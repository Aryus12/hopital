alter table public.profiles add column if not exists email text;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,email,full_name,role)
 values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),'patient')
 on conflict(id) do update set email=excluded.email;
 return new;
end; $$;
update public.profiles p set email=u.email from auth.users u where u.id=p.id and p.email is distinct from u.email;
