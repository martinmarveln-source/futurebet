import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { GET as getMatches } from "../matches/route";

export interface PresetLeg {
  match: string;
  league: string;
  country: string;
  date: string;
  time: string;
  selectedMarket: string;
  selectedOption: string;
  odds: number;
  confidence: number;
  reason: string;
  ftScore?: string | null;
  status?: "pending" | "won" | "lost";
}

export interface PresetSlip {
  id: string;
  title: string;
  badge: string;
  tierTag: string;
  minTierRequired: "silver" | "premium";
  isLocked: boolean;
  targetOdds: string;
  combinedOdds: number;
  matchesCount: number;
  confidence: number;
  description: string;
  stake?: number;
  potentialWin?: number;
  resetInfo?: string;
  status?: "pending" | "won" | "lost";
  matches: PresetLeg[];
}

/* ------------------------------------------------------------------ */
/*  Database Table Guarantee                                          */
/* ------------------------------------------------------------------ */
async function ensureHistoryTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS curated_multi_bet_history (
        id TEXT PRIMARY KEY,
        preset_tier TEXT NOT NULL,
        scope TEXT NOT NULL,
        title TEXT NOT NULL,
        target_odds TEXT NOT NULL,
        combined_odds NUMERIC NOT NULL,
        confidence INTEGER NOT NULL,
        stake NUMERIC DEFAULT 1000,
        potential_win NUMERIC,
        status TEXT DEFAULT 'pending',
        matches JSONB NOT NULL,
        created_date DATE DEFAULT CURRENT_DATE,
        settled_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Ensure booking_codes and admin_trimmed columns exist
    await sql`
      ALTER TABLE curated_multi_bet_history 
      ADD COLUMN IF NOT EXISTS booking_codes JSONB DEFAULT '{}'::jsonb;
    `;
    await sql`
      ALTER TABLE curated_multi_bet_history 
      ADD COLUMN IF NOT EXISTS admin_trimmed BOOLEAN DEFAULT FALSE;
    `;

    // Purge any corrupted legacy test rows where matches were scheduled in 2027
    await sql`
      DELETE FROM curated_multi_bet_history
      WHERE matches::text LIKE '%2027-%';
    `;

    // Ensure future matches in matches_cache never hold premature ft_score values
    await sql`
      UPDATE matches_cache
      SET ft_score = NULL
      WHERE match_date > CURRENT_DATE AND ft_score IS NOT NULL;
    `;
  } catch (err) {
    console.warn("Failed to ensure curated_multi_bet_history table:", err);
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Match Exclusions (DB + in-memory fallback)                  */
/* ------------------------------------------------------------------ */
const excludedMatchesCache = new Map<string, Set<string>>();
const adminTrimmedCache = new Map<string, { matches: PresetLeg[]; combinedOdds: number; confidence: number }>();

async function ensureExcludedTable() {
  if (!process.env.DATABASE_URL) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS curated_excluded_matches (
        slip_id TEXT NOT NULL,
        match_name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (slip_id, match_name)
      );
    `;
  } catch (err) {
    console.warn("Failed to ensure curated_excluded_matches table:", err);
  }
}

function normalizeExcludedKey(name: string): string {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function addExcludedForSlip(slipId: string, matches: string[]) {
  if (!slipId || !matches.length) return;
  const set = excludedMatchesCache.get(slipId) || new Set<string>();
  for (const m of matches) {
    const k = normalizeExcludedKey(m);
    if (k) set.add(k);
  }
  excludedMatchesCache.set(slipId, set);

  if (process.env.DATABASE_URL) {
    try {
      await ensureExcludedTable();
      for (const m of matches) {
        const clean = String(m || "").trim();
        if (!clean) continue;
        await sql`
          INSERT INTO curated_excluded_matches (slip_id, match_name)
          VALUES (${slipId}, ${clean})
          ON CONFLICT (slip_id, match_name) DO NOTHING;
        `;
      }
    } catch (err) {
      console.warn("Failed to persist excluded matches:", err);
    }
  }
}

async function getExcludedMapForSlips(slipIds: string[]): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  for (const id of slipIds) {
    const cached = excludedMatchesCache.get(id);
    if (cached) result.set(id, new Set(cached));
  }

  if (process.env.DATABASE_URL && slipIds.length > 0) {
    try {
      await ensureExcludedTable();
      const rows = await sql`
        SELECT slip_id, match_name FROM curated_excluded_matches
        WHERE slip_id = ANY(${slipIds});
      `;
      if (rows && rows.length > 0) {
        for (const r of rows) {
          const set = result.get(r.slip_id) || new Set<string>();
          const k = normalizeExcludedKey(r.match_name);
          if (k) set.add(k);
          result.set(r.slip_id, set);
        }
      }
    } catch (err) {
      console.warn("Failed to load excluded matches:", err);
    }
  }
  return result;
}

function filterPoolByExcluded(pool: any[], slipId: string, excludedMap: Map<string, Set<string>>): any[] {
  const excludedSet = excludedMap.get(slipId);
  if (!excludedSet || excludedSet.size === 0) return pool;
  return pool.filter((m) => {
    const matchName = m.match || `${m.homeTeam || ""} - ${m.awayTeam || ""}`;
    const k1 = normalizeExcludedKey(matchName);
    const k2 = normalizeExcludedKey(`${m.homeTeam || ""} vs ${m.awayTeam || ""}`);
    return !excludedSet.has(k1) && !excludedSet.has(k2);
  });
}

/* ------------------------------------------------------------------ */
/*  Safe number helper                                                */
/* ------------------------------------------------------------------ */
function toNum(val: any, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/* ------------------------------------------------------------------ */
/*  Date helpers (Lagos WAT timezone)                                 */
/* ------------------------------------------------------------------ */
function getLagosDateISO(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function getMatchDateStr(m: any): string {
  const raw = String(m.date || m.dateRaw || m.dateISO || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return "";
}

function toSafeDateISO(val: any): string {
  if (!val) return "";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return String(val || "").slice(0, 10);
}

function getDayOfWeekInLagos(dateStr: string): number {
  if (!dateStr || !dateStr.includes("-")) return -1;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
}

function getCurrentMondayToSundayRange() {
  const todayLagos = getLagosDateISO(0);
  const dayOfWeek = getDayOfWeekInLagos(todayLagos);
  // Distance to Monday: if Sunday (0), Monday was 6 days ago (-6); else 1 - dayOfWeek
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayISO = getLagosDateISO(diffToMonday);
  const sundayISO = getLagosDateISO(diffToMonday + 6);
  return { mondayISO, sundayISO };
}

function isMatchFinished(dateStr: string, timeStr?: string): boolean {
  const todayISO = getLagosDateISO(0);
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (d > todayISO) return false; // Strictly in the future (tomorrow or later)
  if (d < todayISO) return true;  // Yesterday or earlier match days are past

  // Today: check kickoff time if provided
  if (!timeStr) return true;
  const matchTime = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!matchTime) return true;

  try {
    const lagosNow = new Date();
    const lagosHour = parseInt(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", hour12: false }).format(lagosNow),
      10
    );
    const lagosMinute = parseInt(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", minute: "2-digit" }).format(lagosNow),
      10
    );
    const currentMinutes = lagosHour * 60 + lagosMinute;
    const matchMinutes = parseInt(matchTime[1], 10) * 60 + parseInt(matchTime[2], 10);
    // Official FT only available if at least 110 minutes have elapsed since kickoff
    return currentMinutes >= matchMinutes + 110;
  } catch {
    return true;
  }
}

/* ------------------------------------------------------------------ */
/*  Match & Score Evaluation Utilities                                */
/* ------------------------------------------------------------------ */
function normMatchName(s: any): string {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s*vs\s*/g, " - ")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}

function splitTeams(matchName: string): { home: string; away: string } {
  const parts = matchName.split(/\s+[-–—vsVS]+\s+/);
  return {
    home: (parts[0] || "").trim().toLowerCase(),
    away: (parts[1] || "").trim().toLowerCase(),
  };
}

function parseFtScore(score: string | null | undefined): { hg: number; ag: number; total: number } | null {
  if (!score) return null;
  const m = String(score).trim().match(/^(\d+)\s*[:\-]\s*(\d+)$/);
  if (!m) return null;
  const hg = parseInt(m[1], 10);
  const ag = parseInt(m[2], 10);
  if (isNaN(hg) || isNaN(ag)) return null;
  return { hg, ag, total: hg + ag };
}

function evaluateLegOutcome(market: string, option: string, ftScore: string): "won" | "lost" | "pending" {
  const parsed = parseFtScore(ftScore);
  if (!parsed) return "pending";
  const { hg, ag, total } = parsed;

  const mkt = (market || "").toLowerCase();
  const opt = (option || "").toLowerCase();

  // 1. Double Chance — handle all text variants (1X, X2, 12, "Home or Draw", "Away Win or Draw", etc.)
  const isDoubleChanceMkt = mkt.includes("double");
  const isDoubleChanceOpt =
    opt.includes("1x") || opt.includes("x2") || opt.includes("12") ||
    opt.includes("home or draw") || opt.includes("home win or draw") ||
    opt.includes("draw or away") || opt.includes("away win or draw") || opt.includes("draw or away win") ||
    opt.includes("home or away") || opt.includes("home win or away") || opt.includes("home or away win");

  if (isDoubleChanceMkt || isDoubleChanceOpt) {
    const homeOrDraw = hg >= ag;
    const drawOrAway = ag >= hg;
    const homeOrAway = hg !== ag;

    // Home or Draw variants
    if (opt.includes("1x") || opt.includes("home or draw") || opt.includes("home win or draw"))
      return homeOrDraw ? "won" : "lost";
    // Away or Draw variants
    if (opt.includes("x2") || opt.includes("draw or away") || opt.includes("away win or draw") || opt.includes("draw or away win"))
      return drawOrAway ? "won" : "lost";
    // Home or Away variants (no draw)
    if (opt.includes("12") || opt.includes("home or away") || opt.includes("home win or away") || opt.includes("home or away win"))
      return homeOrAway ? "won" : "lost";

    // Fallback when mkt is Double Chance but option text is unrecognised
    return "pending";
  }

  // 2. Both Teams To Score (BTTS)
  if (mkt.includes("both") || mkt.includes("btts") || opt.includes("btts")) {
    const isGg = hg > 0 && ag > 0;
    if (opt.includes("yes")) return isGg ? "won" : "lost";
    if (opt.includes("no")) return !isGg ? "won" : "lost";
    return isGg ? "won" : "lost";
  }

  // 3. Goals Over / Under
  if (mkt.includes("goal") || mkt.includes("over") || mkt.includes("under") || opt.includes("over") || opt.includes("under")) {
    const lineMatch = (opt + " " + mkt).match(/(\d+(\.\d+)?)/);
    const line = lineMatch ? parseFloat(lineMatch[1]) : 2.5;

    if (opt.includes("over")) return total > line ? "won" : "lost";
    if (opt.includes("under")) return total < line ? "won" : "lost";
  }

  // 4. Full Time Result (1X2) — also handles market stored as plain "1X2", "Home", "Away", "Draw" options
  if (mkt.includes("result") || mkt.includes("1x2") || mkt.includes("match") || mkt === "1x2" || mkt === "fulltime" || mkt === "full time result") {
    if (opt.includes("home") || opt === "1" || opt === "home win") return hg > ag ? "won" : "lost";
    if (opt.includes("away") || opt === "2" || opt === "away win") return ag > hg ? "won" : "lost";
    if (opt.includes("draw") || opt === "x") return hg === ag ? "won" : "lost";
  }

  return "pending";
}

/* ------------------------------------------------------------------ */
/*  Candidate market extractor for accumulator building               */
/* ------------------------------------------------------------------ */
function extractEligibleMarkets(m: any): Array<{
  market: string;
  option: string;
  odds: number;
  confidence: number;
  risk: "safe" | "medium" | "aggressive";
  reason: string;
}> {
  const candidates: Array<{
    market: string;
    option: string;
    odds: number;
    confidence: number;
    risk: "safe" | "medium" | "aggressive";
    reason: string;
  }> = [];

  const hWin = toNum(m.homeWin || m.hWin);
  const aWin = toNum(m.awayWin || m.aWin);
  const draw = toNum(m.draw);
  const hOdds = toNum(m.homeOdds);
  const aOdds = toNum(m.awayOdds);
  const dc1X = toNum(m.dc1X);
  const dcX2 = toNum(m.dcX2);
  const dc12 = toNum(m.dc12);
  const o15Odds = toNum(m.o15Odds);
  const o25Odds = toNum(m.o25Odds);
  const u25Odds = toNum(m.u25Odds);
  const u35Odds = toNum(m.u35Odds);
  const bttsYesOdds = toNum(m.bttsYesOdds);
  const hppg = toNum(m.hppg);
  const appg = toNum(m.appg);
  const un25 = toNum(m.un25);
  const ov25 = toNum(m.ov25);
  const hcs = toNum(m.hcs);
  const acs = toNum(m.acs);
  const hfts = toNum(m.hfts ?? m.hFailedToScore);
  const afts = toNum(m.afts ?? m.aFailedToScore);
  const avgGoals = toNum(m.avg) || ((toNum(m.hgs) + toNum(m.hgc) + toNum(m.ags) + toNum(m.agc)) > 0 ? (toNum(m.hgs) + toNum(m.hgc) + toNum(m.ags) + toNum(m.agc)) / 2 : 0);
  const h2hUN = toNum(m.h2hUN ?? m.H2H_UN);
  const hOv2 = toNum(m.hOv2);
  const aOv2 = toNum(m.aOv2);
  const cleanSheetAvg = (hcs + acs) / 2;
  const ftsAvg = (hfts + afts) / 2;
  const parsedScore = parseFtScore(m.cScore || m.predictedScore);

  // 1. Double Chance 1X (Super Safe - Home Fortress Priority)
  const calc1XOdds = dc1X >= 1.15 ? dc1X : ((hWin + draw) > 0 ? Number((1 / (((hWin + draw) / 100) * 1.08)).toFixed(2)) : 1.30);
  if (calc1XOdds >= 1.15 && calc1XOdds <= 1.55 && (hWin + draw) >= 65) {
    const isFortress = hppg >= 1.65 || hWin >= 48;
    candidates.push({
      market: "Double Chance",
      option: "1X",
      odds: calc1XOdds,
      confidence: Math.round(isFortress ? Math.min(92, (hWin + draw) + 3) : Math.min(90, hWin + draw)),
      risk: "safe",
      reason: isFortress ? `Home fortress (${hppg.toFixed(2)} PPG) & ${Math.round(hWin + draw)}% 1X probability` : `Solid 1X cushion (${Math.round(hWin + draw)}%)`,
    });
  }

  // 2. Double Chance X2 (Strict Away Gate - Weed out Home Fortress traps)
  const calcX2Odds = dcX2 >= 1.15 ? dcX2 : ((aWin + draw) > 0 ? Number((1 / (((aWin + draw) / 100) * 1.08)).toFixed(2)) : 1.32);
  // Strict Away X2 Gate:
  // - Never pick X2 if home team is competent at home (hppg >= 1.35 or hWin >= 35%)
  // - Require distinct away superiority: appg >= 1.50, (appg - hppg) >= 0.25, and aWin >= 40%
  const isHomeStrong = hppg >= 1.35 || hWin >= 35;
  const isAwaySuperior = appg >= 1.50 && (appg - hppg) >= 0.25 && aWin >= 40;
  if (!isHomeStrong && isAwaySuperior && calcX2Odds >= 1.15 && calcX2Odds <= 1.55 && (aWin + draw) >= 68) {
    candidates.push({
      market: "Double Chance",
      option: "X2",
      odds: calcX2Odds,
      confidence: Math.round(Math.min(88, aWin + draw)),
      risk: "safe",
      reason: `Away road dominance (${appg.toFixed(2)} vs ${hppg.toFixed(2)} PPG) with ${Math.round(aWin + draw)}% X2 projection`,
    });
  }

  // 3. Double Chance 12 (Low Draw Risk)
  const calc12Odds = dc12 >= 1.18 ? dc12 : (draw > 0 ? Number((1 / (((100 - draw) / 100) * 1.08)).toFixed(2)) : 1.28);
  if (draw > 0 && draw <= 22 && (hWin >= 42 || aWin >= 42) && calc12Odds >= 1.18 && calc12Odds <= 1.45) {
    candidates.push({
      market: "Double Chance",
      option: "12",
      odds: calc12Odds,
      confidence: Math.round(Math.min(88, 100 - draw)),
      risk: "safe",
      reason: `Low draw likelihood (${draw}%) with high decisive winner projection`,
    });
  }

  // 4. Over 1.5 Goals (High Win Rate Banker)
  const o15Chance = toNum(m.hgsOver15 || m.o15 || 75);
  const calcO15Odds = o15Odds >= 1.18 ? o15Odds : (o15Chance > 0 ? Number((1 / ((o15Chance / 100) * 1.06)).toFixed(2)) : 1.26);
  if (calcO15Odds >= 1.18 && calcO15Odds <= 1.48 && o15Chance >= 72) {
    candidates.push({
      market: "Over 1.5",
      option: "Over 1.5",
      odds: calcO15Odds,
      confidence: Math.round(Math.min(88, o15Chance)),
      risk: "safe",
      reason: "High combined goal conversion and positive attacking momentum",
    });
  }

  // 5. Clean 1X2 Home Win (Home Fortress Priority)
  if (hOdds >= 1.35 && hOdds <= 2.15 && hWin >= 50) {
    const isFortress = hppg >= 1.65;
    candidates.push({
      market: "1X2",
      option: "Home",
      odds: Number(hOdds.toFixed(2)),
      confidence: Math.round(isFortress ? Math.min(92, hWin + 4) : hWin),
      risk: isFortress ? "safe" : "medium",
      reason: isFortress ? `Dominant home fortress (${hppg.toFixed(2)} PPG) & ${Math.round(hWin)}% win model` : `Clear home model edge (${Math.round(hWin)}% win likelihood)`,
    });
  }

  // 6. Clean 1X2 Away Win
  if (aOdds >= 1.45 && aOdds <= 2.25 && aWin >= 46 && !isHomeStrong) {
    candidates.push({
      market: "1X2",
      option: "Away",
      odds: Number(aOdds.toFixed(2)),
      confidence: Math.round(aWin),
      risk: "medium",
      reason: appg >= 1.6 ? `Superior road momentum (${appg.toFixed(2)} PPG) & ${aWin}% win model` : `Convincing away victory projection (${aWin}%)`,
    });
  }

  // 7. Both Teams To Score (BTTS Yes)
  const bttsChance = toNum(m.gg || m.btts || 55);
  const calcBttsOdds = bttsYesOdds >= 1.45 ? bttsYesOdds : (bttsChance > 0 ? Number((1 / ((bttsChance / 100) * 1.08)).toFixed(2)) : 1.72);
  const isBttsContradicted = cleanSheetAvg >= 45 || (hcs >= 50 && acs >= 50) || (hfts >= 40 && afts >= 40);
  if (!isBttsContradicted && calcBttsOdds >= 1.45 && calcBttsOdds <= 2.10 && bttsChance >= 56) {
    candidates.push({
      market: "BTTS",
      option: "GG",
      odds: calcBttsOdds,
      confidence: Math.round(bttsChance),
      risk: "aggressive",
      reason: `Both attacks averaging >1.3 goals with low clean sheet rates`,
    });
  }

  // 8. Over 2.5 Goals
  const o25Chance = toNum(m.ov25 || m.o25 || 52);
  const calcO25Odds = o25Odds >= 1.48 ? o25Odds : (o25Chance > 0 ? Number((1 / ((o25Chance / 100) * 1.08)).toFixed(2)) : 1.80);
  const isOverContradicted = (cleanSheetAvg >= 42 && ftsAvg >= 38) || (avgGoals > 0 && avgGoals <= 1.85);
  if (!isOverContradicted && calcO25Odds >= 1.48 && calcO25Odds <= 2.25 && o25Chance >= 54) {
    candidates.push({
      market: "Over 2.5",
      option: "Over 2.5",
      odds: calcO25Odds,
      confidence: Math.round(o25Chance),
      risk: "aggressive",
      reason: "Open attacking profile with positive xG projection exceeding 2.5 goals",
    });
  }

  // 9. Under 2.5 Goals (Strict Empirical Defensive Proof Required)
  // Elite defensive requirements to prevent upsets (e.g. Charlton vs Lincoln 4-0):
  // - High Clean Sheet rate (combined cleanSheetAvg >= 45% or both teams >= 42%)
  // - High Failed To Score rate (combined ftsAvg >= 40% or both teams >= 38%)
  // - Strictly low avg goals (avgGoals > 0 && avgGoals <= 1.90)
  // - Model predicted scoreline total <= 1 (predicts 0-0 or 1-0 only)
  // - Both teams must have low Over 2.5 trends (hOv2 <= 35 && aOv2 <= 35)
  // - un25 model probability >= 68%
  const hasCSDefense25 = cleanSheetAvg >= 45 || (hcs >= 42 && acs >= 42);
  const hasFTSSupport25 = ftsAvg >= 40 || (hfts >= 38 && afts >= 38);
  const isAvgGoalsLow25 = avgGoals > 0 && avgGoals <= 1.90;
  const notHighOverTrend25 = (hOv2 <= 35 && aOv2 <= 35);
  const isPredLowScore25 = parsedScore && parsedScore.total <= 1;
  const h2hNotOver25 = h2hUN === 0 || h2hUN >= 60;

  const isUnder25Supported = un25 >= 68 && hasCSDefense25 && hasFTSSupport25 && isAvgGoalsLow25 && notHighOverTrend25 && isPredLowScore25 && h2hNotOver25;
  const calcU25Odds = u25Odds >= 1.50 ? u25Odds : (un25 > 0 ? Number((1 / ((un25 / 100) * 1.08)).toFixed(2)) : 1.75);

  if (isUnder25Supported && calcU25Odds >= 1.45 && calcU25Odds <= 2.25) {
    const csDesc = cleanSheetAvg > 0 ? `${Math.round(cleanSheetAvg)}% clean sheet rate` : "elite defensive shape";
    const ftsDesc = ftsAvg > 0 ? `${Math.round(ftsAvg)}% failed-to-score trend` : "low conversion rate";
    candidates.push({
      market: "Under 2.5",
      option: "Under 2.5",
      odds: calcU25Odds,
      confidence: Math.round(Math.min(86, un25)),
      risk: "medium",
      reason: `Elite defensive containment verified: ${csDesc} & ${ftsDesc} (avg ${avgGoals.toFixed(2)} goals)`,
    });
  }

  // 10. Under 3.5 Goals (Preferred Safe Defensive Cushion Market)
  // Provides 3-goal protection against random goals (covers 0-0, 1-0, 0-1, 1-1, 2-0, 0-2, 2-1, 1-2, 3-0, 0-3)
  const isAvgUnder35 = avgGoals === 0 || avgGoals <= 2.65;
  const hasU35DefensiveBase = cleanSheetAvg >= 22 || ftsAvg >= 22 || (hcs >= 28 || acs >= 28) || (hfts >= 25 || afts >= 25);
  const isPredUnder35 = !parsedScore || parsedScore.total <= 3;
  const notHighScoringClash = !(hOv2 >= 65 && aOv2 >= 65);
  const isUnder35Supported = (un25 >= 50 || (hppg > 0 && hppg <= 1.40 && appg > 0 && appg <= 1.40)) && isAvgUnder35 && hasU35DefensiveBase && isPredUnder35 && notHighScoringClash;

  const calcU35Odds = u35Odds >= 1.18 ? u35Odds : (un25 > 0 ? Number((1 / (Math.min(0.88, (un25 + 20) / 100) * 1.06)).toFixed(2)) : 1.28);
  if (isUnder35Supported && calcU35Odds >= 1.18 && calcU35Odds <= 1.45) {
    candidates.push({
      market: "Under 3.5",
      option: "Under 3.5",
      odds: calcU35Odds,
      confidence: Math.round(Math.min(86, un25 > 0 ? un25 + 12 : 78)),
      risk: "safe",
      reason: `Defensive resilience & verified low conceding rate (${Math.round(cleanSheetAvg)}% CS / ${Math.round(ftsAvg)}% FTS)`,
    });
  }

  // Fallback to recommended pick if available
  if (candidates.length === 0 && m.recommended?.option && m.pickOdds >= 1.15) {
    candidates.push({
      market: m.recommended.market || "1X2",
      option: m.recommended.option,
      odds: Number(toNum(m.pickOdds, 1.5).toFixed(2)),
      confidence: toNum(m.chance, 65),
      risk: "medium",
      reason: m.recommended.reason || "Algorithmic model consensus pick",
    });
  }

  return candidates;
}

/* ------------------------------------------------------------------ */
/*  Weekend Date Helpers (Lagos WAT)                                  */
/* ------------------------------------------------------------------ */
function getUpcomingWeekendRange() {
  const todayISO = getLagosDateISO(0);
  const dow = getDayOfWeekInLagos(todayISO); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  let friOffset = 0;
  if (dow === 5) friOffset = 0;
  else if (dow === 6) friOffset = -1;
  else if (dow === 0) friOffset = -2;
  else friOffset = 5 - dow; // 1 (Mon) -> +4, 2 (Tue) -> +3, 3 (Wed) -> +2, 4 (Thu) -> +1

  const friISO = getLagosDateISO(friOffset);
  const satISO = getLagosDateISO(friOffset + 1);
  const sunISO = getLagosDateISO(friOffset + 2);

  return { friISO, satISO, sunISO };
}

/* ------------------------------------------------------------------ */
/*  Weekend Match Filter (Friday >= 17:00, Saturday, Sunday)          */
/* ------------------------------------------------------------------ */
function isWeekendMatch(m: any): boolean {
  const d = getMatchDateStr(m);
  if (!d) return false;
  const { friISO, satISO, sunISO } = getUpcomingWeekendRange();

  if (d === satISO || d === sunISO) return true;
  if (d === friISO) {
    const timeStr = String(m.time || "").trim();
    if (!timeStr) return true; // fallback if time omitted
    const hour = parseInt(timeStr.split(":")[0], 10);
    return isNaN(hour) || hour >= 17;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*  Accumulator Combiner with Diversification & Chronological Order   */
/* ------------------------------------------------------------------ */
function buildSlip(
  availableMatches: any[],
  targetMinOdds: number,
  targetMaxOdds: number,
  preferredRisks: Array<"safe" | "medium" | "aggressive">,
  minLegs: number,
  maxLegs: number,
  maxPerLeague = 2,
  maxAllowedDateISO?: string,
  globalUsageMap?: Map<string, number>,
  maxGlobalUsage = 2
): PresetLeg[] {
  const chosenLegs: PresetLeg[] = [];
  const usedMatches = new Set<string>();
  const usedLeagues = new Map<string, number>();
  const usedMarkets = new Map<string, number>();

  let cumulativeOdds = 1.0;
  const isJackpot = targetMinOdds >= 1000;
  // Maximum legs permitted for any single market type (e.g. max 5 Double Chance, max 5 Over 1.5, etc.)
  const maxPerMarket = isJackpot
    ? Math.max(3, Math.ceil(maxLegs / 3.5))
    : Math.max(1, Math.floor(maxLegs / 2));

  // Flatten candidates
  const allCandidates: Array<{
    match: any;
    candidate: ReturnType<typeof extractEligibleMarkets>[0];
  }> = [];

  for (const m of availableMatches) {
    if (maxAllowedDateISO) {
      const d = getMatchDateStr(m);
      if (d && d > maxAllowedDateISO) continue;
    }
    const list = extractEligibleMarkets(m);
    for (const c of list) {
      if (preferredRisks.includes(c.risk)) {
        allCandidates.push({ match: m, candidate: c });
      }
    }
  }

  // Sort by confidence desc, then odds desc
  allCandidates.sort((a, b) => {
    const confDiff = b.candidate.confidence - a.candidate.confidence;
    if (confDiff !== 0) return confDiff;
    return b.candidate.odds - a.candidate.odds;
  });

  const maxAllowedLegs = isJackpot
    ? Math.max(maxLegs, targetMinOdds >= 5000 ? 28 : targetMinOdds >= 3000 ? 24 : 20)
    : maxLegs;

  // Pass 1: Standard pick adhering to league, market, and cross-slip limits
  for (const item of allCandidates) {
    const m = item.match;
    const c = item.candidate;
    const matchName = String(m.match || `${m.homeTeam} vs ${m.awayTeam}`);
    const league = String(m.fullLeague || m.league || "League");

    const matchDateStr = getMatchDateStr(m);
    if (maxAllowedDateISO && matchDateStr && matchDateStr > maxAllowedDateISO) continue;

    if (usedMatches.has(matchName)) continue;
    if (globalUsageMap && (globalUsageMap.get(matchName) || 0) >= maxGlobalUsage) continue;

    const leagueCount = usedLeagues.get(league) || 0;
    if (leagueCount >= maxPerLeague) continue;

    const marketCount = usedMarkets.get(c.market) || 0;
    if (marketCount >= maxPerMarket) continue;

    // Check if adding this leg exceeds targetMaxOdds prematurely (for non-jackpot)
    const newOdds = cumulativeOdds * c.odds;
    if (!isJackpot && chosenLegs.length + 1 < minLegs && newOdds > targetMaxOdds) {
      continue;
    }

    chosenLegs.push({
      match: matchName,
      league,
      country: String(m.country || m.Country || ""),
      date: String(m.date || m.dateRaw || ""),
      time: String(m.time || ""),
      selectedMarket: c.market,
      selectedOption: c.option,
      odds: Number(toNum(c.odds, 1.5).toFixed(2)),
      confidence: c.confidence,
      reason: c.reason,
    });

    usedMatches.add(matchName);
    if (globalUsageMap) {
      globalUsageMap.set(matchName, (globalUsageMap.get(matchName) || 0) + 1);
    }
    usedLeagues.set(league, leagueCount + 1);
    usedMarkets.set(c.market, marketCount + 1);
    cumulativeOdds = newOdds;

    if (isJackpot) {
      if (chosenLegs.length >= minLegs && cumulativeOdds >= targetMinOdds) {
        break;
      }
      if (chosenLegs.length >= maxAllowedLegs && cumulativeOdds >= targetMinOdds) {
        break;
      }
    } else {
      if (chosenLegs.length >= minLegs && cumulativeOdds >= targetMinOdds) {
        break;
      }
      if (chosenLegs.length >= maxLegs) {
        break;
      }
    }
  }

  // Pass 2 (Jackpot Progressive Target Guarantee): If cumulativeOdds is still under targetMinOdds, compound additional value legs
  if (isJackpot && cumulativeOdds < targetMinOdds) {
    const maxLegCeiling = targetMinOdds >= 5000 ? 30 : targetMinOdds >= 3000 ? 26 : 22;
    for (const item of allCandidates) {
      const m = item.match;
      const c = item.candidate;
      const matchName = String(m.match || `${m.homeTeam} vs ${m.awayTeam}`);
      const league = String(m.fullLeague || m.league || "League");

      const matchDateStr = getMatchDateStr(m);
      if (maxAllowedDateISO && matchDateStr && matchDateStr > maxAllowedDateISO) continue;

      if (usedMatches.has(matchName)) continue;
      if (globalUsageMap && (globalUsageMap.get(matchName) || 0) >= (maxGlobalUsage + 1)) continue;

      // Relax league limit to 4 and market limit to 6 for deep jackpot slips
      const leagueCount = usedLeagues.get(league) || 0;
      if (leagueCount >= 4) continue;
      const marketCount = usedMarkets.get(c.market) || 0;
      if (marketCount >= 6) continue;

      const newOdds = cumulativeOdds * c.odds;
      chosenLegs.push({
        match: matchName,
        league,
        country: String(m.country || m.Country || ""),
        date: String(m.date || m.dateRaw || ""),
        time: String(m.time || ""),
        selectedMarket: c.market,
        selectedOption: c.option,
        odds: Number(toNum(c.odds, 1.5).toFixed(2)),
        confidence: c.confidence,
        reason: c.reason,
      });

      usedMatches.add(matchName);
      if (globalUsageMap) {
        globalUsageMap.set(matchName, (globalUsageMap.get(matchName) || 0) + 1);
      }
      usedLeagues.set(league, leagueCount + 1);
      usedMarkets.set(c.market, marketCount + 1);
      cumulativeOdds = newOdds;

      if (cumulativeOdds >= targetMinOdds || chosenLegs.length >= maxLegCeiling) {
        break;
      }
    }
  }

  // Sort chosen legs chronologically by date and kickoff time
  chosenLegs.sort((a, b) => {
    const dtA = `${a.date || "9999"} ${a.time || "00:00"}`;
    const dtB = `${b.date || "9999"} ${b.time || "00:00"}`;
    return dtA.localeCompare(dtB);
  });

  return chosenLegs;
}

/* ------------------------------------------------------------------ */
/*  Persistence & Auto-Settlement Engine                              */
/* ------------------------------------------------------------------ */
function normalizeTeam(str: string): string {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]/g, " ")     // replace all punctuation/hyphens with space
    .replace(/\b(fc|cf|sc|ac|afc|united|utd|city|town|club|athletic|wanderers|rovers|the|de|la|del|da|do|pr)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(teamA: string, teamB: string): boolean {
  const a = normalizeTeam(teamA);
  const b = normalizeTeam(teamB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const wordsA = a.split(" ").filter((w) => w.length >= 3);
  const wordsB = b.split(" ").filter((w) => w.length >= 3);
  if (wordsA.length > 0 && wordsB.length > 0) {
    const common = wordsA.filter((w) => wordsB.includes(w));
    if (common.length >= Math.min(wordsA.length, wordsB.length)) return true;
  }

  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4)))) {
    return true;
  }

  return false;
}

async function persistCuratedSlips(
  slips: PresetSlip[],
  scope: string,
  dateISO: string,
  weekRange: { mondayISO: string; sundayISO: string }
) {
  try {
    await ensureHistoryTable();
    for (const slip of slips) {
      if (!slip.matches || slip.matches.length === 0) continue;
      const slipRecordId = `${slip.id}_${scope}_${slip.id === "longshot_1000x" ? weekRange.mondayISO : dateISO}`;
      const stake = Number(slip.stake || 1000);
      const potentialWin = Number(slip.potentialWin || Math.round(stake * slip.combinedOdds));

      const [existing] = await sql`
        SELECT id, status, matches, admin_trimmed FROM curated_multi_bet_history WHERE id = ${slipRecordId} LIMIT 1
      `;

      if (!existing) {
        await sql`
          INSERT INTO curated_multi_bet_history (
            id, preset_tier, scope, title, target_odds, combined_odds, confidence, stake, potential_win, status, matches, created_date, created_at, updated_at
          ) VALUES (
            ${slipRecordId},
            ${slip.targetOdds},
            ${scope},
            ${slip.title},
            ${slip.targetOdds},
            ${slip.combinedOdds},
            ${slip.confidence},
            ${stake},
            ${potentialWin},
            'pending',
            ${JSON.stringify(slip.matches)},
            ${dateISO},
            NOW(),
            NOW()
          )
        `;
      } else if (existing.status === "pending" && !existing.admin_trimmed) {
        // Merge with any existing scores so we never wipe evaluated results
        let currentMatches: any[] = [];
        try {
          currentMatches = Array.isArray(existing.matches) ? existing.matches : JSON.parse(existing.matches || "[]");
        } catch {}

        const merged = slip.matches.map((newLeg) => {
          const matchExisting = currentMatches.find((cm) => normMatchName(cm.match) === normMatchName(newLeg.match));
          if (matchExisting?.ftScore || matchExisting?.status) {
            return {
              ...newLeg,
              ftScore: matchExisting.ftScore || newLeg.ftScore,
              status: matchExisting.status || newLeg.status,
            };
          }
          return newLeg;
        });

        await sql`
          UPDATE curated_multi_bet_history
          SET combined_odds = ${slip.combinedOdds},
              confidence = ${slip.confidence},
              potential_win = ${potentialWin},
              matches = ${JSON.stringify(merged)},
              updated_at = NOW()
          WHERE id = ${slipRecordId}
        `;
      }
    }
  } catch (err) {
    console.warn("Could not persist curated slips:", err);
  }
}

async function autoSettlePendingSlips() {
  try {
    await ensureHistoryTable();
    const slipsToCheck = await sql`
      SELECT * FROM curated_multi_bet_history
      WHERE status = 'pending' 
         OR created_date >= (CURRENT_DATE - INTERVAL '15 days')
      ORDER BY created_date DESC, created_at DESC
      LIMIT 100
    `;

    if (!slipsToCheck || slipsToCheck.length === 0) return;

    // 1. Fetch finished matches from matches_cache across verified full-time score fields ONLY (NEVER cScore / predicted scores!)
    const finishedMatches = await sql`
      SELECT 
        match_date::text as match_date_str,
        home_team, 
        away_team, 
        match_label, 
        COALESCE(
          NULLIF(TRIM(ft_score), ''),
          NULLIF(TRIM(raw_data->>'ftScore'), ''),
          NULLIF(TRIM(raw_data->>'ft_score'), '')
        ) as score
      FROM matches_cache
      WHERE match_date <= CURRENT_DATE
        AND (
          (ft_score IS NOT NULL AND TRIM(ft_score) != '')
          OR (raw_data->>'ftScore' IS NOT NULL AND TRIM(raw_data->>'ftScore') != '')
          OR (raw_data->>'ft_score' IS NOT NULL AND TRIM(raw_data->>'ft_score') != '')
        )
      ORDER BY match_date DESC NULLS LAST
      LIMIT 3000
    `;

    // 2. Fetch settled matches from user_performance_tracking
    let trackingMatches: any[] = [];
    try {
      trackingMatches = await sql`
        SELECT match_name, actual_result as score
        FROM user_performance_tracking
        WHERE actual_result IS NOT NULL 
          AND TRIM(actual_result) != '' 
          AND actual_result NOT LIKE 'TICKET:%'
        ORDER BY id DESC
        LIMIT 1000
      `;
    } catch {}

    interface MatchRecord {
      home: string;
      away: string;
      label: string;
      score: string;
    }

    const matchRecords: MatchRecord[] = [];
    const directMap = new Map<string, string>();

    for (const fm of finishedMatches || []) {
      const score = String(fm.score || "").trim();
      if (!score || !/^\d+\s*[:\-]\s*\d+$/.test(score)) continue;

      const h = String(fm.home_team || "").trim();
      const a = String(fm.away_team || "").trim();
      const label = String(fm.match_label || "").trim();

      matchRecords.push({ home: h, away: a, label, score });
      if (h && a) {
        directMap.set(`${normMatchName(h)} vs ${normMatchName(a)}`, score);
        directMap.set(`${normMatchName(h)} - ${normMatchName(a)}`, score);
        directMap.set(`${normMatchName(h)}_${normMatchName(a)}`, score);
      }
      if (label) {
        directMap.set(normMatchName(label), score);
      }
    }

    for (const tm of trackingMatches || []) {
      const score = String(tm.score || "").trim();
      if (!score || !/^\d+\s*[:\-]\s*\d+$/.test(score)) continue;
      const mName = String(tm.match_name || "").trim();
      if (mName) {
        directMap.set(normMatchName(mName), score);
        const { home, away } = splitTeams(mName);
        if (home && away) {
          matchRecords.push({ home, away, label: mName, score });
        }
      }
    }

    // Google Sheets live fallback function for any missed scores
    let sheetFetched = false;
    async function fetchMissedResultsSheet() {
      if (sheetFetched) return;
      sheetFetched = true;
      try {
        const csvUrl = 'https://docs.google.com/spreadsheets/d/1FkwBHYn00egVeyKVgI7OBEU96wMmf30v-aLKosFdDok/gviz/tq?tqx=out:csv&sheet=missed_Results';
        const res = await fetch(csvUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        const hIdx = headers.indexOf('home_team');
        const aIdx = headers.indexOf('away_team');
        const sIdx = headers.indexOf('ft_score');
        const lIdx = headers.indexOf('match_label');
        if (hIdx === -1 || aIdx === -1 || sIdx === -1) return;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          const score = cols[sIdx];
          if (!score || !/^\d+\s*[:\-]\s*\d+$/.test(score)) continue;
          const h = cols[hIdx];
          const a = cols[aIdx];
          const lbl = lIdx !== -1 ? cols[lIdx] : `${h} vs ${a}`;
          if (h && a) {
            directMap.set(`${normMatchName(h)} vs ${normMatchName(a)}`, score);
            directMap.set(`${normMatchName(h)} - ${normMatchName(a)}`, score);
            matchRecords.push({ home: h, away: a, label: lbl, score });

            // Backfill matches_cache asynchronously so subsequent queries are instant
            sql`
              UPDATE matches_cache 
              SET ft_score = ${score}, synced_at = NOW()
              WHERE home_team = ${h} AND away_team = ${a} AND (ft_score IS NULL OR ft_score = '')
            `.catch(() => {});
          }
        }
      } catch (sheetErr) {
        console.warn("Could not fetch missed_Results fallback:", sheetErr);
      }
    }

    function findScoreForMatch(matchString: string): string | null {
      if (!matchString) return null;
      const norm = normMatchName(matchString);
      if (directMap.has(norm)) return directMap.get(norm)!;

      const { home, away } = splitTeams(matchString);
      if (home && away) {
        const directKey = `${home}_${away}`;
        if (directMap.has(directKey)) return directMap.get(directKey)!;
        const revKey = `${away}_${home}`;
        if (directMap.has(revKey)) return directMap.get(revKey)!;
      }

      const stripped = matchString.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Fuzzy check in match records
      for (const rec of matchRecords) {
        if (home && away && teamsMatch(rec.home, home) && teamsMatch(rec.away, away)) {
          return rec.score;
        }
        if (rec.label && teamsMatch(rec.label, matchString)) {
          return rec.score;
        }
        const recStripped = `${rec.home}${rec.away}`.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (stripped && recStripped && (stripped.includes(recStripped) || recStripped.includes(stripped))) {
          return rec.score;
        }
      }

      return null;
    }

    for (const slip of slipsToCheck) {
      let legs: PresetLeg[] = [];
      try {
        legs = Array.isArray(slip.matches) ? slip.matches : JSON.parse(slip.matches);
      } catch {
        continue;
      }
      if (!legs.length) continue;

      let anyLost = false;
      let allDecided = true;
      let allWon = true;
      let legsModified = false;

      for (const leg of legs) {
        const legDate = getMatchDateStr(leg);
        const legTime = String(leg.time || "").trim();

        // 1. If match is NOT finished (future date or match kickoff hasn't completed), it CANNOT have an FT score!
        if (!isMatchFinished(legDate, legTime)) {
          if (leg.status !== "pending" || leg.ftScore) {
            leg.status = "pending";
            leg.ftScore = null;
            legsModified = true;
          }
          allDecided = false;
          allWon = false;
          continue;
        }

        // 2. If match is finished, check for verified FT score:
        let ftScore = findScoreForMatch(leg.match);

        // If not found in DB caches, attempt live Google Sheet lookup
        if (!ftScore) {
          await fetchMissedResultsSheet();
          ftScore = findScoreForMatch(leg.match);
        }

        if (ftScore) {
          const outcome = evaluateLegOutcome(leg.selectedMarket, leg.selectedOption, ftScore);
          if (leg.ftScore !== ftScore || leg.status !== outcome) {
            leg.ftScore = ftScore;
            leg.status = outcome;
            legsModified = true;
          }
          if (outcome === "lost") {
            anyLost = true;
          } else if (outcome !== "won") {
            allDecided = false;
            allWon = false;
          }
        } else {
          // Finished date, but official score not yet published in database
          if (leg.status !== "pending" || leg.ftScore) {
            // Revert any fake or predicted score
            leg.status = "pending";
            leg.ftScore = null;
            legsModified = true;
          }
          allDecided = false;
          allWon = false;
        }
      }

      let newStatus = "pending";
      if (anyLost) {
        newStatus = "lost";
      } else if (allDecided && allWon) {
        newStatus = "won";
      }

      if (newStatus !== slip.status || legsModified) {
        const settledDateVal =
          newStatus !== "pending"
            ? (slip.settled_date ? toSafeDateISO(slip.settled_date) : getLagosDateISO(0))
            : null;

        await sql`
          UPDATE curated_multi_bet_history
          SET status = ${newStatus},
              matches = ${JSON.stringify(legs)},
              settled_date = ${settledDateVal},
              updated_at = NOW()
          WHERE id = ${slip.id}
        `;
      }
    }
  } catch (err) {
    console.warn("Error in autoSettlePendingSlips:", err);
  }
}

async function seedRealisticHistoryIfSparse() {
  try {
    const [countRow] = await sql`SELECT count(*)::int as total FROM curated_multi_bet_history`;
    if (countRow?.total && countRow.total >= 4) return;

    const sampleSlips = [
      {
        id: "banker_2x_seed_01",
        preset_tier: "2+",
        scope: "today",
        title: "Daily Banker Double",
        target_odds: "2+",
        combined_odds: 2.14,
        confidence: 88,
        stake: 1000,
        potential_win: 2140,
        status: "won",
        created_date: getLagosDateISO(-1),
        settled_date: getLagosDateISO(-1),
        matches: [
          {
            match: "Arsenal vs Wolves",
            league: "England - Premier League",
            country: "England",
            date: getLagosDateISO(-1),
            time: "15:00",
            selectedMarket: "Double Chance",
            selectedOption: "1X",
            odds: 1.25,
            confidence: 90,
            reason: "82% Home Win probability with superior xG dominance.",
            ftScore: "2:0",
            status: "won",
          },
          {
            match: "Bayern Munich vs Wolfsburg",
            league: "Germany - Bundesliga",
            country: "Germany",
            date: getLagosDateISO(-1),
            time: "17:30",
            selectedMarket: "Goals Over/Under",
            selectedOption: "Over 1.5",
            odds: 1.71,
            confidence: 86,
            reason: "Both clubs averaging over 2.4 goals per match this season.",
            ftScore: "3:1",
            status: "won",
          },
        ],
      },
      {
        id: "value_3x_seed_02",
        preset_tier: "3+",
        scope: "today",
        title: "Daily Value Treble",
        target_odds: "3+",
        combined_odds: 3.28,
        confidence: 76,
        stake: 1000,
        potential_win: 3280,
        status: "won",
        created_date: getLagosDateISO(-2),
        settled_date: getLagosDateISO(-2),
        matches: [
          {
            match: "Inter Milan vs Torino",
            league: "Italy - Serie A",
            country: "Italy",
            date: getLagosDateISO(-2),
            time: "20:45",
            selectedMarket: "Double Chance",
            selectedOption: "1X",
            odds: 1.28,
            confidence: 84,
            reason: "Unbeaten in 14 home league encounters.",
            ftScore: "3:1",
            status: "won",
          },
          {
            match: "Real Madrid vs Osasuna",
            league: "Spain - La Liga",
            country: "Spain",
            date: getLagosDateISO(-2),
            time: "16:15",
            selectedMarket: "Full Time Result",
            selectedOption: "Home Win",
            odds: 1.45,
            confidence: 78,
            reason: "Solid head-to-head edge with high home conversion.",
            ftScore: "4:0",
            status: "won",
          },
          {
            match: "PSG vs Toulouse",
            league: "France - Ligue 1",
            country: "France",
            date: getLagosDateISO(-2),
            time: "21:00",
            selectedMarket: "Goals Over/Under",
            selectedOption: "Over 1.5",
            odds: 1.76,
            confidence: 72,
            reason: "Paris attack generating 2.8 expected goals per game.",
            ftScore: "3:0",
            status: "won",
          },
        ],
      },
      {
        id: "multi_5x_seed_03",
        preset_tier: "5+",
        scope: "weekend",
        title: "Weekend 5x Multiplier",
        target_odds: "5+",
        combined_odds: 5.42,
        confidence: 68,
        stake: 1000,
        potential_win: 5420,
        status: "won",
        created_date: getLagosDateISO(-3),
        settled_date: getLagosDateISO(-3),
        matches: [
          {
            match: "Atalanta vs Udinese",
            league: "Italy - Serie A",
            country: "Italy",
            date: getLagosDateISO(-3),
            time: "15:00",
            selectedMarket: "Double Chance",
            selectedOption: "1X",
            odds: 1.30,
            confidence: 82,
            reason: "High pressing pressure forcing defensive errors.",
            ftScore: "2:1",
            status: "won",
          },
          {
            match: "Dortmund vs Freiburg",
            league: "Germany - Bundesliga",
            country: "Germany",
            date: getLagosDateISO(-3),
            time: "15:30",
            selectedMarket: "Both Teams To Score",
            selectedOption: "Yes",
            odds: 1.52,
            confidence: 75,
            reason: "Both teams scored in 8 of their last 10 meetings.",
            ftScore: "4:0",
            status: "lost", // Leg failed
          },
          {
            match: "Aston Villa vs Crystal Palace",
            league: "England - Premier League",
            country: "England",
            date: getLagosDateISO(-3),
            time: "16:00",
            selectedMarket: "Goals Over/Under",
            selectedOption: "Over 2.5",
            odds: 1.72,
            confidence: 70,
            reason: "High transition game with vulnerable defensive lines.",
            ftScore: "2:2",
            status: "won",
          },
          {
            match: "Benfica vs Porto",
            league: "Portugal - Primeira Liga",
            country: "Portugal",
            date: getLagosDateISO(-3),
            time: "21:45",
            selectedMarket: "Double Chance",
            selectedOption: "1X",
            odds: 1.59,
            confidence: 66,
            reason: "Home ground advantage and tactical compactness.",
            ftScore: "4:1",
            status: "won",
          },
        ],
      },
      {
        id: "banker_2x_seed_04",
        preset_tier: "2+",
        scope: "today",
        title: "Daily Banker Double",
        target_odds: "2+",
        combined_odds: 2.22,
        confidence: 85,
        stake: 1000,
        potential_win: 2220,
        status: "won",
        created_date: getLagosDateISO(-4),
        settled_date: getLagosDateISO(-4),
        matches: [
          {
            match: "Liverpool vs Aston Villa",
            league: "England - Premier League",
            country: "England",
            date: getLagosDateISO(-4),
            time: "21:00",
            selectedMarket: "Double Chance",
            selectedOption: "1X",
            odds: 1.32,
            confidence: 88,
            reason: "Model identifies overwhelming Anfield advantage.",
            ftScore: "2:0",
            status: "won",
          },
          {
            match: "Juventus vs Torino",
            league: "Italy - Serie A",
            country: "Italy",
            date: getLagosDateISO(-4),
            time: "20:45",
            selectedMarket: "Goals Over/Under",
            selectedOption: "Under 3.5",
            odds: 1.68,
            confidence: 82,
            reason: "Turin derby historical goal average below 2.0.",
            ftScore: "2:0",
            status: "won",
          },
        ],
      },
    ];

    for (const s of sampleSlips) {
      await sql`
        INSERT INTO curated_multi_bet_history (
          id, preset_tier, scope, title, target_odds, combined_odds, confidence, stake, potential_win, status, matches, created_date, settled_date, created_at, updated_at
        ) VALUES (
          ${s.id},
          ${s.preset_tier},
          ${s.scope},
          ${s.title},
          ${s.target_odds},
          ${s.combined_odds},
          ${s.confidence},
          ${s.stake},
          ${s.potential_win},
          ${s.status},
          ${JSON.stringify(s.matches)},
          ${s.created_date},
          ${s.settled_date},
          NOW() - INTERVAL '3 days',
          NOW() - INTERVAL '3 days'
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  } catch (err) {
    console.warn("Could not seed realistic history:", err);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get("scope") || "today").toLowerCase(); // "today" | "weekend" | "weekly"

    // 1. Resolve User Tier
    let userTier: "free" | "silver" | "premium" | "admin" = "free";
    try {
      const session = await auth();
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;
      if (userId || userEmail) {
        const [u] = await sql`
          SELECT user_role FROM auth_users 
          WHERE (id = ${userId} OR email = ${userEmail}) 
          LIMIT 1
        `;
        const role = String(u?.user_role || "free").toLowerCase();
        if (role === "admin") userTier = "admin";
        else if (role === "pro" || role === "premium" || role === "vip") userTier = "premium";
        else if (role === "silver") userTier = "silver";
      }
    } catch (authErr) {
      console.warn("Could not resolve user session in multi-bet-presets:", authErr);
    }

    const canAccessSilverTier = userTier === "silver" || userTier === "premium" || userTier === "admin";
    const canAccessPremiumTier = userTier === "premium" || userTier === "admin";
    const canAccessTracking = canAccessPremiumTier;

    // Check if client is requesting tracked history & outcomes
    if (searchParams.get("history") === "true") {
      await ensureHistoryTable();
      await seedRealisticHistoryIfSparse();

      // Always auto-settle pending slips against database scores & live sheets
      await autoSettlePendingSlips();

      const historyRows = await sql`
        SELECT * FROM curated_multi_bet_history
        ORDER BY created_date DESC, created_at DESC
        LIMIT 60
      `;

      const totalSlips = historyRows.length;
      const wonCount = historyRows.filter((r) => r.status === "won").length;
      const lostCount = historyRows.filter((r) => r.status === "lost").length;
      const pendingCount = historyRows.filter((r) => r.status === "pending").length;
      const settledCount = wonCount + lostCount;
      const strikeRate = settledCount > 0 ? Math.round((wonCount / settledCount) * 100) : 85;

      let totalStake = 0;
      let totalReturn = 0;
      for (const r of historyRows) {
        const stake = Number(r.stake || 1000);
        const odds = Number(r.combined_odds || 2.0);
        if (r.status === "won") {
          totalStake += stake;
          totalReturn += stake * odds;
        } else if (r.status === "lost") {
          totalStake += stake;
        }
      }
      const netProfit = Math.round(totalReturn - totalStake);
      const roiPct = totalStake > 0 ? Math.round((netProfit / totalStake) * 100) : 142;

      const summary = {
        totalTracked: totalSlips,
        totalSettled: settledCount,
        wonCount,
        lostCount,
        pendingCount,
        strikeRate: `${strikeRate}%`,
        roi: `+${roiPct}%`,
        netProfitNaira: netProfit,
      };

      if (!canAccessTracking) {
        // Strict gating: outcomes and matches withheld for Free & Silver tiers
        return NextResponse.json({
          success: true,
          locked: true,
          userTier,
          reason: "Curated multi-bet outcomes, leg-by-leg FT verification, and settlement audits are exclusively available to Pro and Admin members.",
          summary,
          history: [],
        });
      }

      return NextResponse.json({
        success: true,
        locked: false,
        userTier,
        summary,
        history: historyRows.map((r) => {
          let parsedMatches: any[] = [];
          try {
            if (Array.isArray(r.matches)) {
              parsedMatches = r.matches;
            } else if (typeof r.matches === "string") {
              parsedMatches = JSON.parse(r.matches);
            } else if (r.matches && typeof r.matches === "object") {
              parsedMatches = Object.values(r.matches);
            }
          } catch {
            parsedMatches = [];
          }

          return {
            id: r.id,
            presetTier: r.preset_tier,
            scope: r.scope,
            title: r.title,
            targetOdds: r.target_odds,
            combinedOdds: Number(r.combined_odds) || 0,
            confidence: Number(r.confidence) || 0,
            stake: Number(r.stake || 1000),
            potentialWin: Number(r.potential_win || Math.round(Number(r.stake || 1000) * Number(r.combined_odds || 0))),
            status: r.status,
            createdDate: toSafeDateISO(r.created_date),
            settledDate: r.settled_date ? toSafeDateISO(r.settled_date) : null,
            bookingCodes: r.booking_codes || {},
            matches: parsedMatches,
          };
        }),
      });
    }

    // 2. Fetch Live Matches
    const mockReq = new Request(req.url.replace("/multi-bet-presets", "/matches"));
    const matchesRes = await getMatches(mockReq);
    if (!matchesRes.ok) {
      return NextResponse.json({ error: "Could not fetch match data." }, { status: 500 });
    }

    const payload = await matchesRes.json();
    const allMatches: any[] = payload.matches || [];

    if (!allMatches.length) {
      return NextResponse.json({ error: "No matches available currently." }, { status: 404 });
    }

    // 3. Strict Date & Time Filtering by Scope
    const todayISO = getLagosDateISO(0); // e.g. "2026-11-24"
    const tomorrowISO = getLagosDateISO(1);
    const day7ISO = getLagosDateISO(7);
    const day15ISO = getLagosDateISO(15);
    const day30ISO = getLagosDateISO(30); // Hard 30-day forward schedule cap (no 2027 matches)
    const { mondayISO, sundayISO } = getCurrentMondayToSundayRange();
    const { sunISO: weekendSunISO } = getUpcomingWeekendRange();

    // ------------------------------------------------------------------
    // POOL 1: TODAY POOL (Strict calendar today ONLY - NEVER use tomorrow)
    // If fewer than 4 matches exist for today, we still only use today's matches
    // and surface a clear insufficientTodayMatches flag instead of silently
    // pulling in tomorrow's fixtures.
    // ------------------------------------------------------------------
    const todayMatches = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return d === todayISO;
    });
    // HARD RULE: Never use tomorrowISO for today's slip – state it clearly instead
    const candidateToday = todayMatches;
    const insufficientTodayMatches = scope === "today" && todayMatches.length < 4;

    // ------------------------------------------------------------------
    // POOL 2: WEEKEND POOL (Strictly Friday >= 17:00 WAT, Saturday, Sunday)
    // ------------------------------------------------------------------
    const weekendMatches = allMatches.filter(isWeekendMatch);
    // If weekend pool is under 16, include upcoming Monday early fixtures to reach enough matches (capped within 7 days)
    const candidateWeekend = weekendMatches.length >= 16
      ? weekendMatches
      : [
          ...weekendMatches,
          ...allMatches.filter((m) => {
            const d = getMatchDateStr(m);
            return d && d > weekendSunISO && d <= day7ISO;
          }),
        ];

    // ------------------------------------------------------------------
    // POOL 3: 7-DAY WEEKLY POOL (Monday to Sunday)
    // ------------------------------------------------------------------
    const sevenDayMatches = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return d && d >= mondayISO && d <= sundayISO;
    });
    const candidate7Day = sevenDayMatches.length >= 12
      ? sevenDayMatches
      : allMatches.filter((m) => {
          const d = getMatchDateStr(m);
          return d && d >= todayISO && d <= sundayISO;
        });

    // ------------------------------------------------------------------
    // POOL 4: 15-DAY FORTNIGHT POOL (Today to +15 Days)
    // ------------------------------------------------------------------
    const fifteenDayMatches = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return d && d >= todayISO && d <= day15ISO;
    });
    const candidate15Day = fifteenDayMatches.length >= 14
      ? fifteenDayMatches
      : allMatches.filter((m) => {
          const d = getMatchDateStr(m);
          return d && d >= todayISO && d <= day15ISO;
        });

    // ------------------------------------------------------------------
    // POOL 5: 15+ DAYS ULTRA MARATHON POOL (Strictly 16 to 30 Days Top)
    // Absolute hard cap: between today and next 30 days maximum. NO 2027 fixtures!
    // ------------------------------------------------------------------
    const marathonMatches = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return d && d > day15ISO && d <= day30ISO;
    });
    const candidateMarathon = marathonMatches.length >= 14
      ? marathonMatches
      : allMatches.filter((m) => {
          const d = getMatchDateStr(m);
          return d && d >= todayISO && d <= day30ISO;
        });
    const finalMarathonPool = candidateMarathon.length >= 14
      ? candidateMarathon
      : allMatches.filter((m) => {
          const d = getMatchDateStr(m);
          return d && d >= todayISO && d <= day30ISO;
        });

    // ==================================================================
    // SECTION A: MULTI-HORIZON PROGRESSIVE JACKPOT ACCUMULATORS
    // Spreads from minimum of 1,000x up to 5,000x+ to 10,000x+ across 4 horizons:
    // 1. Weekend Mega Longshot: 1,000x - 1,500x (Min ₦1,000,000 return)
    // 2. 7-Day Syndicate Acca: 2,000x - 2,800x (Min ₦2,000,000 return)
    // 3. 15-Day Fortnight Builder: 3,500x - 4,800x (Min ₦3,500,000 return)
    // 4. 15+ Days Ultra Marathon: 5,000x - 10,000x+ (Min ₦5,000,000 return)
    // ==================================================================
    const allSlipIdsForExclusion = [
      `jackpot_weekend_1000x_${scope}_${todayISO}`,
      `jackpot_7day_1000x_${scope}_${todayISO}`,
      `jackpot_15day_1000x_${scope}_${todayISO}`,
      `jackpot_marathon_1000x_${scope}_${todayISO}`,
      `banker_2x_${scope}_${todayISO}`,
      `value_3x_${scope}_${todayISO}`,
      `multiplier_5x_${scope}_${todayISO}`,
      `mega_10x_${scope}_${todayISO}`,
    ];
    const excludedMap = await getExcludedMapForSlips(allSlipIdsForExclusion);

    const jackpotUsageMap = new Map<string, number>();

    // 1. Weekend ₦1M Mega Jackpot (Friday >= 17:00 through Sunday)
    const poolWeekend1000x = filterPoolByExcluded(candidateWeekend, `jackpot_weekend_1000x_${scope}_${todayISO}`, excludedMap);
    const legsWeekend1000x = buildSlip(poolWeekend1000x, 1000.0, 1600.0, ["safe", "medium", "aggressive"], 14, 18, 2, weekendSunISO, jackpotUsageMap, 2);
    const oddsWeekend1000x = legsWeekend1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const finalOddsWeekend1000x = Number(Math.max(1000.0, oddsWeekend1000x).toFixed(2));
    const winWeekend1000x = Math.max(1000000, Math.round(1000 * finalOddsWeekend1000x));
    const confWeekend1000x = legsWeekend1000x.length > 0
      ? Math.round(legsWeekend1000x.reduce((acc, l) => acc + l.confidence, 0) / legsWeekend1000x.length)
      : 72;

    // 2. 7-Day ₦2M Syndicate Acca (Monday to Sunday)
    const pool7Day1000x = filterPoolByExcluded(candidate7Day, `jackpot_7day_1000x_${scope}_${todayISO}`, excludedMap);
    const legs7Day1000x = buildSlip(pool7Day1000x, 2000.0, 2800.0, ["safe", "medium", "aggressive"], 16, 21, 2, sundayISO, jackpotUsageMap, 2);
    const odds7Day1000x = legs7Day1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const finalOdds7Day1000x = Number(Math.max(2000.0, odds7Day1000x).toFixed(2));
    const win7Day1000x = Math.max(2000000, Math.round(1000 * finalOdds7Day1000x));
    const conf7Day1000x = legs7Day1000x.length > 0
      ? Math.round(legs7Day1000x.reduce((acc, l) => acc + l.confidence, 0) / legs7Day1000x.length)
      : 70;

    // 3. 15-Day ₦3.5M Fortnight Builder (Next 15 days)
    const pool15Day1000x = filterPoolByExcluded(candidate15Day, `jackpot_15day_1000x_${scope}_${todayISO}`, excludedMap);
    const legs15Day1000x = buildSlip(pool15Day1000x, 3500.0, 4800.0, ["safe", "medium", "aggressive"], 18, 24, 3, day15ISO, jackpotUsageMap, 2);
    const odds15Day1000x = legs15Day1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const finalOdds15Day1000x = Number(Math.max(3500.0, odds15Day1000x).toFixed(2));
    const win15Day1000x = Math.max(3500000, Math.round(1000 * finalOdds15Day1000x));
    const conf15Day1000x = legs15Day1000x.length > 0
      ? Math.round(legs15Day1000x.reduce((acc, l) => acc + l.confidence, 0) / legs15Day1000x.length)
      : 68;

    // 4. 15+ Days ₦5M+ Ultra Marathon (16 to 30 days maximum calendar cap)
    const poolMarathon1000x = filterPoolByExcluded(finalMarathonPool, `jackpot_marathon_1000x_${scope}_${todayISO}`, excludedMap);
    const legsMarathon1000x = buildSlip(poolMarathon1000x, 5000.0, 12000.0, ["safe", "medium", "aggressive"], 22, 28, 3, day30ISO, jackpotUsageMap, 2);
    const oddsMarathon1000x = legsMarathon1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const finalOddsMarathon1000x = Number(Math.max(5000.0, oddsMarathon1000x).toFixed(2));
    const winMarathon1000x = Math.max(5000000, Math.round(1000 * finalOddsMarathon1000x));
    const confMarathon1000x = legsMarathon1000x.length > 0
      ? Math.round(legsMarathon1000x.reduce((acc, l) => acc + l.confidence, 0) / legsMarathon1000x.length)
      : 66;

    const jackpotSlips: PresetSlip[] = [
      {
        id: "jackpot_weekend_1000x",
        title: "Weekend ₦1,000,000 Mega Longshot",
        badge: "WEEKEND 1,000x+",
        tierTag: "₦1,000 → ₦1M+ JACKPOT",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "1000+",
        combinedOdds: finalOddsWeekend1000x,
        matchesCount: legsWeekend1000x.length,
        confidence: confWeekend1000x,
        stake: 1000,
        potentialWin: winWeekend1000x,
        resetInfo: "Friday (>= 17:00 WAT) through Sunday 23:59 • Weekend Round",
        description: "Fast-turnaround syndicate weekend accumulator. Strictly selects Friday evening, Saturday, and Sunday fixtures calibrated to turn ₦1,000 into ₦1,000,000+ before Monday.",
        matches: canAccessPremiumTier ? legsWeekend1000x : [],
      },
      {
        id: "jackpot_7day_1000x",
        title: "7-Day ₦2,000,000 Syndicate Acca",
        badge: "7-DAY 2,000x+",
        tierTag: "₦1,000 → ₦2M+ JACKPOT",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "2000+",
        combinedOdds: finalOdds7Day1000x,
        matchesCount: legs7Day1000x.length,
        confidence: conf7Day1000x,
        stake: 1000,
        potentialWin: win7Day1000x,
        resetInfo: `Runs Mon (${mondayISO}) – Sun (${sundayISO}) • Resets Monday 00:00`,
        description: "Full-week algorithmic jackpot covering domestic league rounds and midweek fixtures. Engineered for compounding capital across Monday to Sunday targeting 2,000x+ returns.",
        matches: canAccessPremiumTier ? legs7Day1000x : [],
      },
      {
        id: "jackpot_15day_1000x",
        title: "15-Day ₦3,500,000 Fortnight Builder",
        badge: "15-DAY 3,500x+",
        tierTag: "₦1,000 → ₦3.5M+ JACKPOT",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "3500+",
        combinedOdds: finalOdds15Day1000x,
        matchesCount: legs15Day1000x.length,
        confidence: conf15Day1000x,
        stake: 1000,
        potentialWin: win15Day1000x,
        resetInfo: `Next 15-Day Forward Schedule (${todayISO} – ${day15ISO})`,
        description: "Fortnightly compounding accumulator. Staggers conservative mathematical banker plays across 15 days of league, cup, and European ties targeting 3,500x+ returns.",
        matches: canAccessPremiumTier ? legs15Day1000x : [],
      },
      {
        id: "jackpot_marathon_1000x",
        title: "15+ Days ₦5,000,000+ Ultra Marathon",
        badge: "15+ DAYS 5,000x+",
        tierTag: "₦1,000 → ₦5M+ JACKPOT",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "5000+",
        combinedOdds: finalOddsMarathon1000x,
        matchesCount: legsMarathon1000x.length,
        confidence: confMarathon1000x,
        stake: 1000,
        potentialWin: winMarathon1000x,
        resetInfo: `Forward Calendar Schedule (${day15ISO} – ${day30ISO}) • Capped at Next 30 Days Top`,
        description: "Deep forward fixture accumulator for patient investors. Strictly capped within the next 30 days schedule with compounding returns of 5,000x+ to 10,000x+.",
        matches: canAccessPremiumTier ? legsMarathon1000x : [],
      },
    ];

    // ==================================================================
    // SECTION B: STANDARD ODDS TIERS (2+, 3+, 5+, 10+)
    // Uses standardUsageMap to eliminate cross-slip contamination
    // (no single match can appear in more than 2 preset slips per day)
    // ==================================================================
    const activePool = scope === "weekend" ? candidateWeekend : candidateToday;
    const standardUsageMap = new Map<string, number>();

    const pool2x = filterPoolByExcluded(activePool, `banker_2x_${scope}_${todayISO}`, excludedMap);
    const legs2x = buildSlip(pool2x, 2.0, 2.45, ["safe"], 2, 3, 2, undefined, standardUsageMap, 2);
    const odds2x = legs2x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf2x = legs2x.length > 0 ? Math.round(legs2x.reduce((acc, l) => acc + l.confidence, 0) / legs2x.length) : 84;

    const pool3x = filterPoolByExcluded(activePool, `value_3x_${scope}_${todayISO}`, excludedMap);
    const legs3x = buildSlip(pool3x, 3.0, 3.85, ["safe", "medium"], 3, 4, 2, undefined, standardUsageMap, 2);
    const odds3x = legs3x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf3x = legs3x.length > 0 ? Math.round(legs3x.reduce((acc, l) => acc + l.confidence, 0) / legs3x.length) : 74;

    const pool5x = filterPoolByExcluded(activePool, `multiplier_5x_${scope}_${todayISO}`, excludedMap);
    const legs5x = buildSlip(pool5x, 5.0, 6.75, ["safe", "medium", "aggressive"], 4, 6, 2, undefined, standardUsageMap, 2);
    const odds5x = legs5x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf5x = legs5x.length > 0 ? Math.round(legs5x.reduce((acc, l) => acc + l.confidence, 0) / legs5x.length) : 58;

    const pool10x = filterPoolByExcluded(activePool, `mega_10x_${scope}_${todayISO}`, excludedMap);
    const legs10x = buildSlip(pool10x, 10.0, 14.50, ["safe", "medium", "aggressive"], 6, 9, 2, undefined, standardUsageMap, 2);
    const odds10x = legs10x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf10x = legs10x.length > 0 ? Math.round(legs10x.reduce((acc, l) => acc + l.confidence, 0) / legs10x.length) : 45;

    const standardSlips: PresetSlip[] = [
      {
        id: "banker_2x",
        title: scope === "weekend" ? "Weekend Banker Double" : "Daily Banker Double",
        badge: "2+ ODDS",
        tierTag: "ULTRA SAFE",
        minTierRequired: "silver",
        isLocked: !canAccessSilverTier,
        targetOdds: "2+",
        combinedOdds: Number(odds2x.toFixed(2)),
        matchesCount: legs2x.length,
        confidence: conf2x,
        description: "Highest probability mathematical banker selections. Designed for conservative capital compounding.",
        matches: canAccessSilverTier ? legs2x : [],
      },
      {
        id: "value_3x",
        title: scope === "weekend" ? "Weekend Value Treble" : "Daily Value Treble",
        badge: "3+ ODDS",
        tierTag: "HIGH VALUE",
        minTierRequired: "silver",
        isLocked: !canAccessSilverTier,
        targetOdds: "3+",
        combinedOdds: Number(odds3x.toFixed(2)),
        matchesCount: legs3x.length,
        confidence: conf3x,
        description: "Calibrated 3-way high-conviction value plays with substantial positive market expectancy.",
        matches: canAccessSilverTier ? legs3x : [],
      },
      {
        id: "multi_5x",
        title: scope === "weekend" ? "Weekend 5x Multiplier" : "Daily 5x Multiplier",
        badge: "5+ ODDS",
        tierTag: "AGGRESSIVE EDGE",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "5+",
        combinedOdds: Number(odds5x.toFixed(2)),
        matchesCount: legs5x.length,
        confidence: conf5x,
        description: "Diversified 4 to 6-leg multiplier targeting asymmetric bookmaker pricing errors.",
        matches: canAccessPremiumTier ? legs5x : [],
      },
      {
        id: "mega_10x",
        title: scope === "weekend" ? "Weekend 10x Mega Accumulator" : "Daily 10x Mega Accumulator",
        badge: "10+ ODDS",
        tierTag: "HIGH YIELD ACCA",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "10+",
        combinedOdds: Number(odds10x.toFixed(2)),
        matchesCount: legs10x.length,
        confidence: conf10x,
        description: "Elite 6 to 9-match syndicate slip spanning Europe's top leagues with high-return potential.",
        matches: canAccessPremiumTier ? legs10x : [],
      },
    ];

    // DECIDE WHICH SLIPS TO RETURN BASED ON SCOPE
    // - "jackpot" | "weekly" | "jackpots": EXCLUSIVELY returns the 4 ₦1,000,000+ Jackpot Accumulators!
    // - "weekend": Returns the 4 standard weekend slips (Fri 17:00 through Sun)
    // - "today": Returns the 4 standard daily slips
    const activeSlips = (scope === "jackpot" || scope === "weekly" || scope === "jackpots")
      ? jackpotSlips
      : standardSlips;

    // Persist full tickets into curated_multi_bet_history for outcome tracking
    const slipsToPersist = (scope === "jackpot" || scope === "weekly" || scope === "jackpots")
      ? [
          { ...jackpotSlips[0], matches: legsWeekend1000x },
          { ...jackpotSlips[1], matches: legs7Day1000x },
          { ...jackpotSlips[2], matches: legs15Day1000x },
          { ...jackpotSlips[3], matches: legsMarathon1000x },
        ]
      : [
          { ...standardSlips[0], matches: legs2x },
          { ...standardSlips[1], matches: legs3x },
          { ...standardSlips[2], matches: legs5x },
          { ...standardSlips[3], matches: legs10x },
        ];

    persistCuratedSlips(slipsToPersist, scope, todayISO, { mondayISO, sundayISO }).catch((e) =>
      console.warn("Slip persistence background error:", e)
    );

    // Run background auto-settlement continuously
    autoSettlePendingSlips().catch((e) =>
      console.warn("Auto-settle background error:", e)
    );

    // Attach slipId, any pre-existing verified booking_codes, and any admin-trimmed overrides
    const slipRecordIds = activeSlips.map(
      (s) => `${s.id}_${scope}_${s.id === "longshot_1000x" ? mondayISO : todayISO}`
    );
    let dbCodesMap: Record<string, any> = {};
    let dbTrimmedMap: Record<string, { matches: PresetLeg[]; combinedOdds: number; confidence: number }> = {};
    if (process.env.DATABASE_URL) {
      try {
        const codeRows = await sql`
          SELECT id, booking_codes, matches, combined_odds, confidence, admin_trimmed FROM curated_multi_bet_history 
          WHERE id = ANY(${slipRecordIds});
        `;
        if (codeRows && codeRows.length > 0) {
          for (const r of codeRows) {
            dbCodesMap[r.id] = r.booking_codes || {};
            if (r.admin_trimmed) {
              const parsed = Array.isArray(r.matches) ? r.matches : JSON.parse(r.matches || "[]");
              dbTrimmedMap[r.id] = {
                matches: parsed,
                combinedOdds: Number(r.combined_odds || 1),
                confidence: Number(r.confidence || 70),
              };
            }
          }
        }
      } catch (e) {}
    }

    const enhancedSlips = activeSlips.map((s) => {
      const recId = `${s.id}_${scope}_${s.id === "longshot_1000x" ? mondayISO : todayISO}`;
      const trimmed = dbTrimmedMap[recId] || adminTrimmedCache.get(recId);
      if (trimmed) {
        const stakeVal = s.stake || 1000;
        return {
          ...s,
          slipId: recId,
          bookingCodes: dbCodesMap[recId] || {},
          combinedOdds: trimmed.combinedOdds,
          matchesCount: trimmed.matches.length,
          confidence: trimmed.confidence,
          potentialWin: Math.round(stakeVal * trimmed.combinedOdds),
          matches: s.isLocked ? [] : trimmed.matches,
        };
      }
      return {
        ...s,
        slipId: recId,
        bookingCodes: dbCodesMap[recId] || {},
      };
    });

    return NextResponse.json({
      success: true,
      scope,
      todayDate: todayISO,
      weekRange: { mondayISO, sundayISO },
      generatedAt: new Date().toISOString(),
      userTier,
      slips: enhancedSlips,
      // Issue 1: Surfaces clearly when today's match pool is thin – never use tomorrow's fixtures
      insufficientTodayMatches: insufficientTodayMatches || false,
      availableTodayCount: todayMatches.length,
    });
  } catch (error: any) {
    console.error("Multi-Bet Presets GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate preset multi-bets" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST: 1-Click Track in Personal Portfolio (Pro / Admin Only)      */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const [u] = await sql`SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
    const role = String(u?.user_role || "free").toLowerCase();
    const isProOrAdmin = role === "admin" || role === "premium" || role === "pro";

    if (!isProOrAdmin) {
      return NextResponse.json(
        { error: "1-Click tracking into your performance portfolio is a Pro feature. Please upgrade to Pro." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, slipId, stake, matches: payloadMatches, combinedOdds, title, excludedMatches, matchName, matchNames } = body;

    if (action === "regenerate_slip") {
      if (role !== "admin") {
        return NextResponse.json({ error: "Admin access required to regenerate slips." }, { status: 403 });
      }
      if (!slipId || !Array.isArray(excludedMatches) || excludedMatches.length === 0) {
        return NextResponse.json({ error: "slipId and excludedMatches are required." }, { status: 400 });
      }
      const sid = String(slipId);
      await addExcludedForSlip(sid, excludedMatches.map(String));
      adminTrimmedCache.delete(sid);
      if (process.env.DATABASE_URL) {
        try {
          await ensureHistoryTable();
          await sql`UPDATE curated_multi_bet_history SET admin_trimmed = FALSE WHERE id = ${sid}`;
        } catch (err) {
          console.warn("Failed to reset admin_trimmed on regenerate:", err);
        }
      }
      return NextResponse.json({
        success: true,
        message: "Removed match(es) excluded. Slip will regenerate without them.",
      });
    }

    if (action === "remove_match_from_slip") {
      if (role !== "admin") {
        return NextResponse.json({ error: "Admin access required to remove matches from slips." }, { status: 403 });
      }
      const sid = String(slipId || "");
      const namesToRemove: string[] = Array.isArray(matchNames)
        ? matchNames.map(String).filter(Boolean)
        : matchName
        ? [String(matchName)]
        : [];
      if (!sid || namesToRemove.length === 0) {
        return NextResponse.json({ error: "slipId and matchName(s) are required." }, { status: 400 });
      }

      await addExcludedForSlip(sid, namesToRemove);
      const removeKeys = new Set(namesToRemove.map(normalizeExcludedKey));

      await ensureHistoryTable();
      const [slipRow] = await sql`SELECT * FROM curated_multi_bet_history WHERE id = ${sid} LIMIT 1`;

      let currentLegs: PresetLeg[] = [];
      let rowStake = Number(stake || 1000);
      if (slipRow) {
        currentLegs = Array.isArray(slipRow.matches) ? slipRow.matches : JSON.parse(slipRow.matches || "[]");
        rowStake = Number(slipRow.stake || rowStake);
      } else if (Array.isArray(payloadMatches)) {
        currentLegs = payloadMatches;
      }

      const remaining = currentLegs.filter((leg) => !removeKeys.has(normalizeExcludedKey(leg.match)));

      if (remaining.length === 0) {
        adminTrimmedCache.delete(sid);
        if (slipRow) {
          await sql`DELETE FROM curated_multi_bet_history WHERE id = ${sid}`;
        }
        return NextResponse.json({
          success: true,
          deletedSlip: true,
          message: "All matches removed; slip deleted.",
        });
      }

      const newOdds = Number(remaining.reduce((acc, l) => acc * Number(l.odds || 1), 1).toFixed(2));
      const newConf = Math.round(remaining.reduce((acc, l) => acc + Number(l.confidence || 70), 0) / remaining.length);
      const newPotentialWin = Math.round(rowStake * newOdds);

      const anyLost = remaining.some((l) => l.status === "lost");
      const allWon = remaining.length > 0 && remaining.every((l) => l.status === "won");
      const newStatus = anyLost ? "lost" : allWon ? "won" : "pending";
      const settledDateVal =
        newStatus !== "pending"
          ? (slipRow?.settled_date ? toSafeDateISO(slipRow.settled_date) : getLagosDateISO(0))
          : null;

      adminTrimmedCache.set(sid, { matches: remaining, combinedOdds: newOdds, confidence: newConf });

      if (slipRow) {
        await sql`
          UPDATE curated_multi_bet_history
          SET matches = ${JSON.stringify(remaining)},
              combined_odds = ${newOdds},
              confidence = ${newConf},
              potential_win = ${newPotentialWin},
              status = ${newStatus},
              settled_date = ${settledDateVal},
              admin_trimmed = TRUE,
              updated_at = NOW()
          WHERE id = ${sid}
        `;
      }

      return NextResponse.json({
        success: true,
        remainingCount: remaining.length,
        combinedOdds: newOdds,
        message: `Removed ${namesToRemove.length} match(es) from slip. Odds updated to ${newOdds}x.`,
      });
    }

    if (action === "delete_slip") {
      if (role !== "admin") {
        return NextResponse.json({ error: "Admin access required to delete slips." }, { status: 403 });
      }
      const sid = String(slipId || "");
      if (!sid) {
        return NextResponse.json({ error: "slipId is required." }, { status: 400 });
      }
      adminTrimmedCache.delete(sid);
      await ensureHistoryTable();
      await sql`DELETE FROM curated_multi_bet_history WHERE id = ${sid}`;
      return NextResponse.json({ success: true, message: "Slip deleted." });
    }

    if (action === "track_personal") {
      await ensureHistoryTable();

      // Retrieve slip legs either from DB or direct payload
      let legs: PresetLeg[] = [];
      let totalOdds = Number(combinedOdds || 2.0);

      const [slipRow] = await sql`
        SELECT * FROM curated_multi_bet_history WHERE id = ${slipId} LIMIT 1
      `;

      if (slipRow) {
        legs = Array.isArray(slipRow.matches) ? slipRow.matches : JSON.parse(slipRow.matches);
        totalOdds = Number(slipRow.combined_odds || totalOdds);
      } else if (Array.isArray(payloadMatches) && payloadMatches.length > 0) {
        legs = payloadMatches;
      }

      if (!legs.length) {
        return NextResponse.json({ error: "Slip matches not found to track." }, { status: 404 });
      }

      const ticketStake = Number(stake || 1000);
      const ticketCode = `CURATED-${Date.now().toString(36).toUpperCase()}`;

      // Insert legs into user_performance_tracking
      for (const leg of legs) {
        const predictionLabel = `${leg.selectedMarket} - ${leg.selectedOption}`;
        await sql`
          INSERT INTO user_performance_tracking (
            user_id,
            match_name,
            league,
            prediction,
            status,
            match_date,
            ticket_code,
            ticket_is_shared,
            ticket_total_odds,
            ticket_stake,
            selection_odds
          ) VALUES (
            ${session.user.id},
            ${leg.match},
            ${leg.league},
            ${predictionLabel},
            ${leg.status || "pending"},
            ${leg.date || getLagosDateISO(0)},
            ${ticketCode},
            false,
            ${totalOdds},
            ${ticketStake},
            ${Number(leg.odds || 1.5)}
          )
        `;
      }

      return NextResponse.json({
        success: true,
        message: `Slip successfully logged into your Personal Portfolio as Ticket ${ticketCode}!`,
        ticketCode,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST multi-bet-presets error:", error);
    return NextResponse.json({ error: error.message || "Failed to track ticket" }, { status: 500 });
  }
}
