-- Staff roles, specialist planning, absences and safe booking workflow.
insert into public.specialists (id, name, specialty, active) values
('dr-amina','Dr Amina S.','Médecine générale',true),
('dr-marc','Dr Marc K.','Pédiatrie',true),
('dr-sophie','Dr Sophie A.','Gynécologie',true),
('dr-david','Dr David T.','Cardiologie',true)
on conflict (id) do update set name=excluded.name, specialty=excluded.specialty, active=excluded.active;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'patient' check (role in ('admin','reception','doctor','patient')),
  specialist_id text references public.specialists(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''), 'patient')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created_novasante after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.specialist_schedules (
  id uuid primary key default gen_random_uuid(),
  specialist_id text not null references public.specialists(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  slot_minutes smallint not null default 30 check (slot_minutes between 10 and 120),
  active boolean not null default true,
  unique(specialist_id, weekday),
  check (start_time < end_time),
  check ((break_start is null and break_end is null) or (break_start < break_end and break_start >= start_time and break_end <= end_time))
);
alter table public.specialist_schedules enable row level security;
create policy "Public can read active schedules" on public.specialist_schedules for select to anon, authenticated using (active = true);

create table if not exists public.specialist_absences (
  id uuid primary key default gen_random_uuid(),
  specialist_id text not null references public.specialists(id) on delete cascade,
  absence_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique(specialist_id, absence_date)
);
alter table public.specialist_absences enable row level security;

alter table public.appointments add column if not exists duration_minutes smallint not null default 30;
alter table public.appointments add column if not exists updated_at timestamptz not null default now();
alter table public.appointments add column if not exists handled_by uuid references public.profiles(id);
alter table public.appointments add column if not exists internal_note text;
create index if not exists appointments_date_specialist_idx on public.appointments(specialist_id, appointment_date, appointment_time);
create index if not exists appointments_status_date_idx on public.appointments(status, appointment_date);
create unique index if not exists appointments_active_slot_unique on public.appointments(specialist_id, appointment_date, appointment_time) where status in ('pending','confirmed');

revoke all on public.appointments from anon, authenticated;
create policy "Staff can read appointments" on public.appointments for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active = true and p.role in ('admin','reception','doctor') and (p.role <> 'doctor' or p.specialist_id = appointments.specialist_id)));
create policy "Staff can update appointments" on public.appointments for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active = true and p.role in ('admin','reception','doctor') and (p.role <> 'doctor' or p.specialist_id = appointments.specialist_id)))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active = true and p.role in ('admin','reception','doctor') and (p.role <> 'doctor' or p.specialist_id = appointments.specialist_id)));

grant select, update on public.appointments to authenticated;
grant select on public.specialist_schedules to anon, authenticated;
grant select on public.specialists to anon, authenticated;

create or replace function public.get_booked_slots(p_specialist_id text, p_date date)
returns table(appointment_time time) language sql stable security definer set search_path = public, pg_temp as $$
 select a.appointment_time from public.appointments a where a.specialist_id=p_specialist_id and a.appointment_date=p_date and a.status in ('pending','confirmed');
$$;
create or replace function public.is_specialist_absent(p_specialist_id text, p_date date)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
 select exists(select 1 from public.specialist_absences where specialist_id=p_specialist_id and absence_date=p_date);
$$;
revoke all on function public.get_booked_slots(text,date) from public;
grant execute on function public.get_booked_slots(text,date) to anon, authenticated;
revoke all on function public.is_specialist_absent(text,date) from public;
grant execute on function public.is_specialist_absent(text,date) to anon, authenticated;

create or replace function public.request_appointment(
 p_patient_name text,p_phone text,p_email text,p_reason text,p_specialist_id text,p_appointment_date date,p_appointment_time time
) returns table(reference text) language plpgsql security definer set search_path = public, pg_temp as $$
declare v_specialist public.specialists%rowtype; v_schedule public.specialist_schedules%rowtype; v_ref text; v_end time;
begin
 if length(trim(coalesce(p_patient_name,'')))<3 or length(trim(coalesce(p_patient_name,'')))>120 then raise exception 'Nom invalide'; end if;
 if length(regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g'))<8 or length(p_phone)>30 then raise exception 'Téléphone invalide'; end if;
 if p_email is not null and length(p_email)>254 then raise exception 'E-mail invalide'; end if;
 if p_reason is not null and length(p_reason)>500 then raise exception 'Motif trop long'; end if;
 if p_appointment_date <= (now() at time zone 'Africa/Porto-Novo')::date then raise exception 'La date doit être future'; end if;
 select * into v_specialist from public.specialists where id=p_specialist_id and active=true;
 if not found then raise exception 'Spécialiste indisponible'; end if;
 perform pg_advisory_xact_lock(hashtext(p_specialist_id),hashtext(p_appointment_date::text));
 if exists(select 1 from public.specialist_absences where specialist_id=p_specialist_id and absence_date=p_appointment_date) then raise exception 'Spécialiste absent à cette date'; end if;
 select * into v_schedule from public.specialist_schedules where specialist_id=p_specialist_id and weekday=extract(dow from p_appointment_date)::int and active=true;
 if not found then raise exception 'Aucun horaire pour ce spécialiste à cette date'; end if;
 v_end:=p_appointment_time+make_interval(mins=>v_schedule.slot_minutes);
 if p_appointment_time<v_schedule.start_time or v_end>v_schedule.end_time or (v_schedule.break_start is not null and p_appointment_time<v_schedule.break_end and v_end>v_schedule.break_start) or mod(extract(epoch from (p_appointment_time-v_schedule.start_time))::int,v_schedule.slot_minutes*60)<>0 then raise exception 'Créneau hors planning'; end if;
 if exists(select 1 from public.appointments a where a.specialist_id=p_specialist_id and a.appointment_date=p_appointment_date and a.status in ('pending','confirmed') and a.appointment_time<v_end and a.appointment_time+make_interval(mins=>a.duration_minutes)>p_appointment_time) then raise exception 'Ce créneau vient d’être réservé. Choisissez-en un autre.'; end if;
 v_ref:='NS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.appointments(reference,patient_name,phone,email,reason,specialist_id,specialist_name,specialty,appointment_date,appointment_time,status,duration_minutes)
 values(v_ref,trim(p_patient_name),trim(p_phone),nullif(trim(coalesce(p_email,'')),''),nullif(trim(coalesce(p_reason,'')),''),p_specialist_id,v_specialist.name,v_specialist.specialty,p_appointment_date,p_appointment_time,'pending',v_schedule.slot_minutes);
 return query select v_ref;
end; $$;
revoke all on function public.request_appointment(text,text,text,text,text,date,time) from public;
grant execute on function public.request_appointment(text,text,text,text,text,date,time) to anon,authenticated;

insert into public.specialist_schedules(specialist_id,weekday,start_time,end_time,break_start,break_end,slot_minutes) values
('dr-amina',1,'08:00','12:00',null,null,30),('dr-amina',2,'08:00','12:00',null,null,30),('dr-amina',3,'08:00','12:00',null,null,30),('dr-amina',4,'08:00','12:00',null,null,30),('dr-amina',5,'08:00','12:00',null,null,30),('dr-amina',6,'08:00','12:00',null,null,30),
('dr-marc',1,'09:00','16:00','12:00','13:00',30),('dr-marc',3,'09:00','16:00','12:00','13:00',30),('dr-marc',5,'09:00','16:00','12:00','13:00',30),
('dr-sophie',2,'08:30','15:30','12:00','13:00',30),('dr-sophie',4,'08:30','15:30','12:00','13:00',30),('dr-sophie',6,'08:30','15:30','12:00','13:00',30),
('dr-david',2,'14:00','18:00',null,null,30),('dr-david',4,'14:00','18:00',null,null,30)
on conflict(specialist_id,weekday) do update set start_time=excluded.start_time,end_time=excluded.end_time,break_start=excluded.break_start,break_end=excluded.break_end,slot_minutes=excluded.slot_minutes,active=true;
