import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Send,
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import ExactSchoolMap from "@/components/ExactSchoolMap";
import { getSupabase } from "@/lib/supabase";

const card =
  "rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900";

const googleMapsUrl =
  "https://www.google.com/maps/place/0%C2%B005'57.3%22S+37%C2%B034'52.4%22E/@-0.0992456,37.5812178,17z/data=!3m1!4b1!4m4!3m3!8m2!3d-0.0992456!4d37.5812178?entry=ttu&g_ep=EgoyMDI2MDkwMi4wIKXMDSoASAFQAw%3D%3D";

function friendlyContactError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/network|fetch|timeout|429|rate limit/i.test(text)) {
    return "Connection issue. Please check your network and try again.";
  }
  return "We could not send your inquiry right now. Please call the school office at 0142550882.";
}

const contactMethods = [
  {
    icon: Phone,
    label: "Phone",
    value: "0142550882",
    href: "tel:0142550882",
    note: "Direct school enquiries",
  },
  {
    icon: Mail,
    label: "Email",
    value: "Menweprimaryandjunior@gmail.com",
    href: "mailto:Menweprimaryandjunior@gmail.com",
    note: "menweprimaryschool94@gmail.com · Admissions and general enquiries",
  },
  {
    icon: MapPin,
    label: "Find us",
    value: "Igoki · Abogeta Division",
    href: googleMapsUrl,
    note: "Official coordinates: -0.099245555, 37.58121778.",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    grade: "",
  });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSuccess("");
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const message = form.message.trim();

    if (!name || !email || !message) {
      setError("Please complete your name, email address and message.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);

    try {
      const finalMessage = form.grade.trim()
        ? `Grade interest: ${form.grade.trim()}\n\n${message}`
        : message;

      const { error: dbError } = await getSupabase()
        .from("contact_submissions")
        .insert([
          {
            name,
            email,
            phone: phone || null,
            message: finalMessage,
            created_at: new Date().toISOString(),
          },
        ]);

      if (dbError) throw dbError;

      setForm({ name: "", email: "", phone: "", message: "", grade: "" });
      setSuccess(
        "Thank you. Your inquiry has been received and the school team will get back to you."
      );
    } catch (err) {
      setError(friendlyContactError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicLayout>
      <main>
        <section className="relative overflow-hidden bg-[#061229] px-5 py-16 text-white sm:py-20 lg:px-8 lg:py-24">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D89B28]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
          <div className="relative mx-auto max-w-7xl">
            <p className="inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#D89B28]">
              Contact Menwe
            </p>
            <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold tracking-tight sm:text-6xl">
              Let&apos;s start a useful conversation.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              Questions about admissions, school visits, learning pathways or life at Menwe?
              Our team is ready to help.
            </p>
          </div>
        </section>

        <section className="bg-[#F8F9FA] px-5 py-12 lg:px-8 lg:py-16">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
            {contactMethods.map(({ icon: Icon, label, value, href, note }) => (
              <a
                key={label}
                href={href}
                target={label === "Find us" ? "_blank" : undefined}
                rel={label === "Find us" ? "noreferrer" : undefined}
                className={`${card} group flex min-h-36 items-start gap-4 p-6 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#061229]/5 text-[#D89B28] transition-transform duration-300 group-hover:scale-105 dark:bg-white/5">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#D89B28]">
                    {label}
                  </span>
                  <span className="mt-2 block break-words text-sm font-bold text-[#061229] dark:text-white">
                    {value}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {note}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="px-5 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="rounded-3xl bg-[#061229] p-7 text-white shadow-xl sm:p-9">
              <p className="inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#D89B28]">
                Find us
              </p>
              <h2 className="mt-5 font-serif text-3xl font-semibold sm:text-4xl">
                Igoki · Abogeta Division
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">
                Official coordinates: -0.099245555, 37.58121778.
              </p>

              <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">
                  Physical location
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  Menwe Village, Igoki, Abogeta Division, South Imenti Constituency, Meru County, Kenya
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">
                  Postal address
                </p>
                <p className="mt-2 text-sm font-semibold text-white">P.O. Box 19, Kionyo</p>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#D89B28] px-5 py-3 text-sm font-extrabold text-[#061229] transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 focus:ring-offset-[#061229]"
              >
                <Navigation size={16} aria-hidden="true" />
                Open exact location in Google Maps
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>

            <form className={`${card} p-6 sm:p-8 lg:p-9`} onSubmit={submit} noValidate>
              <p className="inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#D89B28]">
                Send an inquiry
              </p>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-[#061229] sm:text-3xl dark:text-white">
                How can we help?
              </h2>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Parent Name <span className="text-[#D89B28]">*</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                    autoComplete="name"
                    className="mt-2 box-border min-h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#061229] outline-none focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Student Grade Interest
                  <input
                    value={form.grade}
                    onChange={(event) => setForm((value) => ({ ...value, grade: event.target.value }))}
                    className="mt-2 box-border min-h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#061229] outline-none focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="e.g. Grade 4"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Phone
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
                    autoComplete="tel"
                    className="mt-2 box-border min-h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#061229] outline-none focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Email <span className="text-[#D89B28]">*</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                    autoComplete="email"
                    className="mt-2 box-border min-h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#061229] outline-none focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>

              <label className="mt-5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Message <span className="text-[#D89B28]">*</span>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))}
                  className="mt-2 box-border w-full resize-y rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm leading-6 text-[#061229] outline-none focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              {error && (
                <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </p>
              )}
              {success && (
                <p role="status" className="mt-5 flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                  <CheckCircle2 size={19} className="shrink-0" aria-hidden="true" />
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#061229] px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D89B28] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-[#061229]"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                {busy ? "Sending…" : "Send inquiry"}
              </button>
            </form>
          </div>
        </section>

        <section className="bg-[#F8F9FA] px-5 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D89B28]">Location map</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#061229] sm:text-4xl dark:text-white">
              Find Menwe Primary &amp; Junior School
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400">
              Use the exact school coordinates for navigation.
            </p>
            <div className="mt-8">
              <ExactSchoolMap />
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
