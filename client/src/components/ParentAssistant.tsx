import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Loader2, MessageCircle, Minus, Send, Sparkles, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Message = { role: "user" | "assistant"; content: string };
type ApexRole = "parent" | "teacher" | "institution";
type ApexSubjectMode = "general" | "mathematics";
type MathLevel = "auto" | "1-3" | "4-6" | "7-9";

const INITIAL_MESSAGE = "Hello. I’m Menwe Apex. Ask me about learning, CBC curriculum, authorized academic progress, or institutional information available to your role.";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function renderInline(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\$([^$]+)\$/g, '<span class="apex-math">$1</span>');
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: JSX.Element[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;
  const fence = String.fromCharCode(96).repeat(3);

  const flushList = () => {
    if (!list.length) return;
    blocks.push(<ol key={`list-${blocks.length}`} className="my-2 list-decimal space-y-1 pl-5">{list.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />)}</ol>);
    list = [];
  };

  const flushCode = () => {
    if (!code.length) return;
    blocks.push(<pre key={`code-${blocks.length}`} className="my-3 overflow-x-auto rounded-xl bg-[#061229] p-3 text-xs leading-5 text-slate-100"><code>{code.join("\n")}</code></pre>);
    code = [];
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith(fence)) {
      if (inCode) flushCode();
      else { flushList(); inCode = true; }
      return;
    }
    if (inCode) { code.push(line); return; }

    const trimmed = line.trim();
    if (!trimmed) { flushList(); return; }
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (numbered) { list.push(numbered[1]); return; }

    if (bullet) {
      flushList();
      blocks.push(<div key={`bullet-${index}`} className="my-1 flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D89B28]" /><span dangerouslySetInnerHTML={{ __html: renderInline(bullet[1]) }} /></div>);
      return;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      flushList();
      blocks.push(<h3 key={`heading-${index}`} className="mt-3 font-bold text-[#061229] first:mt-0" dangerouslySetInnerHTML={{ __html: renderInline(trimmed.replace(/^#{1,3}\s+/, "")) }} />);
      return;
    }

    if (/^>\s?/.test(trimmed)) {
      flushList();
      blocks.push(<blockquote key={`quote-${index}`} className="my-2 border-l-2 border-[#D89B28] pl-3 italic text-slate-600" dangerouslySetInnerHTML={{ __html: renderInline(trimmed.replace(/^>\s?/, "")) }} />);
      return;
    }

    flushList();
    blocks.push(<p key={`paragraph-${index}`} className="my-1.5 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />);
  });

  if (inCode) flushCode();
  flushList();
  return <div className="apex-markdown">{blocks}</div>;
}

const roleLabel: Record<ApexRole, string> = {
  parent: "Family Assistant",
  teacher: "Teacher Assistant",
  institution: "Institution Assistant",
};

const mathLevelLabel: Record<MathLevel, string> = {
  auto: "Auto-detect",
  "1-3": "Grades 1–3",
  "4-6": "Grades 4–6",
  "7-9": "Grades 7–9",
};

export function ApexAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: INITIAL_MESSAGE }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apexRole, setApexRole] = useState<ApexRole | null>(null);
  const [subjectMode, setSubjectMode] = useState<ApexSubjectMode>("general");
  const [mathLevel, setMathLevel] = useState<MathLevel>("auto");
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const mathInstruction = (text: string) => [
    "You are in the Menwe Mathematics Workspace.",
    `Target level: ${mathLevelLabel[mathLevel]}.`,
    "Act as a Kenyan CBC Mathematics specialist.",
    "Work transparently: identify what is given and required, choose the method or formula, show every meaningful step, give the final answer with units where relevant, and verify the result.",
    "Do not skip intermediate calculations. If the learner supplied working, diagnose the first incorrect step before correcting it.",
    "Use concrete/visual language for Grades 1–3, structured multi-step working for Grades 4–6, and formal analytical notation for Grades 7–9.",
    "For word problems, extract the data and explain why the chosen operation or formula fits. For fractions, percentages, ratio, algebra, geometry and statistics, show the relevant conversion/formula and substitution.",
    "If the user asks for a hint, do not immediately reveal the complete solution. If they ask for full working, provide full working.",
    `Mathematics task: ${text}`,
  ].join("\n");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    const serverMessages: Message[] = subjectMode === "mathematics"
      ? [...nextMessages.slice(0, -1), { role: "user", content: mathInstruction(text) }]
      : nextMessages;

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 45_000);

    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");

      const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
      if (!base) throw new Error("Supabase is not configured.");

      const response = await fetch(`${base.replace(/\/$/, "")}/functions/v1/apex-engine`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: serverMessages.slice(-10), subject_mode: subjectMode, math_level: mathLevel }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error("Your session is no longer valid. Please sign in again.");
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Apex is temporarily unavailable.");

      if (payload.role === "parent" || payload.role === "teacher" || payload.role === "institution") setApexRole(payload.role);
      const answer = typeof payload.message === "string" ? payload.message : "I could not find enough verified information to answer that.";
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (err) {
      const message = err instanceof DOMException && err.name === "AbortError"
        ? "The request took too long. Please try again."
        : err instanceof Error ? err.message : "The assistant is temporarily unavailable.";
      setError(message);
      setMessages((current) => [...current, { role: "assistant", content: message }]);
    } finally {
      window.clearTimeout(timeout);
      abortRef.current = null;
      setBusy(false);
    }
  };

  return (
    <>
      {!open && <button type="button" onClick={() => setOpen(true)} aria-label="Open Menwe Apex assistant" className="fixed bottom-4 right-4 z-50 flex min-h-14 items-center gap-2 rounded-full bg-[#061229] px-4 text-sm font-bold text-white shadow-xl ring-1 ring-white/10 transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#D89B28] text-[#061229]"><Sparkles size={18} /></span>
        <span className="hidden sm:inline">Ask Menwe Apex</span>
      </button>}

      {open && <div className="pointer-events-none fixed inset-0 z-50 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[min(430px,calc(100vw-2rem))]">
        <section aria-label="Menwe Apex chat" className={`pointer-events-auto absolute bottom-0 right-0 flex w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl ${minimized ? "h-[76px]" : "h-[min(720px,calc(100dvh-1rem))] rounded-t-3xl sm:h-[min(720px,calc(100dvh-2.5rem))]"}`}>
          <header className="flex shrink-0 items-center gap-3 bg-[#061229] px-4 py-3 text-white">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D89B28] text-[#061229]"><Bot size={20} /></span>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D89B28]">Menwe Apex V2</p><h2 className="truncate text-sm font-bold">{subjectMode === "mathematics" ? "Mathematics Workspace" : apexRole ? roleLabel[apexRole] : "Secure Academic Intelligence"}</h2></div>
            <button type="button" onClick={() => setMinimized((v) => !v)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label={minimized ? "Expand assistant" : "Minimize assistant"}>{minimized ? <ChevronDown size={18} /> : <Minus size={18} />}</button>
            <button type="button" onClick={() => { setOpen(false); setMinimized(false); }} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Close assistant"><X size={18} /></button>
          </header>

          {!minimized && <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button type="button" onClick={() => setSubjectMode("general")} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${subjectMode === "general" ? "bg-[#061229] text-white shadow-sm" : "text-slate-500 hover:text-[#061229]"}`}>General</button>
                  <button type="button" onClick={() => setSubjectMode("mathematics")} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${subjectMode === "mathematics" ? "bg-[#D89B28] text-[#061229] shadow-sm" : "text-slate-500 hover:text-[#061229]"}`}>Mathematics</button>
                </div>
                {subjectMode === "mathematics" && <label className="ml-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Level
                  <select value={mathLevel} onChange={(e) => setMathLevel(e.target.value as MathLevel)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold normal-case tracking-normal text-[#061229] outline-none focus:border-[#D89B28]">
                    <option value="auto">Auto</option><option value="1-3">Grades 1–3</option><option value="4-6">Grades 4–6</option><option value="7-9">Grades 7–9</option>
                  </select>
                </label>}
              </div>
              {subjectMode === "mathematics" && <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
                {[
                  ["Solve step-by-step", "Solve this Mathematics problem step-by-step and show all working."],
                  ["Explain a concept", "Explain this Mathematics concept simply, then give one worked example."],
                  ["Create practice", "Create 5 Mathematics practice questions at this level, then provide answers separately."],
                  ["Check my working", "Check my Mathematics working. Find the first incorrect step, explain why it is wrong, and show the corrected step."],
                ].map(([label, prompt]) => <button key={label} type="button" onClick={() => setInput(prompt)} className="shrink-0 rounded-full border border-[#D89B28]/35 bg-[#D89B28]/8 px-3 py-1.5 text-[10px] font-bold text-[#061229] transition hover:-translate-y-0.5 hover:border-[#D89B28]">{label}</button>)}
              </div>}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
              <div className="space-y-3">
                {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[88%] ${message.role === "user" ? "rounded-br-md bg-[#061229] text-white" : "rounded-bl-md bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                    {message.role === "assistant" ? <MarkdownMessage content={message.content} /> : <p className="whitespace-pre-wrap">{message.content}</p>}
                  </div>
                </div>)}
                {busy && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200"><Loader2 size={16} className="animate-spin text-[#D89B28]" /> Apex is thinking…</div></div>}
                <div ref={endRef} />
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
              {subjectMode === "mathematics" && <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#D89B28]/25 bg-[#D89B28]/8 px-3 py-2 text-[10px] font-semibold text-[#061229]"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#D89B28] font-black">∑</span><span>Math mode: step-by-step working, verification and CBC-level adaptation are active.</span></div>}
              {error && <p role="alert" className="mb-2 text-xs text-red-600">{error}</p>}
              <form onSubmit={submit} className="flex items-end gap-2">
                <textarea aria-label="Ask Menwe Apex" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(event); } }} disabled={busy} maxLength={4000} rows={1} className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#D89B28] focus:ring-2 focus:ring-[#D89B28]/20 disabled:opacity-60" placeholder={subjectMode === "mathematics" ? "Enter a Mathematics problem or ask for working…" : "Ask Menwe Apex…"} />
                <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#D89B28] text-[#061229] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
              </form>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400"><MessageCircle size={11} /><span>Access is enforced server-side from your verified school role.</span></div>
            </div>
          </div>}
        </section>
      </div>}
    </>
  );
}

// Backward-compatible export so existing Parent dashboard imports do not break during the rollout.
export const ParentAssistant = ApexAssistant;
export default ApexAssistant;
