-- Let authenticated learners and linked parents read only their learner's food balance.
-- Existing staff access remains governed by food_learner_term_balances_staff_access.
DROP POLICY IF EXISTS food_learner_term_balances_learner_parent_read ON public.food_learner_term_balances;
CREATE POLICY food_learner_term_balances_learner_parent_read
ON public.food_learner_term_balances
FOR SELECT
TO authenticated
USING (private.can_access_student(learner_id));

-- Prevent anonymous execution of privileged library RPCs. Each function keeps its own
-- role/class-teacher authorization checks; authenticated staff retain required access.
REVOKE EXECUTE ON FUNCTION public.library_checkout_book(uuid, uuid, timestamptz, text, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.library_list_active_learners() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.library_lookup_book_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.library_mark_damaged(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.library_mark_lost(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.library_receive_replacement(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.library_return_book(uuid, numeric, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.library_checkout_book(uuid, uuid, timestamptz, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.library_list_active_learners() TO authenticated;
GRANT EXECUTE ON FUNCTION public.library_lookup_book_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.library_mark_damaged(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.library_mark_lost(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.library_receive_replacement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.library_return_book(uuid, numeric, text) TO authenticated;
