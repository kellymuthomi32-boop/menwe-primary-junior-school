# Supabase Storage Security Notes

The private homework attachment workflow follows the official Supabase access-control and bucket guidance consulted on 27 August 2026.

| Source | Applied principle |
| --- | --- |
| [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) | Storage uploads require explicit `storage.objects` RLS policies. The attachment bucket uses an authenticated insert policy constrained to a folder named for the authenticated user. |
| [Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) | Homework attachments use a private bucket. Private files remain subject to RLS for reads and are opened only through short-lived signed URLs. |
| [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | The attachment metadata and submission workflows require both role grants and row policies. Procedures use `security invoker` where caller-scoped policies can enforce the access decision. |

The implementation does not use a service-role key in client code, does not create public attachment URLs, and validates attachment metadata before the private file identifier is persisted on a homework submission.
