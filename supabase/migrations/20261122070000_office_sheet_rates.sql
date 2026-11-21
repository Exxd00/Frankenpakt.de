create function public.fp_sheet_rates(p_access_digest text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $function$
begin
  if not exists (
    select 1 from fp_metrics.keys
    where label = 'rates-read' and digest = p_access_digest
  ) then
    return null;
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(rate) order by rate.id), '[]'::jsonb)
    from (
      select id, cents, revision, label, unit, scope
      from public.fp_office_rates
    ) as rate
  );
end;
$function$;

revoke all on function public.fp_sheet_rates(text) from public, anon, authenticated;
grant execute on function public.fp_sheet_rates(text) to service_role;
