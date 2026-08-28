create or replace function public.message_directory()
returns table (id uuid, display_name text, email text, role text)
language sql security definer set search_path = public, auth as $$
  with me as (select p.role, p.student_ids from public.profiles p where p.id = auth.uid()),
  my_students as (select s.id, s.class_id from public.students s, me where s.id = any(coalesce(me.student_ids, '{}'::uuid[])) or s.parent_user_ids @> array[auth.uid()]::uuid[]),
  my_classes as (select ta.class_id from public.teacher_assignments ta where ta.teacher_id = auth.uid() union select c.id from public.classes c where c.teacher_id = auth.uid())
  select p.id, coalesce(nullif(p.display_name,''), p.email), p.email, p.role from public.profiles p cross join me
  where p.id <> auth.uid() and p.is_approved and not p.is_disabled and (
    me.role in ('admin','head_of_institution','deputy_hoi')
    or (me.role in ('teacher','class_teacher','classroom_teacher') and (p.role in ('admin','head_of_institution','deputy_hoi') or exists (select 1 from public.students s where s.class_id in (select class_id from my_classes) and (p.id = any(coalesce(s.parent_user_ids, '{}'::uuid[])) or s.student_user_id = p.id))))
    or (me.role = 'parent' and (p.role in ('admin','head_of_institution','deputy_hoi') or (p.role in ('teacher','class_teacher','classroom_teacher') and exists (select 1 from public.teacher_assignments ta join my_students ms on ms.class_id = ta.class_id where ta.teacher_id = p.id)) or (p.role in ('teacher','class_teacher','classroom_teacher') and exists (select 1 from public.classes c join my_students ms on ms.class_id = c.id where c.teacher_id = p.id))))
  ) order by coalesce(nullif(p.display_name,''), p.email)
$$;

create or replace function public.send_message(p_recipient_id uuid, p_subject text, p_body text) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  if not exists (select 1 from public.message_directory() d where d.id = p_recipient_id) then raise exception 'Recipient is not authorised for this conversation' using errcode='42501'; end if;
  if length(btrim(coalesce(p_subject,''))) > 200 or length(btrim(coalesce(p_body,''))) < 1 or length(btrim(p_body)) > 5000 then raise exception 'Invalid message content' using errcode='22023'; end if;
  insert into public.messages(sender_id, subject, body) values (auth.uid(), coalesce(nullif(btrim(p_subject),''),'Message'), btrim(p_body)) returning id into v_id;
  insert into public.message_recipients(message_id, recipient_id) values (v_id, p_recipient_id);
  insert into public.notifications(recipient_id, title, body, category) values (p_recipient_id, coalesce(nullif(btrim(p_subject),''),'New message'), 'You have received a new message.', 'message');
  insert into public.audit_logs(actor_id, action, resource, record_id, new_value) values (auth.uid(), 'message.sent', 'messages', v_id, jsonb_build_object('recipient_id', p_recipient_id));
  return v_id;
end;
$$;

create or replace function public.my_messages() returns table (id uuid, direction text, other_profile_id uuid, other_display_name text, other_email text, subject text, body text, created_at timestamptz, read_at timestamptz)
language sql security definer set search_path = public, auth as $$
  select m.id, 'inbox'::text, p.id, coalesce(nullif(p.display_name,''), p.email), p.email, m.subject, m.body, m.created_at, mr.read_at from public.messages m join public.message_recipients mr on mr.message_id = m.id join public.profiles p on p.id = m.sender_id where mr.recipient_id = auth.uid()
  union all
  select m.id, 'sent'::text, p.id, coalesce(nullif(p.display_name,''), p.email), p.email, m.subject, m.body, m.created_at, null::timestamptz from public.messages m join public.message_recipients mr on mr.message_id = m.id join public.profiles p on p.id = mr.recipient_id where m.sender_id = auth.uid()
  order by created_at desc
$$;

create or replace function public.mark_message_read(p_message_id uuid) returns void language plpgsql security definer set search_path = public, auth as $$ begin update public.message_recipients set read_at = coalesce(read_at, now()) where message_id = p_message_id and recipient_id = auth.uid(); if not found then raise exception 'Message is not accessible' using errcode='42501'; end if; end; $$;
revoke all on function public.message_directory() from public, anon;
revoke all on function public.send_message(uuid,text,text) from public, anon;
revoke all on function public.my_messages() from public, anon;
revoke all on function public.mark_message_read(uuid) from public, anon;
grant execute on function public.message_directory() to authenticated;
grant execute on function public.send_message(uuid,text,text) to authenticated;
grant execute on function public.my_messages() to authenticated;
grant execute on function public.mark_message_read(uuid) to authenticated;
