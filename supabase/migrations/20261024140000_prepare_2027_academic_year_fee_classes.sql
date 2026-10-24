-- Prepare 2027 fee setup without activating the year or inventing term dates.
insert into public.academic_years (name, starts_on, ends_on, is_current, status)
select '2027', date '2027-01-01', date '2027-12-31', false, 'ACTIVE'
where not exists (select 1 from public.academic_years where name = '2027');

-- Create next-year class shells based on the school's existing class register.
-- Do not copy class teachers, enrollments, or term dates; those need next-year review.
insert into public.classes (academic_year_id, code, name, level, class_teacher_id, status)
select y.id, c.code, c.name, c.level, null, 'ACTIVE'
from public.academic_years y
cross join public.classes c
join public.academic_years old_y on old_y.id = c.academic_year_id
where y.name = '2027'
  and old_y.name = '2026'
  and not exists (
    select 1 from public.classes existing
    where existing.academic_year_id = y.id and existing.code = c.code
  );
