create table if not exists public.grading_rules (
  id uuid primary key default gen_random_uuid(),
  academic_period_id uuid null references public.academic_periods(id) on delete cascade,
  academic_term_id uuid null references public.academic_terms(id) on delete cascade,
  min_score numeric(5,2) not null check (min_score >= 0 and min_score <= 100),
  max_score numeric(5,2) not null check (max_score >= 0 and max_score <= 100 and max_score >= min_score),
  grade text not null check (length(trim(grade)) between 1 and 10),
  remarks text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists grading_rules_scope_range_unique on public.grading_rules (coalesce(academic_period_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(academic_term_id, '00000000-0000-0000-0000-000000000000'::uuid), min_score, max_score);
alter table public.grading_rules enable row level security;
create policy admin_manage_grading_rules on public.grading_rules for all to authenticated using (is_school_admin()) with check (is_school_admin());
create policy teachers_read_grading_rules on public.grading_rules for select to authenticated using (exists (select 1 from public.teacher_assignments ta where ta.teacher_id = (select auth.uid())));
create policy students_read_grading_rules on public.grading_rules for select to authenticated using (exists (select 1 from public.students s where s.student_user_id = (select auth.uid())));
create policy parents_read_grading_rules on public.grading_rules for select to authenticated using (exists (select 1 from public.students s where (select auth.uid()) = any(s.parent_user_ids)));
create or replace function public.apply_canonical_configured_grade()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_max_score numeric; v_percentage numeric(5,2); v_period uuid; v_term uuid; v_grade text;
begin
  select max_score, academic_period_id, academic_term_id into v_max_score, v_period, v_term from public.exams where id = new.exam_id;
  if not found or v_max_score is null or v_max_score <= 0 then raise exception 'Exam max_score must be positive'; end if;
  if new.score > v_max_score then raise exception 'Score cannot exceed exam max_score'; end if;
  v_percentage := round((new.score / v_max_score) * 100, 2);
  select gr.grade into v_grade from public.grading_rules gr where (gr.academic_period_id is null or gr.academic_period_id = v_period) and (gr.academic_term_id is null or gr.academic_term_id = v_term) and v_percentage between gr.min_score and gr.max_score order by (gr.academic_term_id is not null) desc, (gr.academic_period_id is not null) desc, gr.sort_order asc, gr.min_score desc limit 1;
  new.grade := v_grade;
  return new;
end; $$;
revoke all on function public.apply_canonical_configured_grade() from public;
drop trigger if exists exam_results_apply_canonical_configured_grade on public.exam_results;
create trigger exam_results_apply_canonical_configured_grade before insert or update of score, exam_id on public.exam_results for each row execute function public.apply_canonical_configured_grade();