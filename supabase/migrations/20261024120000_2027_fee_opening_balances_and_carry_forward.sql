-- 2027 school-fees ledger: reconciled opening balances and automatic carry-forward.
-- Class-specific charges remain defined by fee_structures.class_id and invoice_items.
create table if not exists public.student_fee_opening_balances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  source_academic_year_id uuid references public.academic_years(id) on delete restrict,
  opening_debt numeric(12,2) not null default 0 check (opening_debt >= 0),
  opening_credit numeric(12,2) not null default 0 check (opening_credit >= 0),
  status text not null default 'DRAFT' check (status in ('DRAFT','VERIFIED')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_fee_opening_balance_one_per_year unique (student_id, academic_year_id),
  constraint student_fee_opening_balance_not_both check (opening_debt = 0 or opening_credit = 0),
  constraint student_fee_opening_balance_verification check (
    (status = 'DRAFT' and verified_by is null and verified_at is null)
    or (status = 'VERIFIED' and verified_by is not null and verified_at is not null)
  )
);

create index if not exists student_fee_opening_balances_year_status_idx
  on public.student_fee_opening_balances(academic_year_id, status);
create index if not exists student_fee_opening_balances_source_year_idx
  on public.student_fee_opening_balances(source_academic_year_id);

alter table public.student_fee_opening_balances enable row level security;
drop policy if exists student_fee_opening_balances_admin_all on public.student_fee_opening_balances;
create policy student_fee_opening_balances_admin_all
  on public.student_fee_opening_balances
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on public.student_fee_opening_balances from anon, authenticated;
grant select, insert, update on public.student_fee_opening_balances to authenticated;

-- A single authoritative summary. Positive balance means owing; negative means credit.
create or replace view public.student_fee_account_balances
with (security_invoker = true)
as
with years as (
  select id as academic_year_id, name as academic_year
  from public.academic_years
),
opening as (
  select student_id, academic_year_id,
         sum(opening_debt) filter (where status = 'VERIFIED') as opening_debt,
         sum(opening_credit) filter (where status = 'VERIFIED') as opening_credit,
         bool_or(status = 'DRAFT') as has_unverified_opening_balance
  from public.student_fee_opening_balances
  group by student_id, academic_year_id
),
billed as (
  select i.student_id, i.academic_year_id,
         sum(i.total_amount) filter (where i.status::text <> 'VOID') as fees_charged
  from public.invoices i
  group by i.student_id, i.academic_year_id
),
paid as (
  select i.student_id, i.academic_year_id,
         sum(p.amount) filter (where p.status::text = 'VERIFIED') as verified_payments,
         sum(p.amount) filter (where p.status::text = 'PENDING') as pending_receipts
  from public.payments p
  join public.invoices i on i.id = p.invoice_id
  where i.status::text <> 'VOID'
  group by i.student_id, i.academic_year_id
),
accounts as (
  select student_id, academic_year_id from opening
  union select student_id, academic_year_id from billed
  union select student_id, academic_year_id from paid
)
select a.student_id, a.academic_year_id, y.academic_year,
       coalesce(o.opening_debt, 0)::numeric(12,2) as opening_debt,
       coalesce(o.opening_credit, 0)::numeric(12,2) as opening_credit,
       coalesce(b.fees_charged, 0)::numeric(12,2) as fees_charged,
       coalesce(p.verified_payments, 0)::numeric(12,2) as verified_payments,
       coalesce(p.pending_receipts, 0)::numeric(12,2) as pending_receipts,
       (coalesce(o.opening_debt,0) - coalesce(o.opening_credit,0)
        + coalesce(b.fees_charged,0) - coalesce(p.verified_payments,0))::numeric(12,2) as balance,
       coalesce(o.has_unverified_opening_balance, false) as has_unverified_opening_balance
from accounts a
join years y on y.academic_year_id = a.academic_year_id
left join opening o on o.student_id = a.student_id and o.academic_year_id = a.academic_year_id
left join billed b on b.student_id = a.student_id and b.academic_year_id = a.academic_year_id
left join paid p on p.student_id = a.student_id and p.academic_year_id = a.academic_year_id;

revoke all on public.student_fee_account_balances from anon, authenticated;
grant select on public.student_fee_account_balances to authenticated;

create or replace function public.save_student_fee_opening_balance(
  p_student_id uuid,
  p_academic_year_id uuid,
  p_opening_debt numeric default 0,
  p_opening_credit numeric default 0,
  p_source_academic_year_id uuid default null,
  p_notes text default null,
  p_verify boolean default false
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Only an authorised school administrator can manage opening balances.' using errcode = '42501';
  end if;
  if p_opening_debt is null or p_opening_credit is null or p_opening_debt < 0 or p_opening_credit < 0 then
    raise exception 'Opening debt and credit must be zero or positive.' using errcode = '22023';
  end if;
  if p_opening_debt > 0 and p_opening_credit > 0 then
    raise exception 'Record either an opening debt or an opening credit, not both.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.students where id = p_student_id and deleted_at is null) then
    raise exception 'The selected learner was not found or is archived.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.academic_years where id = p_academic_year_id) then
    raise exception 'The selected academic year was not found.' using errcode = '22023';
  end if;
  if p_source_academic_year_id is not null and not exists (
    select 1 from public.academic_years
    where id = p_source_academic_year_id and id <> p_academic_year_id
  ) then
    raise exception 'The source academic year is invalid.' using errcode = '22023';
  end if;

  select id into v_id
  from public.student_fee_opening_balances
  where student_id = p_student_id and academic_year_id = p_academic_year_id
  for update;

  if v_id is not null and exists (
    select 1 from public.student_fee_opening_balances
    where id = v_id and status = 'VERIFIED'
  ) then
    raise exception 'This opening balance is already verified. Use an auditable adjustment instead of overwriting it.' using errcode = '42501';
  end if;

  insert into public.student_fee_opening_balances (
    student_id, academic_year_id, source_academic_year_id,
    opening_debt, opening_credit, status, notes,
    created_by, verified_by, verified_at, updated_at
  ) values (
    p_student_id, p_academic_year_id, p_source_academic_year_id,
    p_opening_debt, p_opening_credit,
    case when p_verify then 'VERIFIED' else 'DRAFT' end,
    nullif(trim(coalesce(p_notes,'')), ''),
    auth.uid(), case when p_verify then auth.uid() else null end,
    case when p_verify then now() else null end, now()
  )
  on conflict (student_id, academic_year_id) do update set
    source_academic_year_id = excluded.source_academic_year_id,
    opening_debt = excluded.opening_debt,
    opening_credit = excluded.opening_credit,
    status = excluded.status,
    notes = excluded.notes,
    created_by = excluded.created_by,
    verified_by = excluded.verified_by,
    verified_at = excluded.verified_at,
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.carry_forward_student_fee_balances(
  p_source_academic_year_id uuid,
  p_target_academic_year_id uuid,
  p_verify boolean default false
) returns table(processed integer, skipped_existing integer, skipped_unreconciled integer)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_processed integer := 0;
  v_existing integer := 0;
  v_unreconciled integer := 0;
  r record;
  v_balance numeric(12,2);
begin
  if not private.is_admin() then
    raise exception 'Only an authorised school administrator can carry forward fee balances.' using errcode = '42501';
  end if;
  if p_source_academic_year_id = p_target_academic_year_id
     or not exists (select 1 from public.academic_years where id = p_source_academic_year_id)
     or not exists (select 1 from public.academic_years where id = p_target_academic_year_id) then
    raise exception 'Choose two different, existing academic years.' using errcode = '22023';
  end if;

  for r in
    select distinct s.id as student_id
    from public.students s
    where s.deleted_at is null
      and (
        exists (select 1 from public.invoices i where i.student_id = s.id and i.academic_year_id = p_source_academic_year_id and i.status::text <> 'VOID')
        or exists (select 1 from public.student_fee_opening_balances ob where ob.student_id = s.id and ob.academic_year_id = p_source_academic_year_id)
      )
  loop
    if exists (select 1 from public.student_fee_opening_balances ob where ob.student_id = r.student_id and ob.academic_year_id = p_target_academic_year_id) then
      v_existing := v_existing + 1;
      continue;
    end if;

    if exists (select 1 from public.student_fee_opening_balances ob
               where ob.student_id = r.student_id and ob.academic_year_id = p_source_academic_year_id
                 and ob.status <> 'VERIFIED') then
      v_unreconciled := v_unreconciled + 1;
      continue;
    end if;

    select
      coalesce((select sum(ob.opening_debt - ob.opening_credit)
                from public.student_fee_opening_balances ob
                where ob.student_id = r.student_id and ob.academic_year_id = p_source_academic_year_id
                  and ob.status = 'VERIFIED'), 0)
      + coalesce((select sum(i.total_amount) from public.invoices i
                  where i.student_id = r.student_id and i.academic_year_id = p_source_academic_year_id
                    and i.status::text <> 'VOID'), 0)
      - coalesce((select sum(p.amount) from public.payments p join public.invoices i on i.id = p.invoice_id
                  where i.student_id = r.student_id and i.academic_year_id = p_source_academic_year_id
                    and i.status::text <> 'VOID' and p.status::text = 'VERIFIED'), 0)
    into v_balance;

    if exists (select 1 from public.payments p join public.invoices i on i.id=p.invoice_id
               where i.student_id = r.student_id and i.academic_year_id = p_source_academic_year_id
                 and p.status::text = 'PENDING') then
      v_unreconciled := v_unreconciled + 1;
      continue;
    end if;

    insert into public.student_fee_opening_balances (
      student_id, academic_year_id, source_academic_year_id,
      opening_debt, opening_credit, status, notes, created_by, verified_by, verified_at
    ) values (
      r.student_id, p_target_academic_year_id, p_source_academic_year_id,
      greatest(v_balance, 0), greatest(-v_balance, 0),
      case when p_verify then 'VERIFIED' else 'DRAFT' end,
      'System carry-forward from prior academic year; verify against the signed-off fee ledger.',
      auth.uid(), case when p_verify then auth.uid() else null end,
      case when p_verify then now() else null end
    );
    v_processed := v_processed + 1;
  end loop;
  return query select v_processed, v_existing, v_unreconciled;
end;
$$;

revoke all on function public.save_student_fee_opening_balance(uuid,uuid,numeric,numeric,uuid,text,boolean) from public, anon;
revoke all on function public.carry_forward_student_fee_balances(uuid,uuid,boolean) from public, anon;
grant execute on function public.save_student_fee_opening_balance(uuid,uuid,numeric,numeric,uuid,text,boolean) to authenticated;
grant execute on function public.carry_forward_student_fee_balances(uuid,uuid,boolean) to authenticated;
