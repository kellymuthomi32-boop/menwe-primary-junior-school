# Free-Tier Security Posture

## Current Position

This project remains on the existing **free Supabase and Vercel configuration**. No paid Supabase branch, project, upgrade, production test record, or email delivery action has been created as part of this work.

| Control | Current position | Operational consequence |
|---|---|---|
| Email/password provider | Enabled with public sign-up disabled | Accounts are issued through the authorised school invitation path rather than public registration. |
| Email confirmation | Enabled | New account holders must complete the configured confirmation flow before first sign-in. |
| Anonymous sign-in | Disabled | Unauthenticated visitors cannot create anonymous sessions. |
| Leaked-password protection | Unavailable on the current Supabase plan | The dashboard rejected the requested setting because Supabase provides it on Pro plans and above. The setting has therefore **not** been enabled. |
| Client password UI | Requires at least eight characters | The public password page rejects shorter passwords before requesting an update. |
| RLS and storage policies | Enabled for school records and private attachments | Data visibility and file access remain scoped by the authenticated role and database policies. |

> Supabase recommends a minimum password length of at least eight characters and describes leaked-password protection as a Pro-plan-and-above feature that checks passwords against Have I Been Pwned’s Pwned Passwords API.[1]

## Free-Tier Operating Guidance

The application should continue to use its restricted invitation process, confirm email addresses, and avoid public sign-up. Administrators should advise account holders to use a unique password of at least eight characters and preferably a password manager. Supabase notes that password-strength requirements and leaked-password protection apply during password creation or changes; existing passwords are not retrospectively replaced.[1]

The outstanding free-tier limitation is intentionally recorded rather than bypassed. The application must not simulate leaked-password checks in the browser or claim that the upstream protection is active. If the school later elects to use a paid Supabase plan, an administrator can enable the setting in **Authentication → Sign In / Providers → Email** and then re-run the Security Advisor.

## Deferred Validation

No real school accounts, payment records, or message threads have been created for testing. Real end-to-end confirmation of role boundaries, private homework attachments, payment reconciliation, and invitation delivery remains deferred until the school authorises a safe test approach.

## Performance Advisor Context

A fresh Supabase Performance Advisor review reports only **unused-index informational notices**. The project is intentionally new and has no real operational traffic, so index-use statistics are not yet meaningful. The existing indexes support the protected relationship, status, and date queries already implemented; they should not be removed solely because the empty database has not used them. The school should revisit these notices after real, authorised operation establishes normal query patterns.[2]

## References

[1]: https://supabase.com/docs/guides/auth/password-security "Supabase Auth: Password security"
[2]: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index "Supabase Database Linter: Unused index"
