drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_admin() or private.can_message_profile(id));

create or replace function public.message_directory()
returns table(id uuid, full_name text, email text, role public.app_role)
language sql
stable
security invoker
set search_path = public, auth
as $$
  select p.id, p.full_name, p.email, p.role
  from public.profiles p
  where p.status = 'ACTIVE'
    and p.role in ('TEACHER'::public.app_role, 'PARENT'::public.app_role)
    and private.can_message_profile(p.id);
$$;

revoke all on function public.message_directory() from public, anon;
grant execute on function public.message_directory() to authenticated;
