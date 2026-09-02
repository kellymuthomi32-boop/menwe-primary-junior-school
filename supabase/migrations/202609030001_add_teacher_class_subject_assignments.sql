create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, class_id, subject_id)
);
create index if not exists teacher_assignments_teacher_idx on public.teacher_assignments(teacher_id);
create index if not exists teacher_assignments_class_idx on public.teacher_assignments(class_id);
create index if not exists teacher_assignments_subject_idx on public.teacher_assignments(subject_id);
alter table public.teacher_assignments enable row level security;
drop policy if exists "teachers can view own assignments" on public.teacher_assignments;
drop policy if exists "admins can manage teacher assignments" on public.teacher_assignments;
create policy "teachers can view own assignments" on public.teacher_assignments for select to authenticated using (exists (select 1 from public.teachers t where t.id = teacher_assignments.teacher_id and t.profile_id = (select auth.uid())));
create policy "admins can manage teacher assignments" on public.teacher_assignments for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('SUPER_ADMIN','ADMIN'))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('SUPER_ADMIN','ADMIN')));
