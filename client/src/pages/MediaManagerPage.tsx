import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { cacheBustedUrl, fetchSiteMedia, type SiteMedia } from "@/lib/siteMedia";

const BUCKET = "public-media";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const text = (v: unknown, fallback = "") => v == null || v === "" ? fallback : String(v);

type GalleryRow = { id: string; album_id: string; file_id: string; caption: string | null; status: string; uploaded_files?: { filename?: string; public_url?: string; mime_type?: string; byte_size?: number } | null };
type Album = { id: string; title: string; description: string | null; status: string };

const slots = [
  ["homepage_hero_1", "Homepage hero — learning", "homepage"], ["homepage_hero_2", "Homepage hero — community", "homepage"],
  ["homepage_hero_3", "Homepage hero — arts", "homepage"], ["homepage_hero_4", "Homepage hero — sport", "homepage"],
  ["homepage_hero_5", "Homepage hero — science", "homepage"], ["principal_photo", "Principal photo", "about"],
  ["about_banner", "About page banner", "about"], ["contact_banner", "Contact page banner", "contact"],
  ["gallery_banner", "Gallery page banner", "gallery"],
] as const;

export default function MediaManagerPage() {
  const { user, profile, loading: authLoading } = useSchoolAuth();
  const [media, setMedia] = useState<SiteMedia[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<typeof slots[number][0]>(slots[0][0]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);