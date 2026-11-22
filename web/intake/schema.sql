create schema fp_intake;
revoke all on schema fp_intake from public, anon, authenticated;
create table fp_intake.config (singleton boolean primary key default true check(singleton), live boolean not null default false);
insert into fp_intake.config default values;
create table fp_intake.cases (
  ref text primary key, request_id uuid unique not null, fingerprint text not null,
  created timestamptz not null default now(), lead jsonb not null,
  synthetic boolean not null default false, mail_status text not null default 'queued'
    check(mail_status in ('queued','sending','sent','review','test')),
  mail_started timestamptz, mail_due timestamptz not null default now(), mail_attempts integer not null default 0
);
create index fp_intake_created on fp_intake.cases(created desc);
create index fp_intake_mail_due on fp_intake.cases(mail_due) where mail_status in ('queued','sending');
create table fp_intake.files (
  ref text not null references fp_intake.cases(ref) on delete cascade,
  id smallint not null check(id between 1 and 5), name text not null, mime text not null,
  content bytea not null, primary key(ref,id)
);
alter table fp_intake.cases enable row level security;
alter table fp_intake.files enable row level security;
alter table fp_intake.config enable row level security;
revoke all on all tables in schema fp_intake from public, anon, authenticated;

create function public.fp_intake_live() returns boolean language sql stable security definer set search_path='' as $$
 select live from fp_intake.config where singleton
$$;
create function public.fp_intake_submit(p_id uuid,p_fingerprint text,p_lead jsonb,p_files jsonb,p_test boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old fp_intake.cases; r text; e jsonb; i integer:=0; sum_bytes integer:=0; data bytea;
begin
 if not p_test and not public.fp_intake_live() then raise exception using errcode='55000',message='offline'; end if;
 if p_id is null or p_fingerprint !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_lead) is distinct from 'object' or
   jsonb_typeof(p_files) is distinct from 'array' or jsonb_array_length(p_files)>5 or p_test is null then
   raise exception using errcode='22023',message='Input invalid'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,87));
 select * into old from fp_intake.cases where request_id=p_id;
 if found then
   if old.fingerprint<>p_fingerprint or old.synthetic<>p_test then raise exception using errcode='PT409',message='Idempotency conflict'; end if;
   return jsonb_build_object('reference',old.ref,'created',false);
 end if;
 r:='AN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
 insert into fp_intake.cases(ref,request_id,fingerprint,lead,synthetic,mail_status) values(r,p_id,p_fingerprint,p_lead,p_test,case when p_test then 'test' else 'queued' end);
 for e in select * from jsonb_array_elements(p_files) loop
   i:=i+1; data:=decode(e->>'content','base64'); sum_bytes:=sum_bytes+octet_length(data);
   if octet_length(data)<1 or sum_bytes>8388608 or length(e->>'name') not between 1 and 120 or e->>'mime' not in ('image/jpeg','application/pdf','text/plain') then
     raise exception using errcode='22023',message='Attachment invalid'; end if;
   insert into fp_intake.files values(r,i,e->>'name',e->>'mime',data);
 end loop;
 if not p_test then
   insert into fp_metrics.events(event_id,event_name,service,source,attribution)
     values(gen_random_uuid(),'inquiry_received',coalesce(p_lead->>'requestedService',p_lead->>'service'),p_lead->>'source',p_lead->'attribution');
   if p_lead->>'service'='rueckruf' then
     insert into fp_metrics.events(event_id,event_name,service,source,attribution)
       values(gen_random_uuid(),'callback_requested',coalesce(p_lead->>'requestedService','rueckruf'),p_lead->>'source',p_lead->'attribution');
   end if;
 end if;
 return jsonb_build_object('reference',r,'created',true);
end $$;

create function public.fp_intake_list() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x.created desc),'[]') from (
 select ref as reference,created,lead->>'service' as service,lead->>'name' as name,mail_status,
 (select count(*) from fp_intake.files f where f.ref=c.ref) as file_count
 from fp_intake.cases c where not synthetic order by created desc limit 50) x
$$;
create function public.fp_intake_case(p_ref text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('reference',ref,'created',created,'lead',lead,'mail_status',mail_status,'attachments',
 (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'mime',mime,'size',octet_length(content)) order by id),'[]')
  from fp_intake.files f where f.ref=c.ref)) from fp_intake.cases c where ref=p_ref
$$;
create function public.fp_intake_file(p_ref text,p_id integer) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',name,'mime',mime,'content_base64',replace(encode(content,'base64'),E'\n',''))
 from fp_intake.files where ref=p_ref and id=p_id
$$;
create function public.fp_intake_claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare job fp_intake.cases;
begin
 update fp_intake.cases set mail_status='review' where mail_status in ('queued','sending') and mail_started<now()-interval '23 hours';
 select * into job from fp_intake.cases where mail_status in ('queued','sending') and mail_due<=now()
 order by mail_due,created limit 1 for update skip locked;
 if not found then return null;end if;
 update fp_intake.cases set mail_status='sending',mail_attempts=mail_attempts+1,mail_due=now()+interval '2 minutes',
 mail_started=coalesce(mail_started,now()) where ref=job.ref;
 return jsonb_build_object('ref',job.ref,'attempt',job.mail_attempts+1);
end $$;
create function public.fp_intake_set_mail(p_ref text,p_attempt integer,p_sent boolean) returns void language sql security definer set search_path='' as $$
 update fp_intake.cases set mail_status=case when p_sent then 'sent' else 'queued' end,
 mail_due=now()+interval '1 minute'*least(60,p_attempt*p_attempt)
 where ref=p_ref and mail_attempts=p_attempt and mail_status='sending'
$$;
revoke all on function public.fp_intake_live(),public.fp_intake_submit(uuid,text,jsonb,jsonb,boolean),public.fp_intake_list(),
 public.fp_intake_case(text),public.fp_intake_file(text,integer),public.fp_intake_claim(),public.fp_intake_set_mail(text,integer,boolean)
 from public,anon,authenticated;
grant execute on function public.fp_intake_live(),public.fp_intake_submit(uuid,text,jsonb,jsonb,boolean),public.fp_intake_list(),
 public.fp_intake_case(text),public.fp_intake_file(text,integer),public.fp_intake_claim(),public.fp_intake_set_mail(text,integer,boolean) to service_role;
