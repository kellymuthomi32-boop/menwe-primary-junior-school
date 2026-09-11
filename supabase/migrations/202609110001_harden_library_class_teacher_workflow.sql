create or replace function private.is_library_class_teacher(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = p_student_id
      and e.status = 'ACTIVE'
      and (
        c.class_teacher_id = private.current_teacher_id()
        or exists (
          select 1
          from public.teacher_class_roles tcr
          where tcr.class_id = c.id
            and tcr.teacher_id = private.current_teacher_id()
            and tcr.is_class_teacher = true
        )
      )
  );
$$;

revoke execute on function private.is_library_class_teacher(uuid) from public;
grant execute on function private.is_library_class_teacher(uuid) to authenticated;

create or replace function public.library_checkout_book(p_book_id uuid, p_student_id uuid, p_due_at timestamptz, p_notes text default null, p_issue_date date default current_date)
returns public.library_loans
language plpgsql
set search_path = 'public'
as $$
declare v_book public.library_books; v_loan public.library_loans;
begin
  if private.is_admin() is not true and private.is_library_class_teacher(p_student_id) is not true then raise exception 'Only the learner''s class teacher or an administrator can issue textbooks'; end if;
  select * into v_book from public.library_books where id=p_book_id for update;
  if v_book.id is null then raise exception 'Book not found'; end if;
  if coalesce(v_book.available_copies,0) < 1 or coalesce(v_book.status,'AVAILABLE') <> 'AVAILABLE' then raise exception 'No available copy'; end if;
  if exists (select 1 from public.library_loans where book_id=p_book_id and student_id=p_student_id and returned_at is null) then raise exception 'Student already has this book'; end if;
  if p_due_at::date < p_issue_date then raise exception 'Return date cannot be before issue date'; end if;
  insert into public.library_loans(book_id,student_id,issued_by,issued_at,due_at,issue_date,return_date,status,replacement_required,replacement_received,notes)
  values(p_book_id,p_student_id,auth.uid(),now(),p_due_at,p_issue_date,p_due_at::date,'ISSUED',false,false,p_notes)
  returning * into v_loan;
  update public.library_books set available_copies=greatest(0,available_copies-1),status=case when available_copies-1=0 then 'UNAVAILABLE' else 'AVAILABLE' end,updated_at=now() where id=p_book_id;
  return v_loan;
end;
$$;

create or replace function public.library_checkout_book(p_book_id uuid, p_student_id uuid, p_due_at timestamptz, p_notes text default null)
returns public.library_loans
language plpgsql
set search_path = 'public'
as $$
declare v_book public.library_books; v_loan public.library_loans;
begin
  if private.is_admin() is not true and private.is_library_class_teacher(p_student_id) is not true then raise exception 'Only the learner''s class teacher or an administrator can issue textbooks'; end if;
  select * into v_book from public.library_books where id=p_book_id for update;
  if v_book.id is null then raise exception 'Book not found'; end if;
  if coalesce(v_book.available_copies,0) < 1 or coalesce(v_book.status,'AVAILABLE') <> 'AVAILABLE' then raise exception 'No available copy'; end if;
  if exists (select 1 from public.library_loans where book_id=p_book_id and student_id=p_student_id and returned_at is null) then raise exception 'Student already has this book'; end if;
  insert into public.library_loans(book_id,student_id,issued_by,due_at,notes) values(p_book_id,p_student_id,auth.uid(),p_due_at,p_notes) returning * into v_loan;
  update public.library_books set available_copies=greatest(0,available_copies-1),status=case when available_copies-1=0 then 'UNAVAILABLE' else 'AVAILABLE' end,updated_at=now() where id=p_book_id;
  return v_loan;
end;
$$;

drop policy if exists "library loans managed by staff" on public.library_loans;
create policy "library loans managed by authorised staff" on public.library_loans
for all to authenticated
using ((select private.is_admin()) or (select private.is_library_class_teacher(student_id)))
with check ((select private.is_admin()) or (select private.is_library_class_teacher(student_id)));

drop policy if exists "library loans visible to borrower or staff" on public.library_loans;
create policy "library loans visible to borrower or authorised staff" on public.library_loans
for select to authenticated
using (
  exists (select 1 from public.students s where s.id=library_loans.student_id and s.profile_id=(select auth.uid()))
  or exists (select 1 from public.student_parents sp join public.parents pa on pa.id=sp.parent_id where sp.student_id=library_loans.student_id and pa.profile_id=(select auth.uid()))
  or (select private.is_admin())
  or (select private.is_library_class_teacher(student_id))
);

drop policy if exists "library_replacements_staff" on public.library_replacement_records;
create policy "library replacements readable by staff" on public.library_replacement_records
for select to authenticated
using ((select private.is_admin()) or (select private.is_library_class_teacher(learner_id)));
create policy "library replacements managed by administrators" on public.library_replacement_records
for insert to authenticated
with check ((select private.is_admin()));
create policy "library replacements updated by administrators" on public.library_replacement_records
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy "library replacements deleted by administrators" on public.library_replacement_records
for delete to authenticated
using ((select private.is_admin()));

create index if not exists idx_enrollments_active_student_class on public.enrollments(student_id,class_id) where status='ACTIVE';
create index if not exists idx_teacher_class_roles_class_teacher on public.teacher_class_roles(class_id,teacher_id) where is_class_teacher=true;
