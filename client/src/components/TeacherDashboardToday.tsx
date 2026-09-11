import { Bell, BookOpen, CalendarClock, CheckCircle2, Clock3, ClipboardCheck, FileText } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, any>;
type Lesson = Row & { className?: string; subjectName?: string; level?: string };

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const divisionForLevel = (value: unknown) => /^(grade\s*[789]|jss|junior)/i.test(String(value ?? "").trim()) ? "Junior" : "Primary";
const toMinutes = (value: string) => { const [h, m] = String(value).slice(0, 5).split(":").map(Number); return h * 60 + m; };
const displayTime = (value: string) => { const [h, m] = String(value).slice(0, 5).split(":").map(Number); const suffix = h >= 12 ? "PM" : "AM"; const hour = h % 12 || 12; return `${hour}:${String(m).padStart(2, "0")} ${suffix}`; };
const relative = (minutes: number) => minutes <= 0 ? "now" : minutes === 1 ? "in 1 min" : `in ${minutes} min`;

export default function TeacherDashboardToday() {
  const { user } = useSchoolAuth();
  const [teacherId, setTeacherId] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [homework, setHomework] = useState<Row[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const db = getSupabase();
        const tr = await db.from("teachers").select("id").eq("profile_id", user.id).maybeSingle();
        if (tr.error) throw tr.error;
        if (!tr.data?.id) return;
        const id = String(tr.data.id);
        const jsDay = new Date().getDay();
        const schoolDay = jsDay >= 1 && jsDay <= 5 ? jsDay : 0;
        const [tt, hw, nt] = await Promise.all([
          schoolDay ? db.from("timetable_entries").select("id,class_id,subject_id,day_of_week,starts_at,ends_at,room,classes(name,level),subjects(name,code)").eq("teacher_id", id).eq("day_of_week", schoolDay).order("starts_at") : Promise.resolve({ data: [], error: null } as any),
          db.from("homework").select("id,class_id,subject_id,title,due_at,status").eq("teacher_id", id).gte("due_at", new Date(Date.now() - 86400000).toISOString()).order("due_at").limit(8),
          db.from("notifications").select("id", { count: "exact", head: true }).eq("profile_id", user.id).is("read_at", null),
        ]);
        if (tt.error) throw tt.error;
        if (hw.error) throw hw.error;
        if (nt.error) throw nt.error;
        if (!active) return;
        setTeacherId(id);
        setLessons((tt.data ?? []).map((x: Row) => ({ ...x, className: x.classes?.name ?? "Class", subjectName: x.subjects?.name ?? "Subject", level: x.classes?.level ?? "" })));
        setHomework(hw.data ?? []);
        setUnread(nt.count ?? 0);
      } catch {
        if (active) { setLessons([]); setHomework([]); setUnread(0); }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [user?.id]);

  const todayName = dayNames[now.getDay()];
  const todayMinutes = now.getHours() * 60 + now.getMinutes();
  const nextLesson = useMemo(() => lessons.find(l => toMinutes(l.starts_at) > todayMinutes), [lessons, todayMinutes]);
  const currentLesson = useMemo(() => lessons.find(l => toMinutes(l.starts_at) <= todayMinutes && toMinutes(l.ends_at) > todayMinutes), [lessons, todayMinutes]);
  const freeWindows = useMemo(() => {
    const blocks = lessons.map(l => ({ start: toMinutes(l.starts_at), end: toMinutes(l.ends_at) })).sort((a,b) => a.start - b.start);
    const excluded = [[8 * 60 + 20, 8 * 60 + 20], [10 * 60 + 40, 11 * 60 + 30], [12 * 60 + 40, 14 * 60]];
    const windows: { start: number; end: number }[] = [];
    let cursor = 8 * 60 + 20;
    for (const block of blocks) {
      if (block.start > cursor) windows.push({ start: cursor, end: block.start });
      cursor = Math.max(cursor, block.end);
    }
    if (cursor < 15 * 60 + 10) windows.push({ start: cursor, end: 15 * 60 + 10 });
    const subtract = (window: { start: number; end: number }, ex: number[]) => {
      if (ex[1] <= window.start || ex[0] >= window.end) return [window];
      const result: { start: number; end: number }[] = [];
      if (window.start < ex[0]) result.push({ start: window.start, end: ex[0] });
      if (ex[1] < window.end) result.push({ start: ex[1], end: window.end });
      return result;
    };
    let result = windows;
    for (const ex of excluded) result = result.flatMap(w => subtract(w, ex));
    return result.filter(w => w.end - w.start >= 10);
  }, [lessons]);
  const dueSoon = homework.filter(h => h.due_at && new Date(h.due_at).getTime() <= Date.now() + 3 * 86400000);

  if (loading) return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="menwe-card rounded-2xl p-5 text-sm text-[var(--ink)]/50 md:col-span-2 xl:col-span-4">Loading your teaching command centre…</div></section>;
  if (!teacherId) return null;

  return <section aria-label="Today's teaching command centre" className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className={`rounded-2xl border p-5 shadow-sm ${currentLesson ? "border-[var(--gold)]/40 bg-[var(--gold)]/5" : "border-[var(--ink)]/8 bg-white"}`}>
        <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><CalendarClock size={19}/></span><span className="text-xs font-bold text-[var(--ink)]/45">{todayName}</span></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.1em] text-[var(--ink)]/45">Teaching now</p>
        <h2 className="mt-1 text-lg font-black">{currentLesson ? currentLesson.subjectName : "No lesson now"}</h2>
        <p className="mt-1 text-sm text-[var(--ink)]/55">{currentLesson ? `${currentLesson.className} · ends ${displayTime(currentLesson.ends_at)}` : nextLesson ? `Next ${relative(toMinutes(nextLesson.starts_at) - todayMinutes)}` : "Your schedule is clear."}</p>
      </article>
      <article className="rounded-2xl border border-[var(--ink)]/8 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Clock3 size={19}/></span><span className="text-xs font-bold text-[var(--ink)]/45">Next</span></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.1em] text-[var(--ink)]/45">Next lesson</p>
        <h2 className="mt-1 text-lg font-black">{nextLesson?.subjectName ?? "No more lessons"}</h2>
        <p className="mt-1 text-sm text-[var(--ink)]/55">{nextLesson ? `${displayTime(nextLesson.starts_at)} · ${nextLesson.className}` : "You are free for the rest of today."}</p>
      </article>
      <article className="rounded-2xl border border-[var(--ink)]/8 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><CheckCircle2 size={19}/></span><span className="text-xs font-bold text-[var(--ink)]/45">Today</span></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.1em] text-[var(--ink)]/45">Open teaching windows</p>
        <h2 className="mt-1 text-lg font-black">{freeWindows.length}</h2>
        <p className="mt-1 text-sm text-[var(--ink)]/55">{freeWindows.length ? freeWindows.map(w => `${displayTime(`${Math.floor(w.start/60)}:${w.start%60}`)}–${displayTime(`${Math.floor(w.end/60)}:${w.end%60}`)}`).join(" · ") : "No open windows detected."}</p>
      </article>
      <article className="rounded-2xl border border-[var(--ink)]/8 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Bell size={19}/></span><span className="text-xs font-bold text-[var(--ink)]/45">Alerts</span></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.1em] text-[var(--ink)]/45">Unread notifications</p>
        <h2 className="mt-1 text-lg font-black">{unread}</h2>
        <p className="mt-1 text-sm text-[var(--ink)]/55">{dueSoon.length ? `${dueSoon.length} homework item${dueSoon.length === 1 ? "" : "s"} due soon.` : "No homework deadlines in the next 3 days."}</p>
      </article>
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <article className="menwe-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="menwe-premium-label">Today's teaching</p><h2 className="mt-1 text-xl font-black">Your classroom run-sheet</h2></div><Link href="/portal/timetable" className="text-xs font-extrabold text-[var(--accent)]">Full timetable →</Link></div>
        <div className="mt-5 space-y-2">
          {lessons.map(l => { const active = currentLesson?.id === l.id; return <div key={String(l.id)} className={`flex items-center gap-3 rounded-xl border p-3 ${active ? "border-[var(--gold)]/45 bg-[var(--gold)]/5" : "border-[var(--ink)]/8 bg-white"}`}><span className="w-[86px] shrink-0 text-xs font-black">{displayTime(l.starts_at)}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{l.subjectName}</b><span className="text-xs text-[var(--ink)]/50">{l.className} · {divisionForLevel(l.level)}{l.room ? ` · ${l.room}` : ""}</span></span>{active && <span className="rounded-full bg-[var(--gold)]/15 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--gold)]">Now</span>}</div>; })}
          {!lessons.length && <div className="rounded-xl border border-dashed border-[var(--ink)]/12 p-7 text-center text-sm text-[var(--ink)]/50">No lessons are scheduled for you today.</div>}
        </div>
      </article>
      <article className="menwe-card rounded-2xl p-5 sm:p-6">
        <div><p className="menwe-premium-label">Quick checks</p><h2 className="mt-1 text-xl font-black">Keep today moving</h2></div>
        <div className="mt-5 space-y-2">
          <Link href="/portal/attendance" className="flex items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-3 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><ClipboardCheck size={18}/></span><span className="flex-1"><b className="block text-sm">Take attendance</b><span className="text-xs text-[var(--ink)]/50">Open the authorised class register.</span></span>→</Link>
          <Link href="/portal/homework" className="flex items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-3 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><FileText size={18}/></span><span className="flex-1"><b className="block text-sm">Homework</b><span className="text-xs text-[var(--ink)]/50">{dueSoon.length ? `${dueSoon.length} deadline${dueSoon.length === 1 ? "" : "s"} coming up.` : "No urgent deadlines."}</span></span>→</Link>
          <Link href="/portal/notifications" className="flex items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-3 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><Bell size={18}/></span><span className="flex-1"><b className="block text-sm">Notifications</b><span className="text-xs text-[var(--ink)]/50">{unread ? `${unread} unread notification${unread === 1 ? "" : "s"}.` : "You're all caught up."}</span></span>→</Link>
          <Link href="/portal/class-marksheet" className="flex items-center gap-3 rounded-xl border border-[var(--ink)]/8 bg-white p-3 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]"><BookOpen size={18}/></span><span className="flex-1"><b className="block text-sm">Class marksheet</b><span className="text-xs text-[var(--ink)]/50">Review learner performance.</span></span>→</Link>
        </div>
      </article>
    </div>
  </section>;
}
