-- Messaging SECURITY DEFINER functions intentionally bypass table RLS to provide
-- narrowly scoped cross-table workflows. Keep them authenticated-only and use
-- explicit authorization inside the function bodies.
ALTER FUNCTION public.mark_message_read(uuid) SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.message_directory() SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.my_messages() SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.send_message(uuid, text, text) SET search_path = pg_catalog, public, auth;

REVOKE EXECUTE ON FUNCTION public.mark_message_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.message_directory() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_messages() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_message(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.mark_message_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.message_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, text) TO authenticated;

-- Publication state cannot be enforced with a public bucket. The bucket was
-- verified empty before this migration, so switching it private preserves no
-- existing public objects while enabling per-object publication authorization.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'public-assets';

DROP POLICY IF EXISTS public_assets_published_gallery_read ON storage.objects;
CREATE POLICY public_assets_published_gallery_read
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'public-assets'
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.gallery_images gi ON gi.document_id = d.id
    JOIN public.gallery_albums ga ON ga.id = gi.album_id
    WHERE d.storage_path = storage.objects.name
      AND ga.status = 'Published'
  )
);

ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_gallery_image_mime_check;
ALTER TABLE public.documents
ADD CONSTRAINT documents_gallery_image_mime_check
CHECK (
  category <> 'gallery_image'
  OR (mime_type IN ('image/jpeg','image/png','image/webp','image/gif')
      AND byte_size > 0 AND byte_size <= 10485760)
);
