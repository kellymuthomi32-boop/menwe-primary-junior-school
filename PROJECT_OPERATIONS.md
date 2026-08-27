# Menwe Primary & Junior School — Operations Guide

## Purpose and architecture

The application is an editable public school website and a secure management platform. Public information, admissions, contact enquiries, school operations, academic records, attendance, results, finance, and communication are all backed by the existing Supabase PostgreSQL project.

> The application intentionally starts without fabricated students, staff, classes, fees, payments, results, events, achievements, reviews, or contact details. Enter only verified school information through authorised administration screens.

## First Super Administrator setup

The first privileged account must be established directly in Supabase, once, by the project owner. This avoids a hard-coded administrator password or public bootstrap bypass.

1. In Supabase, create the owner account in **Authentication → Users** using a real school-controlled email address.
2. Let the profile trigger create the matching row in `public.profiles`.
3. In the Supabase SQL editor, use `supabase/bootstrap/claim-first-super-admin.sql`, replacing `__OWNER_EMAIL__` with that real owner email. The script aborts unless exactly one matching profile exists, and it permanently refuses to run after a Super Administrator exists.
4. Sign in at `/portal/login`. The Super Administrator can then create real school configuration, records, and linked user invitations through the application.
5. Keep the database password, service-role key, and all `sb_secret_` values out of GitHub, browser code, Kimi prompts, and ordinary messages.

## Safe setup order

Create records in this order: academic year and current term; grading rules; subjects; classes and streams; teachers; parents and students; parent links and enrolments; teacher subject assignments; timetables; fee structures and invoices; then authorised account invitations. This order preserves referential integrity and enables role-scoped workflows.

## Roles and data boundaries

| Role | Authorised scope |
|---|---|
| `SUPER_ADMIN` | Full platform administration, including secure user invitation. |
| `ADMIN` | School operations, content publishing, academic administration, attendance, reports, and finance; cannot issue privileged invitations. |
| `TEACHER` | Assigned classes and subjects, attendance, result entry, homework, timetable, announcements, and authorised messages. |
| `STUDENT` | Personal academic, timetable, homework, attendance, results, report-card, and finance records only. |
| `PARENT` | Records for linked children only, including academic, timetable, attendance, results, invoices, payment intents, homework, announcements, and authorised messages. |

## Payment safety

The interface creates only a **pending sandbox payment intent**. It never treats a browser action as a successful payment. A real M-Pesa implementation must add a protected provider callback that verifies the provider response, records a `payment_events` row, then marks the payment `VERIFIED`. Switch to production only after provider credentials, callback signature verification, and production URLs have been configured in protected deployment settings.

## Deployment settings

Use the deployment platform’s protected Environment Variables interface to set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep `.env.local` local and excluded from Git. Set Supabase Auth redirect URLs to the final production domain and the preview domain when known. Do not add a service-role key to any browser-facing variable.

## Email sign-in, invitations, and delivery

The portal supports email and password sign-in at `/portal/login`, password recovery, and a passwordless email-link option at `/portal/email-link`. The email-link form sets `shouldCreateUser: false`, so it cannot create an unapproved account. Public self-registration is disabled in Supabase; the Super Administrator must first create and link a real school record, then issue a secure invitation from the portal.

Supabase is configured with the application’s Vercel and development redirect allowlists. The current default sender is adequate for development and small controlled tests. Before a school-wide invitation campaign or production launch, configure a verified custom SMTP sender and review the Invite user, Magic link, and Reset password templates in **Supabase → Authentication → Emails**. Confirm sender DNS verification, email rate limits, spam-folder behaviour, and the final custom domain before sending invitations to school families.

## Verification checklist

- Run `pnpm check` and `pnpm test` after changes.
- Confirm Supabase security advisor has no unreviewed findings.
- Test public admissions, contact submissions, portal sign-in, each role’s data scope, attendance, grading, reports, invoice creation, payment intent handling, and password reset with real authorised records.
- Confirm no secrets appear in Git history before publication.
