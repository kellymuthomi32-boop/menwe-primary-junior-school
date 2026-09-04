import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, UserRound, BookOpen, GraduationCap } from "lucide-react";
import { PortalLayout } from "@/components/PortalLayout";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";

type Row = Record<string, any>;
const input = "min-h-12 w-full rounded-xl border border-[var(--ink)]/12 bg-white px-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10";

function Field({ label, value }: { label: string; value: string }) {
  return <div className="menwe-card rounded-2xl p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--ink)]/45">{label}</p><p className="mt-2 break-words font-semibold text-[var(--ink)]">{value || "Not set"}</p></div>;
}

export default function PortalProfilePage() {
  const { user, profile, refreshProfile } = useSchoolAuth();
  const teacher = profile?.role === "TEACHER";
  const admin = !!profile && isAdministrator(profile.role);
  const [fullName, setFullName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [teacherId, setTeacherId] = useState("");
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [classSubjects, setClassSubjects] = useState<Row[]>([]);
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [classRoles, setClassRoles] = useState<Row[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, string[]>>({});
  const [classTeacherIds, setClassTeacherIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingTeaching, setLoadingTeaching] = useState(teacher);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.display_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.display_name, profile?.phone]);

  useEffect(() => {
    if (!teacher || !user?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingTeaching(true);
      try {
        const db = getSupabase();
        const tr = await db.from("teachers").select("id,first_name,middle_name,last_name,employee_number,status").eq("profile_id", user.id).maybeSingle();
        if (tr.error) throw tr.error;
        if (!tr.data) throw new Error("Your teacher profile is not linked yet. Ask an administrator to link your account.");
        const id = String(tr.data.id);
        const [c, s, cs, a, r] = await Promise.all([
          db.from("classes").select("id,name,code,level,academic_year_id,status").eq("status", "ACTIVE").order("name"),
          db.from("subjects").select("id,code,name,status").eq("status", "ACTIVE").order("name"),
          db.from("class_subjects").select("class_id,subject_id"),
          db.from("teacher_assignments").select("id,teacher_id,class_id,subject_id" ).eq("teacher_id", id),
          db.from("teacher_class_roles").select("teacher_id,class_id,is_class_teacher").eq("teacher_id", id)
        ]);
        for (const result of [c, s, cs, a, r]) if (result.error) throw result.error;
        if (cancelled) return;
        setTeacherId(id); setClasses(c.data ?? []); setSubjects(s.data ?? []); setClassSubjects(cs.data ?? []); setAssignments(a.data ?? []); setClassRoles(r.data ?? []);
        const classIds = [...new Set((a.data ?? []).map(x => String(x.class_id)))];
        setSelectedClassIds(classIds);
        const byClass: Record<string,string[]> = {};
        (a.data ?? []).forEach(x => { const key=String(x.class_id); byClass[key] = [...(byClass[key] ?? []), String(x.subject_id)]; });
        setSelectedSubjects(byClass);
        setClassTeacherIds((r.data ?? []).filter(x => x.is_class_teacher).map(x => String(x.class_id)));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Teaching profile could not be loaded.");
      } finally { if (!cancelled) setLoadingTeaching(false); }
    })();
    return () => { cancelled = true; };
  }, [teacher, user?.id]);

  const subjectsForClass = useMemo(() => {
    const map = new Map<string, Row[]>();
    classSubjects.forEach(link => {
      const list = map.get(String(link.class_id)) ?? [];
      const subject = subjects.find(s => String(s.id) === String(link.subject_id));
      if (subject) list.push(subject);
      map.set(String(link.class_id), list);
    });
    return map;
  }, [classSubjects, subjects]);

  const toggleClass = (id: string) => {
    setSelectedClassIds(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };
  const toggleSubject = (classId: string, subjectId: string) => {
    setSelectedSubjects(current => {
      const currentIds = current[classId] ?? [];
      const next = currentIds.includes(subjectId) ? currentIds.filter(x => x !== subjectId) : [...currentIds, subjectId];
      return { ...current, [classId]: next };
    });
  };
  const toggleClassTeacher = (classId: string) => {
    setClassTeacherIds(current => current.includes(classId) ? current.filter(x => x !== classId) : [...current, classId]);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id || !profile) return;
    const cleanName = fullName.trim();
    if (!cleanName) { setError("Full name is required."); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      const db = getSupabase();
      const profileUpdate = await db.from("profiles").update({ full_name: cleanName, phone: phone.trim() || null }).eq("id", user.id);
      if (profileUpdate.error) throw profileUpdate.error;
      const authUpdate = await db.auth.updateUser({ data: { full_name: cleanName, phone: phone.trim() || null } });
      if (authUpdate.error) throw authUpdate.error;
      if (teacher && teacherId) {
        const desired = new Set(selectedClassIds.flatMap(classId => (selectedSubjects[classId] ?? []).map(subjectId => `${classId}:${subjectId}`)));
        const existing = new Map(assignments.map(row => [`${row.class_id}:${row.subject_id}`, row]));
        for (const row of assignments) {
          const key = `${row.class_id}:${row.subject_id}`;
          if (!desired.has(key)) {
            const result = await db.from("teacher_assignments").delete().eq("id", row.id);
            if (result.error) throw result.error;
          }
        }
        for (const key of desired) {
          if (!existing.has(key)) {
            const [classId, subjectId] = key.split(":");
            const result = await db.from("teacher_assignments").insert({ teacher_id: teacherId, class_id: classId, subject_id: subjectId });
            if (result.error) throw result.error;
          }
        }
        const roleResult = await db.from("teacher_class_roles").upsert(classRolesPayload(teacherId, selectedClassIds, classTeacherIds), { onConflict: "teacher_id,class_id" });
        if (roleResult.error) throw roleResult.error;
        const removedRoles = classRoles.filter(row => !selectedClassIds.includes(String(row.class_id)));
        for (const row of removedRoles) {
          const result = await db.from("teacher_class_roles").delete().eq("teacher_id", teacherId).eq("class_id", row.class_id);
          if (result.error) throw result.error;
        }
      }
      await refreshProfile();
      setMessage("Your profile and teaching assignments have been saved.");
      if (teacher) setAssignments(selectedClassIds.flatMap(classId => (selectedSubjects[classId] ?? []).map(subjectId => ({ teacher_id: teacherId, class_id: classId, subject_id: subjectId }))));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your profile could not be saved. Please try again.");
    } finally { setBusy(false); }
  };

  const roleLabel = profile?.role?.replaceAll("_", " ") ?? "Not set";
  return <PortalLayout role={profile?.role ?? "STUDENT"}>
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <section className="menwe-admin-hero rounded-[2rem] p-6 text-white shadow-xl sm:p-8">
        <p className="menwe-admin-kicker"><UserRound size={14}/> My profile</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Account & teaching profile</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">Teachers can keep their name and contact details current and choose the active classes and subjects they teach. Your account role remains controlled by school authorization.</p>
      </section>
      <form onSubmit={save} className="mt-6 grid gap-6">
        <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold">Full name<input required maxLength={120} value={fullName} onChange={e => setFullName(e.target.value)} className={input}/></label>
            <label className="grid gap-1.5 text-sm font-bold">Phone<input maxLength={40} value={phone} onChange={e => setPhone(e.target.value)} className={input}/></label>
          </div>
        </section>
        {teacher && <section className="menwe-card rounded-[1.75rem] p-6 sm:p-8">
          <div className="flex items-start gap-3"><GraduationCap className="mt-1 text-[var(--gold)]"/><div><h2 className="font-serif text-2xl font-semibold">Teaching profile</h2><p className="mt-1 text-sm text-[var(--ink)]/60">Choose the classes and subjects you teach. A class-teacher designation is shown separately from subject teaching.</p></div></div>
          {loadingTeaching ? <div className="flex justify-center py-10"><Loader2 className="animate-spin"/></div> : classes.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-[var(--ink)]/15 p-8 text-center text-sm text-[var(--ink)]/55">No active classes are configured yet.</p> : <div className="mt-6 grid gap-4 md:grid-cols-2">
            {classes.map(cls => { const id=String(cls.id); const available=subjectsForClass.get(id) ?? []; const selected=selectedClassIds.includes(id); return <article key={id} className={`rounded-2xl border p-5 transition-all ${selected ? "border-[var(--gold)] bg-[var(--gold)]/[.035] shadow-md" : "border-[var(--ink)]/10 bg-white"}`}>
              <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={selected} onChange={() => toggleClass(id)} className="h-5 w-5 accent-[var(--gold)]"/><span><strong>{cls.name}</strong><span className="ml-2 text-xs text-[var(--ink)]/45">{cls.level || cls.code}</span></span></label>
              {selected && <div className="mt-4 space-y-3 border-t border-[var(--ink)]/10 pt-4">
                <p className="text-xs font-black uppercase tracking-[.13em] text-[var(--ink)]/45"><BookOpen size={13} className="mr-1 inline"/> Subjects</p>
                {available.length ? <div className="grid gap-2 sm:grid-cols-2">{available.map(subject => { const sid=String(subject.id); return <label key={sid} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--ink)]/8 bg-white p-3 text-sm"><input type="checkbox" checked={(selectedSubjects[id] ?? []).includes(sid)} onChange={() => toggleSubject(id,sid)} className="h-4 w-4 accent-[var(--gold)]"/><span>{subject.name}</span></label>; })}</div> : <p className="rounded-xl bg-[var(--ink)]/[.035] p-3 text-xs text-[var(--ink)]/55">No subjects are linked to this class yet. An administrator must configure the class curriculum first.</p>}
                <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--gold)]/10 p-3 text-sm font-bold"><input type="checkbox" checked={classTeacherIds.includes(id)} onChange={() => toggleClassTeacher(id)} className="h-4 w-4 accent-[var(--gold)]"/> I am the class teacher for this class</label>
              </div>}
            </article>; })}
          </div>}
        </section>}
        <section className="grid gap-4 sm:grid-cols-2"><Field label="Email" value={user?.email ?? ""}/><Field label="Role" value={roleLabel}/><Field label="Account status" value={profile?.status ?? ""}/><Field label="Canonical role" value={profile?.canonical_role ?? ""}/></section>
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--mist)] p-4 text-sm leading-6 text-[var(--ink)]/65"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--gold)]" size={18}/><p>Role changes are not editable from the client. Teacher teaching selections are stored in protected Supabase relationship tables and are used by the marks-entry authorization layer.</p></div>
        {message && <p role="status" className="rounded-xl bg-[var(--sage)]/15 px-4 py-3 text-sm font-semibold">{message}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" disabled={busy || loadingTeaching} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={17}/> : <Save size={17}/>}Save profile</button>
      </form>
    </main>
  </PortalLayout>;
}

function classRolesPayload(teacherId: string, selectedClassIds: string[], classTeacherIds: string[]) {
  return selectedClassIds.map(classId => ({ teacher_id: teacherId, class_id: classId, is_class_teacher: classTeacherIds.includes(classId), updated_at: new Date().toISOString() }));
}
