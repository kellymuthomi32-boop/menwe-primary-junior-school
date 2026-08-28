# First administrator onboarding

The production database intentionally has no operational school users. The application does **not** contain a public "make me admin" path because that would create a privilege-escalation vulnerability.

## One-time Supabase owner action

1. In the Supabase Dashboard, open **Authentication → Users** and create or invite the real school administrator using their real email address. Do not use a synthetic account.
2. The existing `on_auth_user_created_profile` trigger creates the canonical `public.profiles` row with a safe default `role = 'staff'`, `is_approved = false`, and `is_disabled = false`.
3. In the SQL Editor, run the following against the real administrator's email:

```sql
update public.profiles
set role = 'admin',
    is_approved = true,
    is_disabled = false,
    updated_at = now()
where lower(email) = lower('<REAL_ADMIN_EMAIL>');
```

4. Verify exactly one row was updated:

```sql
select id, email, display_name, role, is_approved, is_disabled
from public.profiles
where lower(email) = lower('<REAL_ADMIN_EMAIL>');
```

5. The real administrator signs in through `/portal/login` and opens `/portal/setup`.

## Security notes

- Do not expose the Supabase service-role key in the browser.
- Do not create a public endpoint that assigns `admin` or `head_of_institution`.
- Do not create a placeholder administrator in production.
- Additional users should enter through the application's existing controlled people/invitation flows once the first real administrator is active.

The setup wizard persists only data entered by the real school administrator. It does not seed sample school data.
