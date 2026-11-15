create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active=true and role='admin');
$$;
revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

create policy "Admins can read all profiles" on public.profiles for select to authenticated using (public.current_user_is_admin());
create policy "Admins can update staff profiles" on public.profiles for update to authenticated using (public.current_user_is_admin()) with check (role in ('admin','reception','doctor','patient'));
grant select, update on public.profiles to authenticated;

create policy "Admins manage schedules" on public.specialist_schedules for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
grant insert, update, delete on public.specialist_schedules to authenticated;
create policy "Admins manage absences" on public.specialist_absences for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
grant select, insert, update, delete on public.specialist_absences to authenticated;

create table if not exists public.booking_rate_limits (
 fingerprint text not null,
 window_start timestamptz not null,
 request_count integer not null default 0,
 primary key(fingerprint,window_start)
);
alter table public.booking_rate_limits enable row level security;
revoke all on public.booking_rate_limits from anon,authenticated;

drop function if exists public.request_appointment(text,text,text,text,text,date,time);
create or replace function public.request_appointment(
 p_patient_name text,p_phone text,p_email text,p_reason text,p_specialist_id text,p_appointment_date date,p_appointment_time time,p_client_fingerprint text default 'unknown'
) returns table(reference text) language plpgsql security definer set search_path = public, pg_temp as $$
declare v_specialist public.specialists%rowtype; v_schedule public.specialist_schedules%rowtype; v_ref text; v_end time;
declare v_window timestamptz := date_trunc('hour',now())+make_interval(mins=>(extract(minute from now())::int/10)*10);
declare v_count integer;
begin
 if length(trim(coalesce(p_patient_name,'')))<3 or length(trim(coalesce(p_patient_name,'')))>120 then raise exception 'Nom invalide'; end if;
 if length(regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g'))<8 or length(p_phone)>30 then raise exception 'Téléphone invalide'; end if;
 if p_email is not null and length(p_email)>254 then raise exception 'E-mail invalide'; end if;
 if p_reason is not null and length(p_reason)>500 then raise exception 'Motif trop long'; end if;
 if p_appointment_date <= (now() at time zone 'Africa/Porto-Novo')::date then raise exception 'La date doit être future'; end if;
 insert into public.booking_rate_limits(fingerprint,window_start,request_count) values(left(coalesce(p_client_fingerprint,'unknown'),80),v_window,1)
 on conflict(fingerprint,window_start) do update set request_count=public.booking_rate_limits.request_count+1 returning request_count into v_count;
 if v_count>5 then raise exception 'Trop de demandes depuis cette connexion. Réessayez plus tard.'; end if;
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
 delete from public.booking_rate_limits where window_start<now()-interval '2 days';
 return query select v_ref;
end; $$;
revoke all on function public.request_appointment(text,text,text,text,text,date,time,text) from public;
grant execute on function public.request_appointment(text,text,text,text,text,date,time,text) to anon,authenticated;
