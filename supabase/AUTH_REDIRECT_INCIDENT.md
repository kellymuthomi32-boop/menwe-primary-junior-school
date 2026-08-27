# Invitation completion routing incident

An accepted owner invitation reached the configured Vercel production URL while that deployment still returned `404 NOT_FOUND`. The authentication account was nevertheless confirmed, but the browser could not load the password-setup experience.

For controlled development recovery, the Supabase Auth Site URL has been temporarily set to the allowlisted development portal password route. A new recovery link must be issued before password setup is retried. This temporary setting must be changed to the deployed Vercel password route before production launch.

No personal email address, user identifier, token, password, or credential is stored in this record.
