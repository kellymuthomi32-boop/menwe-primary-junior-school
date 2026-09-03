-- RLS policies invoke these authorization helpers as the authenticated role.
-- Keep execution unavailable to anonymous callers while allowing policy evaluation.
-- This migration is already applied to production; keep the grants source-controlled for reproducible deployments.
grant execute on function private.can_teach_class(uuid) to authenticated;
grant execute on function private.can_teach_exam_subject(uuid, uuid) to authenticated;
grant execute on function private.can_access_subject(uuid) to authenticated;
grant execute on function private.can_access_thread(uuid) to authenticated;
grant execute on function private.can_message_profile(uuid) to authenticated;

revoke execute on function private.can_teach_class(uuid) from anon;
revoke execute on function private.can_teach_exam_subject(uuid, uuid) from anon;
revoke execute on function private.can_access_subject(uuid) from anon;
revoke execute on function private.can_access_thread(uuid) from anon;
revoke execute on function private.can_message_profile(uuid) from anon;
