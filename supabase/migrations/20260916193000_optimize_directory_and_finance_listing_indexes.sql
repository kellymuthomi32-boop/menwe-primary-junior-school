-- Keep high-volume directory and finance listings efficient as production data grows.
create index if not exists admissions_grade_status_created_idx
  on public.admission_applications (grade_applying_for, status, created_at desc);

create index if not exists invoices_issued_on_idx
  on public.invoices (issued_on desc);

create index if not exists payments_created_at_idx
  on public.payments (created_at desc);
