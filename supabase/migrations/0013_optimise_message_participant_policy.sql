drop policy if exists participants_scoped_create on public.thread_participants;
create policy participants_scoped_create on public.thread_participants
for insert to authenticated
with check (profile_id = (select auth.uid()) or private.can_message_profile(profile_id));
