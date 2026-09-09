import { FileText, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

/** Compatibility entry point for the canonical level-aware report-card workspace. */
export default function ReportCardButton({ userId: _userId }: { userId?: string }) {
  const [, go] = useLocation();

  return (
    <button
      type="button"
      onClick={() => go("/portal/report-cards")}
      className="min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-4 font-bold text-[#061229] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[.98]"
    >
      <FileText size={17} />
      Open Report Cards
      <ArrowRight size={16} />
    </button>
  );
}
