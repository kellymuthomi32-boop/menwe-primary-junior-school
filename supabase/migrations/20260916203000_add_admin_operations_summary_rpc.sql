create or replace function public.admin_operations_summary()
returns table (
  pending_admissions bigint,
  verified_payments numeric,
  open_invoices bigint
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if not private.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.admission_applications a
      where a.status in ('PENDING'::public.admission_status, 'UNDER_REVIEW'::public.admission_status, 'submitted'::public.admission_status)),
    coalesce((select sum(p.amount) from public.payments p where p.status = 'VERIFIED'::public.payment_status), 0),
    (select count(*) from public.invoices i
      where i.status not in ('PAID'::public.invoice_status, 'VOID'::public.invoice_status));
end;
$$;

revoke execute on function public.admin_operations_summary() from public;
revoke execute on function public.admin_operations_summary() from anon;
grant execute on function public.admin_operations_summary() to authenticated;
