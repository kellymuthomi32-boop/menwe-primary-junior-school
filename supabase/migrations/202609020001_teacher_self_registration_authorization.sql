-- Teacher self-registration is authorized by a school-wide code plus a unique Staff ID.
-- The authorization code is stored only as a SHA-256 digest.

create table if not exists public.staff_registration_claims (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_registration_claims_active_idx
  on public.staff_registration_claims (token_hash, expires_at)
  where used_at is null;

alter table public.staff_registration_claims enable row level security;
revoke all on public.staff_registration_claims from anon, authenticated;

drop function if exists public.verify_staff_registration(text, text);
create or replace function public.verify_staff_registration(staff_id text, authorization_code text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_staff_id text := upper(trim(coalesce(staff_id, '')));
  normalized_code text := upper(trim(coalesce(authorization_code, '')));
  token text;
begin
  if normalized_staff_id = '' or normalized_code = '' then
    return null;
  end if;

  if encode(digest(normalized_code, 'sha256'), 'hex') <> '4f5a66a86665ef59cfa6507ac5dfba8de1c670bd6d26878274670d8ccc340336' then
    return null;
  end if;

  if exists (
    select 1 from public.teachers
    where upper(trim(employee_number)) = normalized_staff_id
  ) then
    return null;
  end if;

  token := gen_random_uuid()::text || '-' || gen_random_uuid()::text;

  insert into public.staff_registration_claims (staff_id, token_hash)
  values (normalized_staff_id, encode(digest(token, 'sha256'), 'hex'));

  return token;
end;
$$;

grant execute on function public.verify_staff_registration(text, text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  registration_token text := new.raw_user_meta_data->>'staff_registration_claim';
  requested_staff_id text := upper(trim(coalesce(new.raw_user_meta_data->>'tsc_number', new.raw_user_meta_data->>'staff_id', '')));
  claim_staff_id text;
  role_value public.app_role := 'PARENT'::public.app_role;
  full_name_value text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  name_parts text[];
  first_name_value text;
  middle_name_value text;
  last_name_value text;
begin
  if registration_token is not null and registration_token <> '' then
    update public.staff_registration_claims
       set used_at = now()
     where token_hash = encode(digest(registration_token, 'sha256'), 'hex')
       and expires_at > now()
       and used_at is null
     returning staff_id into claim_staff_id;
  end if;

  if claim_staff_id is null and requested_staff_id <> '' then
    update public.staff_registration_claims
       set used_at = now()
     where id = (
       select id
       from public.staff_registration_claims
       where staff_id = requested_staff_id
         and expires_at > now()
         and used_at is null
       order by created_at desc
       limit 1
       for update skip locked
     )
     returning staff_id into claim_staff_id;
  end if;

  if claim_staff_id is not null then
    role_value := 'TEACHER'::public.app_role;
  end if;

  insert into public.profiles (id, email, full_name, phone, avatar_url, role, status)
  values (
    new.id,
    new.email,
    nullif(full_name_value, ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    role_value,
    'ACTIVE'::public.record_status
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    role = case when role_value = 'TEACHER'::public.app_role then role_value else public.profiles.role end,
    updated_at = now();

  if role_value = 'TEACHER'::public.app_role and claim_staff_id is not null then
    name_parts := regexp_split_to_array(trim(full_name_value), '\\s+');
    first_name_value := nullif(name_parts[1], '');
    last_name_value := case when coalesce(array_length(name_parts, 1), 0) >= 2 then nullif(name_parts[array_length(name_parts, 1)], '') else first_name_value end;
    middle_name_value := case when coalesce(array_length(name_parts, 1), 0) > 2 then nullif(array_to_string(name_parts[2:array_length(name_parts, 1)-1], ' '), '') else null end;

    insert into public.teachers (profile_id, employee_number, first_name, middle_name, last_name, email, status)
    values (new.id, claim_staff_id, first_name_value, middle_name_value, last_name_value, new.email, 'ACTIVE'::public.record_status)
    on conflict (profile_id) do update set
      employee_number = excluded.employee_number,
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      email = excluded.email,
      status = excluded.status,
      updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
