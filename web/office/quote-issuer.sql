alter table public.fp_office_quotes add column issuer text not null default '';
create function public.fp_office_quote_v2(p_issuer text,p_id uuid,p_customer text,p_scope text,p_items jsonb)
returns public.fp_office_quotes language plpgsql security invoker set search_path='' as $$
declare row_item jsonb; rate public.fp_office_rates; qty integer; lines jsonb:='[]'; total bigint:=0; result public.fp_office_quotes;
begin
  if length(trim(p_issuer)) not between 1 and 400 or length(trim(p_customer)) not between 1 and 160 or length(trim(p_scope)) not between 1 and 1200
    or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 25 then
    raise exception 'invalid quote' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,17));
  select * into result from public.fp_office_quotes where id=p_id;
  if found then
    if result.issuer<>p_issuer or result.customer<>p_customer or result.scope<>p_scope or
      (select jsonb_agg(jsonb_build_object('id',j->'id','revision',j->'revision','quantity',j->'quantity') order by ord) from jsonb_array_elements(result.lines) with ordinality as l(j,ord))<>p_items then
      raise exception 'quote conflict' using errcode='40001'; end if;
    return result; end if;
  for row_item in select value from jsonb_array_elements(p_items) loop
    select * into rate from public.fp_office_rates where id=row_item->>'id' for share;
    if not found or rate.revision is distinct from (row_item->>'revision')::integer then raise exception 'price has changed' using errcode='40001'; end if;
    qty:=(row_item->>'quantity')::integer;
    if qty is null or qty not between 1 and 999 or lines @> jsonb_build_array(jsonb_build_object('id',rate.id)) then raise exception 'invalid quantity' using errcode='22023'; end if;
    lines:=lines||jsonb_build_array(jsonb_build_object('id',rate.id,'revision',rate.revision,'label',rate.label,'unit',rate.unit,'scope',rate.scope,'cents',rate.cents,'quantity',qty));
    total:=total+rate.cents::bigint*qty;
  end loop;
  insert into public.fp_office_quotes(id,customer,scope,lines,total_cents,issuer) values(p_id,p_customer,p_scope,lines,total,p_issuer) returning * into result;
  return result;
end; $$;
revoke all on function public.fp_office_quote_v2(text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.fp_office_quote_v2(text,uuid,text,text,jsonb) to service_role;
drop function public.fp_office_quote(uuid,text,text,jsonb);
