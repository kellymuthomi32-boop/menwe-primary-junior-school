import { CalendarDays, Download, Loader2, Printer, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, any>;
type Programme = "primary" | "junior";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const programmeForLevel = (level: unknown): Programme => /grade\s*[789]|junior|jss/i.test(String(level ?? "")) ? "junior" : "primary";
const teacherName = (row: Row | null) => row ? [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ") || row.employee_number || "Teacher" : "Teacher";
const minutes = (value: unknown) => { const [h, m] = String(value ?? "00:00").slice(0, 5).split(":").map(Number); return h * 60 + m; };
const formatTime = (value: unknown) => { const [h, m] = String(value ?? "00:00").slice(0, 5).split(":").map(Number); const suffix = h >= 12 ? "p.m." : "a.m."; const hour = h % 12 || 12; return `${hour}:${String(m).padStart(2, "0")} ${suffix}`; };

export default function TeacherTimetablePage() {
  const { user, profile } = useSchoolAuth();
  const [teacher, setTeacher] = useState<Row | null>(null);
  const [entries, setEntries] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError("");
    try {
      const db = getSupabase();
      const tr = await db.from("teachers").select("id,profile_id,first_name,middle_name,last_name,employee_number").eq("profile_id", user.id).eq("status", "ACTIVE").maybeSingle();
      if (tr.error) throw tr.error;
      if (!tr.data?.id) throw new Error("Your teacher record is not linked to this account yet. Please ask an administrator to link it.");
      const result = await db.from("timetable_entries").select("id,class_id,subject_id,day_of_week,starts_at,ends_at,room,classes(name,level),subjects(name,code)").eq("teacher_id", tr.data.id).order("day_of_week").order("starts_at");
      if (result.error) throw result.error;
      setTeacher(tr.data); setEntries(result.data ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your timetable could not be loaded."); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => days.map((day, index) => ({ day, entries: entries.filter(e => Number(e.day_of_week) === index + 1) })), [entries]);
  const divisions = useMemo(() => [...new Set(entries.map(e => programmeForLevel(e.classes?.level)))], [entries]);
  const handleDownload = () => window.print();

  return <PortalLayout role="TEACHER">
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header className="menwe-admin-hero rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="menwe-admin-kicker"><CalendarDays size={14}/> Teacher timetable</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">My teaching timetable</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">Only lessons assigned to your teacher account are shown. If you teach in both Primary and Junior School, both divisions appear together automatically.</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15"><RefreshCw size={16}/> Refresh</button>
            <button type="button" onClick={handleDownload} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[var(--ink)] hover:opacity-95"><Download size={16}/> Download / Print PDF</button>
          </div>
        </div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[var(--accent)]"/></div> : <>
        <section className="print-header hidden rounded-2xl border border-[var(--ink)]/10 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[.14em]">Menwe Primary & Junior School</p>
          <h2 className="mt-1 text-2xl font-extrabold">Teacher Timetable — {teacherName(teacher)}</h2>
          <p className="mt-1 text-sm text-[var(--ink)]/60">8:20 a.m.–3:10 p.m. · {divisions.includes("junior") ? "Junior lessons: 40 minutes" : "Primary lessons: 35 minutes"}{divisions.length > 1 ? " · Primary + Junior assignments" : ""}</p>
        </section>

        <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7">
          <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="menwe-premium-label">Personal schedule</p><h2 className="menwe-premium-title mt-1">{teacherName(teacher)}</h2><p className="mt-2 text-sm text-[var(--ink)]/55">{entries.length} assigned lesson{entries.length === 1 ? "" : "s"} · {divisions.map(d => d === "junior" ? "Junior" : "Primary").join(" + ") || "No assignments yet"}</p></div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--mist)] px-3 py-2 text-xs font-bold text-[var(--accent)]"><Printer size={14}/> Print-friendly</div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            {grouped.map(({ day, entries: dayEntries }) => <section key={day} className="overflow-hidden rounded-2xl border border-[var(--ink)]/10 bg-white">
              <div className="border-b border-[var(--ink)]/10 bg-[var(--mist)]/45 px-4 py-3"><h3 className="font-extrabold">{day}</h3><p className="mt-0.5 text-xs text-[var(--ink)]/45">{dayEntries.length} lesson{dayEntries.length === 1 ? "" : "s"}</p></div>
              <div className="space-y-2 p-3">
                {dayEntries.map(entry => { const cls = entry.classes ?? {}; const subject = entry.subjects ?? {}; const division = programmeForLevel(cls.level); return <article key={String(entry.id)} className="rounded-xl border border-[var(--ink)]/8 p-3">
                  <div className="flex items-start justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[.06em] ${division === "junior" ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--mist)] text-[var(--ink)]/65"}`}>{division === "junior" ? "Junior" : "Primary"}</span><span className="text-[11px] font-bold text-[var(--ink)]/50">{formatTime(entry.starts_at)}–{formatTime(entry.ends_at)}</span></div>
                  <h4 className="mt-3 text-sm font-extrabold">{subject.name || "Subject"}</h4><p className="mt-1 text-xs font-semibold text-[var(--ink)]/60">{cls.name || "Class"}{entry.room ? ` · Room ${entry.room}` : ""}</p>
                </article>; })}
                {!dayEntries.length && <div className="rounded-xl border border-dashed border-[var(--ink)]/10 px-3 py-6 text-center text-xs text-[var(--ink)]/40">Free / no assigned lesson</div>}
              </div>
            </section>)}
          </div>
        </section>

        <section className="no-print grid gap-4 sm:grid-cols-3">
          <div className="menwe-card rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45">Assigned lessons</p><p className="mt-2 text-3xl font-black">{entries.length}</p></div>
          <div className="menwe-card rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45">Teaching divisions</p><p className="mt-2 text-3xl font-black">{divisions.length}</p><p className="mt-1 text-xs text-[var(--ink)]/45">{divisions.map(d => d === "junior" ? "Junior" : "Primary").join(" + ") || "None"}</p></div>
          <div className="menwe-card rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45">Free weekdays</p><p className="mt-2 text-3xl font-black">{grouped.filter(g => !g.entries.length).length}</p></div>
        </section>
      </>}
    </main>
    <style>{`@media print { body { background: white !important; } .no-print, nav, header:not(.print-header) { display: none !important; } .print-header { display: block !important; } main { max-width: none !important; padding: 0 !important; } .menwe-card { box-shadow: none !important; border: 0 !important; padding: 0 !important; } .lg\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; } article { break-inside: avoid; } }`}</style>
  </PortalLayout>;
}
