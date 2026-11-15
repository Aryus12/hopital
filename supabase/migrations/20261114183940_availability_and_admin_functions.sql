create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and active=true and role='admin') then raise exception 'Accès interdit'; end if;
 select jsonb_build_object(
  'appointments_total',(select count(*) from public.appointments),
  'appointments_pending',(select count(*) from public.appointments where status='pending'),
  'staff_active',(select count(*) from public.profiles where active=true and role in ('admin','reception','doctor'))
 ) into result;
 return result;
end; $$;
revoke all on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to authenticated;
