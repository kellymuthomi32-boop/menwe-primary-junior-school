-- Matches the live migration `finance_relationship_indexes`.
-- Cover foreign keys flagged by the Supabase performance advisor without changing data or access semantics.

create index if not exists finance_adjustments_approved_by_idx on public.finance_adjustments(approved_by);
create index if not exists finance_adjustments_created_by_idx on public.finance_adjustments(created_by);
create index if not exists payment_allocations_created_by_idx on public.payment_allocations(created_by);
create index if not exists payments_created_by_idx on public.payments(created_by);
create index if not exists receipts_issued_by_idx on public.receipts(issued_by);
create index if not exists receipts_voided_by_idx on public.receipts(voided_by);
create index if not exists reconciliations_created_by_idx on public.reconciliations(created_by);
create index if not exists reconciliations_reviewed_by_idx on public.reconciliations(reviewed_by);
create index if not exists refunds_approved_by_idx on public.refunds(approved_by);
create index if not exists refunds_created_by_idx on public.refunds(created_by);
