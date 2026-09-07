import { useEffect } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";

const SESSION_KEY = "menwe:analytics-session";
const PREFERENCES_KEY = "menwe-cookie-preferences";

function analyticsAllowed() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { analytics?: boolean };
    return parsed.analytics === true;
  } catch {
    return false;
  }
}

function sessionKey() {
  if (typeof window === "undefined") return "server";
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(SESSION_KEY, value);
  return value;
}

export default function PrivacyAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    if (location.startsWith("/portal") || location.startsWith("/login") || !analyticsAllowed()) return;

    const timer = window.setTimeout(() => {
      void getSupabase()
        .from("site_analytics")
        .insert({
          path: location,
          event_type: "page_view",
          session_key: sessionKey(),
          referrer: document.referrer.slice(0, 1000),
        })
        .then(({ error }) => {
          if (error) console.warn("Analytics event was not recorded", error);
        });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [location]);

  return null;
}