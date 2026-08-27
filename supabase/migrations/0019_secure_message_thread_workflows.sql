-- Keeps direct participant enrollment constrained while moving legitimate cross-profile
-- thread creation and reply notification fan-out into narrowly validated procedures.

drop policy if exists participants_scoped_create on public.thread_participants;
create policy participants_scoped_create on public.thread_participants
for insert to authenticated
with check (
  private.is_admin()
  or (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.message_threads mt
      where mt.id = thread_id and mt.created_by = (select auth.uid())
    )
  )
);

create or replace function public.create_message_thread(
  p_recipient_id uuid,
  p_subject text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_thread_id uuid;
  v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  v_body text := btrim(coalesce(p_body, ''));
begin
  if auth.uid() is null then
    raise exception 'You must sign in to send a message' using errcode = '42501';
  end if;
  if not private.can_message_profile(p_recipient_id) then
    raise exception 'The selected recipient is not authorised for messaging' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then
    raise exception 'Message content must contain between 1 and 5000 characters' using errcode = '22023';
  end if;
  if v_subject is not null and char_length(v_subject) > 200 then
    raise exception 'Message subject must not exceed 200 characters' using errcode = '22023';
  end if;

  insert into public.message_threads (subject, created_by)
  values (v_subject, auth.uid())
  returning id into v_thread_id;
  insert into public.thread_participants (thread_id, profile_id, last_read_at)
  values (v_thread_id, auth.uid(), now()), (v_thread_id, p_recipient_id, null);
  insert into public.messages (thread_id, sender_id, body)
  values (v_thread_id, auth.uid(), v_body);
  insert into public.notifications (profile_id, type, title, body, link)
  values (p_recipient_id, 'MESSAGE', coalesce(v_subject, 'New message'), 'You have received a new secure message.', '/portal/messages');
  return v_thread_id;
end;
$$;

create or replace function public.reply_to_message_thread(
  p_thread_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_subject text;
begin
  if auth.uid() is null or not private.can_access_thread(p_thread_id) then
    raise exception 'You are not authorised to reply to this conversation' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then
    raise exception 'Message content must contain between 1 and 5000 characters' using errcode = '22023';
  end if;

  select subject into v_subject from public.message_threads where id = p_thread_id for update;
  if not found then
    raise exception 'Conversation was not found' using errcode = 'P0002';
  end if;
  insert into public.messages (thread_id, sender_id, body)
  values (p_thread_id, auth.uid(), v_body);
  update public.message_threads set updated_at = now() where id = p_thread_id;
  update public.thread_participants set last_read_at = now()
  where thread_id = p_thread_id and profile_id = auth.uid();
  insert into public.notifications (profile_id, type, title, body, link)
  select tp.profile_id, 'MESSAGE', coalesce(v_subject, 'New message'), 'You have received a new secure message.', '/portal/messages'
  from public.thread_participants tp
  where tp.thread_id = p_thread_id and tp.profile_id <> auth.uid();
end;
$$;

create or replace function public.mark_message_thread_read(p_thread_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not private.can_access_thread(p_thread_id) then
    raise exception 'You are not authorised to access this conversation' using errcode = '42501';
  end if;
  update public.thread_participants
  set last_read_at = now()
  where thread_id = p_thread_id and profile_id = auth.uid();
end;
$$;

revoke all on function public.create_message_thread(uuid, text, text) from public, anon;
revoke all on function public.reply_to_message_thread(uuid, text) from public, anon;
revoke all on function public.mark_message_thread_read(uuid) from public, anon;
grant execute on function public.create_message_thread(uuid, text, text) to authenticated;
grant execute on function public.reply_to_message_thread(uuid, text) to authenticated;
grant execute on function public.mark_message_thread_read(uuid) to authenticated;
