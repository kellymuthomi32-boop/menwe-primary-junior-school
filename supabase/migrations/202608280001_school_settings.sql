create table if not exists public.school_settings (
  id boolean primary key default true check (id),
  school_name text,
  logo_url text,
  contact_email text,
  contact_phone text,
  address text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.school_settings enable row level security;

drop policy if exists "school settings readable by authenticated users" on public.school_settings;
create policy "school settings readable by authenticated users"
  on public.school_settings for select to authenticated using (true);

drop policy if exists "school settings managed by admins" on public.school_settings;
create policy "school settings managed by admins"
  on public.school_settings for all to authenticated
  using (public.is_school_admin())
  with check (public.is_school_admin());
