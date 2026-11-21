alter table fp_intake.cases add column mail_uncertain boolean not null default false;
create or replace function public.fp_intake_claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare job fp_intake.cases;
begin
 update fp_intake.cases set mail_status='review' where (mail_uncertain or mail_status='sending') and mail_started<now()-interval '23 hours' and mail_status in ('queued','sending');
 select * into job from fp_intake.cases where mail_status in ('queued','sending') and mail_due<=now()
 order by mail_due,created limit 1 for update skip locked;
 if not found then return null;end if;
 update fp_intake.cases set mail_uncertain=mail_uncertain or mail_status='sending',mail_status='sending',mail_attempts=mail_attempts+1,mail_due=now()+interval '2 minutes',
 mail_started=coalesce(mail_started,now()) where ref=job.ref;
 return jsonb_build_object('ref',job.ref,'attempt',job.mail_attempts+1);
end $$;
drop function public.fp_intake_set_mail(text,integer,boolean);
create function public.fp_intake_set_mail(p_ref text,p_attempt integer,p_sent boolean,p_definite boolean) returns void language sql security definer set search_path='' as $$
 update fp_intake.cases set mail_status=case when p_sent then 'sent' else 'queued' end,
 mail_started=case when not p_sent and p_definite and not mail_uncertain then null else mail_started end,
 mail_uncertain=mail_uncertain or (not p_sent and not p_definite),
 mail_due=now()+interval '1 minute'*least(60,p_attempt*p_attempt),mail_payload=case when p_sent then null else mail_payload end
 where ref=p_ref and mail_attempts=p_attempt and mail_status='sending'
$$;
revoke all on function public.fp_intake_set_mail(text,integer,boolean,boolean) from public,anon,authenticated;
grant execute on function public.fp_intake_set_mail(text,integer,boolean,boolean) to service_role;
