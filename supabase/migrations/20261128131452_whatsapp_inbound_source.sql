-- Keep existing source values and attribution formats usable for in-flight clients.
alter table fp_metrics.events
  drop constraint events_source_check,
  add constraint events_source_check check (source in ('google','kleinanzeigen','empfehlung','direkt','sonstige','unbekannt','whatsapp')),
  drop constraint events_event_name_check,
  add constraint events_event_name_check check (event_name in (
    'service_chosen','estimate_viewed','upload_ready','contact_intent','inquiry_received','callback_requested','integration_test','whatsapp_visit'
  )),
  drop constraint events_attribution_check,
  add constraint events_attribution_check check (attribution is null or (
    jsonb_typeof(attribution) = 'object'
    and attribution ? 'landing'
    and (attribution - array['landing','keyword','medium','campaign','gclid']::text[]) = '{}'::jsonb
    and attribution->>'landing' ~ '^/([a-z][a-z0-9-]{0,79}/)?$'
    and (attribution->>'medium' is null or attribution->>'medium' in ('cpc','organic','email','social','referral')
      or (source='whatsapp' and attribution->>'medium'='messenger'))
    and (attribution->>'keyword' is null or attribution->>'keyword' ~ '^[a-zäöüß][a-zäöüß -]{0,79}$')
    and (attribution->>'campaign' is null or attribution->>'campaign' ~ '^([1-9][0-9]{0,18}|[a-z][a-z-]{0,47})$')
    and (not (attribution ? 'gclid') or (source='google' and (attribution->>'medium') is not distinct from 'cpc'
      and jsonb_typeof(attribution->'gclid')='string' and length(attribution->>'gclid')<=512
      and attribution->>'gclid' ~ '^[A-Za-z0-9_][A-Za-z0-9._~-]*={0,2}$'))
    and (source <> 'whatsapp' or (
      not (attribution ?| array['keyword','gclid'])
      and (not (attribution ? 'campaign') or (attribution->>'campaign' in ('profil','chat','katalog','status')
        and (attribution->>'medium') is not distinct from 'messenger'))
    ))
  )),
  add constraint events_whatsapp_visit_check check (event_name <> 'whatsapp_visit' or (
    source='whatsapp' and attribution is not null
    and attribution ?& array['landing','medium','campaign']
    and jsonb_typeof(attribution->'landing')='string'
    and jsonb_typeof(attribution->'campaign')='string'
    and (attribution->>'medium') is not distinct from 'messenger'
  ));

create or replace function public.fp_sheet_events(access_digest text)
returns text language plpgsql stable security definer set search_path='' as $$
declare csv text;
begin
  if not exists(select 1 from fp_metrics.keys where label='read' and digest=access_digest) then return null; end if;
  select string_agg(event_id::text || ',' || to_char(received_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || ',' ||
    event_name || ',' || service || ',' || case source when 'whatsapp' then 'WhatsApp' else source end || ',1,' || coalesce(attribution->>'keyword','') || ',' ||
    coalesce(attribution->>'medium','') || ',' ||
    case when attribution->>'campaign' ~ '^[0-9]+$' then 'ID ' || (attribution->>'campaign') else coalesce(attribution->>'campaign','') end || ',' ||
    coalesce(attribution->>'landing','') || ',' ||
    case event_name when 'whatsapp_visit' then 'Websitebesuch über WhatsApp' when 'service_chosen' then 'Leistung gewählt' when 'estimate_viewed' then 'Preis eingeschätzt'
      when 'upload_ready' then 'Datei vorbereitet' when 'inquiry_received' then 'Anfrage eingegangen'
      when 'callback_requested' then 'Rückruf angefragt' when 'integration_test' then 'Systemtest'
      when 'contact_intent' then case contact_channel when 'phone' then 'Telefon – Weiterleitung'
        when 'whatsapp' then 'WhatsApp – Weiterleitung' else 'Kontakt – Weiterleitung' end
      else event_name end || ',' || coalesce(attribution->>'gclid',''),
    E'\n' order by received_at desc,event_id) into csv
    from (select * from fp_metrics.events order by received_at desc,event_id limit 5000) q;
  return 'Event-ID,Zeitpunkt (UTC),Ereignis,Leistung,Quelle,Anzahl,Keyword (Anzeige),Medium,Kampagne,Einstiegsseite,Ereignistyp,GCLID' || coalesce(E'\n'||csv,'');
end $$;

create or replace function public.fp_customer_sheet_page(p_audience text, p_after text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  cfg fp_intake.customer_sheet_config;
  result jsonb;
begin
  select * into cfg from fp_intake.customer_sheet_config where singleton;
  if cfg.audience is null or cfg.audience is distinct from p_audience then
    return null;
  end if;
  if p_after is null or (p_after <> '' and p_after !~ '^AN-[A-F0-9]{16}$') then
    raise exception 'Invalid cursor';
  end if;
  with batch as materialized (
    select ref, created, lead
    from fp_intake.cases
    where ref > p_after and (closed is null or closed > statement_timestamp() - interval '90 days')
      and (not synthetic or (ref = cfg.test_ref and cfg.test_until > statement_timestamp() and mail_status = 'test'))
    order by ref
    limit 201
  ), page as (
    select * from batch order by ref limit 200
  )
  select jsonb_build_object('schema', 1, 'done', (select count(*) <= 200 from batch),
    'rows', coalesce((select jsonb_agg(jsonb_build_array(
      p.ref, to_char(p.created at time zone 'Europe/Berlin','DD.MM.YYYY HH24:MI'),
      case when p.lead->>'service' = 'rueckruf' then 'Rückruf' else 'Angebotsanfrage' end,
      case coalesce(nullif(p.lead->>'requestedService',''), p.lead->>'service')
        when 'entruempelung' then 'Entrümpelung' when 'entsorgung' then 'Entsorgung'
        when 'umzug' then 'Umzug' when 'moebeltaxi' then 'Möbeltaxi'
        when 'seniorenumzug' then 'Seniorenumzug' when 'transport' then 'Transport' else '' end,
      coalesce(p.lead->>'name',''),
      coalesce(nullif(p.lead->>'phone',''), case when p.lead->>'contactMethod' = 'phone' then p.lead->>'contact' end, ''),
      coalesce(nullif(p.lead->>'email',''), case when p.lead->>'contactMethod' = 'email' then p.lead->>'contact' end, ''),
      case p.lead->>'contactMethod' when 'phone' then 'Telefon' when 'email' then 'E-Mail' else '' end,
      coalesce(p.lead#>>'{business,company}',''), coalesce(p.lead->>'zipFrom',''), coalesce(p.lead->>'zipTo',''),
      coalesce(p.lead->>'timeframe',''), coalesce(p.lead->>'details',''),
      (select count(*)::text from fp_intake.files f where f.ref = p.ref),
      case p.lead->>'source' when 'direkt' then 'Direkt' when 'google' then 'Google'
        when 'whatsapp' then 'WhatsApp' when 'kleinanzeigen' then 'Kleinanzeigen' when 'empfehlung' then 'Empfehlung'
        when 'sonstige' then 'Sonstige' else 'Unbekannt' end,
      coalesce(p.lead#>>'{business,reference}',''), coalesce(p.lead#>>'{business,offerBy}',''),
      coalesce(p.lead#>>'{business,recipient}','')
    ) order by p.ref) from page p), '[]'::jsonb)) into result;
  return result;
end;
$$;
