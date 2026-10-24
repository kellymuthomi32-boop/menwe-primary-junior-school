-- Generate one invoice per active learner enrolled in a class from its class-specific fee schedule.
create or replace function public.generate_class_fee_invoices(
  p_fee_structure_id uuid,
  p_due_on date default null
) returns table(created_count integer, skipped_existing_count integer)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_structure public.fee_structures%rowtype;
  v_year_name text;
  v_class_code text;
  v_term_name text;
  v_created integer := 0;
  v_skipped integer := 0;
  r record;
  v_invoice_id uuid;
  v_invoice_number text;
begin
  if not private.is_admin() then
    raise exception 'Only an authorised school administrator can issue class invoices.' using errcode = '42501';
  end if;
  select * into v_structure from public.fee_structures where id = p_fee_structure_id and status::text = 'ACTIVE';
  if not found then raise exception 'Active fee schedule not found.' using errcode = '22023'; end if;
  if not exists (select 1 from public.fee_structure_items where fee_structure_id = v_structure.id) then
    raise exception 'The fee schedule has no fee items.' using errcode = '22023';
  end if;
  select name into v_year_name from public.academic_years where id = v_structure.academic_year_id;
  select code into v_class_code from public.classes where id = v_structure.class_id and academic_year_id = v_structure.academic_year_id and status::text = 'ACTIVE';
  if v_class_code is null then raise exception 'The selected class is not active in this academic year.' using errcode = '22023'; end if;
  if v_structure.term_id is not null then
    select name into v_term_name from public.terms where id = v_structure.term_id and academic_year_id = v_structure.academic_year_id;
    if v_term_name is null then raise exception 'The fee schedule term does not match its academic year.' using errcode = '22023'; end if;
  else
    v_term_name := 'ANNUAL';
  end if;

  for r in
    select s.id as student_id, s.admission_number
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.academic_year_id = v_structure.academic_year_id
      and e.class_id = v_structure.class_id
      and e.status::text = 'ACTIVE'
      and s.status::text = 'ACTIVE'
      and s.deleted_at is null
  loop
    if exists (
      select 1 from public.invoices i
      where i.student_id = r.student_id
        and i.academic_year_id = v_structure.academic_year_id
        and i.term_id is not distinct from v_structure.term_id
        and i.status::text <> 'VOID'
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_invoice_number := left(
      'FEE-' || regexp_replace(coalesce(v_year_name,'YEAR'), '[^A-Za-z0-9]+', '-', 'g')
      || '-' || regexp_replace(coalesce(v_class_code,'CLASS'), '[^A-Za-z0-9]+', '-', 'g')
      || '-' || regexp_replace(coalesce(v_term_name,'ANNUAL'), '[^A-Za-z0-9]+', '-', 'g')
      || '-' || regexp_replace(coalesce(r.admission_number,'LEARNER'), '[^A-Za-z0-9-]+', '-', 'g')
      || '-' || left(replace(r.student_id::text,'-',''),8), 120);

    insert into public.invoices (
      student_id, academic_year_id, term_id, invoice_number, issued_on, due_on,
      status, notes, created_by
    ) values (
      r.student_id, v_structure.academic_year_id, v_structure.term_id, v_invoice_number,
      current_date, p_due_on, 'ISSUED',
      'Generated from class fee schedule: ' || v_structure.name || ' (' || v_structure.id::text || ')',
      auth.uid()
    ) returning id into v_invoice_id;

    insert into public.invoice_items(invoice_id, fee_structure_item_id, label, amount)
    select v_invoice_id, fsi.id, fsi.label, fsi.amount
    from public.fee_structure_items fsi
    where fsi.fee_structure_id = v_structure.id;

    update public.invoices i
    set total_amount = coalesce((select sum(ii.amount) from public.invoice_items ii where ii.invoice_id = v_invoice_id),0),
        updated_at = now()
    where i.id = v_invoice_id;

    v_created := v_created + 1;
  end loop;
  return query select v_created, v_skipped;
end;
$$;
revoke all on function public.generate_class_fee_invoices(uuid,date) from public, anon;
grant execute on function public.generate_class_fee_invoices(uuid,date) to authenticated;
