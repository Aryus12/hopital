-- NovaSanté demo schema — one clinic only.
-- Apply only to a dedicated development Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.specialists (
  id text primary key,
  name text not null,
  specialty text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  patient_name text not null,
  phone text not null,
  email text,
  reason text,
  specialist_id text not null references public.specialists(id),
  specialist_name text not null,
  specialty text not null,
  appointment_date date not null,
  appointment_time time not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','rejected','reschedule_requested','cancelled','completed','no_show')),
  created_at timestamptz not null default now()
);

-- Security-first default: browser roles cannot read or modify appointment rows.
-- The public booking insert and staff workflows must be moved behind authenticated
-- server-side endpoints / Edge Functions with validated permissions before production.
alter table public.specialists enable row level security;
alter table public.appointments enable row level security;

-- Public may read active specialist directory only.
create policy "Public can read active specialists"
on public.specialists for select to anon, authenticated
using (active = true);

-- No anon SELECT/UPDATE/DELETE policy for appointments.
-- Do not add a permissive public insert policy for real patient data.
-- Implement booking through a server-side route/Edge Function with rate limiting,
-- input validation, slot collision checks and audit logging before enabling production.
