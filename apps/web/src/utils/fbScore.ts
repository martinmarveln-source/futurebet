/**
 * FutureBet Score (FB Score) - Single unified trust metric per match
 * Range: 0-100
 * Tiers: 85+ Elite, 70-84 High, 50-69 Medium, <50 Low
 */

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const safe  = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export interface FBScoreResult {
  score: number;
  tier: "Elite" | "High" | "Medium" | "Low";
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  breakdown: { chance: number; rating: number; stability: number; trust: number; };
}

export function computeFBScore(match: any, intelligence?: any): FBScoreResult {
  const chance   = clamp(safe(match?.chance));
  const rating   = clamp(safe(match?.rating));
  const stability = intelligence?.stability != null
    ? clamp(safe(intelligence.stability) * 100)
    : deriveStability(match);
  const trust = intelligence?.modelTrust != null
    ? clamp(safe(intelligence.modelTrust))
    : deriveModelTrust(match);

  const score = clamp(Math.round(chance * 0.35 + rating * 0.30 + stability * 0.20 + trust * 0.15));

  return {
    score,
    ...getTier(score),
    label: `FB ${score}`,
    breakdown: { chance: Math.round(chance), rating: Math.round(rating), stability: Math.round(stability), trust: Math.round(trust) },
  };
}

function getTier(score: number): Pick<FBScoreResult, "tier" | "color" | "bgColor" | "borderColor"> {
  if (score >= 85) return { tier: "Elite", color: "text-purple-300", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/40" };
  if (score >= 70) return { tier: "High", color: "text-emerald-300", bgColor: "bg-emerald-500/20", borderColor: "border-emerald-500/40" };
  if (score >= 50) return { tier: "Medium", color: "text-amber-300", bgColor: "bg-amber-500/20", borderColor: "border-amber-500/40" };
  return { tier: "Low", color: "text-slate-400", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/20" };
}

function deriveStability(match: any): number {
  const formGap = Math.abs(safe(match?.hPts) - safe(match?.aPts));
  return clamp((formGap / 15) * 100);
}

function deriveModelTrust(match: any): number {
  const chance = safe(match?.chance);
  const rating = safe(match?.rating);
  const flag = String(match?.flag || "");
  let trust = chance * 0.5 + rating * 0.5;
  if (flag.includes("✅") || flag.includes("⭐")) trust = Math.min(100, trust + 5);
  return clamp(trust);
}
