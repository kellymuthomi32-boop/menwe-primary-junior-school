-- The first-admin flow now uses the protected first-admin-bootstrap Edge Function.
-- The older public RPC is retained for schema compatibility but must not be callable
-- through the PostgREST API by anonymous or normal authenticated clients.
revoke execute on function public.consume_initial_admin_bootstrap(text) from anon;
revoke execute on function public.consume_initial_admin_bootstrap(text) from authenticated;
grant execute on function public.consume_initial_admin_bootstrap(text) to service_role;
