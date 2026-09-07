create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 160),
  description text,
  material_type text not null default 'LINK' check (material_type in ('LINK','VIDEO','PDF','DOCUMENT','NOTES','OTHER')),
  resource_url text not null check (resource_url ~* '^https?://'),
  class_id uuid references public.classes(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  status public.publication_status not null default 'PUBLISHED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_materials_class_idx on public.learning_materials(class_id);
create index if not exists learning_materials_subject_idx on public.learning_materials(subject_id);
create index if not exists learning_materials_status_idx on public.learning_materials(status);

alter table public.learning_materials enable row level security;

create policy "learning materials admins manage"
on public.learning_materials for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "teachers manage assigned learning materials"
on public.learning_materials for all to authenticated
using (
  teacher_id = private.current_teacher_id()
  and exists (
    select 1 from public.teacher_assignments ta
    where ta.teacher_id = private.current_teacher_id()
      and (ta.class_id = learning_materials.class_id or learning_materials.class_id is null)
      and (ta.subject_id = learning_materials.subject_id or learning_materials.subject_id is null)
  )
)
with check (
  teacher_id = private.current_teacher_id()
  and exists (
    select 1 from public.teacher_assignments ta
    where ta.teacher_id = private.current_teacher_id()
      and (ta.class_id = learning_materials.class_id or learning_materials.class_id is null)
      and (ta.subject_id = learning_materials.subject_id or learning_materials.subject_id is null)
  )
);

create policy "students read assigned published learning materials"
on public.learning_materials for select to authenticated
using (
  status = 'PUBLISHED'
  and exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id and e.status = 'ACTIVE'
    where s.profile_id = auth.uid()
      and (learning_materials.class_id = e.class_id or learning_materials.class_id is null)
  )
);

create policy "parents read children published learning materials"
on public.learning_materials for select to authenticated
using (
  status = 'PUBLISHED'
  and exists (
    select 1
    from public.student_parents sp
    join public.students s on s.id = sp.student_id
    join public.enrollments e on e.student_id = s.id and e.status = 'ACTIVE'
    join public.parents p on p.id = sp.parent_id
    where p.profile_id = auth.uid()
      and (learning_materials.class_id = e.class_id or learning_materials.class_id is null)
  )
);
