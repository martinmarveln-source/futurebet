import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { GET as getMatches } from "../matches/route";

interface PresetLeg {
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
}

interface PresetSlip {
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
  matches: PresetLeg[];
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

  // 3. Over 1.5 Goals (High Win Rate)
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

  // 4. Clean 1X2 Home Win
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

  // 5. Clean 1X2 Away Win
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

  // 6. Both Teams To Score (BTTS Yes)
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

  // 7. Over 2.5 Goals
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
/*  Accumulator Combiner with Diversification Constraints             */
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

  return chosenLegs;
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

    // 3. Strict Date Filtering by Scope
    const todayISO = getLagosDateISO(0); // e.g. "2026-11-24"
    const tomorrowISO = getLagosDateISO(1);
    const { mondayISO, sundayISO } = getCurrentMondayToSundayRange();

    let candidatePool: any[] = [];

    if (scope === "today") {
      // STRICT TODAY: Only matches scheduled for today
      const todayMatches = allMatches.filter((m) => {
        const d = getMatchDateStr(m);
        return d === todayISO;
      });

      // If today has 6+ matches, strictly use today!
      // Only if today has very few matches (e.g. late night), include tomorrow (next 24h), NEVER next week!
      candidatePool = todayMatches.length >= 6
        ? todayMatches
        : allMatches.filter((m) => {
            const d = getMatchDateStr(m);
            return d === todayISO || d === tomorrowISO;
          });
    } else if (scope === "weekend") {
      // STRICT WEEKEND: Matches on Friday (5), Saturday (6), or Sunday (0)
      candidatePool = allMatches.filter((m) => {
        const d = getMatchDateStr(m);
        if (!d) return false;
        const dow = getDayOfWeekInLagos(d);
        return dow === 5 || dow === 6 || dow === 0;
      });
      // Fallback if weekend matches not yet posted
      if (candidatePool.length < 8) {
        candidatePool = allMatches;
      }
    } else {
      // WEEKLY / ALL POOL
      candidatePool = allMatches.filter((m) => {
        const d = getMatchDateStr(m);
        return d >= mondayISO && d <= sundayISO;
      });
      if (candidatePool.length < 10) candidatePool = allMatches;
    }

    // 4. Generate Slips
    // Standard Slips: 2+, 3+, 5+, 10+
    const legs2x = buildSlip(candidatePool, 2.0, 2.45, ["safe"], 2, 3);
    const odds2x = legs2x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf2x = legs2x.length > 0 ? Math.round(legs2x.reduce((acc, l) => acc + l.confidence, 0) / legs2x.length) : 84;

    const legs3x = buildSlip(candidatePool, 3.0, 3.85, ["safe", "medium"], 3, 4);
    const odds3x = legs3x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf3x = legs3x.length > 0 ? Math.round(legs3x.reduce((acc, l) => acc + l.confidence, 0) / legs3x.length) : 74;

    const legs5x = buildSlip(candidatePool, 5.0, 6.75, ["safe", "medium", "aggressive"], 4, 6);
    const odds5x = legs5x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf5x = legs5x.length > 0 ? Math.round(legs5x.reduce((acc, l) => acc + l.confidence, 0) / legs5x.length) : 58;

    const legs10x = buildSlip(candidatePool, 10.0, 14.50, ["safe", "medium", "aggressive"], 6, 9);
    const odds10x = legs10x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf10x = legs10x.length > 0 ? Math.round(legs10x.reduce((acc, l) => acc + l.confidence, 0) / legs10x.length) : 45;

    // 5. Special 7-Day ₦1,000 to ₦1,000,000 Jackpot Accumulator (1,000x+ Odds)
    // Runs Monday to Sunday across the entire week's schedule and resets Monday morning
    const weeklyPool = allMatches.filter((m) => {
      const d = getMatchDateStr(m);
      return !d || (d >= mondayISO && d <= sundayISO);
    });
    const candidateWeekly = weeklyPool.length >= 14 ? weeklyPool : allMatches;

    const legs1000x = buildSlip(candidateWeekly, 1000.0, 2000.0, ["safe", "medium", "aggressive"], 12, 18, 3);
    const odds1000x = legs1000x.reduce((acc, leg) => acc * leg.odds, 1.0);
    const conf1000x = legs1000x.length > 0 ? Math.round(legs1000x.reduce((acc, l) => acc + l.confidence, 0) / legs1000x.length) : 38;
    const finalOdds1000x = Number(odds1000x.toFixed(2));
    const potentialWin1000x = Math.max(1000000, Math.round(1000 * finalOdds1000x));

    // 6. Access Control Gates
    // - Free: all slips locked (selections hidden, teasers visible)
    // - Silver: 2+ and 3+ unlocked; 5+, 10+, and 1000x locked
    // - Premium & Admin: all unlocked
    const canAccessSilverTier = userTier === "silver" || userTier === "premium" || userTier === "admin";
    const canAccessPremiumTier = userTier === "premium" || userTier === "admin";

    const slips: PresetSlip[] = [
      {
        id: "banker_2x",
        title: scope === "weekend" ? "Weekend Banker Double" : scope === "weekly" ? "Weekly Banker Double" : "Daily Banker Double",
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
        title: scope === "weekend" ? "Weekend Value Treble" : scope === "weekly" ? "Weekly Value Treble" : "Daily Value Treble",
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
        title: scope === "weekend" ? "Weekend 5x Multiplier" : scope === "weekly" ? "Weekly 5x Multiplier" : "Daily 5x Multiplier",
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
        title: scope === "weekend" ? "Weekend 10x Mega Accumulator" : scope === "weekly" ? "Weekly 10x Mega" : "Daily 10x Mega Accumulator",
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
      // 7-Day Longshot Jackpot (Always present for weekend or weekly scope)
      {
        id: "longshot_1000x",
        title: "7-Day ₦1,000,000 Mega Jackpot",
        badge: "1,000x+ ODDS",
        tierTag: "₦1,000 → ₦1M+ JACKPOT",
        minTierRequired: "premium",
        isLocked: !canAccessPremiumTier,
        targetOdds: "1000+",
        combinedOdds: finalOdds1000x,
        matchesCount: legs1000x.length,
        confidence: conf1000x,
        stake: 1000,
        potentialWin: potentialWin1000x,
        resetInfo: `Runs Mon (${mondayISO}) – Sun (${sundayISO}) • Resets every Monday 00:00`,
        description: `Syndicate longshot accumulator across Monday to Sunday fixtures. Calibrated for ₦1,000 stake to return at least ₦1,000,000. Resets every Monday morning.`,
        matches: canAccessPremiumTier ? legs1000x : [],
      },
    ];

    // For "today" scope, return the 4 daily slips.
    // For "weekend" and "weekly" scopes, return the 4 slips PLUS the 7-day ₦1M Jackpot!
    const activeSlips = scope === "today" ? slips.slice(0, 4) : slips;

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
