-- Keep the private food learner register restricted to authorised food staff/admins.
DROP POLICY IF EXISTS students_food_staff_read ON public.students;
CREATE POLICY students_food_staff_read
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.food_staff_assignments a
    WHERE a.profile_id = (SELECT auth.uid())
      AND a.active = true
      AND a.responsibility = ANY (ARRAY['FOOD_RECORDING','FOOD_MANAGER','RICE_MONEY'])
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = ANY (ARRAY['SUPER_ADMIN','ADMIN','HEAD_OF_INSTITUTION','DEPUTY_HOI']::public.app_role[])
  )
);

-- The accountability view must respect the underlying RLS policies.
DROP VIEW IF EXISTS public.food_learner_accountability;
CREATE VIEW public.food_learner_accountability
WITH (security_invoker = true)
AS
SELECT
  s.id AS learner_id,
  s.admission_number,
  concat_ws(' ', s.first_name, s.middle_name, s.last_name) AS learner_name,
  COALESCE(SUM(CASE WHEN f.item_type = 'MAIZE' THEN f.quantity ELSE 0 END), 0) AS maize,
  COALESCE(SUM(CASE WHEN f.item_type = 'BEANS' THEN f.quantity ELSE 0 END), 0) AS beans,
  COALESCE(SUM(CASE WHEN f.item_type = 'SORGHUM' THEN f.quantity ELSE 0 END), 0) AS sorghum,
  COALESCE(SUM(CASE WHEN f.item_type = 'MILLET' THEN f.quantity ELSE 0 END), 0) AS millet,
  COALESCE((
    SELECT SUM(r.amount)
    FROM public.rice_payments r
    WHERE r.learner_id = s.id AND r.status = 'RECEIVED'
  ), 0) AS rice_paid,
  350::numeric AS rice_expected,
  GREATEST(
    350::numeric - COALESCE((
      SELECT SUM(r.amount)
      FROM public.rice_payments r
      WHERE r.learner_id = s.id AND r.status = 'RECEIVED'
    ), 0),
    0
  ) AS rice_balance
FROM public.students s
LEFT JOIN public.food_learner_contributions f ON f.learner_id = s.id
WHERE s.deleted_at IS NULL AND s.status = 'ACTIVE'
GROUP BY s.id, s.admission_number, s.first_name, s.middle_name, s.last_name;

REVOKE ALL ON public.food_learner_accountability FROM anon;
GRANT SELECT ON public.food_learner_accountability TO authenticated;
