-- Lock official examination results after publication and support report-card lookups.
create or replace function private.guard_published_exam_result()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if exists (
    select 1
    from public.exams e
    where e.id = coalesce(new.exam_id, old.exam_id)
      and e.status = 'PUBLISHED'
  ) and not private.is_admin() then
    raise exception 'Published examination results are locked.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_published_exam_result on public.exam_results;
create trigger guard_published_exam_result
before update or delete on public.exam_results
for each row execute function private.guard_published_exam_result();

create index if not exists exam_results_exam_subject_student_idx
  on public.exam_results (exam_id, subject_id, student_id);

create index if not exists report_cards_term_class_student_idx
  on public.report_cards (term_id, class_id, student_id);
