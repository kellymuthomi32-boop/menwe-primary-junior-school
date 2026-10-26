-- Keep the privileged transition implementation out of the exposed public API schema.
alter function public.run_2027_academic_transition() set schema private;
alter function private.run_2027_academic_transition() rename to run_2027_academic_transition_internal;

revoke all on function private.run_2027_academic_transition_internal() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.run_2027_academic_transition_internal() to authenticated;

create or replace function public.run_2027_academic_transition()
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.run_2027_academic_transition_internal();
$$;

revoke all on function public.run_2027_academic_transition() from public, anon;
grant execute on function public.run_2027_academic_transition() to authenticated;
