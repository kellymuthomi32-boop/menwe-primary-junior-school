create index if not exists inventory_items_created_by_idx on public.inventory_items (created_by);
create index if not exists inventory_transactions_recorded_by_idx on public.inventory_transactions (recorded_by);
create index if not exists student_fee_opening_balances_created_by_idx on public.student_fee_opening_balances (created_by);
create index if not exists student_fee_opening_balances_verified_by_idx on public.student_fee_opening_balances (verified_by);
