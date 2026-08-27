create policy files_published_gallery_read
on public.uploaded_files
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.gallery_images gi
    join public.gallery_albums ga on ga.id = gi.album_id
    where gi.file_id = uploaded_files.id
      and gi.status = 'PUBLISHED'
      and ga.status = 'PUBLISHED'
  )
);
