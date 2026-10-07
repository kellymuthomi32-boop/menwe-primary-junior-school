export type CbcLevel = "EE1" | "EE2" | "ME1" | "ME2" | "AE1" | "AE2" | "BE1" | "BE2" | "";

/** Calculate the CBC performance level from a score and the assessment maximum. */
export function levelFromScore(score: number, maximum: number): CbcLevel {
  if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0) return "";
  if (score < 0 || score > maximum) return "";
  const pct = (score / maximum) * 100;
  if (pct >= 90) return "EE1";
  if (pct >= 75) return "EE2";
  if (pct >= 58) return "ME1";
  if (pct >= 41) return "ME2";
  if (pct >= 31) return "AE1";
  if (pct >= 21) return "AE2";
  if (pct >= 11) return "BE1";
  if (pct >= 1) return "BE2";
  return "";
}

export const CBC_LEVEL_POINTS: Record<Exclude<CbcLevel, "">, number> = {
  EE1: 8, EE2: 7, ME1: 6, ME2: 5, AE1: 4, AE2: 3, BE1: 2, BE2: 1,
};

export const CBC_LEVEL_REMARKS: Record<Exclude<CbcLevel, "">, string> = {
  EE1: "Exceptional", EE2: "Very Good", ME1: "Good", ME2: "Fair",
  AE1: "Needs Improvement", AE2: "Below Average", BE1: "Well Below Average", BE2: "Minimal",
};
