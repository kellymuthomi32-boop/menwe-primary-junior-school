-- One-click, atomic 2026 -> 2027 learner transition for Menwe.
-- This only adds workflow metadata and functions; it does not move production learners until an admin invokes the RPC.

create table if not exists private.academic_year_transition_runs (
  id uuid primary key default gen_random_uuid(),
  source_year_id uuid not null references public.academic_years(id) on delete restrict,
  target_year_id uuid not null references public.academic_years(id) on delete restrict,
  executed_by uuid not null references auth.users(id) on delete restrict,
  executed_at timestamptz not null default now(),
  promoted_count integer not null default 0,
  grade9_review_count integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  unique (source_year_id, target_year_id)
);
revoke all on private.academic_year_transition_runs from public, anon, authenticated;

create or replace function public.run_2027_academic_transition()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user uuid := auth.uid();
  v_source public.academic_years%rowtype;
  v_target public.academic_years%rowtype;
  v_existing private.academic_year_transition_runs%rowtype;
  v_source_count integer := 0;
  v_promoted integer := 0;
  v_grade9 integer := 0;
  v_missing_classes text[];
  v_details jsonb;
begin
  if v_user is null or not exists (
    select 1 from public.profiles p
    where p.id = v_user and p.status = 'ACTIVE'
      and p.role in ('SUPER_ADMIN','ADMIN','HEAD_OF_INSTITUTION')
  ) then
    raise exception 'Only an authorised school administrator can run the academic year transition.'
      using errcode = '42501';
  end if;

  select * into v_source from public.academic_years where name = '2026' for update;
  select * into v_target from public.academic_years where name = '2027' for update;
  if v_source.id is null or v_target.id is null then
    raise exception 'The 2026 and 2027 academic years must both exist before transitioning.';
  end if;

  select * into v_existing from private.academic_year_transition_runs
   where source_year_id = v_source.id and target_year_id = v_target.id;
  if v_existing.id is not null then
    return jsonb_build_object(
      'already_completed', true,
      'promoted_count', v_existing.promoted_count,
      'grade9_review_count', v_existing.grade9_review_count,
      'executed_at', v_existing.executed_at,
      'message', 'The 2026 to 2027 transition has already been completed. No duplicate enrolments were created.'
    );
  end if;

  if exists (select 1 from public.enrollments where academic_year_id = v_target.id) then
    raise exception 'The 2027 year already has enrolments but no transition record. Nothing was changed; ask the system administrator to review it.';
  end if;

  -- Validate every destination before writing anything.
  select array_agg(m.target_name) into v_missing_classes
  from (values
    ('PP1 East','PP2'), ('PP1 West','PP2'), ('PP2','Grade 1'),
    ('Grade 1','Grade 2'), ('Grade 2','Grade 3'), ('Grade 3','Grade 4'),
    ('Grade 4','Grade 5'), ('Grade 5','Grade 6'), ('Grade 6','Grade 7'),
    ('Grade 7','Grade 8'), ('Grade 8','Grade 9')
  ) as m(source_name,target_name)
  where not exists (
    select 1 from public.classes c
    where c.academic_year_id = v_target.id and c.name = m.target_name and c.status = 'ACTIVE'
  );
  if coalesce(cardinality(v_missing_classes),0) > 0 then
    raise exception 'The 2027 class setup is incomplete. Missing required destination classes: %', array_to_string(v_missing_classes, ', ');
  end if;

  if not exists (select 1 from public.terms where academic_year_id=v_target.id and status='ACTIVE') then
    raise exception 'Create an active 2027 Term 1 in Academic Management before running the transition. No learner records were changed.';
  end if;

  select count(*) into v_source_count
  from public.enrollments e
  join public.classes c on c.id=e.class_id
  join public.students s on s.id=e.student_id
  where e.academic_year_id=v_source.id and e.status='ACTIVE' and s.status='ACTIVE';

  select count(*) into v_grade9
  from public.enrollments e
  join public.classes c on c.id=e.class_id
  join public.students s on s.id=e.student_id
  where e.academic_year_id=v_source.id and e.status='ACTIVE' and s.status='ACTIVE'
    and c.name='Grade 9';

  -- Copy one active enrolment per eligible learner to their next 2027 class.
  -- Grade 9 learners are deliberately excluded for administrator-confirmed leaver review.
  insert into public.enrollments (student_id, class_id, stream_id, academic_year_id, enrolled_on, status)
  select e.student_id, target_class.id, null, v_target.id, v_target.starts_on, 'ACTIVE'
  from public.enrollments e
  join public.classes source_class on source_class.id=e.class_id
  join public.students s on s.id=e.student_id and s.status='ACTIVE'
  join lateral (
    select case
      when source_class.name in ('PP1 East','PP1 West') then 'PP2'
      when source_class.name='PP2' then 'Grade 1'
      when source_class.name ~ '^Grade [1-8]$' then 'Grade ' || (substring(source_class.name from '[0-9]+')::integer + 1)::text
      else null
    end as target_name
  ) mapping on mapping.target_name is not null
  join public.classes target_class on target_class.academic_year_id=v_target.id
    and target_class.name=mapping.target_name and target_class.status='ACTIVE'
  where e.academic_year_id=v_source.id and e.status='ACTIVE'
    and source_class.name <> 'Grade 9'
  on conflict (student_id, academic_year_id) do nothing;

  get diagnostics v_promoted = row_count;

  -- Mark 2027 current only after all destination enrolments have been created.
  update public.academic_years set is_current=false, updated_at=now()
   where is_current=true and id<>v_target.id;
  update public.academic_years set is_current=true, status='ACTIVE', updated_at=now()
   where id=v_target.id;

  update public.terms set is_current=false, updated_at=now()
   where is_current=true and academic_year_id<>v_target.id;
  -- Do not guess which term is current if the 2027 terms are not configured.
  if exists (select 1 from public.terms where academic_year_id=v_target.id and status='ACTIVE') then
    update public.terms set is_current=false, updated_at=now() where academic_year_id=v_target.id;
    update public.terms set is_current=true, updated_at=now()
      where id=(select id from public.terms where academic_year_id=v_target.id and status='ACTIVE'
                order by starts_on asc, created_at asc limit 1);
  end if;

  v_details := jsonb_build_object(
    'source_active_enrolments', v_source_count,
    'promoted', v_promoted,
    'grade9_for_review', v_grade9,
    'grade9_policy', 'Not promoted or disabled automatically; administrator must confirm leavers to preserve access for repeaters/returning learners.',
    'new_pp1_intake', 'Ready for separate admissions; existing PP1 East/West learners are moved to PP2.'
  );

  insert into private.academic_year_transition_runs
    (source_year_id,target_year_id,executed_by,promoted_count,grade9_review_count,details)
  values (v_source.id,v_target.id,v_user,v_promoted,v_grade9,v_details);

  return jsonb_build_object(
    'already_completed', false,
    'promoted_count', v_promoted,
    'grade9_review_count', v_grade9,
    'source_active_enrolments', v_source_count,
    'details', v_details,
    'message', format('Transition complete: %s learners promoted. %s Grade 9 learners remain for leaver review.',v_promoted,v_grade9)
  );
end;
$$;

revoke all on function public.run_2027_academic_transition() from public, anon;
grant execute on function public.run_2027_academic_transition() to authenticated;
