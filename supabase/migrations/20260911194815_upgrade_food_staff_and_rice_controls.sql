-- Food operations roster and rice payment integrity.

insert into public.food_staff_assignments (profile_id, responsibility, active, notes)
values
  ('2f6f71b7-6c90-4bea-bbdf-c074baa90e4b', 'FOOD_MANAGER', true, 'Food operations and rice money custodian'),
  ('41694fdd-c70a-49d7-bdec-e909374d5ab7', 'FOOD_MANAGER', true, 'Food operations'),
  ('9101feeb-3f64-430b-80a4-b473105c6101', 'FOOD_MANAGER', true, 'Food operations')
on conflict (profile_id, responsibility) do update
set active = excluded.active,
    notes = excluded.notes,
    updated_at = now();

insert into public.food_staff_assignments (profile_id, responsibility, active, notes)
values ('2f6f71b7-6c90-4bea-bbdf-c074baa90e4b', 'RICE_MONEY', true, 'Authorised rice payment custodian')
on conflict (profile_id, responsibility) do update
set active = excluded.active,
    notes = excluded.notes,
    updated_at = now();

create or replace function private.sync_rice_payment_balance()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.expected_amount is null or new.expected_amount <= 0 then
    new.expected_amount := 350;
  end if;

  if new.amount is null or new.amount < 0 then
    raise exception 'Rice payment amount must be zero or greater';
  end if;

  new.balance := greatest(
    new.expected_amount - case when new.status = 'RECEIVED' then new.amount else 0 end,
    0
  );

  return new;
end;
$$;

drop trigger if exists rice_payments_sync_balance on public.rice_payments;
create trigger rice_payments_sync_balance
before insert or update of amount, expected_amount, status
on public.rice_payments
for each row execute function private.sync_rice_payment_balance();

alter view public.food_learner_accountability set (security_invoker = true);

update public.rice_payments
set expected_amount = case when expected_amount is null or expected_amount <= 0 then 350 else expected_amount end,
    balance = greatest(
      (case when expected_amount is null or expected_amount <= 0 then 350 else expected_amount end)
      - case when status = 'RECEIVED' then amount else 0 end,
      0
    )
where expected_amount is null
   or expected_amount <= 0
   or balance is distinct from greatest(
      (case when expected_amount is null or expected_amount <= 0 then 350 else expected_amount end)
      - case when status = 'RECEIVED' then amount else 0 end,
      0
   );