-- The principal is a school-wide academic administrator.
-- Keep the same protected RLS path used by administrators; do not weaken
-- row-level security or expose marks to teachers outside their assignments.

insert into public.roles (code, label, description)
values (
  'HEAD_OF_INSTITUTION'::public.app_role,
  'Head of Institution / Principal',
  'School principal with school-wide authority over academic records, including adding and editing learner marks across all active classes.'
)
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select private.has_role(
    'SUPER_ADMIN'::public.app_role,
    'ADMIN'::public.app_role,
    'HEAD_OF_INSTITUTION'::public.app_role,
    'DEPUTY_HOI'::public.app_role
  );
$$;

grant execute on function private.is_admin() to authenticated;
