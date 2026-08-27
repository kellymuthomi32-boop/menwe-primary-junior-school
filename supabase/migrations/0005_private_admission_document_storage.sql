-- Private document bucket for supporting admission evidence. Anonymous visitors
-- may upload only constrained application documents; only administrators may read them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admission-documents',
  'admission-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

alter table public.admission_applications add column supporting_storage_path text;

create policy admission_documents_public_upload
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'admission-documents'
  and name like 'admission-submissions/%'
);

create policy admission_documents_admin_read
on storage.objects for select to authenticated
using (bucket_id = 'admission-documents' and private.is_admin());

drop function public.submit_admission(text, text, date, text, text, text, text, text, text, text, text, text, uuid);

create or replace function public.submit_admission(
  p_student_first_name text,
  p_student_last_name text,
  p_date_of_birth date,
  p_gender text,
  p_current_school text,
  p_grade_applying_for text,
  p_guardian_name text,
  p_guardian_phone text,
  p_guardian_email text,
  p_guardian_relationship text,
  p_address text,
  p_additional_information text,
  p_supporting_storage_path text default null
) returns table(reference text)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare new_reference text;
begin
  if length(trim(coalesce(p_student_first_name, ''))) < 2 or length(trim(coalesce(p_student_last_name, ''))) < 2 then
    raise exception 'Student first and last names are required.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_grade_applying_for, ''))) < 1 or length(trim(coalesce(p_guardian_name, ''))) < 2 or length(trim(coalesce(p_guardian_phone, ''))) < 6 then
    raise exception 'Grade, guardian name, and guardian phone are required.' using errcode = '22023';
  end if;
  if p_supporting_storage_path is not null and p_supporting_storage_path not like 'admission-submissions/%' then
    raise exception 'Invalid supporting document path.' using errcode = '22023';
  end if;
  new_reference := 'MPJS-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.admission_applications (
    reference, student_first_name, student_last_name, date_of_birth, gender, current_school, grade_applying_for,
    guardian_name, guardian_phone, guardian_email, guardian_relationship, address, additional_information, supporting_storage_path
  ) values (
    new_reference, trim(p_student_first_name), trim(p_student_last_name), p_date_of_birth, nullif(trim(p_gender), ''), nullif(trim(p_current_school), ''), trim(p_grade_applying_for),
    trim(p_guardian_name), trim(p_guardian_phone), nullif(lower(trim(p_guardian_email)), ''), nullif(trim(p_guardian_relationship), ''), nullif(trim(p_address), ''), nullif(trim(p_additional_information), ''), p_supporting_storage_path
  );
  return query select new_reference;
end;
$$;

grant execute on function public.submit_admission(text, text, date, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
