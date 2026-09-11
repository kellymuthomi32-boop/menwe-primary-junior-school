create table if not exists public.school_resources (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 description text,
 resource_type text not null check (resource_type in ('SCHEME_OF_WORK','LESSON_PLAN','RECORD_BOOK','TEACHER_NOTES','LEARNER_NOTES','REVISION_MATERIAL','PAST_PAPER','ASSIGNMENT','TEACHER_GUIDE','CURRICULUM_DESIGN','ANSWER_BOOK','OTHER')),
 audience text not null default 'TEACHERS' check (audience in ('TEACHERS','LEARNERS','BOTH')),
 subject_id uuid references public.subjects(id) on delete set null,
 class_id uuid references public.classes(id) on delete set null,
 uploaded_by_teacher_id uuid references public.teachers(id) on delete set null,
 file_path text not null unique,
 original_file_name text not null,
 mime_type text,
 file_size bigint,
 status text not null default 'PUBLISHED' check (status in ('DRAFT','PUBLISHED','ARCHIVED')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists school_resources_type_idx on public.school_resources(resource_type);
create index if not exists school_resources_audience_idx on public.school_resources(audience);
create index if not exists school_resources_subject_idx on public.school_resources(subject_id);
create index if not exists school_resources_class_idx on public.school_resources(class_id);
create index if not exists school_resources_uploader_idx on public.school_resources(uploaded_by_teacher_id);
alter table public.school_resources enable row level security;
create or replace function private.is_active_teacher() returns boolean language sql stable security definer set search_path = public, private as $$ select exists (select 1 from public.teachers t where t.profile_id = (select auth.uid()) and t.status = 'ACTIVE'); $$;
revoke all on function private.is_active_teacher() from public;
grant execute on function private.is_active_teacher() to authenticated;
insert into storage.buckets (id,name,public) values ('school-resources','school-resources',false) on conflict (id) do nothing;
create trigger school_resources_set_updated_at before update on public.school_resources for each row execute function public.set_updated_at();
grant select,insert,update on public.school_resources to authenticated;
