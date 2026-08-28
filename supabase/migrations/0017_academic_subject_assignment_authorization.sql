-- Canonical academic authorization aligned with classes, subjects and teacher_assignments.

drop policy if exists admin_read_classes on public.classes;
create policy admin_manage_classes on public.classes for all to authenticated
using (is_school_admin()) with check (is_school_admin());
create policy teachers_read_assigned_classes on public.classes for select to authenticated
using (exists (select 1 from public.teacher_assignments ta where ta.class_id = classes.id and ta.teacher_id = (select auth.uid())));
create policy students_read_own_class on public.classes for select to authenticated
using (exists (select 1 from public.students s where s.class_id = classes.id and s.student_user_id = (select auth.uid())));
create policy parents_read_children_classes on public.classes for select to authenticated
using (exists (select 1 from public.students s where s.class_id = classes.id and (select auth.uid()) = any(s.parent_user_ids)));

drop policy if exists admin_read_subjects on public.subjects;
create policy admin_manage_subjects on public.subjects for all to authenticated
using (is_school_admin()) with check (is_school_admin());
create policy teachers_read_assigned_subjects on public.subjects for select to authenticated
using (exists (select 1 from public.teacher_assignments ta where ta.subject = subjects.name and ta.teacher_id = (select auth.uid())));
create policy students_read_class_subjects on public.subjects for select to authenticated
using (exists (select 1 from public.students s join public.teacher_assignments ta on ta.class_id = s.class_id where s.student_user_id = (select auth.uid()) and ta.subject = subjects.name));
create policy parents_read_children_subjects on public.subjects for select to authenticated
using (exists (select 1 from public.students s join public.teacher_assignments ta on ta.class_id = s.class_id where (select auth.uid()) = any(s.parent_user_ids) and ta.subject = subjects.name));

drop policy if exists admin_read_teacher_assignments on public.teacher_assignments;
create policy admin_manage_teacher_assignments on public.teacher_assignments for all to authenticated
using (is_school_admin()) with check (is_school_admin());
create policy teachers_read_own_assignments on public.teacher_assignments for select to authenticated
using (teacher_id = (select auth.uid()));

drop policy if exists "teachers manage exams" on public.exams;
create policy teachers_manage_assigned_subject_exams on public.exams for all to authenticated
using (is_school_admin() or exists (select 1 from public.teacher_assignments ta where ta.teacher_id = (select auth.uid()) and ta.class_id = exams.class_id and ta.subject = exams.subject))
with check (is_school_admin() or (created_by = (select auth.uid()) and exists (select 1 from public.teacher_assignments ta where ta.teacher_id = (select auth.uid()) and ta.class_id = exams.class_id and ta.subject = exams.subject)));

drop policy if exists "teachers manage exam results" on public.exam_results;
create policy teachers_manage_assigned_subject_results on public.exam_results for all to authenticated
using (is_school_admin() or exists (select 1 from public.exams e join public.teacher_assignments ta on ta.class_id = e.class_id and ta.subject = e.subject where e.id = exam_results.exam_id and ta.teacher_id = (select auth.uid())))
with check (is_school_admin() or (recorded_by = (select auth.uid()) and exists (select 1 from public.exams e join public.teacher_assignments ta on ta.class_id = e.class_id and ta.subject = e.subject where e.id = exam_results.exam_id and ta.teacher_id = (select auth.uid()))));
create policy students_read_own_exam_results on public.exam_results for select to authenticated
using (exists (select 1 from public.students s where s.id = exam_results.student_id and s.student_user_id = (select auth.uid())));
create policy parents_read_children_exam_results on public.exam_results for select to authenticated
using (exists (select 1 from public.students s where s.id = exam_results.student_id and (select auth.uid()) = any(s.parent_user_ids)));