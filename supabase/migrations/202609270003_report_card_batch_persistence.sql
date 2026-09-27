create or replace function public.persist_report_card_with_items(
  p_student_id uuid,
  p_term_id uuid,
  p_class_id uuid,
  p_attendance_percentage numeric,
  p_average_score numeric,
  p_teacher_remark text,
  p_headteacher_remark text,
  p_generated_by uuid,
  p_items jsonb
)
returns table(report_card_id uuid, item_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_report_card_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SUPER_ADMIN','ADMIN','HEAD_OF_INSTITUTION','DEPUTY_HOI')
  ) then raise exception 'Administrator permission required'; end if;

  insert into public.report_cards (
    student_id, term_id, class_id, attendance_percentage, average_score,
    teacher_remark, headteacher_remark, generated_by, generated_at
  ) values (
    p_student_id, p_term_id, p_class_id, p_attendance_percentage, p_average_score,
    p_teacher_remark, p_headteacher_remark, coalesce(p_generated_by, auth.uid()), now()
  )
  on conflict (student_id, term_id) do update set
    class_id = excluded.class_id,
    attendance_percentage = excluded.attendance_percentage,
    average_score = excluded.average_score,
    teacher_remark = excluded.teacher_remark,
    headteacher_remark = excluded.headteacher_remark,
    generated_by = excluded.generated_by,
    generated_at = now(),
    updated_at = now()
  returning id into v_report_card_id;

  delete from public.report_card_items
  where report_card_id = v_report_card_id;

  insert into public.report_card_items (
    report_card_id, subject_id, score, maximum_score, grade
  )
  select v_report_card_id,
         (item->>'subject_id')::uuid,
         nullif(item->>'score','')::numeric,
         nullif(item->>'maximum_score','')::numeric,
         nullif(item->>'grade','')
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item
  where nullif(item->>'subject_id','') is not null;

  return query
    select v_report_card_id,
           (select count(*)::integer from public.report_card_items where report_card_id = v_report_card_id);
end;
$$;

revoke all on function public.persist_report_card_with_items(uuid,uuid,uuid,numeric,numeric,text,text,uuid,jsonb) from public, anon;
grant execute on function public.persist_report_card_with_items(uuid,uuid,uuid,numeric,numeric,text,text,uuid,jsonb) to authenticated;
