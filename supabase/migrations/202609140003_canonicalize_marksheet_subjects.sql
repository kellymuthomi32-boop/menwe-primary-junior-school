-- Canonicalize class marksheet subject configuration for Grades 1-9.
-- Lower Primary: English, Kiswahili, Mathematics, Environmental Activities,
-- Creative Arts and school-selected Religious Education (CRE).
-- Upper Primary: preserve the school's configured learning areas, with one
-- canonical Integrated Science subject.
-- Junior School: preserve the school's configured Grade 7-9 learning areas.

begin;

-- Ensure Environmental Activities exists for Lower Primary.
insert into public.subjects (name, code, description, status)
select 'Environmental Activities', 'ENV', 'CBC Environmental Activities for Grade 1, Grade 2 and Grade 3.', 'ACTIVE'
where not exists (
  select 1 from public.subjects where lower(trim(name)) = 'environmental activities'
);

-- Ensure one canonical Integrated Science subject exists under code SCI.
insert into public.subjects (name, code, description, status)
select 'Integrated Science', 'SCI', 'Canonical Integrated Science learning area for Upper Primary and Junior School.', 'ACTIVE'
where not exists (
  select 1 from public.subjects where lower(trim(name)) = 'integrated science' and upper(trim(code)) = 'SCI'
);

-- Identify the canonical Integrated Science record and migrate any duplicate
-- Integrated Science mappings/assignments to it without creating duplicates.
do $$
declare
  canonical_id uuid;
  duplicate_id uuid;
begin
  select id into canonical_id
  from public.subjects
  where lower(trim(name)) = 'integrated science'
    and upper(trim(code)) = 'SCI'
  order by id
  limit 1;

  if canonical_id is null then
    raise exception 'Canonical Integrated Science subject could not be resolved';
  end if;

  -- Move class mappings from duplicate Integrated Science records.
  insert into public.class_subjects (class_id, subject_id)
  select cs.class_id, canonical_id
  from public.class_subjects cs
  join public.subjects s on s.id = cs.subject_id
  where lower(trim(s.name)) = 'integrated science'
    and s.id <> canonical_id
  on conflict do nothing;

  delete from public.class_subjects cs
  using public.subjects s
  where cs.subject_id = s.id
    and lower(trim(s.name)) = 'integrated science'
    and s.id <> canonical_id;

  -- Remove conflicting duplicate teacher assignments before moving the rest.
  delete from public.teacher_assignments ta
  using public.subjects s
  where ta.subject_id = s.id
    and lower(trim(s.name)) = 'integrated science'
    and s.id <> canonical_id
    and exists (
      select 1
      from public.teacher_assignments keep
      where keep.teacher_id = ta.teacher_id
        and keep.class_id = ta.class_id
        and keep.subject_id = canonical_id
    );

  update public.teacher_assignments ta
  set subject_id = canonical_id
  where ta.subject_id in (
    select s.id from public.subjects s
    where lower(trim(s.name)) = 'integrated science'
      and s.id <> canonical_id
  );

  -- The duplicate records should now have no dependent rows.
  delete from public.subjects s
  where lower(trim(s.name)) = 'integrated science'
    and s.id <> canonical_id
    and not exists (select 1 from public.exam_results er where er.subject_id = s.id)
    and not exists (select 1 from public.class_subjects cs where cs.subject_id = s.id)
    and not exists (select 1 from public.teacher_assignments ta where ta.subject_id = s.id);
end $$;

-- Lower Primary must not use Integrated Science or Physical Education as a
-- marksheet learning area. Use the school's existing Creative Arts and CRE.
delete from public.class_subjects cs
using public.classes c, public.subjects s
where cs.class_id = c.id
  and cs.subject_id = s.id
  and c.status = 'ACTIVE'
  and c.code in ('G1','G2','G3')
  and upper(trim(s.code)) in ('SCI','PE');

insert into public.class_subjects (class_id, subject_id)
select c.id, s.id
from public.classes c
cross join public.subjects s
where c.status = 'ACTIVE'
  and c.code in ('G1','G2','G3')
  and s.status = 'ACTIVE'
  and upper(trim(s.code)) in ('ART','CRE')
on conflict do nothing;

commit;
