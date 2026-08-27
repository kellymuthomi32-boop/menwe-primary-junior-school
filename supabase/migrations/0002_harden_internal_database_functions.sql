-- Harden internal trigger functions: they are invoked by database triggers only,
-- never through the exposed PostgREST RPC API.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.audit_row_change() from public, anon, authenticated;
