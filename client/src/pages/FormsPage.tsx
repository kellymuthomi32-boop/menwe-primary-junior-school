import { FormEvent, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, MessageSquare, Send } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { getSupabase } from "@/lib/supabase";
import { useLocation } from "wouter";

const input = "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061229] outline-none transition focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20";
const cards = [
  { key: "feedback", title: "Parent feedback", description: "Tell the school what is working well and what could be improved." },
  { key: "interest", title: "Activity interest", description: "Register your interest in sports, clubs, trips or other school activities." },
  { key: "general", title: "General enquiry", description: "Send a question to the school team without starting an admission application." },
] as const;
type Mode = (typeof cards)[number]["key"];

export default function FormsPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("feedback");
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const selected = cards.find(card => card.key === mode)!;
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setSuccess(false);
    const name = form.name.trim(), email = form.email.trim().toLowerCase(), message = form.message.trim();
    if (!name || !email || !message) return setError("Please complete your name, email address and message.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email address.");
    setBusy(true);
    try {
      const subject = form.subject.trim() || selected.title;
      const { error: dbError } = await getSupabase().from("contact_submissions").insert([{ name, email, phone: form.phone.trim() || null, subject, message }]);
      if (dbError) throw dbError;
      setForm({ name: "", email: "", phone: "", subject: "", message: "" }); setSuccess(true);
    } catch (caught) { setError(caught instanceof Error ? "We could not submit the form right now. Please try again or call the school office." : "We could not submit the form right now. Please try again."); }
    finally { setBusy(false); }
  };

  return <PublicLayout><main className="min-h-screen bg-[#F8F9FA]">
    <section className="bg-[#061229] px-5 py-16 text-white sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><span className="inline-flex items-center gap-2 rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]"><ClipboardList size={14}/> Free school forms</span><h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold sm:text-6xl">Forms &amp; feedback</h1><p className="mt-5 max-w-2xl text-base leading-8 text-white/70">Send information directly to the Menwe school team. These forms use the school&apos;s existing secure database—no separate form service is required.</p></div></section>
    <section className="px-5 py-12 lg:px-8 lg:py-16"><div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">{cards.map(card => <button key={card.key} type="button" onClick={() => { setMode(card.key); setSuccess(false); setError(""); }} className={`rounded-2xl border bg-white p-6 text-left shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${mode === card.key ? "border-[#D89B28] ring-2 ring-[#D89B28]/15" : "border-gray-100"}`}><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229]"><MessageSquare size={21}/></span><h2 className="mt-5 text-lg font-bold text-[#061229]">{card.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p></button>)}</div></section>
    <section className="px-5 pb-16 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start"><aside className="rounded-3xl bg-[#061229] p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#D89B28]">Selected form</p><h2 className="mt-3 font-serif text-3xl font-semibold">{selected.title}</h2><p className="mt-4 text-sm leading-7 text-white/65">{selected.description}</p><button type="button" onClick={() => navigate("/admissions")} className="mt-7 rounded-xl bg-[#D89B28] px-5 py-3 text-sm font-extrabold text-[#061229]">Need admission? Start application</button></aside>
    <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-md sm:p-9"><h2 className="font-serif text-2xl font-semibold text-[#061229]">{selected.title}</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Name *<input required className={input} value={form.name} onChange={e => update("name", e.target.value)} /></label><label className="text-xs font-bold text-slate-600">Email *<input required type="email" className={input} value={form.email} onChange={e => update("email", e.target.value)} /></label><label className="text-xs font-bold text-slate-600">Phone<input type="tel" className={input} value={form.phone} onChange={e => update("phone", e.target.value)} /></label><label className="text-xs font-bold text-slate-600">Subject<input className={input} value={form.subject} onChange={e => update("subject", e.target.value)} placeholder={mode === "interest" ? "e.g. Rugby / Music / Trip" : "Optional"} /></label></div><label className="mt-5 block text-xs font-bold text-slate-600">Message *<textarea required rows={7} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-[#061229] outline-none focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20" value={form.message} onChange={e => update("message", e.target.value)} /></label>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{success && <p role="status" className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={18}/> Submitted successfully. The school team can now review it in the admin area.</p>}<button disabled={busy} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#061229] px-6 py-3 text-sm font-extrabold text-white disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} {busy ? "Sending…" : "Submit form"}</button></form></div></section>
  </main></PublicLayout>;
}
