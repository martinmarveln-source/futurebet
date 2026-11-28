import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { GET as getMatches } from "../matches/route";
import {
  callGemini,
  GEMINI_HYDROGEN_MODELS,
  normalizeLegMarketOption,
} from "@/lib/gemini";

interface RecommendConfig {
  minMatches: number;
  maxMatches: number;
  minOdds: number;
  maxOdds: number;
  targetDate?: string;
}

interface CandidateMarketPick {
  market: string;
  option: string;
  odds: number;
  probPct: number;
  evPct: number;
}

function toPct(val: any): number {
  const n = Number(String(val ?? "").replace("%", "").trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n <= 1 ? n * 100 : n;
}

function getAllInRangeMarkets(r: any, minOdds: number, maxOdds: number): CandidateMarketPick[] {
  const hw = toPct(r.homeWin);
  const dr = toPct(r.draw);
  const aw = toPct(r.awayWin);
  const gg = toPct(r.gg);
  const ng = toPct(r.ng) || (gg > 0 ? 100 - gg : 0);
  const ov25 = toPct(r.ov25);
  const un25 = toPct(r.un25) || (ov25 > 0 ? 100 - ov25 : 0);
  const ov15 = ov25 > 0 ? Math.min(92, ov25 + 22) : 0;
  const ov35 = ov25 > 0 ? Math.max(12, ov25 - 22) : 0;
  const un35 = ov35 > 0 ? 100 - ov35 : 0;

  const rawOptions: Array<{ market: string; option: string; odds: number; prob: number }> = [
    { market: "1X2", option: "Home Win", odds: Number(r.homeOdds), prob: hw },
    { market: "1X2", option: "Draw", odds: Number(r.drawOdds), prob: dr },
    { market: "1X2", option: "Away Win", odds: Number(r.awayOdds), prob: aw },
    { market: "Double Chance", option: "Home Win or Draw", odds: Number(r.dc1X), prob: hw + dr },
    { market: "Double Chance", option: "Draw or Away Win", odds: Number(r.dcX2), prob: dr + aw },
    { market: "Double Chance", option: "Home Win or Away Win", odds: Number(r.dc12), prob: hw + aw },
    { market: "O/U 1.5", option: "Over 1.5", odds: Number(r.o15Odds), prob: ov15 },
    { market: "O/U 2.5", option: "Over 2.5", odds: Number(r.o25Odds), prob: ov25 },
    { market: "O/U 2.5", option: "Under 2.5", odds: Number(r.u25Odds), prob: un25 },
    { market: "O/U 3.5", option: "Over 3.5", odds: Number(r.o35Odds), prob: ov35 },
    { market: "O/U 3.5", option: "Under 3.5", odds: Number(r.u35Odds), prob: un35 },
    { market: "BTTS", option: "Yes", odds: Number(r.bttsYesOdds), prob: gg },
    { market: "BTTS", option: "No", odds: Number(r.bttsNoOdds), prob: ng },
  ];

  const valid: CandidateMarketPick[] = [];
  for (const item of rawOptions) {
    if (!Number.isFinite(item.odds) || item.odds <= 1.01) continue;
    if (item.odds < minOdds || item.odds > maxOdds) continue;
    const probPct = Math.max(0, Math.min(95, Math.round(item.prob || 50)));
    const evPct = Number((((probPct / 100) * item.odds - 1) * 100).toFixed(1));
    valid.push({
      market: item.market,
      option: item.option,
      odds: Number(item.odds.toFixed(2)),
      probPct,
      evPct,
    });
  }

  valid.sort((a, b) => b.probPct * 0.65 + b.evPct * 0.35 - (a.probPct * 0.65 + a.evPct * 0.35));
  return valid;
}

function resolveSelectionOdds(row: any, market: string, option: string, aiOdds: number): number {
  const m = market.toLowerCase();
  const o = option.toLowerCase();
  let odds = 0;

  if (m.includes("double") || o.includes("1x") || o.includes("x2") || o.includes("12") || o.includes("or draw") || o.includes("or away")) {
    if (o.includes("1x") || o.includes("home win or draw") || o.includes("home or draw")) odds = Number(row.dc1X);
    else if (o.includes("x2") || o.includes("draw or away") || o.includes("away win or draw")) odds = Number(row.dcX2);
    else if (o.includes("12") || o.includes("home or away") || o.includes("home win or away")) odds = Number(row.dc12);
  } else if (o.includes("over 1.5") || (m.includes("1.5") && o.includes("over"))) odds = Number(row.o15Odds);
  else if (o.includes("under 1.5") || (m.includes("1.5") && o.includes("under"))) odds = Number(row.u15Odds);
  else if (o.includes("over 2.5") || (m.includes("2.5") && o.includes("over")) || o === "over") odds = Number(row.o25Odds);
  else if (o.includes("under 2.5") || (m.includes("2.5") && o.includes("under"))) odds = Number(row.u25Odds);
  else if (o.includes("over 3.5") || (m.includes("3.5") && o.includes("over"))) odds = Number(row.o35Odds);
  else if (o.includes("under 3.5") || (m.includes("3.5") && o.includes("under"))) odds = Number(row.u35Odds);
  else if (o.includes("over 4.5") || (m.includes("4.5") && o.includes("over"))) odds = Number(row.o45Odds);
  else if (o.includes("under 4.5") || (m.includes("4.5") && o.includes("under"))) odds = Number(row.u45Odds);
  else if (m.includes("btts") || o.includes("btts") || o === "yes" || o === "no" || o === "gg" || o === "ng") {
    odds = o.includes("no") || o === "ng" ? Number(row.bttsNoOdds) : Number(row.bttsYesOdds);
  } else if (o.includes("home") || o === "1") odds = Number(row.homeOdds);
  else if (o.includes("away") || o === "2") odds = Number(row.awayOdds);
  else if (o === "draw" || o === "x") odds = Number(row.drawOdds);

  const resolved = odds > 1.01 ? odds : aiOdds > 1.01 ? aiOdds : 0;
  return Number((Number(resolved) || 0).toFixed(2));
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userRecord] = await sql`
      SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1
    `;
    const role = String(userRecord?.user_role || "free").toLowerCase();
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = (await req.json()) as RecommendConfig;
    const minMatches = Math.max(1, Math.min(15, Number(body.minMatches) || 3));
    const maxMatches = Math.max(minMatches, Math.min(15, Number(body.maxMatches) || 5));
    const minOdds = Math.max(1.01, Number(body.minOdds) || 1.5);
    const maxOdds = Math.max(minOdds, Number(body.maxOdds) || 4.0);
    const targetDate = body.targetDate || "";

    const apiKey = process.env.GEMINI_API_KEY || "";

    // ── Fetch today's/upcoming matches ─────────────────────────────────────
    const mockReq = new Request(req.url.replace("/ai-recommend-slip", "/matches"));
    const matchesRes = await getMatches(mockReq);
    if (!matchesRes.ok) {
      return NextResponse.json({ error: "Failed to fetch matches for analysis." }, { status: 422 });
    }

    const payload = await matchesRes.json();
    const rows: any[] = payload.matches || [];
    if (!rows.length) {
      return NextResponse.json({ error: "No matches found for today. Try again later." }, { status: 404 });
    }

    // ── Date + multi-market odds filter ────────────────────────────────────
    const candidateEntries: Array<{ row: any; bestPick: CandidateMarketPick; allValid: CandidateMarketPick[] }> = [];
    for (const r of rows) {
      if (targetDate && r.date !== targetDate) continue;
      const inRange = getAllInRangeMarkets(r, minOdds, maxOdds);
      if (inRange.length === 0) continue;

      const recNorm = normalizeLegMarketOption(r);
      const matchingSystemPick = inRange.find(
        (m) =>
          m.market.toLowerCase() === recNorm.market.toLowerCase() &&
          m.option.toLowerCase() === recNorm.option.toLowerCase()
      );
      const bestPick = matchingSystemPick || inRange[0];
      candidateEntries.push({ row: r, bestPick, allValid: inRange });
    }

    if (candidateEntries.length < minMatches) {
      return NextResponse.json(
        {
          error: `Only ${candidateEntries.length} matches have qualifying markets within odds range ${minOdds.toFixed(2)}–${maxOdds.toFixed(2)}. Try widening the range.`,
        },
        { status: 422 }
      );
    }

    // ── Sort by conviction + chance + rating + EV ──────────────────────────
    candidateEntries.sort((a, b) => {
      const convScore = (r: any) =>
        r.intelligence?.convictionTier === "HIGH" ? 3 : r.intelligence?.convictionTier === "MEDIUM" ? 2 : 1;
      const diff = convScore(b.row) - convScore(a.row);
      if (diff !== 0) return diff;
      const scoreA = (Number(a.row.chance) || 0) + (Number(a.row.rating) || 0) + a.bestPick.evPct * 0.5;
      const scoreB = (Number(b.row.chance) || 0) + (Number(b.row.rating) || 0) + b.bestPick.evPct * 0.5;
      return scoreB - scoreA;
    });

    const topEntries = candidateEntries.slice(0, 40);
    const topMatches = topEntries.map((e) => e.row);

    // ── League/team historical stats ───────────────────────────────────────
    const teamStatsMap = new Map<string, any>();
    try {
      const stats = await sql`
        SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL
      `;
      for (const row of stats) {
        if (!row.team || !row.market_stats) continue;
        let ms = row.market_stats;
        if (typeof ms === "string") {
          try {
            ms = JSON.parse(ms);
          } catch {
            ms = {};
          }
        }
        teamStatsMap.set(row.team.trim().toLowerCase(), ms);
      }
    } catch (e) {
      console.warn("Could not fetch team stats:", e);
    }

    // ── Deterministic fallback builder (clean normalized market + option) ──
    const buildAlgorithmicSlip = (notePrefix = "") => {
      const seenTeams = new Set<string>();
      const leagueCounts = new Map<string, number>();
      const selected: any[] = [];

      for (const entry of topEntries) {
        if (selected.length >= maxMatches) break;
        const { row: r, bestPick } = entry;

        const parts = String(r.match || "").split(/\s+vs\s+|\s+-\s+/);
        const home = (parts[0] || "").trim().toLowerCase();
        const away = (parts[1] || "").trim().toLowerCase();
        if (!home || !away || seenTeams.has(home) || seenTeams.has(away)) continue;

        const league = String(r.league || "").toLowerCase();
        const lc = leagueCounts.get(league) || 0;
        if (lc >= 2) continue;

        seenTeams.add(home);
        seenTeams.add(away);
        leagueCounts.set(league, lc + 1);

        const chance = toPct(r.chance) || bestPick.probPct;
        const rating = toPct(r.rating) || 70;
        const score = Math.round(bestPick.probPct * 0.45 + rating * 0.35 + Math.max(0, bestPick.evPct) * 0.5 + 15);
        const avgGoals = ((Number(r.hgs) || 0) + (Number(r.hgc) || 0) + (Number(r.ags) || 0) + (Number(r.agc) || 0)) / 2;

        selected.push({
          ...r,
          match: r.match,
          league: r.league || "",
          selectedMarket: bestPick.market,
          selectedOption: bestPick.option,
          odds: bestPick.odds,
          score,
          aiReason: `${bestPick.market}: ${bestPick.option} @ ${bestPick.odds.toFixed(2)} — ${bestPick.probPct}% model prob (${bestPick.evPct >= 0 ? `+${bestPick.evPct}% EV` : `${bestPick.evPct}% edge`}), combined ${avgGoals.toFixed(2)} g/g, rating ${Math.round(rating)}%.`,
          aiRisk: bestPick.probPct >= 65 ? "Low variance anchor" : "Moderate market variance",
          aiVerdict: bestPick.evPct > 0 ? "High-Value Pick" : "Statistical Pick",
          addedAt: new Date().toISOString(),
        });
      }

      const combinedOdds = Number(selected.reduce((p, m) => p * Number(m.odds || 1), 1).toFixed(2));
      return {
        matches: selected,
        summary: `${notePrefix}Quant slip built with ${selected.length} uncorrelated legs (${combinedOdds}x combined odds) filtered for ${minOdds.toFixed(2)}–${maxOdds.toFixed(2)}.`,
        diversityNote: `Spread across ${leagueCounts.size} leagues (max 2 per league, zero overlapping clubs).`,
        combinedOdds,
        count: selected.length,
        modelUsed: "deterministic-quant",
      };
    };

    // ── Format candidate pool for Gemini 4 Hydrogen ────────────────────────
    const fmtOdds = (v: any) => {
      const n = Number(v);
      return n > 1.01 ? n.toFixed(2) : "—";
    };
    const fmtPct = (v: any) => {
      const p = toPct(v);
      return p > 0 ? `${Math.round(p)}%` : "—";
    };
    const fmtStat = (v: any) => (v ? (String(v).includes("%") ? v : v + "%") : "—");
    const fmt = (v: any, d = 1) => {
      const n = Number(v);
      return isFinite(n) ? n.toFixed(d) : "—";
    };

    const matchData = topEntries
      .map(({ row: r, allValid }, i) => {
        const parts = String(r.match || "").split(/\s+vs\s+|\s+-\s+/);
        const homeTeam = (parts[0] || "").trim();
        const awayTeam = (parts[1] || "").trim();
        const hs = teamStatsMap.get(homeTeam.toLowerCase()) || {};
        const as_ = teamStatsMap.get(awayTeam.toLowerCase()) || {};

        const normRec = normalizeLegMarketOption(r);
        const convTier = r.intelligence?.convictionTier || "—";
        const valueEdge = r.intelligence?.valueEdge || r.valueEdge || "—";
        const hPts = Number(r.hPts) || 0;
        const aPts = Number(r.aPts) || 0;
        const ptsDelta = Math.abs(hPts - aPts);
        const inRangeStr = allValid
          .slice(0, 6)
          .map((m) => `${m.market}:${m.option}@${m.odds.toFixed(2)}(${m.probPct}%,EV:${m.evPct}%)`)
          .join(" | ");

        return `Match ${i + 1}: ${r.match || "Unknown"} [${r.league || ""}] (${r.date || ""} ${r.time || ""})
  Recommended: ${normRec.market} -> ${normRec.option} | Chance: ${fmtPct(r.chance)} | Rating: ${fmtPct(r.rating)} | Conviction: ${convTier} | Edge: ${valueEdge}
  Qualifying Markets (${minOdds.toFixed(2)}-${maxOdds.toFixed(2)}): ${inRangeStr}
  Win Probs → H:${fmtPct(r.homeWin)} D:${fmtPct(r.draw)} A:${fmtPct(r.awayWin)} | DC1X:${fmtOdds(r.dc1X)} DC12:${fmtOdds(r.dc12)} DCX2:${fmtOdds(r.dcX2)}
  Form → Home:${r.hForm || "—"} (${hPts}pts) | Away:${r.aForm || "—"} (${aPts}pts) | Δ=${ptsDelta}pts
  Goals/BTTS → H:${fmt(r.hgs)}GF/${fmt(r.hgc)}GA | A:${fmt(r.ags)}GF/${fmt(r.agc)}GA | O1.5:${fmtPct(r.ov15)} O2.5:${fmtPct(r.ov25)} BTTS H:${fmtPct(r.hBtts)} A:${fmtPct(r.aBtts)}
  H2H (${r.H2H_GP || "?"}g) → W:${r.H2H_H || 0} D:${r.H2H_D || 0} L:${r.H2H_A || 0} | O2.5:${fmtPct(r.H2H_OV)} | BTTS:${fmtPct(r.H2H_GG)} | CS:${r.likelyCS || "—"}
  League Split → H[W:${fmtStat(hs.W_ALL || hs.W_HOME)} O2.5:${fmtStat(hs.O25_ALL || hs.O25_HOME)} BTTS:${fmtStat(hs.BTTS_ALL || hs.BTTS_HOME)}] | A[W:${fmtStat(as_.W_ALL || as_.W_AWAY)} O2.5:${fmtStat(as_.O25_ALL || as_.O25_AWAY)} BTTS:${fmtStat(as_.BTTS_ALL || as_.BTTS_AWAY)}]`;
      })
      .join("\n\n");

    const systemPrompt = `You are an elite quantitative football portfolio architect powered by Gemini 4 Hydrogen.
Build the highest-edge, lowest-variance betslip from the verified candidate matches below.

## HARD CONSTRAINTS (non-negotiable)
1. Select between ${minMatches} and ${maxMatches} distinct matches.
2. For each selected match, choose ONE exact market & option from its "Qualifying Markets" whose odds sit strictly in [${minOdds}, ${maxOdds}].
3. Standardize "selectedMarket" cleanly ("1X2", "Double Chance", "O/U 1.5", "O/U 2.5", "O/U 3.5", "BTTS") and "selectedOption" ("Home Win", "Away Win", "Draw", "Home Win or Draw", "Draw or Away Win", "Home Win or Away Win", "Over 1.5", "Over 2.5", "Under 2.5", "Over 3.5", "Under 3.5", "Yes", "No"). Never put an option name into selectedMarket.
4. No team may appear more than once; max 2 legs from the same league; prefer top/reliable leagues and diverse markets where warranted.
5. Cite real quantitative stats (EV edge %, goals/game, H2H, form pts, league hit rates) in reasoning — zero generic filler.

## OUTPUT — strict JSON only
{
  "selections": [
    {
      "matchIndex": 1,
      "match": "Home Team - Away Team",
      "league": "Country - League",
      "selectedMarket": "1X2",
      "selectedOption": "Home Win",
      "odds": 2.10,
      "score": 84,
      "reasoning": {
        "conviction": "HIGH",
        "keyStats": "Sharp 1-2 sentence stat citation backing this pick",
        "risk": "Concise main failure mode (e.g. draw threat or high away scoring)",
        "verdict": "Anchor / Value Play / High Conviction"
      }
    }
  ],
  "diversityNote": "League & market spread summary",
  "summary": "Executive quantitative thesis for this accumulator"
}`;

    const userPrompt = `Candidates (sorted by conviction + model quality, filtered to ${minOdds.toFixed(2)}–${maxOdds.toFixed(2)}):\n\n${matchData}\n\nReturn the optimal ${minMatches}–${maxMatches} leg slip in strict JSON.`;

    let selections: any[] = [];
    let parsedSummary = "";
    let parsedDiversity = "";
    let modelUsed = "deterministic-quant";

    if (apiKey) {
      const aiRes = await callGemini({
        apiKey,
        models: GEMINI_HYDROGEN_MODELS,
        systemPrompt,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        temperature: 0.2,
        maxOutputTokens: 8192,
        thinkingLevel: "MEDIUM",
        responseMimeType: "application/json",
      });

      if (aiRes.ok && aiRes.text) {
        const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.selections) && parsed.selections.length >= minMatches) {
              selections = parsed.selections;
              parsedSummary = String(parsed.summary || "");
              parsedDiversity = String(parsed.diversityNote || "");
              modelUsed = aiRes.modelUsed || "gemini-4-hydrogen";
            }
          } catch (e) {
            console.warn("Failed to parse Gemini 4 Hydrogen recommend JSON:", e);
          }
        }
      } else if (aiRes.errors.length > 0) {
        console.warn("Gemini recommend model attempts:", aiRes.errors);
      }
    }

    if (selections.length < minMatches) {
      const fallbackResult = buildAlgorithmicSlip();
      return NextResponse.json(fallbackResult);
    }

    // ── Post-process & strictly enforce constraints server-side ────────────
    const seenTeams = new Set<string>();
    const leagueCounts = new Map<string, number>();

    const betslipMatches = selections
      .map((sel) => {
        const idx = Math.max(0, Math.min(topMatches.length - 1, (Number(sel.matchIndex) || 1) - 1));
        const row = topMatches[idx] || topMatches[0];
        const norm = normalizeLegMarketOption({
          ...row,
          selectedMarket: sel.selectedMarket,
          selectedOption: sel.selectedOption,
        });
        const odds = resolveSelectionOdds(row, norm.market, norm.option, Number(sel.odds));
        return { sel, row, norm, odds };
      })
      .filter(({ row, odds }) => {
        if (odds < minOdds || odds > maxOdds) return false;
        const parts = String(row.match || "").split(/\s+vs\s+|\s+-\s+/);
        const home = (parts[0] || "").trim().toLowerCase();
        const away = (parts[1] || "").trim().toLowerCase();
        if (!home || !away || seenTeams.has(home) || seenTeams.has(away)) return false;

        const league = String(row.league || "").toLowerCase();
        const lc = leagueCounts.get(league) || 0;
        if (lc >= 2) return false;

        seenTeams.add(home);
        seenTeams.add(away);
        leagueCounts.set(league, lc + 1);
        return true;
      })
      .slice(0, maxMatches)
      .map(({ sel, row, norm, odds }) => ({
        ...row,
        match: row.match || sel.match,
        league: row.league || sel.league || "",
        selectedMarket: norm.market,
        selectedOption: norm.option,
        odds,
        score: Number(sel.score) || null,
        aiReason: String(sel.reasoning?.keyStats || sel.reason || ""),
        aiRisk: String(sel.reasoning?.risk || ""),
        aiVerdict: String(sel.reasoning?.verdict || ""),
        addedAt: new Date().toISOString(),
      }));

    if (betslipMatches.length < minMatches) {
      const fallbackResult = buildAlgorithmicSlip();
      return NextResponse.json(fallbackResult);
    }

    const combinedOdds = Number(
      betslipMatches.reduce((p, m) => p * Number(m.odds || 1), 1).toFixed(2)
    );

    return NextResponse.json({
      matches: betslipMatches,
      summary:
        parsedSummary ||
        `Gemini 4 Hydrogen compiled ${betslipMatches.length} high-conviction legs (${combinedOdds}x combined odds).`,
      diversityNote:
        parsedDiversity ||
        `Distributed across ${leagueCounts.size} leagues with zero team overlap.`,
      combinedOdds,
      count: betslipMatches.length,
      modelUsed,
    });
  } catch (error) {
    console.error("AI Recommend Slip Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
