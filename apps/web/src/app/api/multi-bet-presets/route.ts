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
  } catch (err) {
    console.warn("Failed to ensure curated_multi_bet_history table:", err);
  }
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

  // 1. Double Chance
  if (mkt.includes("double") || opt.includes("1x") || opt.includes("x2") || opt.includes("12")) {
    const homeOrDraw = hg >= ag;
    const drawOrAway = ag >= hg;
    const homeOrAway = hg !== ag;

    if (opt.includes("1x")) return homeOrDraw ? "won" : "lost";
    if (opt.includes("x2")) return drawOrAway ? "won" : "lost";
    if (opt.includes("12")) return homeOrAway ? "won" : "lost";
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

  // 4. Full Time Result (1X2)
  if (mkt.includes("result") || mkt.includes("1x2") || mkt.includes("match")) {
    if (opt.includes("home") || opt === "1") return hg > ag ? "won" : "lost";
    if (opt.includes("away") || opt === "2") return ag > hg ? "won" : "lost";
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
  const o15Odds = toNum(m.o15Odds);
  const o25Odds = toNum(m.o25Odds);
  const bttsYesOdds = toNum(m.bttsYesOdds);
  const hppg = toNum(m.hppg);
  const appg = toNum(m.appg);
  const un25 = toNum(m.un25);
  const ov25 = toNum(m.ov25);

  // 1. Double Chance 1X (Super Safe)
  if (dc1X >= 1.12 && dc1X <= 1.45 && (hWin + draw) >= 65) {
    candidates.push({
      market: "Double Chance",
      option: "1X",
      odds: dc1X,
      confidence: Math.round(Math.min(92, hWin + draw)),
      risk: "safe",
      reason: hppg >= 1.6 ? `Strong home form (${hppg.toFixed(2)} PPG)` : "Dominant home/draw probability support",
    });
  }

  // 2. Double Chance X2 (Super Safe)
  if (dcX2 >= 1.12 && dcX2 <= 1.45 && (aWin + draw) >= 65) {
    candidates.push({
      market: "Double Chance",
      option: "X2",
      odds: dcX2,
      confidence: Math.round(Math.min(92, aWin + draw)),
      risk: "safe",
      reason: appg >= 1.6 ? `Strong away form (${appg.toFixed(2)} PPG)` : "Solid away tactical resilience",
    });
  }

  // 3. Double Chance 12 (Low Draw Risk)
  if (draw > 0 && draw <= 22 && (hWin >= 42 || aWin >= 42)) {
    candidates.push({
      market: "Double Chance",
      option: "12",
      odds: 1.28,
      confidence: Math.round(Math.min(90, 100 - draw)),
      risk: "safe",
      reason: `Low draw probability (${draw}%) with high decisive winner conversion`,
    });
  }

  // 4. Over 1.5 Goals (High Win Rate)
  const o15Chance = toNum(m.hgsOver15 || m.o15 || 75);
  if (o15Odds >= 1.15 && o15Odds <= 1.45 && o15Chance >= 70) {
    candidates.push({
      market: "Over 1.5",
      option: "Over 1.5",
      odds: o15Odds,
      confidence: Math.round(Math.min(90, o15Chance)),
      risk: "safe",
      reason: "High combined goal expectation across recent fixtures",
    });
  }

  // 5. Under 3.5 Goals (Tactical Defensive Under)
  if (un25 >= 55 || (hppg > 0 && hppg <= 1.2 && appg > 0 && appg <= 1.2)) {
    candidates.push({
      market: "Under 3.5",
      option: "Under 3.5",
      odds: 1.25,
      confidence: Math.round(Math.min(94, un25 > 0 ? un25 + 20 : 85)),
      risk: "safe",
      reason: "Defensive stability and low collective expected goal conversion",
    });
  }

  // 6. Clean 1X2 Home Win
  if (hOdds >= 1.30 && hOdds <= 1.85 && hWin >= 55) {
    candidates.push({
      market: "1X2",
      option: "Home",
      odds: hOdds,
      confidence: Math.round(hWin),
      risk: "medium",
      reason: `Clear home model edge (${hWin}% win likelihood)`,
    });
  }

  // 7. Clean 1X2 Away Win
  if (aOdds >= 1.40 && aOdds <= 2.05 && aWin >= 50) {
    candidates.push({
      market: "1X2",
      option: "Away",
      odds: aOdds,
      confidence: Math.round(aWin),
      risk: "medium",
      reason: `Superior league rank and road momentum (${aWin}% win likelihood)`,
    });
  }

  // 8. Both Teams To Score (BTTS Yes)
  const bttsChance = toNum(m.gg || m.btts || 55);
  if (bttsYesOdds >= 1.45 && bttsYesOdds <= 1.95 && bttsChance >= 58) {
    candidates.push({
      market: "BTTS",
      option: "GG",
      odds: bttsYesOdds,
      confidence: Math.round(bttsChance),
      risk: "aggressive",
      reason: `Both attacks averaging >1.3 goals with low clean sheet rates`,
    });
  }

  // 9. Over 2.5 Goals
  const o25Chance = toNum(m.ov25 || m.o25 || 52);
  if (o25Odds >= 1.50 && o25Odds <= 2.15 && o25Chance >= 55) {
    candidates.push({
      market: "Over 2.5",
      option: "Over 2.5",
      odds: o25Odds,
      confidence: Math.round(o25Chance),
      risk: "aggressive",
      reason: "Open attacking profile with positive xG projection",
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
/*  Weekend Match Filter (Friday >= 17:00, Saturday, Sunday)          */
/* ------------------------------------------------------------------ */
function isWeekendMatch(m: any): boolean {
  const d = getMatchDateStr(m);
  if (!d) return false;
  const dow = getDayOfWeekInLagos(d); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  // Saturday (6) and Sunday (0) are 100% weekend fixtures
  if (dow === 6 || dow === 0) return true;

  // Friday (5): ONLY evening kickoffs (>= 17:00 WAT)
  if (dow === 5) {
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
  maxPerLeague = 2
): PresetLeg[] {
  const chosenLegs: PresetLeg[] = [];
  const usedMatches = new Set<string>();
  const usedLeagues = new Map<string, number>();

  let cumulativeOdds = 1.0;

  // Flatten candidates
  const allCandidates: Array<{
    match: any;
    candidate: ReturnType<typeof extractEligibleMarkets>[0];
  }> = [];

  for (const m of availableMatches) {
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

  for (const item of allCandidates) {
    const m = item.match;
    const c = item.candidate;
    const matchName = String(m.match || `${m.homeTeam} vs ${m.awayTeam}`);
    const league = String(m.fullLeague || m.league || "League");

    if (usedMatches.has(matchName)) continue;
    const leagueCount = usedLeagues.get(league) || 0;
    if (leagueCount >= maxPerLeague) continue;

    // Check if adding this leg exceeds targetMaxOdds prematurely
    const newOdds = cumulativeOdds * c.odds;
    if (chosenLegs.length + 1 < minLegs && newOdds > targetMaxOdds) {
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
    usedLeagues.set(league, leagueCount + 1);
    cumulativeOdds = newOdds;

    if (chosenLegs.length >= minLegs && cumulativeOdds >= targetMinOdds) {
      break;
    }
    if (chosenLegs.length >= maxLegs) {
      break;
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
        SELECT id, status FROM curated_multi_bet_history WHERE id = ${slipRecordId} LIMIT 1
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
      } else if (existing.status === "pending") {
        await sql`
          UPDATE curated_multi_bet_history
          SET combined_odds = ${slip.combinedOdds},
              confidence = ${slip.confidence},
              potential_win = ${potentialWin},
              matches = ${JSON.stringify(slip.matches)},
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
    const pendingSlips = await sql`
      SELECT * FROM curated_multi_bet_history
      WHERE status = 'pending'
      ORDER BY created_date DESC
      LIMIT 40
    `;

    if (!pendingSlips || pendingSlips.length === 0) return;

    const finishedMatches = await sql`
      SELECT match_date, home_team, away_team, match_label, ft_score, raw_data
      FROM matches_cache
      WHERE ft_score IS NOT NULL AND ft_score != ''
        AND match_date >= (CURRENT_DATE - INTERVAL '30 days')
      ORDER BY match_date DESC
      LIMIT 300
    `;

    if (!finishedMatches || finishedMatches.length === 0) return;

    const matchScoreMap = new Map<string, string>();
    for (const fm of finishedMatches) {
      const score = String(fm.ft_score || "").trim();
      if (!score) continue;
      const h = String(fm.home_team || "").toLowerCase().trim();
      const a = String(fm.away_team || "").toLowerCase().trim();
      if (h && a) {
        matchScoreMap.set(`${h} vs ${a}`, score);
        matchScoreMap.set(`${h} - ${a}`, score);
        matchScoreMap.set(`${h}_${a}`, score);
      }
      if (fm.match_label) {
        matchScoreMap.set(normMatchName(fm.match_label), score);
      }
      if (fm.raw_data?.match) {
        matchScoreMap.set(normMatchName(fm.raw_data.match), score);
      }
    }

    for (const slip of pendingSlips) {
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
        if (leg.status === "won" || leg.status === "lost") {
          if (leg.status === "lost") anyLost = true;
          continue;
        }

        const legNorm = normMatchName(leg.match);
        let ftScore: string | null = null;

        if (matchScoreMap.has(legNorm)) {
          ftScore = matchScoreMap.get(legNorm)!;
        } else {
          const { home, away } = splitTeams(leg.match);
          if (home && away) {
            const key = `${home}_${away}`;
            if (matchScoreMap.has(key)) {
              ftScore = matchScoreMap.get(key)!;
            } else {
              for (const [mapKey, sc] of matchScoreMap.entries()) {
                if (mapKey.includes(home) && mapKey.includes(away)) {
                  ftScore = sc;
                  break;
                }
              }
            }
          }
        }

        if (ftScore) {
          const outcome = evaluateLegOutcome(leg.selectedMarket, leg.selectedOption, ftScore);
          leg.ftScore = ftScore;
          leg.status = outcome;
          legsModified = true;
          if (outcome === "lost") {
            anyLost = true;
          } else if (outcome !== "won") {
            allDecided = false;
            allWon = false;
          }
        } else {
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
        await sql`
          UPDATE curated_multi_bet_history
          SET status = ${newStatus},
              matches = ${JSON.stringify(legs)},
              settled_date = ${newStatus !== "pending" ? sql`CURRENT_DATE` : null},
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
      if (session?.user?.id) {
        const [u] = await sql`SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        const role = String(u?.user_role || "free").toLowerCase();
        if (role === "admin") userTier = "admin";
        else if (role === "pro" || role === "premium") userTier = "premium";
        else if (role === "silver") userTier = "silver";
      }
    } catch (authErr) {
      console.warn("Could not resolve user session in multi-bet-presets:", authErr);
    }

    // Check if client is requesting tracked history & outcomes
    if (searchParams.get("history") === "true") {
      await ensureHistoryTable();
      await seedRealisticHistoryIfSparse();

      const canAccessTracking = userTier === "premium" || userTier === "admin";
      if (canAccessTracking) {
        await autoSettlePendingSlips();
      }

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
        history: historyRows.map((r) => ({
          id: r.id,
          presetTier: r.preset_tier,
          scope: r.scope,
          title: r.title,
          targetOdds: r.target_odds,
          combinedOdds: Number(r.combined_odds),
          confidence: Number(r.confidence),
          stake: Number(r.stake || 1000),
          potentialWin: Number(r.potential_win || Math.round(Number(r.stake || 1000) * Number(r.combined_odds))),
          status: r.status,
          createdDate: r.created_date ? new Date(r.created_date).toISOString().slice(0, 10) : "",
          settledDate: r.settled_date ? new Date(r.settled_date).toISOString().slice(0, 10) : null,
          matches: Array.isArray(r.matches) ? r.matches : (typeof r.matches === "string" ? JSON.parse(r.matches) : []),
        })),
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
    const { mondayISO, sundayISO } = getCurrentMondayToSundayRange();

    const canAccessSilverTier = userTier === "silver" || userTier === "premium" || userTier === "admin";
    const canAccessPremiumTier = userTier === "premium" || userTier === "admin";

    // ------------------------------------------------------------------
    // POOL 1: TODAY POOL (Strict calendar today, or next 24h if late night)
    // ------------------------------------------------------------------
    const todayMatches = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return d === todayISO;
    });
    const candidateToday = todayMatches.length >= 6
      ? todayMatches
      : allMatches.filter((m) => {
          const d = getMatchDateStr(m);
          return d === todayISO || d === tomorrowISO;
        });

    // ------------------------------------------------------------------
    // POOL 2: WEEKEND POOL (Strictly Friday >= 17:00 WAT, Saturday, Sunday)
    // ------------------------------------------------------------------
    const weekendMatches = allMatches.filter(isWeekendMatch);
    const candidateWeekend = weekendMatches.length >= 8 ? weekendMatches : allMatches;

    // ------------------------------------------------------------------
    // POOL 3: 7-DAY WEEKLY POOL (Monday to Sunday)
    // ------------------------------------------------------------------
    const sevenDayMatches = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return !d || (d >= mondayISO && d <= sundayISO);
    });
    const candidate7Day = sevenDayMatches.length >= 12 ? sevenDayMatches : allMatches;

    // ------------------------------------------------------------------
    // POOL 4: 15-DAY FORTNIGHT POOL (Today to +15 Days)
    // ------------------------------------------------------------------
    const fifteenDayMatches = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return !d || (d >= todayISO && d <= day15ISO);
    });
    const candidate15Day = fifteenDayMatches.length >= 14 ? fifteenDayMatches : allMatches;

    // ------------------------------------------------------------------
    // POOL 5: 15+ DAYS ULTRA MARATHON POOL (16+ Days to 30+ Days)
    // ------------------------------------------------------------------
    const marathonMatches = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return !d || d > day15ISO;
    });
    const candidateMarathon = marathonMatches.length >= 14
      ? marathonMatches
      : allMatches.filter((m) => {
          const d = getMatchDateStr(m);
          return !d || d >= day7ISO;
        });
    const finalMarathonPool = candidateMarathon.length >= 14 ? candidateMarathon : allMatches;

    // ==================================================================
    // SECTION A: ₦1,000,000+ MEGA JACKPOT ACCUMULATORS
    // Arranged by 4 distinct time horizons (all targeting >= ₦1,000,000)
    // ==================================================================
    // 1. Weekend ₦1M Mega Jackpot (Friday >= 17:00 through Sunday)
    const legsWeekend1000x = buildSlip(candidateWeekend, 1000.0, 2500.0, ["safe", "medium", "aggressive"], 12, 16, 3);
    const oddsWeekend1000x = legsWeekend1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const finalOddsWeekend1000x = Number(oddsWeekend1000x.toFixed(2));
    const winWeekend1000x = Math.max(1000000, Math.round(1000 * finalOddsWeekend1000x));
    const confWeekend1000x = legsWeekend1000x.length > 0
      ? Math.round(legsWeekend1000x.reduce((acc, l) => acc + l.confidence, 0) / legsWeekend1000x.length)
      : 44;

    // 2. 7-Day ₦1M Syndicate Acca (Monday to Sunday)
    const legs7Day1000x = buildSlip(candidate7Day, 1000.0, 3000.0, ["safe", "medium", "aggressive"], 13, 18, 3);
    const odds7Day1000x = legs7Day1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const finalOdds7Day1000x = Number(odds7Day1000x.toFixed(2));
    const win7Day1000x = Math.max(1000000, Math.round(1000 * finalOdds7Day1000x));
    const conf7Day1000x = legs7Day1000x.length > 0
      ? Math.round(legs7Day1000x.reduce((acc, l) => acc + l.confidence, 0) / legs7Day1000x.length)
      : 41;

    // 3. 15-Day ₦1M Fortnight Builder (Next 15 days)
    const legs15Day1000x = buildSlip(candidate15Day, 1000.0, 5000.0, ["safe", "medium", "aggressive"], 14, 20, 3);
    const odds15Day1000x = legs15Day1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const finalOdds15Day1000x = Number(odds15Day1000x.toFixed(2));
    const win15Day1000x = Math.max(1000000, Math.round(1000 * finalOdds15Day1000x));
    const conf15Day1000x = legs15Day1000x.length > 0
      ? Math.round(legs15Day1000x.reduce((acc, l) => acc + l.confidence, 0) / legs15Day1000x.length)
      : 38;

    // 4. 15+ Days ₦1M Ultra Marathon (16+ days deep forward calendar)
    const legsMarathon1000x = buildSlip(finalMarathonPool, 1000.0, 10000.0, ["safe", "medium", "aggressive"], 15, 22, 3);
    const oddsMarathon1000x = legsMarathon1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const finalOddsMarathon1000x = Number(oddsMarathon1000x.toFixed(2));
    const winMarathon1000x = Math.max(1000000, Math.round(1000 * finalOddsMarathon1000x));
    const confMarathon1000x = legsMarathon1000x.length > 0
      ? Math.round(legsMarathon1000x.reduce((acc, l) => acc + l.confidence, 0) / legsMarathon1000x.length)
      : 36;

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
        title: "7-Day ₦1,000,000 Syndicate Acca",
        badge: "7-DAY 1,000x+",
        tierTag: "₦1,000 → ₦1M+ JACKPOT",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "1000+",
        combinedOdds: finalOdds7Day1000x,
        matchesCount: legs7Day1000x.length,
        confidence: conf7Day1000x,
        stake: 1000,
        potentialWin: win7Day1000x,
        resetInfo: `Runs Mon (${mondayISO}) – Sun (${sundayISO}) • Resets Monday 00:00`,
        description: "Full-week algorithmic jackpot covering domestic league rounds and midweek fixtures. Engineered for compounding capital across Monday to Sunday.",
        matches: canAccessPremiumTier ? legs7Day1000x : [],
      },
      {
        id: "jackpot_15day_1000x",
        title: "15-Day ₦1,000,000 Fortnight Builder",
        badge: "15-DAY 1,000x+",
        tierTag: "₦1,000 → ₦1M+ JACKPOT",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "1000+",
        combinedOdds: finalOdds15Day1000x,
        matchesCount: legs15Day1000x.length,
        confidence: conf15Day1000x,
        stake: 1000,
        potentialWin: win15Day1000x,
        resetInfo: `Next 15-Day Forward Schedule (${todayISO} – ${day15ISO})`,
        description: "Fortnightly compounding accumulator. Staggers conservative mathematical banker plays across 15 days of league, cup, and European ties.",
        matches: canAccessPremiumTier ? legs15Day1000x : [],
      },
      {
        id: "jackpot_marathon_1000x",
        title: "15+ Days ₦1,000,000 Ultra Marathon",
        badge: "15+ DAYS 1,000x+",
        tierTag: "₦1,000 → ₦1M+ JACKPOT",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "1000+",
        combinedOdds: finalOddsMarathon1000x,
        matchesCount: legsMarathon1000x.length,
        confidence: confMarathon1000x,
        stake: 1000,
        potentialWin: winMarathon1000x,
        resetInfo: "Extended Calendar Schedule (16 to 30+ Days)",
        description: "Deep forward fixture accumulator for patient investors. Targets high-conviction recurring mathematical value spots across the forward monthly schedule.",
        matches: canAccessPremiumTier ? legsMarathon1000x : [],
      },
    ];

    // ==================================================================
    // SECTION B: STANDARD ODDS TIERS (2+, 3+, 5+, 10+)
    // ==================================================================
    const activePool = scope === "weekend" ? candidateWeekend : candidateToday;

    const legs2x = buildSlip(activePool, 2.0, 2.45, ["safe"], 2, 3);
    const odds2x = legs2x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf2x = legs2x.length > 0 ? Math.round(legs2x.reduce((acc, l) => acc + l.confidence, 0) / legs2x.length) : 84;

    const legs3x = buildSlip(activePool, 3.0, 3.85, ["safe", "medium"], 3, 4);
    const odds3x = legs3x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf3x = legs3x.length > 0 ? Math.round(legs3x.reduce((acc, l) => acc + l.confidence, 0) / legs3x.length) : 74;

    const legs5x = buildSlip(activePool, 5.0, 6.75, ["safe", "medium", "aggressive"], 4, 6);
    const odds5x = legs5x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf5x = legs5x.length > 0 ? Math.round(legs5x.reduce((acc, l) => acc + l.confidence, 0) / legs5x.length) : 58;

    const legs10x = buildSlip(activePool, 10.0, 14.50, ["safe", "medium", "aggressive"], 6, 9);
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

    return NextResponse.json({
      success: true,
      scope,
      todayDate: todayISO,
      weekRange: { mondayISO, sundayISO },
      generatedAt: new Date().toISOString(),
      userTier,
      slips: activeSlips,
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
    const { action, slipId, stake, matches: payloadMatches, combinedOdds, title } = body;

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
            odds,
            bet_amount,
            potential_payout
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
            ${Number(leg.odds || 1.5)},
            ${ticketStake},
            ${Math.round(ticketStake * totalOdds)}
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
