-- Menwe Primary & Junior School: production data foundation.
-- This migration intentionally contains no student, staff, fee, payment, or other production data.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

create type public.app_role as enum ('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT');
create type public.record_status as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
create type public.student_status as enum ('ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN');
create type public.publication_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
create type public.admission_status as enum ('PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED');
create type public.attendance_status as enum ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
create type public.invoice_status as enum ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');
create type public.payment_status as enum ('PENDING', 'VERIFIED', 'FAILED', 'REVERSED');
create type public.payment_environment as enum ('SANDBOX', 'PRODUCTION');
create type public.message_status as enum ('OPEN', 'CLOSED', 'ARCHIVED');

create table public.roles (
  code public.app_role primary key,
  label text not null,
  description text not null,
  created_at timestamptz not null default now()
);

insert into public.roles (code, label, description) values
  ('SUPER_ADMIN', 'Super Administrator', 'Owns the platform and can manage all school records.'),
  ('ADMIN', 'Administrator', 'Manages authorised school records and public content.'),
  ('TEACHER', 'Teacher', 'Accesses assigned classes, subjects, learners, and teaching workflows.'),
  ('STUDENT', 'Student', 'Accesses only personal academic and school information.'),
  ('PARENT', 'Parent or Guardian', 'Accesses only information for linked children.');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role public.app_role not null default 'STUDENT' references public.roles(code),
  status public.record_status not null default 'ACTIVE',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_pages (
  slug text primary key,
  title text not null,
  headline text,
  body jsonb not null default '{}'::jsonb,
  status public.publication_status not null default 'DRAFT',
  seo_description text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  storage_key text not null unique,
  public_url text not null,
  filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0 and byte_size <= 10485760),
  purpose text not null,
  created_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

create unique index academic_years_one_current on public.academic_years (is_current) where is_current;

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, name),
  check (ends_on > starts_on)
);

create unique index terms_one_current on public.terms (is_current) where is_current;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  employee_number text not null unique,
  first_name text not null,
  middle_name text,
  last_name text not null,
  phone text,
  email text,
  employment_date date,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  address text,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  code text not null,
  name text not null,
  level text not null,
  class_teacher_id uuid references public.teachers(id) on delete set null,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, code)
);

create table public.streams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name)
);

create table public.class_subjects (
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (class_id, subject_id)
);

create table public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (teacher_id, class_id, subject_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  admission_number text not null unique,
  first_name text not null,
  middle_name text,
  last_name text not null,
  date_of_birth date,
  gender text,
  phone text,
  email text,
  address text,
  admission_date date,
  profile_photo_file_id uuid references public.uploaded_files(id) on delete set null,
  status public.student_status not null default 'ACTIVE',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_parents (
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  relationship text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (student_id, parent_id)
);

create unique index student_parents_primary_guardian on public.student_parents (student_id) where is_primary;

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  stream_id uuid references public.streams(id) on delete set null,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  enrolled_on date not null default current_date,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  session_date date not null,
  taken_by uuid not null references public.teachers(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, session_date)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status public.attendance_status not null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  name text not null,
  exam_type text,
  starts_on date,
  ends_on date,
  status public.publication_status not null default 'DRAFT',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  unique (term_id, class_id, name)
);

create table public.grading_rules (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  min_score numeric(6,2) not null check (min_score >= 0),
  max_score numeric(6,2) not null check (max_score >= min_score),
  grade text not null,
  remark text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, grade)
);

create table public.exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  score numeric(6,2) not null check (score >= 0),
  maximum_score numeric(6,2) not null check (maximum_score > 0),
  grade text,
  teacher_comment text,
  entered_by uuid references public.teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id, subject_id),
  check (score <= maximum_score)
);

create table public.report_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  term_id uuid not null references public.terms(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  attendance_percentage numeric(5,2),
  average_score numeric(6,2),
  teacher_remark text,
  headteacher_remark text,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, term_id)
);

create table public.report_card_items (
  id uuid primary key default gen_random_uuid(),
  report_card_id uuid not null references public.report_cards(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  score numeric(6,2),
  maximum_score numeric(6,2),
  grade text,
  created_at timestamptz not null default now(),
  unique (report_card_id, subject_id)
);

create table public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  term_id uuid references public.terms(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  name text not null,
  status public.record_status not null default 'ACTIVE',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fee_structure_items (
  id uuid primary key default gen_random_uuid(),
  fee_structure_id uuid not null references public.fee_structures(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  term_id uuid references public.terms(id) on delete set null,
  invoice_number text not null unique,
  issued_on date not null default current_date,
  due_on date,
  status public.invoice_status not null default 'DRAFT',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on is null or due_on >= issued_on)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  fee_structure_item_id uuid references public.fee_structure_items(id) on delete set null,
  label text not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null,
  provider text,
  environment public.payment_environment not null default 'SANDBOX',
  transaction_reference text not null unique,
  provider_reference text unique,
  status public.payment_status not null default 'PENDING',
  paid_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_type text not null,
  provider_reference text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  verified_by_system boolean not null default false
);

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  stream_id uuid references public.streams(id) on delete set null,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid references public.teachers(id) on delete set null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  title text not null,
  instructions text not null,
  due_at timestamptz,
  attachment_file_id uuid references public.uploaded_files(id) on delete set null,
  status public.publication_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  content text,
  attachment_file_id uuid references public.uploaded_files(id) on delete set null,
  submitted_at timestamptz not null default now(),
  marked_at timestamptz,
  mark numeric(6,2),
  feedback text,
  marked_by uuid references public.teachers(id) on delete set null,
  unique (homework_id, student_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_roles public.app_role[] not null default '{}'::public.app_role[],
  target_class_id uuid references public.classes(id) on delete set null,
  status public.publication_status not null default 'DRAFT',
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  body text not null,
  category text,
  featured_image_file_id uuid references public.uploaded_files(id) on delete set null,
  is_featured boolean not null default false,
  status public.publication_status not null default 'DRAFT',
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  image_file_id uuid references public.uploaded_files(id) on delete set null,
  status public.publication_status not null default 'DRAFT',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.publication_status not null default 'DRAFT',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums(id) on delete cascade,
  file_id uuid not null references public.uploaded_files(id) on delete restrict,
  caption text,
  sort_order integer not null default 0,
  status public.publication_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (album_id, file_id)
);

create table public.admission_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  student_first_name text not null,
  student_last_name text not null,
  date_of_birth date,
  gender text,
  current_school text,
  grade_applying_for text not null,
  guardian_name text not null,
  guardian_phone text not null,
  guardian_email text,
  guardian_relationship text,
  address text,
  additional_information text,
  supporting_file_id uuid references public.uploaded_files(id) on delete set null,
  status public.admission_status not null default 'PENDING',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  subject text,
  message text not null,
  status public.record_status not null default 'ACTIVE',
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  subject text,
  status public.message_status not null default 'OPEN',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.thread_participants (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (thread_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  attachment_file_id uuid references public.uploaded_files(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_status_idx on public.profiles (role, status);
create index students_name_idx on public.students (last_name, first_name);
create index students_status_idx on public.students (status) where deleted_at is null;
create index enrollments_class_status_idx on public.enrollments (class_id, status);
create index attendance_sessions_class_date_idx on public.attendance_sessions (class_id, session_date desc);
create index attendance_records_student_idx on public.attendance_records (student_id);
create index exam_results_student_idx on public.exam_results (student_id, exam_id);
create index invoices_student_status_idx on public.invoices (student_id, status);
create index payments_invoice_status_idx on public.payments (invoice_id, status);
create index homework_class_due_idx on public.homework (class_id, due_at desc);
create index notifications_profile_unread_idx on public.notifications (profile_id, read_at) where read_at is null;
create index message_participants_profile_idx on public.thread_participants (profile_id, thread_id);
create index messages_thread_created_idx on public.messages (thread_id, created_at);
create index admissions_status_created_idx on public.admission_applications (status, created_at desc);
create index news_published_idx on public.news_articles (status, published_at desc);
create index events_published_start_idx on public.events (status, starts_at);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function private.has_role(variadic permitted_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'ACTIVE' and p.role = any(permitted_roles)
  );
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.has_role('SUPER_ADMIN'::public.app_role, 'ADMIN'::public.app_role);
$$;

create or replace function private.current_teacher_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select t.id from public.teachers t where t.profile_id = auth.uid() and t.status = 'ACTIVE' limit 1;
$$;

create or replace function private.current_parent_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select p.id from public.parents p where p.profile_id = auth.uid() and p.status = 'ACTIVE' limit 1;
$$;

create or replace function private.can_access_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin()
    or exists (select 1 from public.classes c where c.id = p_class_id and c.class_teacher_id = private.current_teacher_id())
    or exists (select 1 from public.teacher_subjects ts where ts.class_id = p_class_id and ts.teacher_id = private.current_teacher_id())
    or exists (select 1 from public.enrollments e join public.students s on s.id = e.student_id where e.class_id = p_class_id and s.profile_id = auth.uid() and e.status = 'ACTIVE')
    or exists (select 1 from public.enrollments e join public.student_parents sp on sp.student_id = e.student_id join public.parents p on p.id = sp.parent_id where e.class_id = p_class_id and p.profile_id = auth.uid() and e.status = 'ACTIVE');
$$;

create or replace function private.can_access_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin()
    or exists (select 1 from public.students s where s.id = p_student_id and s.profile_id = auth.uid())
    or exists (select 1 from public.student_parents sp join public.parents p on p.id = sp.parent_id where sp.student_id = p_student_id and p.profile_id = auth.uid())
    or exists (select 1 from public.enrollments e where e.student_id = p_student_id and e.status = 'ACTIVE' and private.can_access_class(e.class_id));
$$;

create or replace function private.can_teach_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin()
    or exists (select 1 from public.classes c where c.id = p_class_id and c.class_teacher_id = private.current_teacher_id())
    or exists (select 1 from public.teacher_subjects ts where ts.class_id = p_class_id and ts.teacher_id = private.current_teacher_id());
$$;

create or replace function private.can_teach_exam_subject(p_exam_id uuid, p_subject_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin() or exists (
    select 1 from public.exams e join public.teacher_subjects ts on ts.class_id = e.class_id
    where e.id = p_exam_id and ts.subject_id = p_subject_id and ts.teacher_id = private.current_teacher_id()
  );
$$;

create or replace function private.can_access_thread(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin() or exists (
    select 1 from public.thread_participants tp where tp.thread_id = p_thread_id and tp.profile_id = auth.uid()
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.has_role(public.app_role[]) to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.current_teacher_id() to authenticated;
grant execute on function private.current_parent_id() to authenticated;
grant execute on function private.can_access_class(uuid) to authenticated;
grant execute on function private.can_access_student(uuid) to authenticated;
grant execute on function private.can_teach_class(uuid) to authenticated;
grant execute on function private.can_teach_exam_subject(uuid, uuid) to authenticated;
grant execute on function private.can_access_thread(uuid) to authenticated;
revoke all on function public.handle_new_auth_user() from public;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare target_id text;
begin
  target_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), tg_op, tg_table_name, target_id, jsonb_build_object('operation', tg_op));
  return coalesce(new, old);
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','school_settings','content_pages','academic_years','terms','subjects','teachers','parents','classes','streams',
    'students','enrollments','attendance_sessions','attendance_records','exams','exam_results','grading_rules','report_cards',
    'fee_structures','invoices','invoice_items','payments','timetable_entries','homework','announcements','news_articles','events',
    'gallery_albums','gallery_images','admission_applications','contact_submissions','message_threads','messages'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end;
$$;

create trigger students_audit after insert or update or delete on public.students for each row execute procedure public.audit_row_change();
create trigger attendance_audit after insert or update or delete on public.attendance_records for each row execute procedure public.audit_row_change();
create trigger exam_results_audit after insert or update or delete on public.exam_results for each row execute procedure public.audit_row_change();
create trigger invoices_audit after insert or update or delete on public.invoices for each row execute procedure public.audit_row_change();
create trigger payments_audit after insert or update or delete on public.payments for each row execute procedure public.audit_row_change();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'roles','profiles','school_settings','content_pages','uploaded_files','academic_years','terms','subjects','teachers','parents',
    'classes','streams','class_subjects','teacher_subjects','students','student_parents','enrollments','attendance_sessions','attendance_records',
    'exams','grading_rules','exam_results','report_cards','report_card_items','fee_structures','fee_structure_items','invoices','invoice_items',
    'payments','payment_events','timetable_entries','homework','homework_submissions','announcements','news_articles','events','gallery_albums',
    'gallery_images','admission_applications','contact_submissions','notifications','message_threads','thread_participants','messages','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.content_pages, public.news_articles, public.events, public.gallery_albums, public.gallery_images, public.school_settings to anon;
grant insert on public.admission_applications, public.contact_submissions to anon;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or private.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or private.is_admin()) with check (id = auth.uid() or private.is_admin());
create policy roles_select on public.roles for select to authenticated using (true);

create policy settings_public_read on public.school_settings for select to anon, authenticated using (is_public or private.is_admin());
create policy settings_admin_manage on public.school_settings for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy pages_public_read on public.content_pages for select to anon, authenticated using (status = 'PUBLISHED' or private.is_admin());
create policy pages_admin_manage on public.content_pages for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy files_owner_read on public.uploaded_files for select to authenticated using (owner_id = auth.uid() or private.is_admin());
create policy files_owner_create on public.uploaded_files for insert to authenticated with check (owner_id = auth.uid() or private.is_admin());
create policy files_owner_update on public.uploaded_files for update to authenticated using (owner_id = auth.uid() or private.is_admin()) with check (owner_id = auth.uid() or private.is_admin());

create policy years_auth_read on public.academic_years for select to authenticated using (true);
create policy years_admin_manage on public.academic_years for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy terms_auth_read on public.terms for select to authenticated using (true);
create policy terms_admin_manage on public.terms for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy subjects_auth_read on public.subjects for select to authenticated using (true);
create policy subjects_admin_manage on public.subjects for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy classes_auth_read on public.classes for select to authenticated using (true);
create policy classes_admin_manage on public.classes for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy streams_auth_read on public.streams for select to authenticated using (true);
create policy streams_admin_manage on public.streams for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy class_subjects_auth_read on public.class_subjects for select to authenticated using (true);
create policy class_subjects_admin_manage on public.class_subjects for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy teacher_subjects_read on public.teacher_subjects for select to authenticated using (teacher_id = private.current_teacher_id() or private.is_admin());
create policy teacher_subjects_admin_manage on public.teacher_subjects for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy teachers_read on public.teachers for select to authenticated using (profile_id = auth.uid() or private.is_admin());
create policy teachers_admin_manage on public.teachers for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy parents_read on public.parents for select to authenticated using (profile_id = auth.uid() or private.is_admin());
create policy parents_admin_manage on public.parents for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy students_read on public.students for select to authenticated using (private.can_access_student(id));
create policy students_admin_manage on public.students for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy student_parents_read on public.student_parents for select to authenticated using (private.can_access_student(student_id) or parent_id = private.current_parent_id());
create policy student_parents_admin_manage on public.student_parents for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy enrollments_read on public.enrollments for select to authenticated using (private.can_access_student(student_id));
create policy enrollments_admin_manage on public.enrollments for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy attendance_sessions_read on public.attendance_sessions for select to authenticated using (private.can_access_class(class_id));
create policy attendance_sessions_manage on public.attendance_sessions for all to authenticated using (private.can_teach_class(class_id)) with check (private.can_teach_class(class_id) and taken_by = private.current_teacher_id());
create policy attendance_records_read on public.attendance_records for select to authenticated using (private.can_access_student(student_id));
create policy attendance_records_manage on public.attendance_records for all to authenticated using (private.is_admin() or exists (select 1 from public.attendance_sessions s where s.id = session_id and private.can_teach_class(s.class_id))) with check (private.is_admin() or exists (select 1 from public.attendance_sessions s where s.id = session_id and private.can_teach_class(s.class_id)));

create policy exams_read on public.exams for select to authenticated using (private.can_access_class(class_id));
create policy exams_admin_manage on public.exams for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy grading_rules_read on public.grading_rules for select to authenticated using (true);
create policy grading_rules_admin_manage on public.grading_rules for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy results_read on public.exam_results for select to authenticated using (private.can_access_student(student_id));
create policy results_teacher_manage on public.exam_results for all to authenticated using (private.can_teach_exam_subject(exam_id, subject_id)) with check (private.can_teach_exam_subject(exam_id, subject_id));
create policy report_cards_read on public.report_cards for select to authenticated using (private.can_access_student(student_id));
create policy report_cards_admin_manage on public.report_cards for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy report_items_read on public.report_card_items for select to authenticated using (exists (select 1 from public.report_cards rc where rc.id = report_card_id and private.can_access_student(rc.student_id)));
create policy report_items_admin_manage on public.report_card_items for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy fee_structures_admin_read on public.fee_structures for select to authenticated using (private.is_admin());
create policy fee_structures_admin_manage on public.fee_structures for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy fee_items_admin_read on public.fee_structure_items for select to authenticated using (private.is_admin());
create policy fee_items_admin_manage on public.fee_structure_items for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy invoices_read on public.invoices for select to authenticated using (private.can_access_student(student_id));
create policy invoices_admin_manage on public.invoices for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy invoice_items_read on public.invoice_items for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and private.can_access_student(i.student_id)));
create policy invoice_items_admin_manage on public.invoice_items for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy payments_read on public.payments for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and private.can_access_student(i.student_id)));
create policy payments_create_pending on public.payments for insert to authenticated with check (status = 'PENDING' and exists (select 1 from public.invoices i where i.id = invoice_id and private.can_access_student(i.student_id)));
create policy payments_admin_manage on public.payments for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy payment_events_admin_read on public.payment_events for select to authenticated using (private.is_admin());

create policy timetable_read on public.timetable_entries for select to authenticated using (private.can_access_class(class_id));
create policy timetable_admin_manage on public.timetable_entries for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy homework_read on public.homework for select to authenticated using (private.can_access_class(class_id));
create policy homework_manage on public.homework for all to authenticated using (teacher_id = private.current_teacher_id() or private.is_admin()) with check ((teacher_id = private.current_teacher_id() and private.can_teach_class(class_id)) or private.is_admin());
create policy homework_submissions_read on public.homework_submissions for select to authenticated using (private.can_access_student(student_id) or exists (select 1 from public.homework h where h.id = homework_id and h.teacher_id = private.current_teacher_id()));
create policy homework_submissions_create on public.homework_submissions for insert to authenticated with check (exists (select 1 from public.students s where s.id = student_id and s.profile_id = auth.uid()));
create policy homework_submissions_mark on public.homework_submissions for update to authenticated using (exists (select 1 from public.homework h where h.id = homework_id and h.teacher_id = private.current_teacher_id()) or private.is_admin()) with check (exists (select 1 from public.homework h where h.id = homework_id and h.teacher_id = private.current_teacher_id()) or private.is_admin());

create policy announcements_read on public.announcements for select to authenticated using (private.is_admin() or (status = 'PUBLISHED' and (cardinality(target_roles) = 0 or private.has_role(variadic target_roles)) and (target_class_id is null or private.can_access_class(target_class_id))));
create policy announcements_admin_manage on public.announcements for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy news_public_read on public.news_articles for select to anon, authenticated using (status = 'PUBLISHED' or private.is_admin());
create policy news_admin_manage on public.news_articles for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy events_public_read on public.events for select to anon, authenticated using (status = 'PUBLISHED' or private.is_admin());
create policy events_admin_manage on public.events for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy albums_public_read on public.gallery_albums for select to anon, authenticated using (status = 'PUBLISHED' or private.is_admin());
create policy albums_admin_manage on public.gallery_albums for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy gallery_public_read on public.gallery_images for select to anon, authenticated using (status = 'PUBLISHED' and exists (select 1 from public.gallery_albums a where a.id = album_id and a.status = 'PUBLISHED') or private.is_admin());
create policy gallery_admin_manage on public.gallery_images for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admissions_public_submit on public.admission_applications for insert to anon, authenticated with check (status = 'PENDING');
create policy admissions_admin_manage on public.admission_applications for select to authenticated using (private.is_admin());
create policy admissions_admin_update on public.admission_applications for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy contact_public_submit on public.contact_submissions for insert to anon, authenticated with check (status = 'ACTIVE');
create policy contacts_admin_manage on public.contact_submissions for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy notifications_self_read on public.notifications for select to authenticated using (profile_id = auth.uid());
create policy notifications_self_update on public.notifications for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy notifications_admin_manage on public.notifications for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy threads_read on public.message_threads for select to authenticated using (private.can_access_thread(id));
create policy threads_create on public.message_threads for insert to authenticated with check (created_by = auth.uid());
create policy threads_update on public.message_threads for update to authenticated using (private.can_access_thread(id)) with check (private.can_access_thread(id));
create policy participants_read on public.thread_participants for select to authenticated using (private.can_access_thread(thread_id));
create policy participants_create on public.thread_participants for insert to authenticated with check (profile_id = auth.uid() or private.is_admin());
create policy messages_read on public.messages for select to authenticated using (private.can_access_thread(thread_id));
create policy messages_create on public.messages for insert to authenticated with check (sender_id = auth.uid() and private.can_access_thread(thread_id));
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (private.is_admin());

comment on table public.payments is 'Payment records start PENDING. Mobile-money and other provider payments must be marked VERIFIED only by a verified server-side provider callback or an authorised administrator.';
comment on table public.profiles is 'Role assignment is controlled by an authorised owner through Supabase Dashboard or a secured future admin workflow; no production Super Admin credential is hard-coded.';
