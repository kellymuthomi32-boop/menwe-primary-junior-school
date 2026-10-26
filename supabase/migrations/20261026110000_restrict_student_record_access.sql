-- Prevent learners from accessing classmates' records through the shared student-access policy.
-- Parents remain limited to linked children; teachers remain limited to assigned classes; administrators retain school-wide access.
CREATE OR REPLACE FUNCTION private.can_access_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  select private.is_admin()
    or exists (
      select 1 from public.students s
      where s.id = p_student_id and s.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.student_parents sp
      join public.parents p on p.id = sp.parent_id
      where sp.student_id = p_student_id and p.profile_id = auth.uid()
    )
    or (
      private.current_teacher_id() is not null
      and exists (
        select 1 from public.enrollments e
        where e.student_id = p_student_id
          and e.status = 'ACTIVE'
          and private.can_access_class(e.class_id)
      )
    );
$function$;
