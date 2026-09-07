import { useState } from "react";
import { FileText, Loader2, Printer } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Student = { id: string; name: string; admission_number: string; upi_number: string | null };
type Grade = { learning_area: string; rubric_score: "EE" | "ME" | "AE" | "BE"; term: string; teacher_remarks: string | null };
type Attendance = { status: string };
const rubric: Record<Grade["rubric_score"], string> = { EE: "Exceeding Expectations", ME: "Meeting Expectations", AE: "Approaching Expectations", BE: "Below Expectations" };

export default function ReportCardButton({ userId }: { userId?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const printReport = async () => {
    if (!userId) return;
    setBusy(true); setMessage("");
    try {
      const db = getSupabase();
      const { data: students, error: studentError } = await db.from("students").select("id,name,admission_number,upi_number").contains("parent_user_ids", [userId]).order("name");
      if (studentError) throw studentError;
      const student = (students ?? [])[0] as Student | undefined;
      if (!student?.upi_number) throw new Error("No linked learner with a UPI number was found.");
      const [g, a] = await Promise.all([
        db.from("cbc_grades").select("learning_area,rubric_score,term,teacher_remarks").eq("learner_upi", student.upi_number).order("created_at", { ascending: false }).limit(20),
        db.from("daily_attendance").select("status").eq("learner_upi", student.upi_number),
      ]);
      if (g.error) throw g.error; if (a.error) throw a.error;
      const grades = (g.data ?? []) as Grade[]; const attendance = (a.data ?? []) as Attendance[];
      const present = attendance.filter(x => x.status === "Present").length;
      const absent = attendance.filter(x => x.status === "Absent").length;
      const late = attendance.filter(x => x.status === "Late").length;
      const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Menwe CBC Report Card - ${escapeHtml(student.name)}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#061229;background:#fff;font-size:11px;margin:0}h1,h2,p{margin:0}.header{text-align:center;border-bottom:3px solid #D89B28;padding-bottom:10px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:12px 0}.box{border:1px solid #ddd;border-radius:8px;padding:8px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f3ee}.remarks{margin-top:10px}.footer{margin-top:14px;border-top:1px solid #ddd;padding-top:8px;font-size:9px}@media print{button{display:none!important}}</style></head><body><div class="header"><h1>Menwe Primary & Junior School</h1><p>Meru Central, South Imenti, Igoki</p><p>CBC Learner Assessment Report</p></div><div class="meta"><div class="box"><b>Learner:</b> ${escapeHtml(student.name)}</div><div class="box"><b>Admission No:</b> ${escapeHtml(student.admission_number)}</div><div class="box"><b>UPI:</b> ${escapeHtml(student.upi_number)}</div><div class="box"><b>Report Date:</b> ${escapeHtml(new Date().toLocaleDateString("en-KE"))}</div></div><h2>CBC Learning Areas</h2><table><thead><tr><th>Learning Area</th><th>Rubric</th><th>Term</th><th>Teacher Remarks</th></tr></thead><tbody>${grades.map(x => `<tr><td>${escapeHtml(x.learning_area)}</td><td><b>${escapeHtml(x.rubric_score)}</b> — ${escapeHtml(rubric[x.rubric_score])}</td><td>${escapeHtml(x.term)}</td><td>${escapeHtml(x.teacher_remarks ?? "—")}</td></tr>`).join("") || '<tr><td colspan="4">No assessment records available.</td></tr>'}</tbody></table><div class="meta"><div class="box"><b>Attendance — Present:</b> ${present}</div><div class="box"><b>Absent:</b> ${absent}</div><div class="box"><b>Late:</b> ${late}</div><div class="box"><b>Total Recorded:</b> ${attendance.length}</div></div><div class="remarks"><b>School Remarks:</b> Learner progress is reported using the Competency-Based Curriculum assessment framework. Please contact the class teacher for detailed guidance.</div><div class="footer">Official school record • Menwe Primary & Junior School • Igoki, Abogeta Division, Meru Central District, Eastern Province • South Imenti Constituency</div></body></html>`;

      const iframe = document.createElement("iframe");
      iframe.setAttribute("title", "Printable report card");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      document.body.appendChild(iframe);
      const frameWindow = iframe.contentWindow;
      const frameDocument = iframe.contentDocument;
      if (!frameWindow || !frameDocument) { iframe.remove(); throw new Error("The print preview could not be prepared."); }
      frameDocument.open();
      frameDocument.write(html);
      frameDocument.close();
      await new Promise<void>(resolve => {
        if (frameDocument.readyState === "complete") resolve();
        else iframe.addEventListener("load", () => resolve(), { once: true });
      });
      window.setTimeout(() => {
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(() => iframe.remove(), 1000);
      }, 100);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to prepare the report card."); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-col items-end gap-2"> <button type="button" onClick={() => void printReport()} disabled={busy || !userId} className="min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-4 font-bold text-[#061229] transition active:scale-[.98] disabled:opacity-60"><Printer size={17}/>{busy ? <><Loader2 size={16} className="animate-spin"/>Preparing…</> : <><FileText size={17}/>Download Report Card</>}</button>{message&&<p role="alert" className="max-w-xs text-right text-xs text-amber-200">{message}</p>}</div>;
}
