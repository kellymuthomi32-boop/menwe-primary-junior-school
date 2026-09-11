create or replace function public.library_return_book(p_loan_id uuid, p_fine_amount numeric default 0, p_notes text default null)
returns public.library_loans
language plpgsql
set search_path = 'public'
as $$
declare v_loan public.library_loans;
begin
  select * into v_loan from public.library_loans where id=p_loan_id for update;
  if v_loan.id is null then raise exception 'Loan not found'; end if;
  if private.is_admin() is not true and private.is_library_class_teacher(v_loan.student_id) is not true then raise exception 'Only the learner''s class teacher or an administrator can manage this loan'; end if;
  if v_loan.returned_at is not null then raise exception 'Book already returned'; end if;
  update public.library_loans set returned_at=now(),returned_by=auth.uid(),fine_amount=greatest(0,coalesce(p_fine_amount,0)),status='RETURNED',notes=coalesce(p_notes,notes) where id=p_loan_id returning * into v_loan;
  update public.library_books set available_copies=least(total_copies,available_copies+1),status='AVAILABLE',updated_at=now() where id=v_loan.book_id;
  return v_loan;
end;
$$;

create or replace function public.library_mark_lost(p_loan_id uuid, p_notes text default null)
returns public.library_loans
language plpgsql
set search_path = 'public'
as $$
declare v_loan public.library_loans; v_book public.library_books;
begin
  select * into v_loan from public.library_loans where id=p_loan_id for update;
  if v_loan.id is null then raise exception 'Loan not found'; end if;
  if private.is_admin() is not true and private.is_library_class_teacher(v_loan.student_id) is not true then raise exception 'Only the learner''s class teacher or an administrator can manage this loan'; end if;
  if v_loan.returned_at is not null then raise exception 'Book already closed'; end if;
  select * into v_book from public.library_books where id=v_loan.book_id for update;
  update public.library_loans set returned_at=now(),returned_by=auth.uid(),lost_at=now(),status='LOST',replacement_required=true,replacement_received=false,notes=coalesce(p_notes,notes) where id=p_loan_id returning * into v_loan;
  update public.library_books set lost_copies=coalesce(lost_copies,0)+1,updated_at=now() where id=v_book.id;
  insert into public.library_replacement_records(loan_id,book_id,learner_id,replacement_type,expected_cost,notes)
  select v_loan.id,v_loan.book_id,v_loan.student_id,'BUY_NEW',coalesce(v_book.replacement_cost,0),coalesce(p_notes,'Lost textbook; new replacement required.')
  where not exists (select 1 from public.library_replacement_records where loan_id=v_loan.id and resolved_at is null);
  return v_loan;
end;
$$;

drop policy if exists "library loans managed by authorised staff" on public.library_loans;
create policy "library loans managed by authorised staff" on public.library_loans
for all to authenticated
using ((select private.is_admin()) or (select private.is_library_class_teacher(student_id)))
with check ((select private.is_admin()) or (select private.is_library_class_teacher(student_id)));
