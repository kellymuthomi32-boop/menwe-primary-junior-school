import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("school platform canonical architecture", () => {
  it("uses canonical Supabase academic, enrolment, attendance and finance models", async () => {
    const [academics, enrollment, attendance, finance] = await Promise.all([
      read("../client/src/pages/AcademicDirectory.tsx"), read("../client/src/pages/EnrollmentDirectory.tsx"),
      read("../client/src/pages/AttendanceDirectory.tsx"), read("../client/src/pages/FinanceDirectory.tsx"),
    ]);
    expect(academics).toContain('academic_periods'); expect(academics).toContain('academic_terms');
    expect(academics).not.toContain('academic_years');
    expect(enrollment).toContain('enrollments'); expect(attendance).toContain('attendance');
    expect(finance).toContain('charges'); expect(finance).toContain('payment_allocations');
    expect(finance).not.toContain('from("invoices")');
  });

  it("keeps messaging and gallery hardening in the current production architecture", async () => {
    const [messages, hardening, gallery] = await Promise.all([
      read("../client/src/pages/MessageCenter.tsx"), read("../supabase/migrations/0020_message_workflow_linter_hardening.sql"),
      read("../supabase/migrations/0011_harden_messaging_and_gallery_storage.sql"),
    ]);
    expect(messages).toContain('rpc("my_messages")'); expect(messages).toContain('rpc("send_message")'); expect(messages).toContain('rpc("mark_message_read")');
    expect(hardening).toContain('search_path'); expect(gallery).toContain('public-assets'); expect(gallery).toContain('10485760');
  });

  it("persists initial school setup through canonical Supabase tables", async () => {
    const [setup, migration] = await Promise.all([read("../client/src/pages/SchoolSetupPage.tsx"), read("../supabase/migrations/202608280001_school_settings.sql")]);
    for (const table of ['school_settings', 'academic_periods', 'academic_terms', 'classes', 'subjects']) expect(setup).toContain(`from("${table}")`);
    expect(setup).not.toContain('from("streams")'); expect(migration).toContain('enable row level security');
  });

  it("keeps portal administration role-gated and profile identity canonical", async () => {
    const [portal, layout] = await Promise.all([read("../client/src/pages/PortalPages.tsx"), read("../client/src/components/PortalLayout.tsx")]);
    expect(portal).toContain('isAdministrator'); expect(portal).toContain('profile.status !== "ACTIVE"');
    expect(layout).toContain('profile?.display_name'); expect(layout).not.toContain('profile?.full_name');
  });

  it("ships public-content and deployment security basics", async () => {
    const [vercel, html, robots, publicPages] = await Promise.all([read("../vercel.json"), read("../client/index.html"), read("../client/public/robots.txt"), read("../client/src/pages/PublicPages.tsx")]);
    expect(vercel).toContain('Content-Security-Policy'); expect(vercel).toContain('X-Content-Type-Options');
    expect(html).toContain('property="og:title"'); expect(html).toContain('name="robots"'); expect(robots).toContain('Sitemap:');
    expect(publicPages).toContain('usePage("admissions")'); expect(publicPages).toContain('usePage("contact")');
  });
});
