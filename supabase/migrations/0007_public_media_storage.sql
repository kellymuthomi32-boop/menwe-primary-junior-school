insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-media', 'public-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

create policy public_media_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'public-media');

create policy public_media_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-media' and private.is_admin());

create policy public_media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'public-media' and private.is_admin())
  with check (bucket_id = 'public-media' and private.is_admin());

create policy public_media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-media' and private.is_admin());
