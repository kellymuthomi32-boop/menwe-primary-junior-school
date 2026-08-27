# Supabase Authentication Email Configuration

**Verified on 27 August 2026 through the connected Supabase dashboard.**

| Setting | Verified state | Release implication |
|---|---|---|
| Email provider | Enabled | Password, reset, invite, and email-link flows are available to authorised accounts. |
| Allow new users to sign up | Disabled | The public application cannot create arbitrary school accounts through self-registration. |
| Allow anonymous sign-ins | Disabled | Anonymous sessions cannot be used to access the portal. |
| Confirm email | Enabled | Invited accounts must complete email confirmation before first sign-in. |
| `school-invite` Edge Function | Active, version 1 | The client invokes the clean replacement endpoint; server-side Super Administrator checks remain required. |
| Custom SMTP | Not configured | Use the default sender only for controlled development checks. Branded production delivery remains dependent on a school-controlled SMTP provider configured directly in Supabase. |

The Supabase Site URL and redirect allowlist were configured earlier for the intended Vercel address and the current development preview. A controlled test with an actual school-owned Super Administrator account is still required before claiming that any email reached a mailbox.
