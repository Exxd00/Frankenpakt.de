-- Existing events retain NULL attribution. The former six-column import continues to use columns A:F.
alter table fp_metrics.events add column attribution jsonb
  check (attribution is null or (
    jsonb_typeof(attribution) = 'object'
    and attribution ? 'landing'
    and (attribution - array['landing','keyword','medium','campaign']::text[]) = '{}'::jsonb
    and attribution->>'landing' ~ '^/([a-z][a-z0-9-]{0,79}/)?$'
    and (attribution->>'medium' is null or attribution->>'medium' in ('cpc','organic','email','social','referral'))
    and (attribution->>'keyword' is null or attribution->>'keyword' ~ '^[a-zäöüß][a-zäöüß -]{0,79}$')
    and (attribution->>'campaign' is null or attribution->>'campaign' ~ '^([1-9][0-9]{0,18}|[a-z][a-z-]{0,47})$')
  ));

create function public.fp_record_attributed_event(eid uuid, kind text, category text, channel text, rate_bucket text, access_digest text, attribution jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare clock_minute timestamptz := date_trunc('minute',clock_timestamp()); n integer;
begin
  if kind in ('inquiry_received','callback_requested','integration_test') then
    if not exists(select 1 from fp_metrics.keys where label='write' and digest=access_digest) then return 'forbidden'; end if;
  else
    if rate_bucket is null or length(rate_bucket)<>64 then return 'forbidden'; end if;
    delete from fp_metrics.minute_limits where minute < clock_minute - interval '2 minutes';
    insert into fp_metrics.minute_limits values(rate_bucket,clock_minute,1)
      on conflict(minute,bucket) do update set hits=fp_metrics.minute_limits.hits+1 returning hits into n;
    if n>90 then return 'limited'; end if;
  end if;
  insert into fp_metrics.events(event_id,event_name,service,source,attribution) values(eid,kind,category,channel,attribution)
    on conflict(event_id) do nothing;
  return 'ok';
end $$;
revoke all on function public.fp_record_attributed_event(uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.fp_record_attributed_event(uuid,text,text,text,text,text,jsonb) to service_role;

-- Preserve compatibility with the currently deployed Edge Function until its new version is serving.
create or replace function public.fp_record_event(eid uuid, kind text, category text, channel text, rate_bucket text, access_digest text)
returns text language sql security definer set search_path='' as $$
 select public.fp_record_attributed_event(eid,kind,category,channel,rate_bucket,access_digest,null)
$$;

create or replace function public.fp_sheet_events(access_digest text)
returns text language plpgsql stable security definer set search_path='' as $$
declare csv text;
begin
  if not exists(select 1 from fp_metrics.keys where label='read' and digest=access_digest) then return null; end if;
  select string_agg(event_id::text || ',' || to_char(received_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || ',' || event_name || ',' || service || ',' || source || ',1,' ||
    coalesce(attribution->>'keyword','') || ',' || coalesce(attribution->>'medium','') || ',' ||
    case when attribution->>'campaign' ~ '^[0-9]+$' then 'ID ' || (attribution->>'campaign') else coalesce(attribution->>'campaign','') end ||
    ',' || coalesce(attribution->>'landing',''),
    E'\n' order by received_at desc,event_id) into csv
    from (select * from fp_metrics.events order by received_at desc,event_id limit 5000) q;
  return 'Event-ID,Zeitpunkt (UTC),Ereignis,Leistung,Quelle,Anzahl,Keyword (Anzeige),Medium,Kampagne,Einstiegsseite' || coalesce(E'\n'||csv,'');
end $$;

create or replace function public.fp_intake_submit(p_id uuid,p_fingerprint text,p_lead jsonb,p_files jsonb,p_test boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old fp_intake.cases; r text; e jsonb; i integer:=0; sum_bytes integer:=0; data bytea;
begin
 if not p_test and not public.fp_intake_live() then raise exception using errcode='55000',message='offline'; end if;
 if p_id is null or p_fingerprint !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_lead) is distinct from 'object' or
   jsonb_typeof(p_files) is distinct from 'array' or jsonb_array_length(p_files)>5 or p_test is null then
   raise exception using errcode='22023',message='Input invalid'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,87));
 select * into old from fp_intake.cases where request_id=p_id;
 if found then
   if old.fingerprint<>p_fingerprint or old.synthetic<>p_test then raise exception using errcode='PT409',message='Idempotency conflict'; end if;
   return jsonb_build_object('reference',old.ref,'created',false);
 end if;
 r:='AN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
 insert into fp_intake.cases(ref,request_id,fingerprint,lead,synthetic,mail_status) values(r,p_id,p_fingerprint,p_lead,p_test,case when p_test then 'test' else 'queued' end);
 for e in select * from jsonb_array_elements(p_files) loop
   i:=i+1; data:=decode(e->>'content','base64'); sum_bytes:=sum_bytes+octet_length(data);
   if octet_length(data)<1 or sum_bytes>8388608 or length(e->>'name') not between 1 and 120 or e->>'mime' not in ('image/jpeg','application/pdf','text/plain') then
     raise exception using errcode='22023',message='Attachment invalid'; end if;
   insert into fp_intake.files values(r,i,e->>'name',e->>'mime',data);
 end loop;
 if not p_test then
   insert into fp_metrics.events(event_id,event_name,service,source,attribution)
     values(gen_random_uuid(),'inquiry_received',coalesce(p_lead->>'requestedService',p_lead->>'service'),p_lead->>'source',p_lead->'attribution');
   if p_lead->>'service'='rueckruf' then
     insert into fp_metrics.events(event_id,event_name,service,source,attribution)
       values(gen_random_uuid(),'callback_requested',coalesce(p_lead->>'requestedService','rueckruf'),p_lead->>'source',p_lead->'attribution');
   end if;
 end if;
 return jsonb_build_object('reference',r,'created',true);
end $$;
