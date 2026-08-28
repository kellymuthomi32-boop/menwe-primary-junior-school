# Menwe Primary & Junior School — Production Reconciliation Audit

Status date: 2026-08-28

## Architecture

- Frontend: React 19 + TypeScript + Vite + Wouter + Supabase JS.
- Legacy server: Express + tRPC exists but contains only system/auth scaffolding; it is not the primary school-data backend.
- Database: Supabase/Postgres is the operational backend and source of persistent school data.
- Drizzle: legacy MySQL/Manus schema only; it does not describe the live Supabase database and must not be used to migrate the school platform.
- Deployment: Vercel production deployment exists and is READY.

## Critical schema mismatch

The repository's historical `supabase/migrations/0001_school_platform.sql` describes a different school schema from the live database. Examples:

- Repository: `academic_years`, `terms`; live: `academic_periods`, `academic_terms`.
- Repository: `teachers`, `parents`, `student_parents`; live: `staff_members` plus profile/student relationship fields.
- Repository: `attendance_sessions` and `attendance_records`; live: `attendance`.
- Repository: `message_threads` and `thread_participants`; live: `messages` and `message_recipients`.
- Repository finance workflow: `invoices`, `invoice_items`, `payment_events`; live finance ledger: `charges`, `payments`, `payment_allocations`, `receipts`, `finance_adjustments`, `refunds`, `reconciliations`.

Do not replay the historical 0001 migration into production. The live Supabase schema is the current production baseline until a complete canonical schema reconciliation is committed.

## P0 fixed in this branch

The previously deployed `verify_payment` RPC referenced missing relations and a missing `private.is_admin()` helper at runtime. It has been reconciled with the live ledger and now verifies confirmed payments using `payments` and `payment_allocations`.

The public `is_school_admin()` SECURITY DEFINER helper was removed from authenticated RPC execution while remaining available to database policies.

## Next reconciliation work

1. Replace the message-thread frontend with the live `messages` + `message_recipients` model, or introduce canonical thread tables through a tested migration. Do not mix both models.
2. Reconcile frontend table names and columns against the live schema for people, academics, attendance, exams, results, finance, homework, admissions, gallery and notifications.
3. Choose one backend authority. Supabase/Postgres is currently canonical; the legacy Drizzle/MySQL layer should be isolated or removed after tests prove it is unused.
4. Add a typed Supabase database contract and automated schema compatibility tests.
5. Run authenticated role-by-role CRUD and RLS tests before production readiness is claimed.
