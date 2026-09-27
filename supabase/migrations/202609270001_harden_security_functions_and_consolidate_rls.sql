-- Harden SECURITY DEFINER functions with fixed, trusted search paths and explicit execution grants.
alter function public.admin_people_directory(text,integer,integer,text,text,text) set search_path = pg_catalog, public, private;
alter function public.get_my_food_accountability() set search_path = pg_catalog, public;
alter function public.get_my_food_accountability_csv() set search_path = pg_catalog, public;
alter function public.teacher_library_issue(uuid,uuid,timestamptz,text) set search_path = pg_catalog, public, private;
alter function public.teacher_library_return(uuid,text) set search_path = pg_catalog, public, private;

revoke all on function public.admin_people_directory(text,integer,integer,text,text,text) from public, anon;
revoke all on function public.get_my_food_accountability() from public, anon;
revoke all on function public.get_my_food_accountability_csv() from public, anon;
revoke all on function public.teacher_library_issue(uuid,uuid,timestamptz,text) from public, anon;
revoke all on function public.teacher_library_return(uuid,text) from public, anon;

grant execute on function public.admin_people_directory(text,integer,integer,text,text,text) to authenticated;
grant execute on function public.get_my_food_accountability() to authenticated;
grant execute on function public.get_my_food_accountability_csv() to authenticated;
grant execute on function public.teacher_library_issue(uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.teacher_library_return(uuid,text) to authenticated;

-- Consolidate permissive policies without broadening access.
drop policy if exists "payments_create_pending" on public.payments;
drop policy if exists "payments_class_teacher_insert" on public.payments;
create policy "payments_create_pending" on public.payments
for insert to authenticated
with check (
  status = 'PENDING'::payment_status
  and (
    exists (select 1 from public.invoices i where i.id = payments.invoice_id and private.can_access_student(i.student_id))
    or private.is_class_teacher_for_student((select i.student_id from public.invoices i where i.id = payments.invoice_id))
  )
);

drop policy if exists "payments_admin_manage" on public.payments;
drop policy if exists "payments_class_teacher_update" on public.payments;
create policy "payments_manage_authorised" on public.payments
for update to authenticated
using (
  private.is_admin()
  or private.is_class_teacher_for_student((select i.student_id from public.invoices i where i.id = payments.invoice_id))
)
with check (
  private.is_admin()
  or private.is_class_teacher_for_student((select i.student_id from public.invoices i where i.id = payments.invoice_id))
);

drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_update_authorised" on public.profiles
for update to authenticated
using (private.can_manage_roles() or id = (select auth.uid()))
with check (
  private.can_manage_roles()
  or (id = (select auth.uid()) and role = private.current_user_role())
);

drop policy if exists "school resources staff read" on public.school_resources;
drop policy if exists "school resources learner read" on public.school_resources;
drop policy if exists "school resources parent read" on public.school_resources;
drop policy if exists "school resources teacher own read" on public.school_resources;
create policy "school resources audience read" on public.school_resources
for select to authenticated
using (
  (status = 'PUBLISHED'::text and audience in ('TEACHERS','BOTH') and private.has_role('TEACHER'::app_role))
  or (status = 'PUBLISHED'::text and audience in ('LEARNERS','BOTH') and private.has_role('STUDENT'::app_role) and (class_id is null or exists (select 1 from public.students s join public.enrollments e on e.student_id = s.id where s.profile_id = (select auth.uid()) and e.class_id = school_resources.class_id and e.status = 'ACTIVE'::record_status)))
  or (status = 'PUBLISHED'::text and audience in ('LEARNERS','BOTH') and private.has_role('PARENT'::app_role) and (class_id is null or exists (select 1 from public.student_parents sp join public.parents p on p.id = sp.parent_id join public.enrollments e on e.student_id = sp.student_id where p.profile_id = (select auth.uid()) and e.class_id = school_resources.class_id and e.status = 'ACTIVE'::record_status)))
  or (private.is_active_teacher() and uploaded_by_teacher_id = (select t.id from public.teachers t where t.profile_id = (select auth.uid()) and t.status = 'ACTIVE'::record_status))
);
