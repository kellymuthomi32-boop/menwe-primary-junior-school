# Vercel Release Checklist

This repository is intentionally prepared for a **review-branch preview before any production merge**. The application is not ready to publish to the production Vercel domain until the checks below are completed.

| Step | Required action |
| --- | --- |
| 1 | In the intended `menwe-primary-junior-school` Vercel project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for **Preview** and **Production**. These are browser configuration values, not service credentials. |
| 2 | Do not add the Supabase service-role key, database password, `sb_secret` value, SMTP password, M-Pesa credential, or any real student data to Vercel client variables. |
| 3 | Deploy `build/supabase-platform` as a Vercel Preview and use its exact URL in Supabase Auth redirect configuration for controlled invite/reset testing. |
| 4 | Confirm public pages, admissions, contact forms, portal login, and access-denied states against the Preview deployment. |
| 5 | Enable Supabase leaked-password protection, configure branded SMTP directly in Supabase, and test one authorised reset/invitation before production release. |
| 6 | Only after role-boundary and core workflow testing passes should the review branch be merged into `main`; then use the Vercel Publish control. |

> Do not use the stale production URL for invitation acceptance until an approved, tested production deployment exists. The email completion route must match an allowed, deployed Vercel URL.

## Latest readiness review

The intended Vercel project is connected to the `build/supabase-platform` review branch. As reviewed on **2026-08-28**, its Environment Variables page reported **no variables configured**. The deployment history shows multiple earlier `build/supabase-platform` **Preview** deployments as **Ready**, including the latest checkpoint on the remote review branch at the time of review. The only deployment labelled **Production** is the older `main` deployment and is marked **Error**.

The missing public Supabase build variables still prevent any Preview or Production deployment from being relied upon for authenticated or database workflow tests. Current local dependency and card-system changes have not yet reached a Vercel Preview; after their review-branch push, the resulting Preview must be checked successfully with the two values in step 1 present in Vercel’s protected settings interface. No Vercel settings were changed during this review.
