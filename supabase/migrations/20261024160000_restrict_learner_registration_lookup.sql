-- Keep learner-identifier lookup behind the server-side family login resolver.
revoke execute on function public.verify_learner_registration(text) from public, anon, authenticated;
grant execute on function public.verify_learner_registration(text) to service_role;
