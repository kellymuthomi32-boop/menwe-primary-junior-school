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
});
