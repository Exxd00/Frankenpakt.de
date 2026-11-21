create schema if not exists fp_metrics;
revoke all on schema fp_metrics from public, anon, authenticated;

create table fp_metrics.events (
  event_id uuid primary key,
  received_at timestamptz not null default clock_timestamp(),
  event_name text not null check (event_name in ('service_chosen','estimate_viewed','upload_ready','contact_intent','inquiry_received','callback_requested','integration_test')),
  service text not null check (service in ('entruempelung','entsorgung','umzug','seniorenumzug','moebeltaxi','transport','rueckruf','unbekannt')),
  source text not null check (source in ('google','kleinanzeigen','empfehlung','direkt','sonstige','unbekannt'))
);
create index fp_events_time on fp_metrics.events(received_at);
create table fp_metrics.keys (label text primary key, digest text not null);
create table fp_metrics.minute_limits (
  bucket text not null, minute timestamptz not null, hits integer not null,
  primary key (minute,bucket)
);
alter table fp_metrics.events enable row level security;
alter table fp_metrics.keys enable row level security;
alter table fp_metrics.minute_limits enable row level security;
revoke all on all tables in schema fp_metrics from public,anon,authenticated;

create function public.fp_record_event(eid uuid, kind text, category text, channel text, rate_bucket text, access_digest text)
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
  insert into fp_metrics.events(event_id,event_name,service,source) values(eid,kind,category,channel)
    on conflict(event_id) do nothing;
  return 'ok';
end $$;
revoke all on function public.fp_record_event(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.fp_record_event(uuid,text,text,text,text,text) to service_role;

create function public.fp_sheet_events(access_digest text)
returns text language plpgsql stable security definer set search_path='' as $$
declare csv text;
begin
  if not exists(select 1 from fp_metrics.keys where label='read' and digest=access_digest) then return null; end if;
  select string_agg(event_id::text || ',' || to_char(received_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || ',' || event_name || ',' || service || ',' || source || ',1',
    E'\n' order by received_at desc,event_id) into csv
    from (select * from fp_metrics.events order by received_at desc,event_id limit 5000) q;
  return 'Event-ID,Zeitpunkt (UTC),Ereignis,Leistung,Quelle,Anzahl' || coalesce(E'\n'||csv,'');
end $$;
revoke all on function public.fp_sheet_events(text) from public,anon,authenticated;
grant execute on function public.fp_sheet_events(text) to service_role;
