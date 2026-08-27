create or replace function public.apply_configured_grade()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare score_percentage numeric(6,2);
declare configured_grade text;
begin
  score_percentage := round((new.score / new.maximum_score) * 100, 2);
  select gr.grade into configured_grade
  from public.exams e
  join public.terms t on t.id = e.term_id
  join public.grading_rules gr on gr.academic_year_id = t.academic_year_id
  where e.id = new.exam_id
    and score_percentage between gr.min_score and gr.max_score
  order by gr.sort_order asc, gr.min_score desc
  limit 1;

  new.grade := configured_grade;
  return new;
end;
$$;

revoke all on function public.apply_configured_grade() from public, anon, authenticated;
drop trigger if exists exam_results_apply_configured_grade on public.exam_results;
create trigger exam_results_apply_configured_grade
before insert or update of score, maximum_score, exam_id on public.exam_results
for each row execute procedure public.apply_configured_grade();
