import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import ExactSchoolMap from "@/components/ExactSchoolMap";
import { getSupabase } from "@/lib/supabase";

const card =
  "rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900";

const officialLocation =
  "Menwe Village, Igoki, Abogeta Division, South Imenti Constituency, Meru County, Kenya";

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
    label: "Call the school",
    value: "0142550882",
    href: "tel:0142550882",
    note: "Speak directly with the school team",
  },
  {
    icon: Mail,
    label: "Email",
    value: "Menweprimaryandjunior@gmail.com",
    href: "mailto:Menweprimaryandjunior@gmail.com",
    note: "For admissions and general enquiries",
  },
  {
    icon: Mail,
    label: "Alternative email",
    value: "menweprimaryschool94@gmail.com",
    href: "mailto:menweprimaryschool94@gmail.com",
    note: "A second channel for school enquiries",
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
        <section className="relative overflow-hidden bg-[#061229] px-5 py-16 text-white sm:py-20 lg:py-24 lg:px-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D89B28]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
          <div className="relative mx-auto max-w-7xl">
            <div className="max-w-3xl">
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
              <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Clock3 size={16} className="text-[#D89B28]" /> School enquiries
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <MapPin size={16} className="text-[#D89B28]" /> Menwe Village
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F8F9FA] px-5 py-12 lg:px-8 lg:py-16">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
            {contactMethods.map(({ icon: Icon, label, value, href, note }) => (
              <a
                key={label}
                href={href}
                className={`${card} group flex min-h-36 items-start gap-4 p-6 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#061229]/5 text-[#061229] transition-transform duration-300 group-hover:scale-105 dark:bg-white/5 dark:text-white">
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
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
            <div className="flex flex-col justify-between rounded-3xl bg-[#061229] p-7 text-white shadow-xl sm:p-9">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D89B28]/10 text-[#D89B28]">
                  <MapPin size={22} aria-hidden="true" />
                </span>
                <p className="mt-6 inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#D89B28]">
                  Visit Menwe
                </p>
                <h2 className="mt-4 font-serif text-2xl font-semibold sm:text-3xl">
                  We&apos;re here to help you find the school.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  {officialLocation}
                </p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">
                    Postal address
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    P.O. Box 19, Kionyo
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D89B28]">
                    Exact location
                  </p>
                  <p className="mt-2 font-mono text-xs text-white/75">
                    -0.099245555, 37.58121778
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    0°05&apos;57.3&quot;S, 37°34&apos;52.4&quot;E
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <a
                  href="https://wa.me/254142550882"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-4 py-3 text-center text-sm font-extrabold text-[#061229] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 focus:ring-offset-[#061229] active:scale-[.98]"
                >
                  <MessageCircle size={17} aria-hidden="true" />
                  WhatsApp us
                </a>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#D89B28]"
                >
                  <Navigation size={16} aria-hidden="true" />
                  Google Maps
                </a>
              </div>
            </div>

            <form
              className={`${card} p-6 sm:p-8 lg:p-9`}
              onSubmit={submit}
              noValidate
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#D89B28]">
                    Send an inquiry
                  </p>
                  <h2 className="mt-3 font-serif text-2xl font-semibold text-[#061229] sm:text-3xl dark:text-white">
                    Tell us how we can help.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Complete the form and your message will be sent to the school team.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Parent Name <span className="text-[#D89B28]">*</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                    autoComplete="name"
                    className="mt-2 box-border min-h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#061229] outline-none transition focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Your full name"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Student Grade Interest
                  <input
                    value={form.grade}
                    onChange={(event) => setForm((value) => ({ ...value, grade: event.target.value }))}
                    className="mt-2 box-border min-h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#061229] outline-none transition focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                    className="mt-2 box-border min-h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#061229] outline-none transition focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Your phone number"
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
                    className="mt-2 box-border min-h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm text-[#061229] outline-none transition focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="you@example.com"
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
                  className="mt-2 box-border w-full resize-y rounded-xl border border-gray-200 bg-[#F8F9FA] px-4 py-3 text-sm leading-6 text-[#061229] outline-none transition focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Tell us what you would like to know..."
                />
              </label>

              {error && (
                <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {error}
                </p>
              )}

              {success && (
                <p role="status" className="mt-5 flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {success}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  We only use your details to respond to your enquiry.
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#061229] px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-[#061229]"
                >
                  {busy ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={15} aria-hidden="true" />
                      Send Inquiry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="bg-[#F8F9FA] px-5 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D89B28]">
                Find us
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#061229] sm:text-4xl dark:text-white">
                Our exact school location
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                Use the exact pin below for directions to Menwe Primary &amp; Junior School.
              </p>
            </div>
            <ExactSchoolMap />
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-[#061229] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#D89B28] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <Navigation size={15} aria-hidden="true" />
                Open exact Google Maps location
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
