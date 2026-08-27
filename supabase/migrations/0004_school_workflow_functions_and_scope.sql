-- Secure database-backed workflow helpers and stricter relationship-scoped visibility.

create or replace function private.can_access_subject(p_subject_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin() or exists (
    select 1 from public.class_subjects cs
    where cs.subject_id = p_subject_id and private.can_access_class(cs.class_id)
  );
$$;

create or replace function private.can_access_teacher(p_teacher_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin()
    or p_teacher_id = private.current_teacher_id()
    or exists (
      select 1
      from public.teacher_subjects ts
      join public.enrollments e on e.class_id = ts.class_id and e.status = 'ACTIVE'
      join public.student_parents sp on sp.student_id = e.student_id
      join public.parents current_parent on current_parent.id = sp.parent_id
      where ts.teacher_id = p_teacher_id and current_parent.profile_id = auth.uid()
    );
$$;

create or replace function private.can_access_parent(p_parent_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin()
    or p_parent_id = private.current_parent_id()
    or exists (
      select 1
      from public.student_parents target_link
      join public.enrollments e on e.student_id = target_link.student_id and e.status = 'ACTIVE'
      join public.teacher_subjects ts on ts.class_id = e.class_id
      where target_link.parent_id = p_parent_id and ts.teacher_id = private.current_teacher_id()
    );
$$;

create or replace function private.can_message_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_admin() or exists (
    select 1
    from public.profiles target
    where target.id = p_profile_id and target.status = 'ACTIVE' and (
      (target.role = 'TEACHER' and exists (
        select 1
        from public.teachers target_teacher
        join public.teacher_subjects ts on ts.teacher_id = target_teacher.id
        join public.enrollments e on e.class_id = ts.class_id and e.status = 'ACTIVE'
        join public.student_parents sp on sp.student_id = e.student_id
        join public.parents current_parent on current_parent.id = sp.parent_id
        where target_teacher.profile_id = target.id and current_parent.profile_id = auth.uid()
      ))
      or (target.role = 'PARENT' and exists (
        select 1
        from public.parents target_parent
        join public.student_parents sp on sp.parent_id = target_parent.id
        join public.enrollments e on e.student_id = sp.student_id and e.status = 'ACTIVE'
        join public.teacher_subjects ts on ts.class_id = e.class_id
        where target_parent.profile_id = target.id and ts.teacher_id = private.current_teacher_id()
      ))
    )
  );
$$;

grant execute on function private.can_access_subject(uuid) to authenticated;
grant execute on function private.can_access_teacher(uuid) to authenticated;
grant execute on function private.can_access_parent(uuid) to authenticated;
grant execute on function private.can_message_profile(uuid) to authenticated;

drop policy if exists subjects_auth_read on public.subjects;
create policy subjects_relationship_read on public.subjects for select to authenticated using (private.can_access_subject(id));
drop policy if exists teachers_read on public.teachers;
create policy teachers_relationship_read on public.teachers for select to authenticated using (private.can_access_teacher(id));
drop policy if exists parents_read on public.parents;
create policy parents_relationship_read on public.parents for select to authenticated using (private.can_access_parent(id));
drop policy if exists participants_create on public.thread_participants;
create policy participants_scoped_create on public.thread_participants for insert to authenticated with check (profile_id = auth.uid() or private.can_message_profile(profile_id));
drop policy if exists attendance_sessions_manage on public.attendance_sessions;
create policy attendance_sessions_manage on public.attendance_sessions for all to authenticated using (private.is_admin() or (private.can_teach_class(class_id) and taken_by = private.current_teacher_id())) with check (private.is_admin() or (private.can_teach_class(class_id) and taken_by = private.current_teacher_id()));
drop policy if exists results_teacher_manage on public.exam_results;
create policy results_teacher_manage on public.exam_results for all to authenticated using (private.is_admin() or (private.can_teach_exam_subject(exam_id, subject_id) and entered_by = private.current_teacher_id())) with check (private.is_admin() or (private.can_teach_exam_subject(exam_id, subject_id) and entered_by = private.current_teacher_id()));

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
  p_supporting_file_id uuid default null
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
  new_reference := 'MPJS-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.admission_applications (
    reference, student_first_name, student_last_name, date_of_birth, gender, current_school, grade_applying_for,
    guardian_name, guardian_phone, guardian_email, guardian_relationship, address, additional_information, supporting_file_id
  ) values (
    new_reference, trim(p_student_first_name), trim(p_student_last_name), p_date_of_birth, nullif(trim(p_gender), ''), nullif(trim(p_current_school), ''), trim(p_grade_applying_for),
    trim(p_guardian_name), trim(p_guardian_phone), nullif(lower(trim(p_guardian_email)), ''), nullif(trim(p_guardian_relationship), ''), nullif(trim(p_address), ''), nullif(trim(p_additional_information), ''), p_supporting_file_id
  );
  return query select new_reference;
end;
$$;

create or replace function public.submit_contact(
  p_name text,
  p_email text,
  p_phone text,
  p_subject text,
  p_message text
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare submission_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_message, ''))) < 10 then
    raise exception 'A name and a meaningful message are required.' using errcode = '22023';
  end if;
  insert into public.contact_submissions (name, email, phone, subject, message)
  values (trim(p_name), nullif(lower(trim(p_email)), ''), nullif(trim(p_phone), ''), nullif(trim(p_subject), ''), trim(p_message))
  returning id into submission_id;
  return submission_id;
end;
$$;

create or replace function public.create_payment_intent(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_provider text default 'M-PESA'
) returns table(payment_id uuid, transaction_reference text, status public.payment_status)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare target_invoice public.invoices;
declare amount_due numeric(12,2);
declare amount_paid numeric(12,2);
declare new_payment_id uuid;
declare new_reference text;
begin
  select * into target_invoice from public.invoices where id = p_invoice_id;
  if not found or not private.can_access_student(target_invoice.student_id) then
    raise exception 'Invoice is not available for this account.' using errcode = '42501';
  end if;
  select coalesce(sum(amount), 0) into amount_due from public.invoice_items where invoice_id = p_invoice_id;
  select coalesce(sum(amount), 0) into amount_paid from public.payments where invoice_id = p_invoice_id and status = 'VERIFIED';
  if p_amount <= 0 or p_amount > amount_due - amount_paid then
    raise exception 'Payment amount must be greater than zero and not exceed the unpaid balance.' using errcode = '22023';
  end if;
  new_reference := 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.payments (invoice_id, amount, payment_method, provider, transaction_reference, status, environment)
  values (p_invoice_id, p_amount, trim(p_payment_method), nullif(trim(p_provider), ''), new_reference, 'PENDING', 'SANDBOX')
  returning id into new_payment_id;
  return query select new_payment_id, new_reference, 'PENDING'::public.payment_status;
end;
$$;

create or replace function public.generate_report_card(
  p_student_id uuid,
  p_term_id uuid,
  p_teacher_remark text default null,
  p_headteacher_remark text default null
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare target_term public.terms;
declare enrolled_class_id uuid;
declare report_id uuid;
declare attendance_pct numeric(5,2);
declare average_pct numeric(6,2);
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can generate report cards.' using errcode = '42501';
  end if;
  select * into target_term from public.terms where id = p_term_id;
  if not found then raise exception 'Term was not found.' using errcode = '22023'; end if;
  select e.class_id into enrolled_class_id from public.enrollments e where e.student_id = p_student_id and e.academic_year_id = target_term.academic_year_id and e.status = 'ACTIVE' limit 1;
  if enrolled_class_id is null then raise exception 'Student does not have an active enrollment for this term.' using errcode = '22023'; end if;
  select round(100.0 * count(*) filter (where ar.status in ('PRESENT', 'LATE', 'EXCUSED')) / nullif(count(*), 0), 2)
  into attendance_pct
  from public.attendance_records ar join public.attendance_sessions s on s.id = ar.session_id
  where ar.student_id = p_student_id and s.class_id = enrolled_class_id and s.session_date between target_term.starts_on and target_term.ends_on;
  select round(avg((er.score / nullif(er.maximum_score, 0)) * 100), 2)
  into average_pct
  from public.exam_results er join public.exams e on e.id = er.exam_id
  where er.student_id = p_student_id and e.term_id = p_term_id;
  insert into public.report_cards (student_id, term_id, class_id, attendance_percentage, average_score, teacher_remark, headteacher_remark, generated_by)
  values (p_student_id, p_term_id, enrolled_class_id, attendance_pct, average_pct, nullif(trim(p_teacher_remark), ''), nullif(trim(p_headteacher_remark), ''), auth.uid())
  on conflict (student_id, term_id) do update set
    class_id = excluded.class_id,
    attendance_percentage = excluded.attendance_percentage,
    average_score = excluded.average_score,
    teacher_remark = excluded.teacher_remark,
    headteacher_remark = excluded.headteacher_remark,
    generated_by = excluded.generated_by,
    generated_at = now()
  returning id into report_id;
  delete from public.report_card_items where report_card_id = report_id;
  insert into public.report_card_items (report_card_id, subject_id, score, maximum_score, grade)
  select report_id, er.subject_id, er.score, er.maximum_score, er.grade
  from public.exam_results er join public.exams e on e.id = er.exam_id
  where er.student_id = p_student_id and e.term_id = p_term_id;
  return report_id;
end;
$$;

grant execute on function public.submit_admission(text, text, date, text, text, text, text, text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.submit_contact(text, text, text, text, text) to anon, authenticated;
grant execute on function public.create_payment_intent(uuid, numeric, text, text) to authenticated;
grant execute on function public.generate_report_card(uuid, uuid, text, text) to authenticated;
