drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid()) or private.is_admin()) with check (id = (select auth.uid()) or private.is_admin());

drop policy if exists files_owner_read on public.uploaded_files;
create policy files_owner_read on public.uploaded_files for select to authenticated using (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists files_owner_create on public.uploaded_files;
create policy files_owner_create on public.uploaded_files for insert to authenticated with check (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists files_owner_update on public.uploaded_files;
create policy files_owner_update on public.uploaded_files for update to authenticated using (owner_id = (select auth.uid()) or private.is_admin()) with check (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists homework_submissions_create on public.homework_submissions;
create policy homework_submissions_create on public.homework_submissions for insert to authenticated with check (exists (select 1 from public.students s where s.id = student_id and s.profile_id = (select auth.uid())));

drop policy if exists notifications_self_read on public.notifications;
create policy notifications_self_read on public.notifications for select to authenticated using (profile_id = (select auth.uid()));

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update on public.notifications for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy if exists threads_create on public.message_threads;
create policy threads_create on public.message_threads for insert to authenticated with check (created_by = (select auth.uid()));

drop policy if exists participants_create on public.thread_participants;
create policy participants_create on public.thread_participants for insert to authenticated with check (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists messages_create on public.messages;
create policy messages_create on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and private.can_access_thread(thread_id));
