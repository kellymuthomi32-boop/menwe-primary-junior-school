create or replace function public.create_fee_structure_with_items(
  p_academic_year_id uuid,
  p_term_id uuid,
  p_class_id uuid,
  p_name text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  fee_structure_id uuid;
  provided_item_count integer;
  inserted_item_count integer;
begin
  if not private.is_admin() then
    raise exception 'Only school administrators can create fee structures' using errcode = '42501';
  end if;
  if nullif(trim(p_name), '') is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A fee structure name and at least one fee item are required' using errcode = '22023';
  end if;
  if p_term_id is not null and not exists (select 1 from public.terms where id = p_term_id and academic_year_id = p_academic_year_id) then
    raise exception 'The selected term does not belong to the selected academic year' using errcode = '22023';
  end if;
  if p_class_id is not null and not exists (select 1 from public.classes where id = p_class_id and academic_year_id = p_academic_year_id) then
    raise exception 'The selected class does not belong to the selected academic year' using errcode = '22023';
  end if;

  insert into public.fee_structures (academic_year_id, term_id, class_id, name, status, created_by)
  values (p_academic_year_id, p_term_id, p_class_id, trim(p_name), 'ACTIVE', (select auth.uid()))
  returning id into fee_structure_id;

  select count(*) into provided_item_count from jsonb_to_recordset(p_items) as item(label text, amount numeric);
  insert into public.fee_structure_items (fee_structure_id, label, amount)
  select fee_structure_id, trim(item.label), item.amount
  from jsonb_to_recordset(p_items) as item(label text, amount numeric)
  where nullif(trim(item.label), '') is not null and item.amount >= 0;
  get diagnostics inserted_item_count = row_count;
  if inserted_item_count <> provided_item_count then
    raise exception 'Every fee item must have a label and a non-negative amount' using errcode = '22023';
  end if;
  return fee_structure_id;
end;
$$;

create or replace function public.create_invoice_with_items(
  p_student_id uuid,
  p_academic_year_id uuid,
  p_term_id uuid,
  p_invoice_number text,
  p_issued_on date,
  p_due_on date,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  invoice_id uuid;
  provided_item_count integer;
  inserted_item_count integer;
begin
  if not private.is_admin() then
    raise exception 'Only school administrators can create invoices' using errcode = '42501';
  end if;
  if nullif(trim(p_invoice_number), '') is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An invoice number and at least one invoice item are required' using errcode = '22023';
  end if;
  if p_due_on is not null and p_due_on < coalesce(p_issued_on, current_date) then
    raise exception 'The due date cannot be before the issue date' using errcode = '22023';
  end if;
  if p_term_id is not null and not exists (select 1 from public.terms where id = p_term_id and academic_year_id = p_academic_year_id) then
    raise exception 'The selected term does not belong to the selected academic year' using errcode = '22023';
  end if;

  insert into public.invoices (student_id, academic_year_id, term_id, invoice_number, issued_on, due_on, status, notes, created_by)
  values (p_student_id, p_academic_year_id, p_term_id, trim(p_invoice_number), coalesce(p_issued_on, current_date), p_due_on, 'ISSUED', nullif(trim(coalesce(p_notes, '')), ''), (select auth.uid()))
  returning id into invoice_id;

  select count(*) into provided_item_count from jsonb_to_recordset(p_items) as item(fee_structure_item_id uuid, label text, amount numeric);
  insert into public.invoice_items (invoice_id, fee_structure_item_id, label, amount)
  select invoice_id, item.fee_structure_item_id, trim(item.label), item.amount
  from jsonb_to_recordset(p_items) as item(fee_structure_item_id uuid, label text, amount numeric)
  where nullif(trim(item.label), '') is not null and item.amount >= 0;
  get diagnostics inserted_item_count = row_count;
  if inserted_item_count <> provided_item_count then
    raise exception 'Every invoice item must have a label and a non-negative amount' using errcode = '22023';
  end if;
  return invoice_id;
end;
$$;

revoke all on function public.create_fee_structure_with_items(uuid, uuid, uuid, text, jsonb) from public;
revoke all on function public.create_invoice_with_items(uuid, uuid, uuid, text, date, date, text, jsonb) from public;
grant execute on function public.create_fee_structure_with_items(uuid, uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.create_invoice_with_items(uuid, uuid, uuid, text, date, date, text, jsonb) to authenticated;
