-- Compute patient-visible appointment slots in one protected database function.
-- It deliberately returns only time labels, never patient or booking details.
create or replace function public.get_available_slots(p_specialist_id text, p_date date)
returns table(slot_time text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select to_char(gs.slot_start::time, 'HH24:MI') as slot_time
  from public.specialists sp
  join public.specialist_schedules sch on sch.specialist_id = sp.id
  cross join lateral generate_series(
    p_date::timestamp + sch.start_time,
    p_date::timestamp + sch.end_time - make_interval(mins => sch.slot_minutes),
    make_interval(mins => sch.slot_minutes)
  ) as gs(slot_start)
  where sp.id = p_specialist_id
    and sp.active = true
    and sch.active = true
    and sch.weekday = extract(dow from p_date)::int
    and p_date >= (now() at time zone 'Africa/Porto-Novo')::date
    and not exists (
      select 1 from public.specialist_absences sa
      where sa.specialist_id = p_specialist_id and sa.absence_date = p_date
    )
    and (
      sch.break_start is null
      or not (
        gs.slot_start::time < sch.break_end
        and gs.slot_start::time + make_interval(mins => sch.slot_minutes) > sch.break_start
      )
    )
    and not exists (
      select 1 from public.appointments a
      where a.specialist_id = p_specialist_id
        and a.appointment_date = p_date
        and a.status in ('pending', 'confirmed')
        and a.appointment_time < gs.slot_start::time + make_interval(mins => sch.slot_minutes)
        and a.appointment_time + make_interval(mins => a.duration_minutes) > gs.slot_start::time
    )
    and (
      p_date > (now() at time zone 'Africa/Porto-Novo')::date
      or gs.slot_start::time > (now() at time zone 'Africa/Porto-Novo')::time
    )
  order by gs.slot_start;
$$;

revoke all on function public.get_available_slots(text, date) from public;
grant execute on function public.get_available_slots(text, date) to anon, authenticated;
