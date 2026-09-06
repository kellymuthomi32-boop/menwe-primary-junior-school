import { Bot, CalendarDays, ChevronRight, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { listPublished } from "@/lib/database";

type Message = { id: string; from: "bot" | "user"; text: string; links?: { label: string; path: string }[] };

type Knowledge = {
  news: { title: string; excerpt: string }[];
  events: { title: string; date: string; location?: string }[];
};

const QUICK_QUESTIONS = ["How do I apply?", "What classes do you offer?", "Where is the school?", "What is happening soon?"];

const baseKnowledge = {
  admissions: {
    answer: "You can start an application online from the Admissions page. The school team can guide you through the requirements and next steps.",
    links: [{ label: "Open Admissions", path: "/admissions" }, { label: "Contact the school", path: "/contact" }],
  },
  academics: {
    answer: "Menwe provides Early Childhood & Primary learning, Junior Secondary School pathways, and co-curricular and talent opportunities including sport, music, STEM and leadership.",
    links: [{ label: "Explore Academics", path: "/academics" }, { label: "Discover School Life", path: "/school-life" }],
  },
  contact: {
    answer: "The school admissions hotline is 0142550882. You can also use the Contact page to send the school a message.",
    links: [{ label: "Open Contact", path: "/contact" }],
  },
  location: {
    answer: "Menwe Primary & Junior School is in the Kionyo area. The school's postal address is P.O. Box 19, Kionyo.",
    links: [{ label: "Get contact details", path: "/contact" }],
  },
  portal: {
    answer: "The secure portal is for authorised school users such as staff and families. Use the portal login to access your workspace.",
    links: [{ label: "Open Portal", path: "/portal/login" }],
  },
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function answerQuestion(question: string, knowledge: Knowledge): Omit<Message, "id" | "from"> {
  const q = normalize(question);
  if (!q) return { text: "Please type a question and I’ll help you find the right school information." };

  if (/\b(apply|application|admission|admissions|enrol|enroll|join|place)\b/.test(q)) return baseKnowledge.admissions;
  if (/\b(fee|fees|cost|price|tuition|charges|pay|payment)\b/.test(q)) {
    return { text: "For current fees and payment information, please contact the school directly so you receive the latest figures. I won’t guess a fee amount.", links: [{ label: "Contact the school", path: "/contact" }, { label: "Admissions", path: "/admissions" }] };
  }
  if (/\b(class|classes|grade|grades|curriculum|cbc|academic|academics|subject|subjects|junior|primary|learning)\b/.test(q)) return baseKnowledge.academics;
  if (/\b(where|location|located|address|kionyo|directions|map)\b/.test(q)) return baseKnowledge.location;
  if (/\b(phone|call|contact|email|reach|hotline|telephone)\b/.test(q)) return baseKnowledge.contact;
  if (/\b(portal|login|log in|account|dashboard)\b/.test(q)) return baseKnowledge.portal;
  if (/\b(news|latest|announcement|announcements)\b/.test(q)) {
    if (!knowledge.news.length) return { text: "I don’t have a published news item to show right now. Please check the News page for updates." , links: [{ label: "Open News", path: "/news" }] };
    return { text: `Here are the latest published updates: ${knowledge.news.map((item) => item.title).join("; ")}.`, links: [{ label: "Read News", path: "/news" }] };
  }
  if (/\b(event|events|calendar|happening|upcoming|soon|meeting|sports day)\b/.test(q)) {
    if (!knowledge.events.length) return { text: "There are no published upcoming events available right now. Please check the Events page for the latest calendar." , links: [{ label: "Open Events", path: "/events" }] };
    return { text: `Upcoming at Menwe: ${knowledge.events.map((item) => `${item.title} (${item.date})`).join("; ")}.`, links: [{ label: "View Events", path: "/events" }] };
  }
  if (/\b(gallery|photos|photo|pictures|school life|sport|football|rugby|music|talent)\b/.test(q)) return { text: "You can explore school activities, learner life and published photos through the Gallery and School Life pages.", links: [{ label: "Open Gallery", path: "/gallery" }, { label: "School Life", path: "/school-life" }] };
  if (/\b(about|history|founded|1961|principal|school)\b/.test(q)) return { text: "Menwe Primary & Junior School was established in 1961 and focuses on learning, character, confidence and the wider development of every learner.", links: [{ label: "About Menwe", path: "/about" }] };

  return {
    text: "I’m Menwe’s free school information assistant. I can help with admissions, academics, fees, contact details, the portal, news, events and school life. Try one of the questions below.",
    links: [{ label: "Admissions", path: "/admissions" }, { label: "Contact", path: "/contact" }],
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function SchoolFAQAssistant() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<Knowledge>({ news: [], events: [] });
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", from: "bot", text: "Hello 👋 I’m Menwe’s school assistant. Ask me about admissions, academics, fees, events, contact details or the school." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      try {
        const [newsResult, eventsResult] = await Promise.all([listPublished("news_articles", 0, 3), listPublished("events", 0, 5)]);
        if (!active) return;
        setKnowledge({
          news: newsResult.data.map((item) => ({ title: String(item.title || ""), excerpt: String(item.excerpt || "") })).filter((item) => item.title),
          events: eventsResult.data.map((item) => ({ title: String(item.title || ""), date: formatDate(String(item.starts_at || "")), location: item.location ? String(item.location) : undefined })).filter((item) => item.title),
        });
      } catch {
        // The assistant remains fully usable with its built-in FAQ when CMS data is unavailable.
      }
    };
    void load();
    return () => { active = false; };
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const latestEventLabel = useMemo(() => knowledge.events[0]?.title || "Upcoming events", [knowledge.events]);

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    const userMessage: Message = { id: crypto.randomUUID(), from: "user", text: question };
    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    const response = answerQuestion(question, knowledge);
    setMessages((current) => [...current, { id: crypto.randomUUID(), from: "bot", ...response }]);
    setLoading(false);
  };

  return <>
    {open && <div className="fixed inset-0 z-[115] bg-[#061229]/15 backdrop-blur-[1px] sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
    {open && <section className="fixed inset-x-3 bottom-20 z-[120] flex max-h-[min(680px,calc(100vh-110px))] flex-col overflow-hidden rounded-[1.5rem] border border-[var(--ink)]/10 bg-[var(--paper)] shadow-[0_28px_90px_rgba(6,18,41,.25)] sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[390px]" aria-label="Menwe school assistant">
      <header className="flex items-center justify-between bg-[var(--ink)] px-4 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--gold)] text-[var(--ink)] shadow-lg"><Bot size={22} /></span><div className="min-w-0"><p className="flex items-center gap-1.5 text-sm font-extrabold">Menwe Assistant <Sparkles size={13} className="text-[var(--gold)]" /></p><p className="mt-0.5 text-[10px] text-white/60">Free school information assistant</p></div></div>
        <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Close assistant"><X size={18} /></button>
      </header>
      <div className="border-b border-[var(--ink)]/8 bg-white/70 px-4 py-2.5"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-[var(--ink)]/45"><CalendarDays size={12} /> {latestEventLabel}</p></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
        {messages.map((message) => <div key={message.id} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${message.from === "user" ? "rounded-br-md bg-[var(--ink)] text-white" : "rounded-bl-md border border-[var(--ink)]/8 bg-white text-[var(--ink)] shadow-sm"}`}><p>{message.text}</p>{message.links?.length ? <div className="mt-2.5 flex flex-col gap-1.5">{message.links.map((link) => <button key={link.path} type="button" onClick={() => { navigate(link.path); setOpen(false); }} className="flex w-full items-center justify-between gap-2 rounded-xl bg-[var(--mist)] px-3 py-2 text-left text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--gold)]/15"><span>{link.label}</span><ChevronRight size={14} className="shrink-0 text-[var(--accent)]" /></button>)}</div> : null}</div></div>)}
        {loading && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-[var(--ink)]/8 bg-white px-4 py-3 text-xs text-[var(--ink)]/50 shadow-sm">Thinking…</div></div>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-[var(--ink)]/8 bg-white px-3 pb-3 pt-2.5">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">{QUICK_QUESTIONS.map((question) => <button key={question} type="button" onClick={() => void send(question)} className="shrink-0 rounded-full border border-[var(--ink)]/10 bg-[var(--paper)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--ink)]/65 transition hover:border-[var(--gold)]/40 hover:text-[var(--ink)]">{question}</button>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-center gap-2 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] p-1.5 focus-within:border-[var(--gold)]/60"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Menwe a question…" aria-label="Ask Menwe a question" className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink)]/35" /><button type="submit" disabled={!input.trim() || loading} aria-label="Send question" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--ink)] text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35"><Send size={15} /></button></form>
        <p className="mt-2 text-center text-[9px] text-[var(--ink)]/35">Answers use Menwe’s built-in FAQ plus published school updates.</p>
      </div>
    </section>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close Menwe assistant" : "Open Menwe assistant"} aria-expanded={open} className={`fixed bottom-5 right-5 z-[121] grid h-14 w-14 place-items-center rounded-full bg-[var(--gold)] text-[var(--ink)] shadow-[0_12px_34px_rgba(6,18,41,.22)] ring-4 ring-[var(--gold)]/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(6,18,41,.28)] focus:outline-none focus:ring-4 focus:ring-[var(--gold)]/40 ${open ? "rotate-0" : ""}`}><span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--ink)] px-1 text-[9px] font-extrabold text-white">AI</span>{open ? <X size={22} /> : <MessageCircle size={23} />}</button>
  </>;
}
