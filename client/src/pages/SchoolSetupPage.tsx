import { useEffect, useState } from "react";
import { Link } from "wouter";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

type Notice = { kind: "success" | "error"; text: string } | null;

export default function SchoolSetupPage() {
  const { loading, user, profile } = useSchoolAuth();
  const [notice, setNotice] = useState<Notice>(null);
  const [school, setSchool] = useState({ school_name: "", logo_url: "", contact_email: "", contact_phone: "", address: "" });
  const [period, setPeriod] = useState({ name: "", start_date: "", end_date: "" });
  const [term, setTerm] = useState({ academic_period_id: "", name: "", start_date: "", end_date: "" });
  const [periods, setPeriods] = useState<Array<{ id: string; name: string }>>([]);
  const [schoolClass, setSchoolClass] = useState({ name: "", level: "", grade: "" });
  const [subject, setSubject] = useState({ name: "", level: "" });
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const db = getSupabase();
    const [{ data: settings, error: settingsError }, { data: academicPeriods, error: periodsError }] = await Promise.all([
      db.from("school_settings").select("school_name,logo_url,contact_email,contact_phone,address").eq("id", true).maybeSingle(),
      db.from("academic_periods").select("id,name").order("start_date", { ascending: false }),
    ]);
    if (settingsError || periodsError) {
      setNotice({ kind: "error", text: settingsError?.message || periodsError?.message || "Could not load setup data." });
      return;
    }
    if (settings) setSchool({ school_name: settings.school_name || "", logo_url: settings.logo_url || "", contact_email: settings.contact_email || "", contact_phone: settings.contact_phone || "", address: settings.address || "" });
    setPeriods(academicPeriods || []);
  };

  useEffect(() => { if (user && isAdministrator(profile?.role)) void load(); }, [user, profile?.role]);

  const save = async (key: string, task: () => Promise<{ error: { message: string } | null }>) => {
    setBusy(key); setNotice(null);
    const { error } = await task();
    setBusy(null);
    if (error) { setNotice({ kind: "error", text: error.message }); return false; }
    setNotice({ kind: "success", text: "Saved to Supabase." });
    await load();
    return true;
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f4f5f1]">Loading secure setup…</main>;
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#f4f5f1] p-6 text-center"><div><h1 className="text-2xl font-semibold">Sign in to continue</h1><p className="mt-2 text-slate-600">School setup is available only to approved administrators.</p><Link href="/portal/login" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-white">Open login</Link></div></main>;
  if (!isAdministrator(profile?.role) || profile?.status !== "ACTIVE") return <main className="grid min-h-screen place-items-center bg-[#f4f5f1] p-6 text-center"><div><h1 className="text-2xl font-semibold">Setup access required</h1><p className="mt-2 text-slate-600">Only active school administrators can change the initial school configuration.</p></div></main>;

  const card = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900";
  const button = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50";

  return <main className="min-h-screen bg-[#f4f5f1] p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6"><header><p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Initial configuration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Set up your school</h1><p className="mt-2 max-w-2xl text-slate-600">Enter only real school information. Each completed step writes to the canonical Supabase schema and can be edited later.</p></header>{notice && <div className={`rounded-xl border p-4 text-sm ${notice.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{notice.text}</div>}

  <section className={card}><h2 className="text-lg font-semibold">1. School information</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">School name<input className={input} value={school.school_name} onChange={e => setSchool({ ...school, school_name: e.target.value })} /></label><label className="text-sm font-medium">Logo URL (optional)<input className={input} value={school.logo_url} onChange={e => setSchool({ ...school, logo_url: e.target.value })} /></label><label className="text-sm font-medium">Contact email<input type="email" className={input} value={school.contact_email} onChange={e => setSchool({ ...school, contact_email: e.target.value })} /></label><label className="text-sm font-medium">Contact phone<input className={input} value={school.contact_phone} onChange={e => setSchool({ ...school, contact_phone: e.target.value })} /></label><label className="text-sm font-medium md:col-span-2">Address<textarea className={input} rows={3} value={school.address} onChange={e => setSchool({ ...school, address: e.target.value })} /></label></div><button disabled={busy === "school"} className={`${button} mt-4`} onClick={() => void save("school", () => getSupabase().from("school_settings").upsert({ id: true, ...school, updated_at: new Date().toISOString(), updated_by: user.id }))}>{busy === "school" ? "Saving…" : "Save school information"}</button></section>

  <section className={card}><h2 className="text-lg font-semibold">2. Academic period</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><input aria-label="Period name" placeholder="e.g. 2027 Academic Year" className={input} value={period.name} onChange={e => setPeriod({ ...period, name: e.target.value })} /><input aria-label="Period start" type="date" className={input} value={period.start_date} onChange={e => setPeriod({ ...period, start_date: e.target.value })} /><input aria-label="Period end" type="date" className={input} value={period.end_date} onChange={e => setPeriod({ ...period, end_date: e.target.value })} /></div><button disabled={busy === "period" || !period.name || !period.start_date || !period.end_date} className={`${button} mt-4`} onClick={() => void save("period", async () => { const result = await getSupabase().from("academic_periods").insert({ ...period, is_active: periods.length === 0 }); if (!result.error) setPeriod({ name: "", start_date: "", end_date: "" }); return result; })}>{busy === "period" ? "Saving…" : "Create academic period"}</button></section>

  <section className={card}><h2 className="text-lg font-semibold">3. Academic term</h2><div className="mt-4 grid gap-4 md:grid-cols-4"><select aria-label="Academic period" className={input} value={term.academic_period_id} onChange={e => setTerm({ ...term, academic_period_id: e.target.value })}><option value="">Select period</option>{periods.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="Term name" className={input} value={term.name} onChange={e => setTerm({ ...term, name: e.target.value })} /><input type="date" className={input} value={term.start_date} onChange={e => setTerm({ ...term, start_date: e.target.value })} /><input type="date" className={input} value={term.end_date} onChange={e => setTerm({ ...term, end_date: e.target.value })} /></div><button disabled={busy === "term" || Object.values(term).some(value => !value)} className={`${button} mt-4`} onClick={() => void save("term", async () => { const result = await getSupabase().from("academic_terms").insert(term); if (!result.error) setTerm({ academic_period_id: "", name: "", start_date: "", end_date: "" }); return result; })}>{busy === "term" ? "Saving…" : "Create academic term"}</button></section>

  <section className={card}><h2 className="text-lg font-semibold">4. First class</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><input placeholder="Class name" className={input} value={schoolClass.name} onChange={e => setSchoolClass({ ...schoolClass, name: e.target.value })} /><input placeholder="Level" className={input} value={schoolClass.level} onChange={e => setSchoolClass({ ...schoolClass, level: e.target.value })} /><input placeholder="Grade" className={input} value={schoolClass.grade} onChange={e => setSchoolClass({ ...schoolClass, grade: e.target.value })} /></div><button disabled={busy === "class" || Object.values(schoolClass).some(value => !value)} className={`${button} mt-4`} onClick={() => void save("class", async () => { const result = await getSupabase().from("classes").insert(schoolClass); if (!result.error) setSchoolClass({ name: "", level: "", grade: "" }); return result; })}>{busy === "class" ? "Saving…" : "Create class"}</button></section>

  <section className={card}><h2 className="text-lg font-semibold">5. First subject</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><input placeholder="Subject name" className={input} value={subject.name} onChange={e => setSubject({ ...subject, name: e.target.value })} /><input placeholder="Level (optional)" className={input} value={subject.level} onChange={e => setSubject({ ...subject, level: e.target.value })} /></div><button disabled={busy === "subject" || !subject.name} className={`${button} mt-4`} onClick={() => void save("subject", async () => { const result = await getSupabase().from("subjects").insert({ name: subject.name, level: subject.level || null }); if (!result.error) setSubject({ name: "", level: "" }); return result; })}>{busy === "subject" ? "Saving…" : "Create subject"}</button></section>

  <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6"><h2 className="text-lg font-semibold">Continue with real school records</h2><p className="mt-2 text-sm text-slate-600">After the foundation is saved, create staff, students and parent links, then use enrolment and teacher assignments to establish the real school relationships. Streams are not included because the current canonical production schema has no streams table.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/portal/staff" className={button}>Staff</Link><Link href="/portal/students" className={button}>Students</Link><Link href="/portal/parents" className={button}>Parents</Link><Link href="/portal/enrolment" className={button}>Enrol students</Link><Link href="/portal/academics" className={button}>Teacher assignments</Link></div></section>
  </div></main>;
}
