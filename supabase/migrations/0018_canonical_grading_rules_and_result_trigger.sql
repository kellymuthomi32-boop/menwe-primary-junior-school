-- Keep the grading trigger aligned with the school platform schema created in 0001.
-- The earlier draft of this migration referenced academic_periods/academic_terms and
-- exams.max_score, which do not exist in this database.
create or replace function public.apply_canonical_configured_grade()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  score_percentage numeric(6,2);
  configured_grade text;
begin
  if new.maximum_score is null or new.maximum_score <= 0 then
    raise exception 'Maximum score must be positive';
  end if;

  score_percentage := round((new.score / new.maximum_score) * 100, 2);

  select gr.grade
    into configured_grade
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

revoke all on function public.apply_canonical_configured_grade() from public, anon, authenticated;
drop trigger if exists exam_results_apply_canonical_configured_grade on public.exam_results;
create trigger exam_results_apply_canonical_configured_grade
before insert or update of score, maximum_score, exam_id on public.exam_results
for each row execute procedure public.apply_canonical_configured_grade();
