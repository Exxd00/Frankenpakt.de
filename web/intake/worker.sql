create extension if not exists pg_cron;
create extension if not exists pg_net;
alter table fp_intake.cases add column closed timestamptz, add column mail_payload jsonb;
create index fp_intake_closed on fp_intake.cases(closed) where closed is not null;
create function public.fp_intake_close(p_ref text) returns boolean language plpgsql security definer set search_path='' as $$
begin update fp_intake.cases set closed=coalesce(closed,now()) where ref=p_ref; return found; end $$;
create function public.fp_intake_payload(p_ref text,p_attempt integer,p_payload jsonb) returns jsonb language sql security definer set search_path='' as $$
 update fp_intake.cases set mail_payload=coalesce(mail_payload,p_payload)
 where ref=p_ref and mail_status='sending' and mail_attempts=p_attempt returning mail_payload
$$;
create function public.fp_intake_worker_valid(p_token text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from vault.decrypted_secrets where name='fp_intake_worker' and length(p_token)=64 and decrypted_secret=p_token)
$$;
revoke all on function public.fp_intake_close(text),public.fp_intake_payload(text,integer,jsonb),public.fp_intake_worker_valid(text) from public,anon,authenticated;
grant execute on function public.fp_intake_close(text),public.fp_intake_payload(text,integer,jsonb),public.fp_intake_worker_valid(text) to service_role;
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'fp_intake_worker','Private scheduled intake mail worker')
where not exists(select 1 from vault.secrets where name='fp_intake_worker');
create function fp_intake.tick() returns void language plpgsql security definer set search_path='' as $$
declare bearer text;
begin
 delete from fp_intake.cases where (synthetic and created<now()-interval '1 day') or closed<now()-interval '90 days';
 update fp_intake.cases set mail_payload=null where mail_payload is not null and mail_status='sent';
 if not exists(select 1 from fp_intake.cases where mail_status in ('queued','sending') and mail_due<=now()) then return; end if;
 select decrypted_secret into bearer from vault.decrypted_secrets where name='fp_intake_worker';
 if bearer is null then return; end if;
 perform net.http_post(url:='https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-intake/flush',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||bearer),body:='{}'::jsonb,timeout_milliseconds:=20000);
end $$;
revoke all on function fp_intake.tick() from public,anon,authenticated;
select cron.schedule('frankenpakt-intake-delivery','*/5 * * * *','select fp_intake.tick()');
