drop policy if exists "library reservations updated by owner or staff" on public.library_reservations;
create policy "library reservations updated by owner or staff"
on public.library_reservations
for update
to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = library_reservations.student_id
      and s.profile_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.student_parents sp
    join public.parents pa on pa.id = sp.parent_id
    where sp.student_id = library_reservations.student_id
      and pa.profile_id = (select auth.uid())
  )
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['SUPER_ADMIN'::public.app_role, 'ADMIN'::public.app_role, 'HEAD_OF_INSTITUTION'::public.app_role, 'DEPUTY_HOI'::public.app_role, 'TEACHER'::public.app_role])
  )
)
with check (
  exists (
    select 1 from public.students s
    where s.id = library_reservations.student_id
      and s.profile_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.student_parents sp
    join public.parents pa on pa.id = sp.parent_id
    where sp.student_id = library_reservations.student_id
      and pa.profile_id = (select auth.uid())
  )
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['SUPER_ADMIN'::public.app_role, 'ADMIN'::public.app_role, 'HEAD_OF_INSTITUTION'::public.app_role, 'DEPUTY_HOI'::public.app_role, 'TEACHER'::public.app_role])
  )
);