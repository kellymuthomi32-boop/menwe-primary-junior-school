-- Stock-changing RPCs perform explicit administrator/class-teacher checks before writing.
alter function public.library_checkout_book(uuid, uuid, timestamp with time zone, text) security definer;
alter function public.library_checkout_book(uuid, uuid, timestamp with time zone, text, date) security definer;
alter function public.library_return_book(uuid, numeric, text) security definer;
alter function public.library_mark_lost(uuid, text) security definer;
alter function public.library_receive_replacement(uuid, text) security definer;

alter function public.library_checkout_book(uuid, uuid, timestamp with time zone, text) set search_path = pg_catalog, public, private;
alter function public.library_checkout_book(uuid, uuid, timestamp with time zone, text, date) set search_path = pg_catalog, public, private;
alter function public.library_return_book(uuid, numeric, text) set search_path = pg_catalog, public, private;
alter function public.library_mark_lost(uuid, text) set search_path = pg_catalog, public, private;
alter function public.library_receive_replacement(uuid, text) set search_path = pg_catalog, public, private;

revoke all on function public.library_checkout_book(uuid, uuid, timestamp with time zone, text) from public, anon;
revoke all on function public.library_checkout_book(uuid, uuid, timestamp with time zone, text, date) from public, anon;
revoke all on function public.library_return_book(uuid, numeric, text) from public, anon;
revoke all on function public.library_mark_lost(uuid, text) from public, anon;
revoke all on function public.library_receive_replacement(uuid, text) from public, anon;
grant execute on function public.library_checkout_book(uuid, uuid, timestamp with time zone, text) to authenticated;
grant execute on function public.library_checkout_book(uuid, uuid, timestamp with time zone, text, date) to authenticated;
grant execute on function public.library_return_book(uuid, numeric, text) to authenticated;
grant execute on function public.library_mark_lost(uuid, text) to authenticated;
grant execute on function public.library_receive_replacement(uuid, text) to authenticated;

alter table public.library_loans drop constraint if exists library_loans_status_check;
alter table public.library_loans add constraint library_loans_status_check
check (status = any (array['ISSUED'::text, 'RETURNED'::text, 'OVERDUE'::text, 'LOST'::text, 'REPLACED'::text, 'DAMAGED'::text]));

create or replace function public.library_mark_damaged(p_loan_id uuid, p_notes text default null)
returns public.library_loans
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_loan public.library_loans;
  v_book public.library_books;
begin
  select * into v_loan
  from public.library_loans
  where id = p_loan_id
  for update;

  if v_loan.id is null then
    raise exception 'Loan not found';
  end if;
  if private.is_admin() is not true
     and private.is_library_class_teacher(v_loan.student_id) is not true then
    raise exception 'Only the learner''s class teacher or an administrator can manage this loan';
  end if;
  if v_loan.returned_at is not null
     or v_loan.status in ('RETURNED', 'LOST', 'REPLACED', 'DAMAGED') then
    raise exception 'Book already closed';
  end if;

  select * into v_book
  from public.library_books
  where id = v_loan.book_id
  for update;

  update public.library_loans
  set returned_at = now(),
      returned_by = auth.uid(),
      status = 'DAMAGED',
      notes = coalesce(p_notes, notes)
  where id = p_loan_id
  returning * into v_loan;

  update public.library_books
  set damaged_copies = coalesce(damaged_copies, 0) + 1,
      status = case when coalesce(available_copies, 0) > 0 then 'AVAILABLE' else 'UNAVAILABLE' end,
      updated_at = now()
  where id = v_book.id;

  return v_loan;
end;
$function$;

revoke all on function public.library_mark_damaged(uuid, text) from public, anon;
grant execute on function public.library_mark_damaged(uuid, text) to authenticated;