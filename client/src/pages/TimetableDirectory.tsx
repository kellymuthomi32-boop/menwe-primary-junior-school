import { CalendarDays, Clock3, Info, Loader2, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, unknown>;
type Programme = "primary" | "junior";
type Slot = { label: string; start: string; end: string; kind: "lesson" | "break" | "lunch" | "activity" };

const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const input = "min-h-11 w-full rounded-xl border border-[var(--ink)]/15 bg-white px-3 py-2.5 text-sm";
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);

/**
 * Menwe timetable standards.
 * Primary: 35-minute lessons, 08:20–15:10, 30-minute break and 12:40–14:00 lunch.
 * Junior: 40-minute lessons. With the same school day and breaks, only 7 full lessons
 * plus a 20-minute activity fit each day; the system therefore warns administrators
 * that the official 40-period weekly allocation cannot fit without changing the day.
 */
const programmeSlots: Record<Programme, Slot[]> = {
  primary: [
    { label: "Lesson 1", start: "08:20", end: "08:55", kind: "lesson" },
    { label: "Lesson 2", start: "08:55", end: "09:30", kind: "lesson" },
    { label: "Lesson 3", start: "09:30", end: "10:05", kind: "lesson" },
    { label: "Lesson 4", start: "10:05", end: "10:40", kind: "lesson" },
    { label: "Break", start: "10:40", end: "11:10", kind: "break" },
    { label: "Lesson 5", start: "11:10", end: "11:45", kind: "lesson" },
    { label: "Lesson 6", start: "11:45", end: "12:20", kind: "lesson" },
    { label: "Class activity / PPI", start: "12:20", end: "12:40", kind: "activity" },
    { label: "Lunch / long break", start: "12:40", end: "14:00", kind: "lunch" },
    { label: "Lesson 7", start: "14:00", end: "14:35", kind: "lesson" },
    { label: "Lesson 8", start: "14:35", end: "15:10", kind: "lesson" },
  ],
  junior: [
    { label: "Lesson 1", start: "08:20", end: "09:00", kind: "lesson" },
    { label: "Lesson 2", start: "09:00", end: "09:40", kind: "lesson" },
    { label: "Lesson 3", start: "09:40", end: "10:20", kind: "lesson" },
    { label: "Lesson 4", start: "10:20", end: "11:00", kind: "lesson" },
    { label: "Break", start: "11:00", end: "11:30", kind: "break" },
    { label: "Lesson 5", start: "11:30", end: "12:10", kind: "lesson" },
    { label: "Lesson 6", start: "12:10", end: "12:40", kind: "activity" },
    { label: "Lunch / long break", start: "12:40", end: "14:00", kind: "lunch" },
    { label: "Lesson 7", start: "14:00", end: "14:40", kind: "lesson" },
    { label: "Closing activity / PPI", start: "14:40", end: "15:10", kind: "activity" },
  ],
};

function programmeForLevel(level: unknown): Programme {
  const value = String(level ?? "").toLowerCase();
  return /grade\s*[789]|junior|jss/.test(value) ? "junior" : "primary";
}

function TimetableTemplate({ programme }: { programme: Programme }) {
  const slots = programmeSlots[programme];
  const lessonMinutes = programme === "primary" ? 35 : 40;
  return (
    <section className="rounded-[1.5rem] border border-[var(--ink)]/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--accent)]">Daily template</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--ink)]">{programme === "primary" ? "Primary School" : "Junior School"}</h2>
          <p className="mt-1 text-sm text-[var(--ink)]/60">{lessonMinutes}-minute lessons · 8:20 a.m.–3:10 p.m.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)]/5 px-3 py-2 text-xs font-semibold text-[var(--ink)]/70"><Clock3 size={14} /> {programme === "primary" ? "35 min" : "40 min"}</div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <div key={`${slot.label}-${slot.start}`} className={`rounded-xl border px-3 py-3 ${slot.kind === "lesson" ? "border-[var(--ink)]/10 bg-white" : slot.kind === "lunch" ? "border-[var(--accent)]/20 bg-[var(--accent)]/8" : "border-dashed border-[var(--ink)]/10 bg-[var(--ink)]/[.025]"}`}>
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-[var(--ink)]">{slot.label}</span><span className="text-xs font-bold text-[var(--ink)]/45">{slot.start}–{slot.end}</span></div>
          </div>
        ))}
      </div>
      {programme === "junior" && <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-950"><Info className="mt-0.5 shrink-0" size={17} /><p><strong>Capacity check:</strong> the 8:20–3:10 day, 12:40–2:00 lunch and 30-minute break provide 300 minutes for instruction. That is 7½ forty-minute periods, so 40 full weekly periods cannot fit across five days without changing the school-day structure.</p></div>}
    </section>
  );
}

export default function TimetableDirectory() {
  const { user, profile } = useSchoolAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [teachers, setTeachers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [programme, setProgramme] = useState<Programme>("primary");
  const [form, setForm] = useState({ class_id: "", stream_id: "", subject_id: "", teacher_id: "", day_of_week: "1", starts_at: "08:20", ends_at: "08:55", room: "" });
  const admin = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"].includes(profile?.role ?? "");

  const load = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const [c, s, t, r] = await Promise.all([
        db.from("classes").select("id,name,level").eq("status", "ACTIVE").order("name"),
        db.from("subjects").select("id,name,code").eq("status", "ACTIVE").order("name"),
        db.from("teachers").select("id,profile_id,first_name,middle_name,last_name,employee_number").eq("status", "ACTIVE").order("first_name"),
        db.from("timetable_entries").select("id,class_id,stream_id,subject_id,teacher_id,day_of_week,starts_at,ends_at,room,classes(name,level),subjects(name,code),teachers(first_name,middle_name,last_name)").order("day_of_week").order("starts_at"),
      ]);
      for (const x of [c, s, t, r]) if (x.error) throw x.error;
      setClasses(c.data ?? []); setSubjects(s.data ?? []); setTeachers(t.data ?? []); setRows(r.data ?? []);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Timetable could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, user]);

  useEffect(() => { void load(); }, [load]);

  const classOptions = useMemo(() => classes.filter((c) => programmeForLevel(c.level) === programme), [classes, programme]);
  const slots = programmeSlots[programme].filter((s) => s.kind === "lesson");

  const chooseProgramme = (next: Programme) => {
    setProgramme(next);
    const first = programmeSlots[next].find((s) => s.kind === "lesson");
    setForm((current) => ({ ...current, class_id: "", starts_at: first?.start ?? current.starts_at, ends_at: first?.end ?? current.ends_at }));
  };

  const chooseClass = (classId: string) => {
    const selected = classes.find((c) => String(c.id) === classId);
    const nextProgramme = programmeForLevel(selected?.level);
    setProgramme(nextProgramme);
    const first = programmeSlots[nextProgramme].find((s) => s.kind === "lesson");
    setForm((current) => ({ ...current, class_id: classId, starts_at: first?.start ?? current.starts_at, ends_at: first?.end ?? current.ends_at }));
  };

  const applySlot = (start: string, end: string) => setForm((current) => ({ ...current, starts_at: start, ends_at: end }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); if (!admin) return;
    setBusy(true); setMessage(null);
    try {
      const selectedClass = classes.find((c) => String(c.id) === form.class_id);
      const expectedProgramme = programmeForLevel(selectedClass?.level);
      const expectedMinutes = expectedProgramme === "primary" ? 35 : 40;
      const [sh, sm] = form.starts_at.split(":").map(Number); const [eh, em] = form.ends_at.split(":").map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);
      if (duration !== expectedMinutes) throw new Error(`${expectedProgramme === "primary" ? "Primary" : "Junior School"} lessons must be exactly ${expectedMinutes} minutes.`);
      if (form.ends_at <= form.starts_at) throw new Error("End time must be after start time.");
      const db = getSupabase();
      const clash = await db.from("timetable_entries").select("id").eq("class_id", form.class_id).eq("day_of_week", Number(form.day_of_week)).lt("starts_at", form.ends_at).gt("ends_at", form.starts_at).limit(1);
      if (clash.error) throw clash.error;
      if ((clash.data ?? []).length) throw new Error("This class already has a timetable entry in that time window.");
      if (form.teacher_id) {
        const teacherClash = await db.from("timetable_entries").select("id").eq("teacher_id", form.teacher_id).eq("day_of_week", Number(form.day_of_week)).lt("starts_at", form.ends_at).gt("ends_at", form.starts_at).limit(1);
        if (teacherClash.error) throw teacherClash.error;
        if ((teacherClash.data ?? []).length) throw new Error("That teacher is already scheduled in this time window.");
      }
      const r = await db.from("timetable_entries").insert({ class_id: form.class_id, stream_id: form.stream_id || null, subject_id: form.subject_id, teacher_id: form.teacher_id || null, day_of_week: Number(form.day_of_week), starts_at: form.starts_at, ends_at: form.ends_at, room: form.room.trim() || null });
      if (r.error) throw r.error;
      setMessage("Timetable entry saved to the live school schedule.");
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Timetable entry could not be saved."); }
    finally { setBusy(false); }
  };

  const teacherName = (r: Row) => [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ") || text(r.employee_number);
  if (!profile) return null;

  return <PortalLayout role={profile.role}>
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header className="menwe-portal-hero rounded-[2rem] p-6 text-white sm:p-8">
        <span className="menwe-portal-kicker"><CalendarDays size={14} /> Scheduling</span>
        <h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Timetable System</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">One timetable engine for Primary and Junior School, with programme-specific lesson lengths, fixed breaks, lunch and teacher/class clash protection.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {(["primary", "junior"] as Programme[]).map((item) => <button key={item} type="button" onClick={() => chooseProgramme(item)} className={`rounded-2xl border p-5 text-left transition ${programme === item ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-sm" : "border-[var(--ink)]/10 bg-white hover:border-[var(--accent)]/30"}`}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--ink)]/45">{item === "primary" ? "Primary" : "Junior School"}</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--ink)]">{item === "primary" ? "35-minute lessons" : "40-minute lessons"}</h2></div><Clock3 className="text-[var(--accent)]" /></div><p className="mt-2 text-sm text-[var(--ink)]/60">8:20 a.m. start · 12:40–2:00 p.m. lunch · 3:10 p.m. close</p></button>)}
      </section>

      <TimetableTemplate programme={programme} />

      <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7">
        {admin && <form onSubmit={create} className="space-y-4 rounded-2xl border border-[var(--ink)]/10 p-4 sm:p-5">
          <div className="flex items-center gap-2"><Save size={17} className="text-[var(--accent)]" /><h2 className="font-serif text-2xl font-semibold">Add timetable entry</h2></div>
          <div className="grid gap-3 md:grid-cols-3">
            <select required value={form.class_id} onChange={e => chooseClass(e.target.value)} className={input}><option value="">Class — {programme === "primary" ? "Primary" : "Junior"}</option>{classOptions.map(c => <option key={text(c.id)} value={text(c.id)}>{text(c.name)} · {text(c.level)}</option>)}</select>
            <select required value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} className={input}><option value="">Subject</option>{subjects.map(s => <option key={text(s.id)} value={text(s.id)}>{text(s.name)} ({text(s.code)})</option>)}</select>
            <select value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })} className={input}><option value="">No teacher</option>{teachers.map(t => <option key={text(t.id)} value={text(t.id)}>{teacherName(t)}</option>)}</select>
            <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })} className={input}>{days.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select>
            <select value={`${form.starts_at}-${form.ends_at}`} onChange={e => { const [start, end] = e.target.value.split("-"); applySlot(start, end); }} className={input}><option value="">Lesson period</option>{slots.map(s => <option key={s.start} value={`${s.start}-${s.end}`}>{s.label} · {s.start}–{s.end}</option>)}</select>
            <input required type="time" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} className={input} aria-label="Start time" />
            <input required type="time" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} className={input} aria-label="End time" />
            <input placeholder="Room (optional)" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} className={input} />
            <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white disabled:opacity-60"><Plus size={16} />{busy ? "Saving…" : "Add entry"}</button>
          </div>
        </form>}

        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--accent)]" /></div> : rows.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45"><th className="p-3">Day</th><th className="p-3">Class</th><th className="p-3">Subject</th><th className="p-3">Teacher</th><th className="p-3">Time</th><th className="p-3">Room</th></tr></thead><tbody>{rows.map(r => <tr key={text(r.id)} className="border-b border-[var(--ink)]/7"><td className="p-3">{days[Number(r.day_of_week)] ?? "—"}</td><td className="p-3 font-semibold">{text((r.classes as Row | null)?.name)}</td><td className="p-3">{text((r.subjects as Row | null)?.name)}</td><td className="p-3">{text([((r.teachers as Row | null)?.first_name), ((r.teachers as Row | null)?.middle_name), ((r.teachers as Row | null)?.last_name)].filter(Boolean).join(" "))}</td><td className="p-3">{text(r.starts_at)}–{text(r.ends_at)}</td><td className="p-3">{text(r.room)}</td></tr>)}</tbody></table></div> : <p className="mt-6 rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-10 text-center text-sm text-[var(--ink)]/55">No authorised timetable entries exist yet.</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-4 py-3 text-sm">{message}</p>}
      </section>
    </main>
  </PortalLayout>;
}