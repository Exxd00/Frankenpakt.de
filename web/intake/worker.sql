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
create table fp_intake.worker_tickets(digest bytea primary key,expires timestamptz not null);
alter table fp_intake.worker_tickets enable row level security;
revoke all on fp_intake.worker_tickets from public,anon,authenticated;
create or replace function public.fp_intake_worker_valid(p_token text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if length(p_token)<>64 then return false;end if;
 delete from fp_intake.worker_tickets where digest=extensions.digest(p_token,'sha256') and expires>clock_timestamp();
 return found;
end $$;
create or replace function fp_intake.tick() returns void language plpgsql security definer set search_path='' as $$
declare ticket text;
begin
 delete from fp_intake.cases where (synthetic and created<now()-interval '1 day') or closed<now()-interval '90 days';
 delete from fp_intake.worker_tickets where expires<=now();
 update fp_intake.cases set mail_payload=null where mail_payload is not null and mail_status='sent';
 if not exists(select 1 from fp_intake.cases where mail_status in ('queued','sending') and mail_due<=now()) then return;end if;
 ticket:=encode(extensions.gen_random_bytes(32),'hex');
 insert into fp_intake.worker_tickets values(extensions.digest(ticket,'sha256'),now()+interval '2 minutes');
 perform net.http_post(url:='https://rjcmfkupgngfxteeupql.supabase.co/functions/v1/frankenpakt-intake/flush',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||ticket),body:='{}'::jsonb,timeout_milliseconds:=20000);
end $$;
revoke all on function public.fp_intake_close(text),public.fp_intake_payload(text,integer,jsonb),public.fp_intake_worker_valid(text) from public,anon,authenticated;
grant execute on function public.fp_intake_close(text),public.fp_intake_payload(text,integer,jsonb),public.fp_intake_worker_valid(text) to service_role;
revoke all on function fp_intake.tick() from public,anon,authenticated;
select cron.schedule('frankenpakt-intake-delivery','*/5 * * * *','select fp_intake.tick()');
