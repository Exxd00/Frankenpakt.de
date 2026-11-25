-- This audience is the public client ID of the private, spreadsheet-bound script.
-- Until the operator pairs it, the RPC returns no records.
create table fp_intake.customer_sheet_config (
  singleton boolean primary key default true check (singleton),
  audience text,
  test_ref text check (test_ref ~ '^AN-[A-F0-9]{16}$'),
  test_until timestamptz
);
alter table fp_intake.customer_sheet_config enable row level security;
revoke all on fp_intake.customer_sheet_config from public, anon, authenticated;
insert into fp_intake.customer_sheet_config(singleton) values (true);

create function public.fp_customer_sheet_page(p_audience text, p_after text)
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
        when 'kleinanzeigen' then 'Kleinanzeigen' when 'empfehlung' then 'Empfehlung'
        when 'sonstige' then 'Sonstige' else 'Unbekannt' end,
      coalesce(p.lead#>>'{business,reference}',''), coalesce(p.lead#>>'{business,offerBy}',''),
      coalesce(p.lead#>>'{business,recipient}','')
    ) order by p.ref) from page p), '[]'::jsonb)) into result;
  return result;
end;
$$;

revoke all on function public.fp_customer_sheet_page(text, text) from public, anon, authenticated;
grant execute on function public.fp_customer_sheet_page(text, text) to service_role;
