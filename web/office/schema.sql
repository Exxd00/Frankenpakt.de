create table public.fp_office_settings (
  singleton boolean primary key default true check (singleton),
  salt text, verifier text,
  check ((salt is null and verifier is null) or (length(salt)=32 and length(verifier)=64))
);
insert into public.fp_office_settings(singleton) values (true);
create table public.fp_office_sessions (
  digest text primary key, role text not null check(role in ('editor','viewer')),
  expires timestamptz not null
);
create table public.fp_office_logins (
  key text primary key, slot timestamptz not null, attempts integer not null
);
create table public.fp_office_rates (
  id text primary key, label text not null, unit text not null, scope text not null,
  cents integer not null check(cents between 1 and 100000000),
  revision integer not null default 1, changed timestamptz not null default now()
);
insert into public.fp_office_rates(id,label,unit,scope,cents) values
 ('drei','Umzugsteam · 3 Stunden','Einsatz','Zwei Personen und Fahrzeug. Drei Stunden vor Ort, An- und Rückfahrt ab 90453 bis zusammen 20 km und 30 Minuten.',32200),
 ('kompakt','Kompaktumzug','Auftrag','Zwei Personen. Bis 20 m³, zwei Ladungen, fünf Stunden und 35 km ab 90453. Erdgeschoss zu Erdgeschoss, je bis 15 m Trageweg, alles gepackt.',49800),
 ('sieben','Umzugsteam · 7 Stunden','Einsatz','Zwei Personen und Fahrzeug. Bis 50 km Gesamtroute ab und bis 90453, Fahrzeit in sieben Stunden enthalten.',78900),
 ('extra','Verlängerung','30 Minuten','Nach Vereinbarung im laufenden Auftrag für dieselben zwei Personen und dasselbe Fahrzeug.',5500);
create table public.fp_office_quotes (
  id uuid primary key, created timestamptz not null default now(), customer text not null,
  scope text not null, lines jsonb not null, total_cents bigint not null
);
alter table public.fp_office_settings enable row level security;
alter table public.fp_office_sessions enable row level security;
alter table public.fp_office_logins enable row level security;
alter table public.fp_office_rates enable row level security;
alter table public.fp_office_quotes enable row level security;
revoke all on public.fp_office_settings, public.fp_office_sessions, public.fp_office_logins, public.fp_office_rates, public.fp_office_quotes from public, anon, authenticated;
grant select,insert,update,delete on public.fp_office_settings, public.fp_office_sessions, public.fp_office_logins, public.fp_office_rates, public.fp_office_quotes to service_role;

create function public.fp_office_gate(p_key text,p_max integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  delete from public.fp_office_logins where slot < now() - interval '2 hours';
  delete from public.fp_office_sessions where expires < now();
  insert into public.fp_office_logins as l(key,slot,attempts) values (p_key,now(),1)
    on conflict(key) do update set attempts=case when l.slot < now()-interval '10 minutes' then 1 else l.attempts+1 end,
    slot=case when l.slot < now()-interval '10 minutes' then now() else l.slot end
    returning attempts into n;
  return n<=p_max;
end; $$;

create function public.fp_office_quote(p_id uuid,p_customer text,p_scope text,p_items jsonb)
returns public.fp_office_quotes language plpgsql security invoker set search_path='' as $$
declare row_item jsonb; rate public.fp_office_rates; qty integer; lines jsonb:='[]'; total bigint:=0; result public.fp_office_quotes;
begin
  if length(trim(p_customer)) not between 1 and 160 or length(trim(p_scope)) not between 1 and 1200
    or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 25 then
    raise exception 'invalid quote' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,17));
  select * into result from public.fp_office_quotes where id=p_id;
  if found then
    if result.customer<>p_customer or result.scope<>p_scope or
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
  insert into public.fp_office_quotes(id,customer,scope,lines,total_cents) values(p_id,p_customer,p_scope,lines,total) returning * into result;
  return result;
end; $$;
revoke all on function public.fp_office_gate(text,integer), public.fp_office_quote(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.fp_office_gate(text,integer), public.fp_office_quote(uuid,text,text,jsonb) to service_role;
