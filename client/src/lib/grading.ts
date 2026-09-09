export type CbcLevel = "EE" | "ME" | "AE" | "BE" | "";

/** Calculate the CBC performance level from a score and the assessment maximum. */
export function levelFromScore(score: number, maximum: number): CbcLevel {
  if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0) return "";
  if (score < 0 || score > maximum) return "";
  const pct = (score / maximum) * 100;
  if (pct >= 76) return "EE";
  if (pct >= 51) return "ME";
  if (pct >= 26) return "AE";
  return "BE";
}
