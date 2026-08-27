-- ONE-TIME OWNER OPERATION
-- In Supabase SQL Editor, replace __OWNER_EMAIL__ with the school-controlled
-- account email that you have already created in Authentication → Users.
-- Do not commit the edited copy containing a personal email address.

begin;

do $$
declare
  candidate_count integer;
begin
  if exists (select 1 from public.profiles where role = 'SUPER_ADMIN') then
    raise exception 'A Super Administrator already exists. This one-time bootstrap is locked.' using errcode = '42501';
  end if;

  update public.profiles
  set role = 'SUPER_ADMIN', status = 'ACTIVE', updated_at = now()
  where lower(email) = lower('__OWNER_EMAIL__');

  get diagnostics candidate_count = row_count;
  if candidate_count <> 1 then
    raise exception 'Exactly one existing Authentication user profile must match the owner email.' using errcode = '22023';
  end if;
end;
$$;

commit;
