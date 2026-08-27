-- Homework functions can operate with the caller's own RLS permissions.
-- This removes public SECURITY DEFINER exposure while preserving the scoped workflow.

alter function public.submit_homework_submission(uuid, text) security invoker;
alter function public.mark_homework_submission(uuid, numeric, text) security invoker;

drop policy if exists homework_submissions_student_revise on public.homework_submissions;
create policy homework_submissions_student_revise
on public.homework_submissions
for update to authenticated
using (
  student_id = private.current_student_id()
  and marked_at is null
)
with check (
  student_id = private.current_student_id()
  and marked_at is null
  and mark is null
  and feedback is null
  and marked_by is null
);

drop policy if exists notifications_homework_marker_create on public.notifications;
create policy notifications_homework_marker_create
on public.notifications
for insert to authenticated
with check (
  type = 'HOMEWORK_MARKED'
  and exists (
    select 1
    from public.homework_submissions hs
    join public.homework h on h.id = hs.homework_id
    join public.students s on s.id = hs.student_id
    where s.profile_id = notifications.profile_id
      and (private.is_admin() or h.teacher_id = private.current_teacher_id())
  )
);
