-- Keep public published reads independent from the authenticated-only admin helper.
-- A shared policy containing `OR private.is_admin()` makes anonymous reads fail
-- because anon is intentionally not allowed to execute private.is_admin().

-- Site-wide CMS media used by the public homepage and other public pages.
drop policy if exists site_media_public_read on public.site_media;
create policy site_media_public_read
  on public.site_media for select to anon, authenticated
  using (is_published = true);
create policy site_media_admin_read
  on public.site_media for select to authenticated
  using (private.is_admin());

-- Published gallery albums and images.
drop policy if exists albums_public_read on public.gallery_albums;
create policy albums_public_read
  on public.gallery_albums for select to anon, authenticated
  using (status = 'PUBLISHED');
create policy albums_admin_read
  on public.gallery_albums for select to authenticated
  using (private.is_admin());

drop policy if exists gallery_public_read on public.gallery_images;
create policy gallery_public_read
  on public.gallery_images for select to anon, authenticated
  using (
    status = 'PUBLISHED'
    and exists (
      select 1
      from public.gallery_albums a
      where a.id = album_id and a.status = 'PUBLISHED'
    )
  );
create policy gallery_admin_read
  on public.gallery_images for select to authenticated
  using (private.is_admin());

-- Other public CMS reads affected by the same helper-permission issue.
drop policy if exists pages_public_read on public.content_pages;
create policy pages_public_read
  on public.content_pages for select to anon, authenticated
  using (status = 'PUBLISHED');
create policy pages_admin_read
  on public.content_pages for select to authenticated
  using (private.is_admin());

drop policy if exists events_public_read on public.events;
create policy events_public_read
  on public.events for select to anon, authenticated
  using (status = 'PUBLISHED');
create policy events_admin_read
  on public.events for select to authenticated
  using (private.is_admin());

drop policy if exists news_public_read on public.news_articles;
create policy news_public_read
  on public.news_articles for select to anon, authenticated
  using (status = 'PUBLISHED');
create policy news_admin_read
  on public.news_articles for select to authenticated
  using (private.is_admin());

drop policy if exists settings_public_read on public.school_settings;
create policy settings_public_read
  on public.school_settings for select to anon, authenticated
  using (is_public = true);
create policy settings_admin_read
  on public.school_settings for select to authenticated
  using (private.is_admin());
