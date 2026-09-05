import MediaManagerPage from "./MediaManagerPage";

/**
 * Backwards-compatible entry point for the existing Admin Dashboard Gallery card.
 * The gallery workspace is now the unified site-wide media manager so admins can
 * manage both fixed site image slots and gallery uploads from one place.
 */
export default function GalleryManagementPage() {
  return <MediaManagerPage />;
}
