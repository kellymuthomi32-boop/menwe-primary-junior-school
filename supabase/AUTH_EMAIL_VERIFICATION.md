# Auth email delivery verification

## Current production finding

Supabase Auth logs showed OTP requests reaching `/auth/v1/otp`, but the project is not configured with a production SMTP provider. Supabase's built-in SMTP service is intended for development/testing and does not reliably deliver production authentication messages; it can also restrict delivery to project/team addresses.

The portal also intentionally uses `shouldCreateUser: false` for magic-link sign-in, so a magic-link request must never be treated as public registration.

## First real administrator

While SMTP is unavailable, the first real school administrator can use the one-time route:

`/portal/setup/first-admin`

It creates one real administrator with a password, marks the email as confirmed, creates the canonical profile, and locks the one-time bootstrap path after use. The private bootstrap code is issued separately to the school owner and is not stored in the repository or frontend.

## Production email action still required

For normal invitations, password resets, and magic links, configure a real SMTP provider in:

**Supabase → Authentication → Emails → SMTP Settings**

Recommended requirements:

- SMTP credentials from a transactional email provider
- verified sending domain or approved sender
- link tracking disabled for Supabase Auth links
- Supabase Site URL set to the production domain
- production portal URLs added to Redirect URLs

No SMTP password, API key, or service-role key is stored in this repository.
