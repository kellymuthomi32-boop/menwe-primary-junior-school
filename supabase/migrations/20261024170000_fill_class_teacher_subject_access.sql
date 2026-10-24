-- Ensure the designated class teacher can manage all subjects for their class.
-- Only fill missing subject assignments where an active class teacher is already
-- explicitly designated. Never guess a teacher for classes without one.
insert into public.teacher_assignments (teacher_id, class_id, subject_id)
select tcr.teacher_id, cs.class_id, cs.subject_id
from public.class_subjects cs
join public.classes c on c.id = cs.class_id
join public.academic_years ay on ay.id = c.academic_year_id
join public.teacher_class_roles tcr on tcr.class_id = c.id and tcr.is_class_teacher = true
join public.teachers t on t.id = tcr.teacher_id and t.status = 'ACTIVE'
where ay.name = '2026'
  and not exists (
    select 1 from public.teacher_assignments existing
    where existing.class_id = cs.class_id and existing.subject_id = cs.subject_id
  )
on conflict do nothing;
