-- Trigger functions do not need to be exposed through the Data API.
-- Keep the grading trigger available to table operations while removing direct RPC execution.
REVOKE EXECUTE ON FUNCTION public.apply_canonical_configured_grade() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_canonical_configured_grade() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_canonical_configured_grade() FROM authenticated;
