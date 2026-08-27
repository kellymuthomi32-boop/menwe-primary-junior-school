-- Teachers and parents may be created by an authorised administrator before
-- an email invitation is accepted and a matching Supabase Auth profile exists.

alter table public.teachers alter column profile_id drop not null;
alter table public.parents alter column profile_id drop not null;
