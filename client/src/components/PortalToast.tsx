import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type PortalToastProps = {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
};

export function PortalToast({ message, type = "success", onClose }: PortalToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  const success = type === "success";

  return (
    <div className="fixed right-4 top-4 z-[100] w-[min(92vw,420px)] sm:right-6 sm:top-6" role={success ? "status" : "alert"} aria-live="polite">
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
        <div className="flex items-start gap-3 p-4">
          <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${success ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-[var(--ink)]/45">{success ? "Success" : "Action failed"}</p>
            <p className="mt-1 text-sm font-bold leading-5 text-[var(--ink)]">{message}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Dismiss notification" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--ink)]/40 transition hover:bg-[var(--mist)] hover:text-[var(--ink)]">
            <X size={17} />
          </button>
        </div>
        <div className={`h-0.5 ${success ? "bg-emerald-500" : "bg-red-500"}`} />
      </div>
    </div>
  );
}
