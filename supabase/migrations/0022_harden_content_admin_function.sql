-- Keep CMS authorization helper callable by RLS without exposing a SECURITY DEFINER RPC surface.
create or replace function public.is_content_admin() returns boolean language sql stable security invoker set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and not p.is_disabled
      and p.role in ('admin','head_of_institution','deputy_hoi')
  );
$$;
