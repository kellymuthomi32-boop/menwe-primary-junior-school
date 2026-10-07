-- Use the same canonical teacher_assignments records as the portal UI.
-- The previous helper checked the legacy teacher_subjects table, which can
-- reject result inserts even when a teacher has a valid class/subject assignment.
create or replace function private.can_teach_exam_subject(p_exam_id uuid, p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select private.is_admin()
    or exists (
      select 1
      from public.exams e
      join public.teacher_assignments ta
        on ta.class_id = e.class_id
       and ta.subject_id = p_subject_id
      where e.id = p_exam_id
        and ta.teacher_id = private.current_teacher_id()
    )
    or exists (
      select 1
      from public.exams e
      join public.classes c on c.id = e.class_id
      where e.id = p_exam_id
        and c.class_teacher_id = private.current_teacher_id()
        and exists (
          select 1
          from public.class_subjects cs
          where cs.class_id = e.class_id
            and cs.subject_id = p_subject_id
        )
    );
$$;

grant execute on function private.can_teach_exam_subject(uuid, uuid) to authenticated;
