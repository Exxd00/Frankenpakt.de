alter table fp_metrics.events
  add column contact_channel text check (
    contact_channel is null or (event_name='contact_intent' and contact_channel in ('phone','whatsapp'))
  ),
  drop constraint events_attribution_check,
  add constraint events_attribution_check check (attribution is null or (
    jsonb_typeof(attribution) = 'object'
    and attribution ? 'landing'
    and (attribution - array['landing','keyword','medium','campaign','gclid']::text[]) = '{}'::jsonb
    and attribution->>'landing' ~ '^/([a-z][a-z0-9-]{0,79}/)?$'
    and (attribution->>'medium' is null or attribution->>'medium' in ('cpc','organic','email','social','referral'))
    and (attribution->>'keyword' is null or attribution->>'keyword' ~ '^[a-zäöüß][a-zäöüß -]{0,79}$')
    and (attribution->>'campaign' is null or attribution->>'campaign' ~ '^([1-9][0-9]{0,18}|[a-z][a-z-]{0,47})$')
    and (not (attribution ? 'gclid') or (source='google' and (attribution->>'medium') is not distinct from 'cpc'
      and jsonb_typeof(attribution->'gclid')='string' and length(attribution->>'gclid')<=512
      and attribution->>'gclid' ~ '^[A-Za-z0-9_][A-Za-z0-9._~-]*={0,2}$'))
  ));

create function public.fp_record_event_detail(eid uuid, kind text, category text, channel text,
  rate_bucket text, access_digest text, attribution jsonb, contact_method text)
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
  insert into fp_metrics.events(event_id,event_name,service,source,attribution,contact_channel)
    values(eid,kind,category,channel,attribution,contact_method)
    on conflict(event_id) do nothing;
  return 'ok';
end $$;
revoke all on function public.fp_record_event_detail(uuid,text,text,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.fp_record_event_detail(uuid,text,text,text,text,text,jsonb,text) to service_role;

create or replace function public.fp_record_attributed_event(eid uuid, kind text, category text, channel text,
  rate_bucket text, access_digest text, attribution jsonb)
returns text language sql security definer set search_path='' as $$
  select public.fp_record_event_detail(eid,kind,category,channel,rate_bucket,access_digest,attribution,null)
$$;

create or replace function public.fp_sheet_events(access_digest text)
returns text language plpgsql stable security definer set search_path='' as $$
declare csv text;
begin
  if not exists(select 1 from fp_metrics.keys where label='read' and digest=access_digest) then return null; end if;
  select string_agg(event_id::text || ',' || to_char(received_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || ',' ||
    event_name || ',' || service || ',' || source || ',1,' || coalesce(attribution->>'keyword','') || ',' ||
    coalesce(attribution->>'medium','') || ',' ||
    case when attribution->>'campaign' ~ '^[0-9]+$' then 'ID ' || (attribution->>'campaign') else coalesce(attribution->>'campaign','') end || ',' ||
    coalesce(attribution->>'landing','') || ',' ||
    case event_name when 'service_chosen' then 'Leistung gewählt' when 'estimate_viewed' then 'Preis eingeschätzt'
      when 'upload_ready' then 'Datei vorbereitet' when 'inquiry_received' then 'Anfrage eingegangen'
      when 'callback_requested' then 'Rückruf angefragt' when 'integration_test' then 'Systemtest'
      when 'contact_intent' then case contact_channel when 'phone' then 'Telefon – Weiterleitung'
        when 'whatsapp' then 'WhatsApp – Weiterleitung' else 'Kontakt – Weiterleitung' end
      else event_name end || ',' || coalesce(attribution->>'gclid',''),
    E'\n' order by received_at desc,event_id) into csv
    from (select * from fp_metrics.events order by received_at desc,event_id limit 5000) q;
  return 'Event-ID,Zeitpunkt (UTC),Ereignis,Leistung,Quelle,Anzahl,Keyword (Anzeige),Medium,Kampagne,Einstiegsseite,Ereignistyp,GCLID' || coalesce(E'\n'||csv,'');
end $$;
