import { CalendarDays, Download, Loader2, Plus, Printer, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth, type AppRole } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, any>;
const text = (v: unknown, fallback = "—") => v == null || v === "" ? fallback : String(v);
const teacherName = (t: Row) => [t.first_name, t.middle_name, t.last_name].filter(Boolean).join(" ") || text(t.employee_number, "Teacher");
const input = "min-h-11 w-full rounded-xl border border-[var(--ink)]/12 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]";
const adminRoles: AppRole[] = ["SUPER_ADMIN", "ADMIN", "HEAD_OF_INSTITUTION", "DEPUTY_HOI"];
const fmt = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${d}T00:00:00`));
const daysBetween = (start: string, end: string) => { const out: string[] = []; const d = new Date(`${start}T00:00:00`); const last = new Date(`${end}T00:00:00`); while (d <= last && out.length < 370) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); } return out; };

export default function TeacherDutyRosterPage() {
  const { user, profile } = useSchoolAuth();
  const [rosters, setRosters] = useState<Row[]>([]);
  const [entries, setEntries] = useState<Row[]>([]);
  const [teachers, setTeachers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({ title: "Teacher Duty Roster", start_date: new Date().toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) });
  const [entry, setEntry] = useState({ duty_date: new Date().toISOString().slice(0, 10), teacher_id: "", duty_type: "GENERAL", location: "", notes: "" });
  const admin = !!profile && adminRoles.includes(profile.role);

  const load = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true); setMessage(null);
    try {
      const db = getSupabase();
      const [r, t] = await Promise.all([
        db.from("teacher_duty_rosters").select("id,title,start_date,end_date,status,created_at,created_by").order("start_date", { ascending: false }),
        db.from("teachers").select("id,first_name,middle_name,last_name,employee_number,status").eq("status", "ACTIVE").order("first_name"),
      ]);
      if (r.error) throw r.error; if (t.error) throw t.error;
      setRosters(r.data ?? []); setTeachers(t.data ?? []);
      const activeId = selected || r.data?.[0]?.id || "";
      setSelected(activeId);
      if (activeId) {
        const e = await db.from("teacher_duty_roster_entries").select("id,roster_id,duty_date,teacher_id,duty_type,location,notes,teachers(first_name,middle_name,last_name,employee_number)").eq("roster_id", activeId).order("duty_date");
        if (e.error) throw e.error; setEntries(e.data ?? []);
      } else setEntries([]);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Duty roster could not be loaded."); }
    finally { setLoading(false); }
  }, [profile, selected, user]);
  useEffect(() => { void load(); }, [load]);

  const createRoster = async (e: React.FormEvent) => {
    e.preventDefault(); if (!admin || !user) return;
    if (form.end_date < form.start_date) { setMessage("End date must be on or after the start date."); return; }
    setBusy(true); setMessage(null);
    try {
      const r = await getSupabase().from("teacher_duty_rosters").insert({ ...form, created_by: user.id, status: "DRAFT" }).select("id").single();
      if (r.error) throw r.error;
      setSelected(r.data.id); setMessage("Duty roster created. Add the teachers and duty dates below, then publish it."); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Roster could not be created."); }
    finally { setBusy(false); }
  };

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault(); if (!admin || !selected) return;
    setBusy(true); setMessage(null);
    try {
      const r = await getSupabase().from("teacher_duty_roster_entries").insert({ roster_id: selected, ...entry, location: entry.location.trim() || null, notes: entry.notes.trim() || null });
      if (r.error) throw r.error; setMessage("Duty assignment saved."); setEntry({ ...entry, teacher_id: "", location: "", notes: "" }); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Assignment could not be saved."); }
    finally { setBusy(false); }
  };

  const removeEntry = async (id: string) => {
    if (!admin || !confirm("Remove this duty assignment?")) return;
    const r = await getSupabase().from("teacher_duty_roster_entries").delete().eq("id", id);
    if (r.error) setMessage(r.error.message); else await load();
  };

  const publish = async () => {
    if (!admin || !selected) return;
    const r = await getSupabase().from("teacher_duty_rosters").update({ status: "PUBLISHED", updated_at: new Date().toISOString() }).eq("id", selected);
    if (r.error) setMessage(r.error.message); else { setMessage("Roster published. All authorised teachers can now see it."); await load(); }
  };

  const current = rosters.find(r => r.id === selected);
  const selectedTeacher = teachers.find(t => t.id === entry.teacher_id);
  const availableDates = useMemo(() => current ? daysBetween(current.start_date, current.end_date) : [], [current]);
  const sortedEntries = useMemo(() => [...entries].sort((a,b) => String(a.duty_date).localeCompare(String(b.duty_date))), [entries]);

  const downloadCsv = () => {
    if (!current) return;
    const lines = [["Date","Teacher","Duty","Location","Notes"], ...sortedEntries.map(e => [e.duty_date, teacherName(e.teachers ?? {}), e.duty_type, e.location ?? "", e.notes ?? ""])];
    const csv = lines.map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `${current.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${current.start_date}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const downloadPdf = async () => {
    if (!current) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(18); doc.text("MENWE PRIMARY & JUNIOR SCHOOL", 14, 15);
    doc.setFontSize(12); doc.text(current.title, 14, 23); doc.setFontSize(9); doc.text(`${fmt(current.start_date)} – ${fmt(current.end_date)} · ${current.status}`, 14, 29);
    let y = 38; doc.setFontSize(9); doc.text("Date", 14, y); doc.text("Teacher", 50, y); doc.text("Duty", 125, y); doc.text("Location", 165, y); doc.text("Notes", 215, y); y += 6;
    for (const e of sortedEntries) { if (y > 190) { doc.addPage(); y = 18; } doc.text(fmt(e.duty_date), 14, y); doc.text(teacherName(e.teachers ?? {}).slice(0, 38), 50, y); doc.text(text(e.duty_type).slice(0, 20), 125, y); doc.text(text(e.location, "—").slice(0, 25), 165, y); doc.text(text(e.notes, "—").slice(0, 35), 215, y); y += 6; }
    doc.save(`${current.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${current.start_date}.pdf`);
  };

  if (!profile) return null;
  return <PortalLayout role={profile.role}><main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <header className="menwe-portal-hero rounded-[2rem] p-6 text-white sm:p-8"><span className="menwe-portal-kicker"><CalendarDays size={14}/> Staff scheduling</span><h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Teacher Duty Roster</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Create, publish and download the official teacher duty schedule. Teachers see published dates and assignments in the secure portal.</p></header>
    {admin && <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ink)]/5"><ShieldCheck size={19}/></span><div><h2 className="text-lg font-bold">Roster management</h2><p className="text-sm text-[var(--ink)]/55">Deputy Headteacher, Headteacher and administrators can manage duty rosters.</p></div></div><form onSubmit={createRoster} className="grid gap-3 md:grid-cols-4"><input required className={input} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Roster title"/><input required type="date" className={input} value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/><input required type="date" className={input} value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/><button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"><Plus size={16}/>Create roster</button></form></section>}
    <section className="menwe-card rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--accent)]">Published schedules</p><h2 className="mt-1 text-2xl font-bold">Duty calendar</h2></div>{current&&<div className="flex flex-wrap gap-2"><button onClick={downloadPdf} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-white px-3 text-xs font-bold"><Download size={15}/>Download PDF</button><button onClick={downloadCsv} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-white px-3 text-xs font-bold"><Download size={15}/>CSV</button><button onClick={()=>window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ink)] px-3 text-xs font-bold text-white"><Printer size={15}/>Print</button></div>}</div>
      {rosters.length>0&&<div className="mt-5 flex gap-2 overflow-x-auto pb-1">{rosters.map(r=><button key={r.id} onClick={()=>setSelected(r.id)} className={`min-w-[210px] rounded-2xl border p-4 text-left transition-all ${selected===r.id?"border-[var(--gold)] bg-[var(--gold)]/8":"border-[var(--ink)]/10 bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{text(r.title)}</span><span className="rounded-full bg-[var(--ink)]/5 px-2 py-1 text-[9px] font-black uppercase">{text(r.status)}</span></div><p className="mt-2 text-xs text-[var(--ink)]/55">{fmt(r.start_date)} – {fmt(r.end_date)}</p></button>)}</div>}
      {current && admin && <form onSubmit={addEntry} className="mt-5 grid gap-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)]/50 p-4 md:grid-cols-5"><select required className={input} value={entry.duty_date} onChange={e=>setEntry({...entry,duty_date:e.target.value})}>{availableDates.map(d=><option key={d} value={d}>{fmt(d)}</option>)}</select><select required className={input} value={entry.teacher_id} onChange={e=>setEntry({...entry,teacher_id:e.target.value})}><option value="">Teacher</option>{teachers.map(t=><option key={t.id} value={t.id}>{teacherName(t)}</option>)}</select><select className={input} value={entry.duty_type} onChange={e=>setEntry({...entry,duty_type:e.target.value})}><option>GENERAL</option><option>MORNING</option><option>BREAK</option><option>LUNCH</option><option>GATE</option><option>COMPOUND</option><option>BOARDING</option><option>OTHER</option></select><input className={input} placeholder="Location (optional)" value={entry.location} onChange={e=>setEntry({...entry,location:e.target.value})}/><button disabled={busy||!selectedTeacher} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"><Plus size={16}/>Assign duty</button><input className={`${input} md:col-span-4`} placeholder="Notes (optional)" value={entry.notes} onChange={e=>setEntry({...entry,notes:e.target.value})}/><button type="button" onClick={publish} disabled={busy||current.status==="PUBLISHED"||entries.length===0} className="min-h-11 rounded-xl border border-[var(--gold)] bg-[var(--gold)]/10 px-4 text-sm font-black">{current.status==="PUBLISHED"?"Published":"Publish roster"}</button></form>}
      {loading?<div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--accent)]"/></div>:sortedEntries.length?<div className="mt-6 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b border-[var(--ink)]/10 text-xs font-bold uppercase tracking-[.12em] text-[var(--ink)]/45"><th className="p-3">Date</th><th className="p-3">Teacher</th><th className="p-3">Duty</th><th className="p-3">Location</th><th className="p-3">Notes</th>{admin&&<th className="p-3">Manage</th>}</tr></thead><tbody>{sortedEntries.map(e=><tr key={e.id} className="border-b border-[var(--ink)]/7"><td className="p-3 font-semibold">{fmt(e.duty_date)}</td><td className="p-3">{teacherName(e.teachers??{})}</td><td className="p-3"><span className="rounded-full bg-[var(--gold)]/10 px-3 py-1 text-[10px] font-black">{text(e.duty_type)}</span></td><td className="p-3">{text(e.location)}</td><td className="p-3">{text(e.notes)}</td>{admin&&<td className="p-3"><button onClick={()=>void removeEntry(e.id)} aria-label="Remove assignment" className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 text-red-600"><Trash2 size={15}/></button></td>}</tr>)}</tbody></table></div>:<div className="mt-6 rounded-2xl border border-dashed border-[var(--ink)]/15 px-5 py-12 text-center text-sm text-[var(--ink)]/55">{current?"No duty assignments have been added to this roster yet.":"No duty roster has been created yet."}</div>}
      {message&&<p role="status" className="mt-5 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-4 py-3 text-sm">{message}</p>}
    </section></main></PortalLayout>;
}