-- Durable teacher registration claim flow.
alter table public.staff_registration_claims
  alter column expires_at set default (now() + interval '1 hour');

create unique index if not exists staff_registration_claims_one_active_per_staff
  on public.staff_registration_claims (staff_id)
  where used_at is null;

create or replace function public.verify_staff_registration(staff_id text, authorization_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_staff_id text := upper(trim(coalesce(staff_id, '')));
  normalized_code text := upper(trim(coalesce(authorization_code, '')));
  token text;
begin
  if normalized_staff_id = '' or normalized_code = '' then return null; end if;
  if encode(extensions.digest(normalized_code, 'sha256'), 'hex') <> '4f5a66a86665ef59cfa6507ac5dfba8de1c670bd6d26878274670d8ccc340336' then return null; end if;
  if exists (select 1 from public.teachers t where upper(trim(t.employee_number)) = normalized_staff_id) then return null; end if;

  update public.staff_registration_claims c
     set used_at = now()
   where upper(trim(c.staff_id)) = normalized_staff_id and c.used_at is null;

  token := extensions.gen_random_uuid()::text || '-' || extensions.gen_random_uuid()::text;
  insert into public.staff_registration_claims (staff_id, token_hash, expires_at)
  values (normalized_staff_id, encode(extensions.digest(token, 'sha256'), 'hex'), now() + interval '1 hour');
  return token;
end;
$$;

revoke execute on function public.verify_staff_registration(text,text) from public;
grant execute on function public.verify_staff_registration(text,text) to anon, authenticated;
