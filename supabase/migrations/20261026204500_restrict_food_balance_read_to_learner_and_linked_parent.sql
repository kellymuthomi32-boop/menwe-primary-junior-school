-- Restrict food term balances to the learner, a linked parent, or existing food staff/admin policy.
-- Do not inherit the broader teacher/class access helper for financial/accountability data.
DROP POLICY IF EXISTS food_learner_term_balances_learner_parent_read ON public.food_learner_term_balances;
CREATE POLICY food_learner_term_balances_learner_parent_read
ON public.food_learner_term_balances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = learner_id
      AND s.profile_id = (SELECT auth.uid())
      AND s.deleted_at IS NULL
      AND s.status = 'ACTIVE'
  )
  OR EXISTS (
    SELECT 1
    FROM public.student_parents sp
    JOIN public.parents p ON p.id = sp.parent_id
    JOIN public.students s ON s.id = sp.student_id
    WHERE sp.student_id = learner_id
      AND p.profile_id = (SELECT auth.uid())
      AND s.deleted_at IS NULL
      AND s.status = 'ACTIVE'
  )
);