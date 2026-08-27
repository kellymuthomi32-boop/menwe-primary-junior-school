import { getSupabase } from "./supabase";

export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

const readableListTables = new Set([
  "academic_years", "admission_applications", "attendance_sessions", "audit_logs", "classes", "contact_submissions", "exam_results", "gallery_albums", "grading_rules", "invoices", "parents", "payments", "school_settings", "students", "subjects", "teachers", "terms",
]);
const readableOrderColumns = new Set(["created_at", "updated_at", "starts_at", "starts_on", "sort_order"]);

export async function getPublishedPage(slug: string) {
  const { data, error } = await getSupabase()
    .from("content_pages")
    .select("slug,title,headline,body,seo_description,updated_at")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .maybeSingle();
  if (error) throw error;
  return data as { slug: string; title: string; headline: string | null; body: Record<string, unknown>; seo_description: string | null; updated_at: string } | null;
}

export async function listPublished(table: "news_articles" | "events" | "gallery_albums", page = 0, size = 12) {
  const client = getSupabase();
  const query = client.from(table).select("*", { count: "exact" }).eq("status", "PUBLISHED");
  const ordered = table === "events" ? query.order("starts_at", { ascending: true }) : query.order("published_at", { ascending: false });
  const { data, error, count } = await ordered.range(page * size, page * size + size - 1);
  if (error) throw error;
  return { data: (data ?? []) as Record<string, unknown>[], count: count ?? 0 };
}

export async function submitContact(input: { name: string; email?: string; phone?: string; subject?: string; message: string }) {
  const { data, error } = await getSupabase().rpc("submit_contact", {
    p_name: input.name,
    p_email: input.email || null,
    p_phone: input.phone || null,
    p_subject: input.subject || null,
    p_message: input.message,
  });
  if (error) throw error;
  return data as string;
}

export async function uploadAdmissionDocument(file: File) {
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) throw new Error("Upload a PDF, JPG, or PNG document.");
  if (file.size > 5 * 1024 * 1024) throw new Error("The supporting document must be 5 MB or smaller.");
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
  const path = `admission-submissions/${crypto.randomUUID()}-${safeFilename}`;
  const { error } = await getSupabase().storage.from("admission-documents").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function submitAdmission(input: Record<string, string | null>) {
  const { data, error } = await getSupabase().rpc("submit_admission", {
    p_student_first_name: input.student_first_name,
    p_student_last_name: input.student_last_name,
    p_date_of_birth: input.date_of_birth || null,
    p_gender: input.gender || null,
    p_current_school: input.current_school || null,
    p_grade_applying_for: input.grade_applying_for,
    p_guardian_name: input.guardian_name,
    p_guardian_phone: input.guardian_phone,
    p_guardian_email: input.guardian_email || null,
    p_guardian_relationship: input.guardian_relationship || null,
    p_address: input.address || null,
    p_additional_information: input.additional_information || null,
    p_supporting_storage_path: input.supporting_storage_path || null,
  });
  if (error) throw error;
  return (data as { reference: string }[])[0]?.reference;
}

export async function getRows(table: string, select = "*", page = 0, size = 25, order = "created_at") {
  if (!readableListTables.has(table)) throw new Error("This record list is not available through the shared browser data helper.");
  if (!readableOrderColumns.has(order)) throw new Error("This record list uses an unsupported order field.");
  if (!/^[a-zA-Z0-9_*,().\s]+$/.test(select)) throw new Error("This record list uses an invalid select expression.");
  const safePage = Math.max(0, Math.floor(page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(size)));
  const { data, error, count } = await getSupabase().from(table).select(select, { count: "exact" }).order(order, { ascending: false }).range(safePage * safeSize, safePage * safeSize + safeSize - 1);
  if (error) throw error;
  return { data: (data ?? []) as unknown as Record<string, unknown>[], count: count ?? 0 };
}

export async function insertRow(table: string, values: Record<string, unknown>) {
  const { data, error } = await getSupabase().from(table).insert(values).select().single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function updateRow(table: string, id: string, values: Record<string, unknown>) {
  const { data, error } = await getSupabase().from(table).update(values).eq("id", id).select().single();
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function countRows(table: string) {
  const query = getSupabase().from(table).select("*", { count: "exact", head: true });
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
