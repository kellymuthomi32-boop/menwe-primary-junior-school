-- Private profile-photo storage: each signed-in user can manage only files in their own UID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=2097152, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists profile_photos_owner_read on storage.objects;
create policy profile_photos_owner_read on storage.objects for select to authenticated
using (bucket_id='profile-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin()));

drop policy if exists profile_photos_owner_insert on storage.objects;
create policy profile_photos_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and coalesce((metadata->>'size')::bigint,0) <= 2097152 and lower(coalesce(metadata->>'mimetype','')) = any(array['image/jpeg','image/png','image/webp']));

drop policy if exists profile_photos_owner_update on storage.objects;
create policy profile_photos_owner_update on storage.objects for update to authenticated
using (bucket_id='profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id='profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text and coalesce((metadata->>'size')::bigint,0) <= 2097152 and lower(coalesce(metadata->>'mimetype','')) = any(array['image/jpeg','image/png','image/webp']));

drop policy if exists profile_photos_owner_delete on storage.objects;
create policy profile_photos_owner_delete on storage.objects for delete to authenticated
using (bucket_id='profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
