create table if not exists public.teacher_library_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null default 'OTHER' check (item_type in ('COURSE_BOOK','TEACHER_GUIDE','CURRICULUM_DESIGN','SCHEMES_OF_WORK','ANSWER_BOOK','RECORD_BOOK','TEACHER_REFERENCE','ASSESSMENT_MATERIAL','MANUAL','OTHER')),
  title text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  accession_number text,
  serial_number text,
  total_copies integer not null default 1 check (total_copies >= 0),
  available_copies integer not null default 1 check (available_copies >= 0),
  condition text not null default 'GOOD' check (condition in ('NEW','GOOD','FAIR','DAMAGED','LOST')),
  location text,
  replacement_cost numeric default 0 check (replacement_cost >= 0),
  notes text,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','UNAVAILABLE','REPAIR','RETIRED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(accession_number)
);

create table if not exists public.teacher_library_loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.teacher_library_items(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  issued_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  returned_at timestamptz,
  returned_by uuid references auth.users(id) on delete set null,
  status text not null default 'ISSUED' check (status in ('ISSUED','RETURNED','LOST','DAMAGED')),
  notes text
);

create index if not exists idx_teacher_library_loans_teacher on public.teacher_library_loans(teacher_id,status);
create index if not exists idx_teacher_library_loans_item on public.teacher_library_loans(item_id,status);

create or replace function public.teacher_library_issue(p_item_id uuid,p_teacher_id uuid,p_due_at timestamptz default null,p_notes text default null)
returns public.teacher_library_loans language plpgsql security definer set search_path='public' as $$
declare v_item public.teacher_library_items; v_loan public.teacher_library_loans;
begin
  if private.is_admin() is not true then raise exception 'Only administrators can issue teacher resources'; end if;
  select * into v_item from public.teacher_library_items where id=p_item_id for update;
  if v_item.id is null then raise exception 'Resource not found'; end if;
  if v_item.available_copies < 1 or v_item.status <> 'AVAILABLE' then raise exception 'No available copy'; end if;
  if exists(select 1 from public.teacher_library_loans where item_id=p_item_id and teacher_id=p_teacher_id and returned_at is null) then raise exception 'Teacher already has this resource'; end if;
  insert into public.teacher_library_loans(item_id,teacher_id,issued_by,due_at,notes) values(p_item_id,p_teacher_id,auth.uid(),p_due_at,p_notes) returning * into v_loan;
  update public.teacher_library_items set available_copies=available_copies-1,status=case when available_copies-1=0 then 'UNAVAILABLE' else 'AVAILABLE' end,updated_at=now() where id=p_item_id;
  return v_loan;
end; $$;

create or replace function public.teacher_library_return(p_loan_id uuid,p_notes text default null)
returns public.teacher_library_loans language plpgsql security definer set search_path='public' as $$
declare v_loan public.teacher_library_loans;
begin
  if private.is_admin() is not true then raise exception 'Only administrators can receive teacher resources'; end if;
  select * into v_loan from public.teacher_library_loans where id=p_loan_id for update;
  if v_loan.id is null then raise exception 'Loan not found'; end if;
  if v_loan.returned_at is not null then raise exception 'Resource already returned'; end if;
  update public.teacher_library_loans set returned_at=now(),returned_by=auth.uid(),status='RETURNED',notes=coalesce(p_notes,notes) where id=p_loan_id returning * into v_loan;
  update public.teacher_library_items set available_copies=least(total_copies,available_copies+1),status='AVAILABLE',updated_at=now() where id=v_loan.item_id;
  return v_loan;
end; $$;

revoke all on function public.teacher_library_issue(uuid,uuid,timestamptz,text) from public;
revoke all on function public.teacher_library_return(uuid,text) from public;
grant execute on function public.teacher_library_issue(uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.teacher_library_return(uuid,text) to authenticated;

alter table public.teacher_library_items enable row level security;
alter table public.teacher_library_loans enable row level security;

create policy teacher_library_items_admin on public.teacher_library_items for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy teacher_library_items_teacher_read on public.teacher_library_items for select to authenticated using (exists(select 1 from public.teacher_library_loans l join public.teachers t on t.id=l.teacher_id where l.item_id=teacher_library_items.id and t.profile_id=(select auth.uid())) or (select private.is_admin()));
create policy teacher_library_loans_admin on public.teacher_library_loans for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy teacher_library_loans_teacher_read on public.teacher_library_loans for select to authenticated using (exists(select 1 from public.teachers t where t.id=teacher_library_loans.teacher_id and t.profile_id=(select auth.uid())) or (select private.is_admin()));
