import { ArrowRightLeft, CheckCircle2, Loader2, ShieldAlert, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type ClassRow = { id: string; name: string; academic_year_id: string; status: string };
type YearRow = { id: string; name: string; is_current: boolean; starts_on: string; ends_on: string };

const promotionMap: Record<string, string> = {
  "PP1 East": "PP2", "PP1 West": "PP2", "PP2": "Grade 1",
  "Grade 1": "Grade 2", "Grade 2": "Grade 3", "Grade 3": "Grade 4",
  "Grade 4": "Grade 5", "Grade 5": "Grade 6", "Grade 6": "Grade 7",
  "Grade 7": "Grade 8", "Grade 8": "Grade 9",
};

export default function AcademicYearTransitionPage() {
  const [years, setYears] = useState<YearRow[]>([]);
  const [sourceClasses, setSourceClasses] = useState<ClassRow[]>([]);
  const [targetClasses, setTargetClasses] = useState<ClassRow[]>([]);
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [completed, setCompleted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const db = getSupabase();
      const { data: yearData, error: yearError } = await db.from("academic_years")
        .select("id,name,is_current,starts_on,ends_on").in("name", ["2026", "2027"]);
      if (yearError) throw yearError;
      const yearRows = (yearData ?? []) as YearRow[];
      setYears(yearRows);
      const source = yearRows.find(y => y.name === "2026");
      const target = yearRows.find(y => y.name === "2027");
      if (!source || !target) throw new Error("Both 2026 and 2027 academic years must exist.");
      const [{ data: sourceData, error: sourceError }, { data: targetData, error: targetError }, { data: enrollmentData, error: enrollmentError }] = await Promise.all([
        db.from("classes").select("id,name,academic_year_id,status").eq("academic_year_id", source.id).eq("status", "ACTIVE").order("name"),
        db.from("classes").select("id,name,academic_year_id,status").eq("academic_year_id", target.id).eq("status", "ACTIVE").order("name"),
        db.from("enrollments").select("class_id,student_id,students!inner(status)").eq("academic_year_id", source.id).eq("status", "ACTIVE").eq("students.status", "ACTIVE"),
      ]);
      if (sourceError) throw sourceError;
      if (targetError) throw targetError;
      if (enrollmentError) throw enrollmentError;
      const sourceRows = (sourceData ?? []) as ClassRow[];
      const targetRows = (targetData ?? []) as ClassRow[];
      setSourceClasses(sourceRows);
      setTargetClasses(targetRows);
      const counts: Record<string, number> = {};
      for (const enrollment of enrollmentData ?? []) counts[enrollment.class_id] = (counts[enrollment.class_id] ?? 0) + 1;
      setActiveCounts(counts);
      const total2027 = await db.from("enrollments").select("id", { count: "exact", head: true }).eq("academic_year_id", target.id);
      if (total2027.error) throw total2027.error;
      setCompleted((total2027.count ?? 0) > 0 || target.is_current);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "The transition preview could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const source = years.find(y => y.name === "2026");
  const target = years.find(y => y.name === "2027");
  const expectedPromotions = sourceClasses.reduce((sum, c) => sum + (promotionMap[c.name] ? (activeCounts[c.id] ?? 0) : 0), 0);
  const grade9Count = sourceClasses.filter(c => c.name === "Grade 9").reduce((sum, c) => sum + (activeCounts[c.id] ?? 0), 0);
  const missingTargets = [...new Set(sourceClasses.filter(c => promotionMap[c.name]).map(c => promotionMap[c.name]).filter(name => !targetClasses.some(t => t.name === name)))];

  const runTransition = async () => {
    if (running || completed || missingTargets.length) return;
    setRunning(true);
    setMessage(null);
    try {
      const { data, error } = await getSupabase().rpc("run_2027_academic_transition");
      if (error) throw error;
      const result = data as { message?: string; promoted_count?: number; grade9_review_count?: number; already_completed?: boolean } | null;
      setCompleted(true);
      setMessage({ kind: "success", text: result?.message ?? "The academic transition completed. Refresh the preview to verify the results." });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "The transition failed. No partial changes were committed." });
    } finally {
      setRunning(false);
    }
  };

  return <main className="grid gap-6">
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[var(--accent)]/10 p-3 text-[var(--accent)]"><ArrowRightLeft size={25}/></div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--accent)]">Admin only · Academic year setup</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold">One-click 2027 transition</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink)]/65">Promote active learners into the matching 2027 classes in one atomic operation. The 2026 marks, reports, attendance, fees and historical enrolments remain untouched.</p>
        </div>
      </div>
      {loading ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--ink)]/60"><Loader2 className="animate-spin" size={18}/>Loading transition preview…</div> : <>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--ink)]/10 p-4"><p className="text-sm text-[var(--ink)]/60">Eligible active learners</p><p className="mt-1 text-3xl font-semibold tabular-nums">{expectedPromotions.toLocaleString()}</p><p className="mt-1 text-xs text-[var(--ink)]/55">From classes with a 2027 destination</p></div>
          <div className="rounded-2xl border border-[var(--ink)]/10 p-4"><p className="text-sm text-[var(--ink)]/60">Grade 9 · leaver review</p><p className="mt-1 text-3xl font-semibold tabular-nums">{grade9Count.toLocaleString()}</p><p className="mt-1 text-xs text-[var(--ink)]/55">Not automatically disabled or promoted</p></div>
          <div className="rounded-2xl border border-[var(--ink)]/10 p-4"><p className="text-sm text-[var(--ink)]/60">2027 class setup</p><p className="mt-1 text-3xl font-semibold tabular-nums">{targetClasses.length}/12</p><p className="mt-1 text-xs text-[var(--ink)]/55">Required school classes</p></div>
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--ink)]/10">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead><tr className="border-b border-[var(--ink)]/10 bg-[var(--ink)]/[.03] text-xs uppercase tracking-wide text-[var(--ink)]/55"><th className="p-3">2026 class</th><th className="p-3">Active learners</th><th className="p-3">2027 action</th></tr></thead>
            <tbody>{sourceClasses.map(c => <tr key={c.id} className="border-b border-[var(--ink)]/5 last:border-0"><td className="p-3 font-semibold">{c.name}</td><td className="p-3 tabular-nums">{(activeCounts[c.id] ?? 0).toLocaleString()}</td><td className="p-3">{promotionMap[c.name] ? <span>{promotionMap[c.name]}</span> : c.name === "Grade 9" ? <span className="font-semibold text-[var(--accent)]">Review leavers manually</span> : <span className="text-[var(--ink)]/50">No automatic move</span>}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--ink)]/10 p-4">
          <ShieldAlert className="mt-0.5 shrink-0 text-[var(--accent)]" size={20}/>
          <div className="text-sm leading-6 text-[var(--ink)]/75">
            <p className="font-semibold text-[var(--ink)]">Before you run it</p>
            <p>PP1 East and PP1 West move to PP2; PP2 moves to Grade 1; Grades 1–8 each move up one grade. Grade 9 is deliberately held for leaver confirmation so repeaters or returning learners are not locked out by mistake. New PP1 admissions remain separate.</p>
            <p className="mt-1">The operation sets 2027 as the current academic year after enrolments succeed. It can only run once; repeat clicks return the saved result instead of creating duplicate enrolments.</p>
            {missingTargets.length > 0 && <p className="mt-2 font-semibold">Missing 2027 destinations: {missingTargets.join(", ")}. Fix the class setup before proceeding.</p>}
            {completed && <p className="mt-2 font-semibold">Transition already completed or 2027 is already active. Check the result message below before taking further action.</p>}
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" disabled={running || completed || missingTargets.length > 0} onClick={() => void runTransition()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
            {running ? <Loader2 className="animate-spin" size={18}/> : <Users size={18}/>}
            {running ? "Transition running…" : completed ? "Transition already processed" : "Promote learners to 2027"}
          </button>
          <button type="button" onClick={() => void load()} disabled={loading || running} className="min-h-12 rounded-xl border border-[var(--ink)]/15 px-5 py-3 text-sm font-bold disabled:opacity-50">Refresh preview</button>
        </div>
      </>}
      {message && <div role="status" className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm leading-6 ${message.kind === "success" ? "bg-emerald-500/10 text-[var(--ink)]" : "bg-red-500/10 text-[var(--ink)]"}`}>{message.kind === "success" && <CheckCircle2 className="mt-1 shrink-0" size={16}/>}<span>{message.text}</span></div>}
    </section>
  </main>;
}
