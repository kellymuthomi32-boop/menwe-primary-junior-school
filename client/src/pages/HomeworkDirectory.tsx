import { BookOpenCheck, CheckCircle2, Clock3, Download, FileText, Loader2, Plus, Search, Send, Sparkles, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { PortalLayout } from "@/components/PortalLayout";

type Row = Record<string, unknown>;
const text = (v: unknown, fallback = "") => (v == null ? fallback : String(v));
