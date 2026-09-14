-- Give the principal a first-class role instead of requiring the account to be ADMIN.
-- This migration intentionally only changes the enum. The new value is used by
-- the following migration after this transaction has committed.

alter type public.app_role add value if not exists 'HEAD_OF_INSTITUTION';
