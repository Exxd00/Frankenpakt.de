drop function public.fp_intake_close(text);
create function public.fp_intake_close(p_ref text) returns jsonb language sql security definer set search_path='' as $$
 update fp_intake.cases set closed=coalesce(closed,now()) where ref=p_ref
 returning jsonb_build_object('reference',ref,'closed',closed)
$$;
revoke all on function public.fp_intake_close(text) from public,anon,authenticated;
grant execute on function public.fp_intake_close(text) to service_role;
create or replace function public.fp_intake_case(p_ref text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('reference',ref,'created',created,'closed',closed,'lead',lead,'mail_status',mail_status,'attachments',
 (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'mime',mime,'size',octet_length(content)) order by id),'[]')
  from fp_intake.files f where f.ref=c.ref)) from fp_intake.cases c where ref=p_ref
$$;
create or replace function public.fp_intake_list() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x.created desc),'[]') from (
 select ref as reference,created,closed,lead->>'service' as service,lead->>'name' as name,mail_status,
 (select count(*) from fp_intake.files f where f.ref=c.ref) as file_count
 from fp_intake.cases c where not synthetic order by created desc limit 50) x
$$;
