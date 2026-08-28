-- Reconciles the payment verification RPC with the live finance ledger and
-- removes a SECURITY DEFINER helper from the exposed RPC surface.

create or replace function public.verify_payment(
  p_payment_id uuid,
  p_provider_reference text,
  p_event_payload jsonb default '{}'::jsonb
) returns void
language plpgsql
security invoker
set search_path = public, private, auth
as $$
declare
  v_reference text := nullif(btrim(coalesce(p_provider_reference, '')), '');
  v_amount numeric;
  v_allocated numeric;
begin
  if auth.uid() is null or not private.can_approve_finance() then
    raise exception 'Only an authorised finance approver can verify a payment.' using errcode = '42501';
  end if;
  if v_reference is null or char_length(v_reference) < 3 then
    raise exception 'A provider reference is required to verify a payment.' using errcode = '22023';
  end if;

  select amount into v_amount from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment was not found.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.payments
    where external_reference = v_reference and id <> p_payment_id and status = 'Confirmed'
  ) then
    raise exception 'This provider reference is already attached to another confirmed payment.' using errcode = '23505';
  end if;

  update public.payments
  set status = 'Confirmed', external_reference = v_reference, updated_at = now()
  where id = p_payment_id;

  select coalesce(sum(amount), 0) into v_allocated from public.payment_allocations where payment_id = p_payment_id;
  if v_allocated > v_amount then
    raise exception 'Payment allocations exceed the confirmed payment amount.' using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.verify_payment(uuid, text, jsonb) from public, anon;
grant execute on function public.verify_payment(uuid, text, jsonb) to authenticated;

revoke execute on function public.is_school_admin() from public, anon, authenticated;

create unique index if not exists payments_confirmed_external_reference_unique
  on public.payments (external_reference)
  where status = 'Confirmed' and external_reference is not null;

create index if not exists charges_academic_period_id_idx on public.charges (academic_period_id);
create index if not exists charges_academic_term_id_idx on public.charges (academic_term_id);
create index if not exists charges_created_by_idx on public.charges (created_by);
