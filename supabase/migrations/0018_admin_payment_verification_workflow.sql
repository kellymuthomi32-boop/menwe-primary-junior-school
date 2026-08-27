create or replace function public.verify_payment(
  p_payment_id uuid,
  p_provider_reference text,
  p_event_payload jsonb default '{}'::jsonb
) returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  v_payment public.payments;
  v_due numeric(12,2);
  v_verified numeric(12,2);
begin
  if not private.is_admin() then
    raise exception 'Only an authorised administrator can verify a payment.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_provider_reference, ''))) < 3 then
    raise exception 'A provider reference is required to verify a payment.' using errcode = '22023';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment was not found.' using errcode = '22023';
  end if;
  if v_payment.status = 'VERIFIED' then
    if v_payment.provider_reference = trim(p_provider_reference) then return; end if;
    raise exception 'A verified payment cannot be changed.' using errcode = '42501';
  end if;
  if v_payment.status <> 'PENDING' then
    raise exception 'Only a pending payment can be verified.' using errcode = '22023';
  end if;
  if exists (select 1 from public.payments where provider_reference = trim(p_provider_reference) and id <> v_payment.id) then
    raise exception 'This provider reference is already recorded for another payment.' using errcode = '23505';
  end if;
  update public.payments
  set status = 'VERIFIED', provider_reference = trim(p_provider_reference), paid_at = now(), verified_at = now(), verified_by = auth.uid(), metadata = coalesce(p_event_payload, '{}'::jsonb)
  where id = v_payment.id;
  insert into public.payment_events (payment_id, event_type, provider_reference, payload, verified_by_system)
  values (v_payment.id, 'ADMIN_VERIFIED', trim(p_provider_reference), coalesce(p_event_payload, '{}'::jsonb), false);
  select coalesce(sum(amount), 0) into v_due from public.invoice_items where invoice_id = v_payment.invoice_id;
  select coalesce(sum(amount), 0) into v_verified from public.payments where invoice_id = v_payment.invoice_id and status = 'VERIFIED';
  update public.invoices
  set status = case when v_verified >= v_due then 'PAID'::public.invoice_status when v_verified > 0 then 'PARTIALLY_PAID'::public.invoice_status else status end
  where id = v_payment.invoice_id and status <> 'VOID';
end;
$$;

revoke all on function public.verify_payment(uuid, text, jsonb) from public;
grant execute on function public.verify_payment(uuid, text, jsonb) to authenticated;
