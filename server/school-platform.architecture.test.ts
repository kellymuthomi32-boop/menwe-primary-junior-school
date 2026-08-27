import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("school platform database architecture", () => {
  it("defines the required persistent school records and protects them with Row Level Security", async () => {
    const schema = await read("../supabase/migrations/0001_school_platform.sql");
    for (const table of ["students", "parents", "teachers", "enrollments", "attendance_sessions", "attendance_records", "exams", "exam_results", "report_cards", "invoices", "payments", "admission_applications", "contact_submissions", "message_threads", "audit_logs"]) {
      expect(schema).toContain(`create table public.${table}`);
    }
    expect(schema).toContain("enable row level security");
    expect(schema).toContain("private.can_access_student");
    expect(schema).toContain("private.can_teach_class");
    expect(schema).toContain("create trigger attendance_audit");
    expect(schema).toContain("create trigger exam_results_audit");
    expect(schema).toContain("create trigger payments_audit");
  });

  it("keeps public submissions constrained and payment completion separate from payment initiation", async () => {
    const [workflows, schema] = await Promise.all([
      read("../supabase/migrations/0004_school_workflow_functions_and_scope.sql"),
      read("../supabase/migrations/0001_school_platform.sql"),
    ]);
    const admissionStorage = await read("../supabase/migrations/0005_private_admission_document_storage.sql");
    expect(workflows).toContain("create or replace function public.submit_admission");
    expect(workflows).toContain("create or replace function public.create_payment_intent");
    expect(workflows).toContain("'PENDING'::public.payment_status");
    expect(schema).toContain("verified_by_system");
    expect(admissionStorage).toContain("file_size_limit");
    expect(admissionStorage).toContain("admission_documents_admin_read");
  });

  it("applies grades through the school’s saved grading configuration", async () => {
    const grading = await read("../supabase/migrations/0009_configurable_grading.sql");
    const portal = await read("../client/src/pages/PortalPages.tsx");
    expect(grading).toContain("public.grading_rules");
    expect(grading).toContain("exam_results_apply_configured_grade");
    expect(grading).toContain("new.grade := configured_grade");
    expect(portal).toContain("Its grade is calculated from the saved grading rules.");
    expect(portal).not.toContain('grade: percent >= 80 ? "A"');
    expect(portal).toContain('if (mode !== "report") return');
  });

  it("provides a one-time Super Administrator bootstrap that locks itself after a privileged account exists", async () => {
    const bootstrap = await read("../supabase/bootstrap/claim-first-super-admin.sql");
    expect(bootstrap).toContain("__OWNER_EMAIL__");
    expect(bootstrap).toContain("A Super Administrator already exists");
    expect(bootstrap).toContain("candidate_count <> 1");
  });

  it("exposes gallery files publicly only through published gallery records and indexes advisor-identified foreign keys", async () => {
    const [galleryPolicy, indexes] = await Promise.all([
      read("../supabase/migrations/0010_published_gallery_media_read.sql"),
      read("../supabase/migrations/0011_cover_unindexed_foreign_keys.sql"),
    ]);
    expect(galleryPolicy).toContain("files_published_gallery_read");
    expect(galleryPolicy).toContain("gi.status = 'PUBLISHED'");
    expect(galleryPolicy).toContain("ga.status = 'PUBLISHED'");
    expect(indexes).toContain("create index if not exists exam_results_subject_idx");
    expect(indexes).toContain("create index if not exists uploaded_files_owner_idx");
  });

  it("saves fee structures and multi-line invoices through atomic administrator-only procedures", async () => {
    const [finance, portal] = await Promise.all([
      read("../supabase/migrations/0014_atomic_finance_setup_workflows.sql"),
      read("../client/src/pages/PortalPages.tsx"),
    ]);
    expect(finance).toContain("create_fee_structure_with_items");
    expect(finance).toContain("create_invoice_with_items");
    expect(finance).toContain("Only school administrators can create invoices");
    expect(portal).toContain('rpc("create_fee_structure_with_items"');
    expect(portal).toContain('rpc("create_invoice_with_items"');
  });

  it("keeps streams and teaching responsibilities as persisted academic relationships", async () => {
    const portal = await read("../client/src/pages/PortalPages.tsx");
    expect(portal).toContain('insertRow("streams"');
    expect(portal).toContain('insertRow("class_subjects"');
    expect(portal).toContain('insertRow("teacher_subjects"');
    expect(portal).toContain('updateRow("classes", values.class_id, { class_teacher_id: values.teacher_id || null })');
  });

  it("provides administrators with a persisted invoice directory without treating pending payments as settled", async () => {
    const portal = await read("../client/src/pages/PortalPages.tsx");
    expect(portal).toContain("function AdminInvoiceDirectory()");
    expect(portal).toContain('payment.status) === "VERIFIED"');
    expect(portal).toContain('value="OVERDUE"');
    expect(portal).toContain('<AdminInvoiceDirectory />');
  });

  it("uses scoped database procedures for homework submission, marking, and marking notifications", async () => {
    const portal = await read("../client/src/pages/PortalPages.tsx");
    const migration = await read("../supabase/migrations/0015_homework_submission_and_marking_workflows.sql");
    expect(portal).toContain('rpc("submit_homework_submission"');
    expect(portal).toContain('rpc("mark_homework_submission"');
    expect(migration).toContain('private.current_student_id()');
    expect(migration).toContain("join public.enrollments e on e.class_id = h.class_id");
    expect(migration).toContain("insert into public.notifications");
  });

  it("keeps Admissions, Contact, Gallery, and Portal Login headings connected to saved CMS records", async () => {
    const publicPages = await read("../client/src/pages/PublicPages.tsx");
    const portal = await read("../client/src/pages/PortalPages.tsx");
    expect(publicPages).toContain('usePage("admissions")');
    expect(publicPages).toContain('usePage("contact")');
    expect(publicPages).toContain('usePage("gallery")');
    expect(publicPages).toContain('usePage("portal-login")');
    expect(portal).toContain('["home","about","academics","admissions","contact","gallery","portal-login"]');
  });

  it("provides audit history without exposing raw metadata or public routes", async () => {
    const operations = await read("../client/src/pages/OperationsAdmin.tsx");
    expect(operations).toContain("function AuditPanel()");
    expect(operations).toContain('getRows("audit_logs", "id,action,entity_type,entity_id,created_at"');
    expect(operations).toContain("without displaying raw record payloads or credentials");
  });

  it("ships baseline SEO metadata and deployment security headers", async () => {
    const vercel = await read("../vercel.json");
    const html = await read("../client/index.html");
    const robots = await read("../client/public/robots.txt");
    expect(vercel).toContain("Content-Security-Policy");
    expect(vercel).toContain("X-Content-Type-Options");
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="robots"');
    expect(robots).toContain("Sitemap:");
  });

  it("exposes persisted notifications through a recipient-scoped portal route", async () => {
    const portal = await read("../client/src/pages/PortalPages.tsx");
    const layout = await read("../client/src/components/PortalLayout.tsx");
    expect(portal).toContain("function NotificationsView()");
    expect(portal).toContain('useRows("notifications", "id,type,title,body,link,read_at,created_at"');
    expect(portal).toContain('updateRow("notifications", text(notice.id), { read_at: new Date().toISOString() })');
    expect(layout).toContain('["Notifications", "notifications", Bell]');
  });

  it("keeps homework attachments private, size-limited, and owner-validated before submission", async () => {
    const portal = await read("../client/src/pages/PortalPages.tsx");
    const migration = await read("../supabase/migrations/0017_private_homework_attachment_storage.sql");
    expect(portal).toContain('storage.from("homework-submissions").upload');
    expect(portal).toContain('storage.from("homework-submissions").createSignedUrl');
    expect(portal).toContain("function StudentAttachmentAccess");
    expect(portal).toContain('p_attachment_file_id: attachmentId');
    expect(migration).toContain("'homework-submissions'");
    expect(migration).toContain("p_attachment_file_id is not null and not exists");
    expect(migration).toContain("byte_size <= 5242880");
  });

  it("keeps payment verification separate, administrator-authorised, and event-audited", async () => {
    const portal = await read("../client/src/pages/PortalPages.tsx");
    const migration = await read("../supabase/migrations/0018_admin_payment_verification_workflow.sql");
    expect(portal).toContain("function PaymentVerificationPanel()");
    expect(portal).toContain('rpc("verify_payment"');
    expect(migration).toContain("if not private.is_admin()");
    expect(migration).toContain("insert into public.payment_events");
    expect(migration).toContain("Only a pending payment can be verified");
  });

  it("does not label all historical enrolments as active in operations reporting", async () => {
    const operations = await read("../client/src/pages/OperationsAdmin.tsx");
    expect(operations).toContain('from("enrollments").select("id", { count: "exact", head: true }).eq("status", "ACTIVE")');
    expect(operations).toContain('"Active enrolment records"');
  });
});
