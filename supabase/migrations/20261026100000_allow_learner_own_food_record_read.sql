-- Allow each signed-in learner to read only their own food contributions
-- and rice payment rows. Existing staff-management policies remain unchanged.
drop policy if exists food_learner_contributions_self_read on public.food_learner_contributions;
create policy food_learner_contributions_self_read
on public.food_learner_contributions
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = food_learner_contributions.learner_id
      and s.profile_id = (select auth.uid())
      and s.deleted_at is null
      and s.status = 'ACTIVE'::public.student_status
  )
);

drop policy if exists rice_payments_self_read on public.rice_payments;
create policy rice_payments_self_read
on public.rice_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = rice_payments.learner_id
      and s.profile_id = (select auth.uid())
      and s.deleted_at is null
      and s.status = 'ACTIVE'::public.student_status
  )
);
