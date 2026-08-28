import { getSupabase } from "./supabase";

export type PublicationStatus = "Draft" | "Published" | "Archived";
const readableListTables = new Set(["academic_periods", "academic_terms", "applications", "attendance", "audit_logs", "classes", "contact_submissions", "content_pages", "exam_results", "gallery_albums", "news_articles", "notifications", "charges", "payments", "students", "subjects", "teacher_assignments", "staff_members"]);
const readableOrderColumns = new Set(["created_at", "updated_at", "starts_at", "attendance_date", "sort_order"]);

export async function getPublishedPage(slug: string) {
  const { data, error } = await getSupabase().from("content_pages").select("slug,title,headline,body,updated_at").eq("slug", slug).eq("status", "Published").maybeSingle();
  if (error) throw error;
  return data as { slug: string; title: string; headline: string | null; body: Record<string, unknown>; updated_at: string } | null;
}

export async function listPublished(type: "news_articles" | "events", page = 0, size = 12) {
  const client = getSupabase();
  const query = type === "news_articles"
    ? client.from("news_articles").select("*", { count: "exact" }).eq("status", "Published").order("published_at", { ascending: false })
    : client.from("events").select("*", { count: "exact" }).order("starts_at", { ascending: true });
  const { data, error, count } = await query.range(page * size, page * size + size - 1);
  if (error) throw error;
  return { data: (data ?? []) as Record<string, unknown>[], count: count ?? 0 };
}

export async function submitContact(input: { name: string; email?: string; phone?: string; subject?: string; message: string }) {
  const { data, error } = await getSupabase().from("contact_submissions").insert({ name: input.name.trim(), email: input.email || null, phone: input.phone || null, subject: input.subject || null, message: input.message.trim(), status: "New" }).select("id").single();
  if (error) throw error; return data.id as string;
}

export async function uploadAdmissionDocument(file: File) {
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) throw new Error("Upload a PDF, JPG, or PNG document.");
  if (file.size > 5 * 1024 * 1024) throw new Error("The supporting document must be 5 MB or smaller.");
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
  const path = `admission-submissions/${crypto.randomUUID()}-${safeFilename}`;
  const { error } = await getSupabase().storage.from("admission-documents").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error; return path;
}

export async function submitAdmission(input: Record<string, string | null>) {
  const studentName = [input.student_first_name, input.student_last_name].filter(Boolean).join(" ").trim();
  const parentName = input.guardian_name?.trim() || "Parent/Guardian";
  const { data, error } = await getSupabase().from("applications").insert({
    student_name: studentName, parent_name: parentName, parent_email: input.guardian_email?.trim() || "not-provided@application.local",
    parent_phone: input.guardian_phone || null, requested_class_id: input.requested_class_id || null, status: "Submitted",
    notes: input.additional_information || null,
  }).select("reference,id").single();
  if (error) throw error; return (data.reference as string) || `APP-${String(data.id).replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export async function getRows(table: string, select = "*", page = 0, size = 25, order = "created_at") {
  if (!readableListTables.has(table)) throw new Error("This record list is not available through the shared browser data helper.");
  if (!readableOrderColumns.has(order)) throw new Error("This record list uses an unsupported order field.");
  if (!/^[a-zA-Z0-9_*,().\s]+$/.test(select)) throw new Error("This record list uses an invalid select expression.");
  const safePage = Math.max(0, Math.floor(page)); const safeSize = Math.min(100, Math.max(1, Math.floor(size)));
  const { data, error, count } = await getSupabase().from(table).select(select, { count: "exact" }).order(order, { ascending: false }).range(safePage * safeSize, safePage * safeSize + safeSize - 1);
  if (error) throw error; return { data: (data ?? []) as unknown as Record<string, unknown>[], count: count ?? 0 };
}
export async function insertRow(table: string, values: Record<string, unknown>) { const { data, error } = await getSupabase().from(table).insert(values).select().single(); if (error) throw error; return data as Record<string, unknown>; }
export async function updateRow(table: string, id: string, values: Record<string, unknown>) { const { data, error } = await getSupabase().from(table).update(values).eq("id", id).select().single(); if (error) throw error; return data as Record<string, unknown>; }
export async function countRows(table: string) { const { count, error } = await getSupabase().from(table).select("*", { count: "exact", head: true }); if (error) throw error; return count ?? 0; }
