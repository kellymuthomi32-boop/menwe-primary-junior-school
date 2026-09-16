create or replace function public.generate_report_card(p_student_id uuid, p_term_id uuid, p_teacher_remark text default null, p_headteacher_remark text default null)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  target_term public.terms;
  enrolled_class_id uuid;
  report_id uuid;
  attendance_pct numeric(5,2);
  average_pct numeric(6,2);
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can generate report cards.' using errcode = '42501';
  end if;

  select * into target_term from public.terms where id = p_term_id;
  if not found then raise exception 'Term was not found.' using errcode = '22023'; end if;

  select e.class_id into enrolled_class_id
  from public.enrollments e
  where e.student_id = p_student_id
    and e.academic_year_id = target_term.academic_year_id
    and e.status = 'ACTIVE'
  limit 1;
  if enrolled_class_id is null then raise exception 'Student does not have an active enrollment for this term.' using errcode = '22023'; end if;

  select round(100.0 * count(*) filter (where ar.status in ('PRESENT', 'LATE', 'EXCUSED')) / nullif(count(*), 0), 2)
  into attendance_pct
  from public.attendance_records ar
  join public.attendance_sessions s on s.id = ar.session_id
  where ar.student_id = p_student_id
    and s.class_id = enrolled_class_id
    and s.session_date between target_term.starts_on and target_term.ends_on;

  with latest_subject_results as (
    select distinct on (er.subject_id)
      er.subject_id, er.score, er.maximum_score, er.grade
    from public.exam_results er
    join public.exams e on e.id = er.exam_id
    where er.student_id = p_student_id
      and e.term_id = p_term_id
      and e.status = 'PUBLISHED'
    order by er.subject_id, e.ends_on desc nulls last, e.created_at desc, er.id desc
  )
  select round(avg((score / nullif(maximum_score, 0)) * 100), 2)
  into average_pct
  from latest_subject_results;

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

  with latest_subject_results as (
    select distinct on (er.subject_id)
      er.subject_id, er.score, er.maximum_score, er.grade
    from public.exam_results er
    join public.exams e on e.id = er.exam_id
    where er.student_id = p_student_id
      and e.term_id = p_term_id
      and e.status = 'PUBLISHED'
    order by er.subject_id, e.ends_on desc nulls last, e.created_at desc, er.id desc
  )
  insert into public.report_card_items (report_card_id, subject_id, score, maximum_score, grade)
  select report_id, subject_id, score, maximum_score, grade
  from latest_subject_results;

  return report_id;
end;
$$;

revoke all on function public.generate_report_card(uuid, uuid, text, text) from public;
grant execute on function public.generate_report_card(uuid, uuid, text, text) to authenticated;
