import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { GET as getMatches } from "../matches/route";

interface RecommendConfig {
  minMatches: number;
  maxMatches: number;
  minOdds: number;
  maxOdds: number;
  targetDate?: string;
}

/* ------------------------------------------------------------------ */
/*  Resolve the market odds from a match row for the system pick       */
/* ------------------------------------------------------------------ */
function oddsForGuide(r: any): number {
  const guide = (r.guide || r.pick || "").toLowerCase().replace(/[^a-z0-9.]/g, "");
  if (guide.includes("homewin") || guide === "home" || guide === "1")
    return Number(r.homeOdds) || 0;
  if (guide === "draw" || guide === "x")
    return Number(r.drawOdds) || 0;
  if (guide.includes("awaywin") || guide === "away" || guide === "2")
    return Number(r.awayOdds) || 0;
  if (guide.includes("ov25") || guide.includes("over25") || guide === "o25")
    return Number(r.o25Odds) || 0;
  if (guide.includes("ov15") || guide.includes("over15") || guide === "o15")
    return Number(r.o15Odds) || 0;
  if (guide.includes("ov35") || guide.includes("over35") || guide === "o35")
    return Number(r.o35Odds) || 0;
  if (guide.includes("ov45") || guide.includes("over45") || guide === "o45")
    return Number(r.o45Odds) || 0;
  if (guide.includes("btts") || guide === "gg")
    return Number(r.bttsYesOdds) || 0;
  if (guide.includes("dc1x") || guide === "1x")
    return Number(r.dc1X) || 0;
  if (guide.includes("dcx2") || guide === "x2")
    return Number(r.dcX2) || 0;
  if (guide.includes("dc12") || guide === "12")
    return Number(r.dc12) || 0;
  // fallback: pick highest available odds
  return Math.max(
    Number(r.homeOdds) || 0,
    Number(r.drawOdds) || 0,
    Number(r.awayOdds) || 0
  );
}

/* ------------------------------------------------------------------ */
/*  Resolve selected-option odds from AI output                        */
/* ------------------------------------------------------------------ */
function resolveSelectionOdds(row: any, option: string, aiOdds: number): number {
  const o = option.toLowerCase();
  let odds = 0;
  if (o.includes("home win") || o === "home")       odds = Number(row.homeOdds);
  else if (o.includes("away win") || o === "away")  odds = Number(row.awayOdds);
  else if (o === "draw")                             odds = Number(row.drawOdds);
  else if (o === "over" || o === "over 2.5")         odds = Number(row.o25Odds);
  else if (o === "over 1.5")                         odds = Number(row.o15Odds);
  else if (o === "over 3.5")                         odds = Number(row.o35Odds);
  else if (o === "over 4.5")                         odds = Number(row.o45Odds);
  else if (o === "yes" || o === "btts yes")          odds = Number(row.bttsYesOdds);
  else if (o === "no" || o === "btts no")            odds = Number(row.bttsNoOdds);
  else if (o === "home or draw")                     odds = Number(row.dc1X);
  else if (o === "home or away")                     odds = Number(row.dc12);
  else if (o === "draw or away")                     odds = Number(row.dcX2);
  const resolved = odds > 1.01 ? odds : (aiOdds > 1.01 ? aiOdds : 0);
  return Number(resolved) || 2.0;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [userRecord] = await sql`SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
    const role = userRecord?.user_role || "free";
    const allowed = ["admin", "vip", "pro"];
    if (!allowed.includes(role))
      return NextResponse.json({ error: "VIP or Pro access required" }, { status: 403 });

    const body = (await req.json()) as RecommendConfig;
    const minMatches = Math.max(1, Math.min(15, Number(body.minMatches) || 3));
    const maxMatches = Math.max(minMatches, Math.min(15, Number(body.maxMatches) || 5));
    const minOdds = Math.max(1.01, Number(body.minOdds) || 1.5);
    const maxOdds = Math.max(minOdds, Number(body.maxOdds) || 4.0);
    const targetDate = body.targetDate || "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });

    // ── Fetch today's matches ──────────────────────────────────────────────
    const mockReq = new Request(req.url.replace("/ai-recommend-slip", "/matches"));
    const matchesRes = await getMatches(mockReq);
    if (!matchesRes.ok)
      return NextResponse.json({ error: "Failed to fetch matches for analysis." }, { status: 502 });

    const payload = await matchesRes.json();
    const rows: any[] = payload.matches || [];
    if (!rows.length)
      return NextResponse.json({ error: "No matches found for today. Try again later." }, { status: 404 });

    // ── Date + odds pre-filter (using precise market resolution) ──────────
    const eligibleMatches = rows.filter((r) => {
      if (targetDate && r.date !== targetDate) return false;
      const odds = oddsForGuide(r);
      return odds >= minOdds && odds <= maxOdds;
    });

    if (eligibleMatches.length < minMatches) {
      return NextResponse.json(
        { error: `Only ${eligibleMatches.length} matches found within odds range ${minOdds}–${maxOdds}. Try widening the range.` },
        { status: 422 }
      );
    }

    // ── Sort by conviction + chance + rating; take top 40 for AI ─────────
    eligibleMatches.sort((a, b) => {
      const convScore = (r: any) =>
        r.intelligence?.convictionTier === "HIGH" ? 3 :
        r.intelligence?.convictionTier === "MEDIUM" ? 2 : 1;
      const diff = convScore(b) - convScore(a);
      if (diff !== 0) return diff;
      return (Number(b.chance) + Number(b.rating)) - (Number(a.chance) + Number(a.rating));
    });
    const topMatches = eligibleMatches.slice(0, 40);

    // ── League/team historical stats ──────────────────────────────────────
    const teamStatsMap = new Map<string, any>();
    try {
      const stats = await sql`SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL`;
      for (const row of stats) {
        if (!row.team || !row.market_stats) continue;
        let ms = row.market_stats;
        if (typeof ms === "string") { try { ms = JSON.parse(ms); } catch { ms = {}; } }
        teamStatsMap.set(row.team.trim().toLowerCase(), ms);
      }
    } catch (e) {
      console.warn("Could not fetch team stats:", e);
    }

    // ── Build rich per-match context block ────────────────────────────────
    const fmtOdds = (v: any) => { const n = Number(v); return n > 1.01 ? n.toFixed(2) : "—"; };
    const fmtPct  = (v: any) => {
      if (!v && v !== 0) return "—";
      const n = Number(String(v).replace("%", ""));
      return isNaN(n) ? "—" : Math.round(n) + "%";
    };
    const fmtStat = (v: any) => v ? (String(v).includes("%") ? v : v + "%") : "—";
    const fmt     = (v: any, d = 1) => { const n = Number(v); return isFinite(n) ? n.toFixed(d) : "—"; };

    const matchData = topMatches.map((r, i) => {
      const parts = (r.match || "").split(/\s+vs\s+|\s+-\s+/);
      const homeTeam = (parts[0] || "").trim();
      const awayTeam = (parts[1] || "").trim();
      const hs = teamStatsMap.get(homeTeam.toLowerCase()) || {};
      const as_ = teamStatsMap.get(awayTeam.toLowerCase()) || {};

      const guide       = (r.guide || r.pick || "—").toUpperCase();
      const chance      = Number(r.chance) || 0;
      const rating      = Number(r.rating) || 0;
      const convTier    = r.intelligence?.convictionTier || "—";
      const valueEdge   = r.intelligence?.valueEdge || r.valueEdge || "—";
      const alignScore  = r.intelligence?.alignmentScore ?? r.alignmentScore ?? "—";
      const hPts        = Number(r.hPts) || 0;
      const aPts        = Number(r.aPts) || 0;
      const ptsDelta    = Math.abs(hPts - aPts);

      return `Match ${i + 1}: ${r.match || "Unknown"} [${r.league || ""}]
  System Pick: ${guide} | Chance: ${chance > 1 ? chance : (chance * 100).toFixed(0)}% | Rating: ${rating > 1 ? rating : (rating * 100).toFixed(0)}%
  Conviction: ${convTier} | ValueEdge: ${valueEdge} | Alignment: ${alignScore}
  Win Probabilities → Home: ${fmtPct(r.homeWin)} | Draw: ${fmtPct(r.draw)} | Away: ${fmtPct(r.awayWin)}
  Form → Home: ${r.hForm || "—"} (${hPts}pts) | Away: ${r.aForm || "—"} (${aPts}pts) | Δ=${ptsDelta}pts
  Goals Avg → Home: scores ${fmt(r.hgs)}/g, concedes ${fmt(r.hgc)}/g | Away: scores ${fmt(r.ags)}/g, concedes ${fmt(r.agc)}/g
  BTTS Rate → Home: ${fmtPct(r.hBtts)} | Away: ${fmtPct(r.aBtts)}
  Over Rates → O1.5: ${fmtPct(r.ov15)} | O2.5: ${fmtPct(r.ov25)} | O3.5: ${fmtPct(r.ov35)} | O4.5: ${fmtPct(r.ov45)}
  H2H (last ${r.H2H_GP || "?"}g) → Home W:${r.H2H_H || 0} D:${r.H2H_D || 0} Away:${r.H2H_A || 0} | O2.5: ${fmtPct(r.H2H_OV)} | BTTS: ${fmtPct(r.H2H_GG)}
  Predicted Score: ${r.likelyCS || "—"} (${fmtPct(r.scorelineCSPercent)} confidence)
  Odds → Home:${fmtOdds(r.homeOdds)} Draw:${fmtOdds(r.drawOdds)} Away:${fmtOdds(r.awayOdds)} O1.5:${fmtOdds(r.o15Odds)} O2.5:${fmtOdds(r.o25Odds)} O3.5:${fmtOdds(r.o35Odds)} O4.5:${fmtOdds(r.o45Odds)} BTTS:${fmtOdds(r.bttsYesOdds)} DC1X:${fmtOdds(r.dc1X)} DC12:${fmtOdds(r.dc12)} DCX2:${fmtOdds(r.dcX2)}
  League Hit Rates → Home: [Win:${fmtStat(hs.W_ALL || hs.W_HOME)} O2.5:${fmtStat(hs.O25_ALL || hs.O25_HOME)} BTTS:${fmtStat(hs.BTTS_ALL || hs.BTTS_HOME)}] | Away: [Win:${fmtStat(as_.W_ALL || as_.W_AWAY)} O2.5:${fmtStat(as_.O25_ALL || as_.O25_AWAY)} BTTS:${fmtStat(as_.BTTS_ALL || as_.BTTS_AWAY)}]`;
    }).join("\n\n");

    // ── System prompt ─────────────────────────────────────────────────────
    const systemPrompt = `You are an elite sports betting analyst. Your job is to build the highest-confidence betslip from the candidate matches below.

## HARD CONSTRAINTS (non-negotiable)
1. Select between ${minMatches} and ${maxMatches} matches — no more, no fewer (unless fewer than ${minMatches} genuinely meet the quality bar; then return what you can and explain in the summary).
2. Every selected odds value MUST be between ${minOdds} and ${maxOdds}. Never pick outside this range.
3. Each team may appear in AT MOST ONE leg. No team can feature twice across the slip.
4. No more than 2 legs from the same league.
5. Never combine "Home Win" and "BTTS Yes" for the same match — if one team wins convincingly, BTTS often fails.

## SCORING RUBRIC — score each candidate out of 100 before choosing
| Criterion | Points |
|-----------|--------|
| Conviction tier HIGH | +30 | MEDIUM | +15 | LOW | 0 |
| Chance ≥ 80% | +20 | 70–79% | +12 | 60–69% | +5 | below 60% | 0 |
| Rating ≥ 70% | +15 | 60–69% | +8 | below 60% | 0 |
| H2H supports selection (≥ 60% hit rate for the chosen market) | +15 |
| Form gap (Δpts ≥ 3, clear edge) | +10 | Δpts ≤ 1 (coin flip) | −10 |
| League hit rate for chosen market ≥ 70% | +10 |
| ValueEdge HIGH | +10 | MEDIUM | +5 | LOW | 0 |

Pick the highest-scoring matches that also satisfy the hard constraints above.

## MARKET SELECTION RULES
- If selecting the system Pick, Chance must be ≥ 65% AND Rating ≥ 55%.
- If selecting an ALTERNATIVE market (Over 2.5, BTTS, Double Chance, Over 1.5):
  - For Over 2.5: ov25 ≥ 60%, combined avg goals ≥ 2.3, H2H O2.5 ≥ 55%
  - For BTTS Yes: hBtts ≥ 55% AND aBtts ≥ 55%, H2H GG ≥ 55%
  - For Over 1.5: ov15 ≥ 70%
  - For Double Chance: combined probability (from win probs) ≥ 65%
- If NO market for a match meets these thresholds, skip the match entirely.

## DIVERSITY
- Prefer matches from different leagues and countries.
- Avoid clustering picks on the same day if targetDate is not set.

## OUTPUT FORMAT — strict JSON only, no markdown, no extra text
{
  "selections": [
    {
      "matchIndex": 1,
      "match": "Home Team vs Away Team",
      "league": "League Name",
      "selectedMarket": "1X2",
      "selectedOption": "Home Win",
      "odds": 2.10,
      "score": 78,
      "reasoning": {
        "conviction": "HIGH",
        "keyStats": "Cite 2–3 actual numbers that support the pick",
        "risk": "One genuine risk or 'None identified'",
        "verdict": "Recommend | Borderline | Skip"
      }
    }
  ],
  "diversityNote": "Brief note on league/country spread",
  "summary": "1–2 sentence overall slip assessment with combined odds estimate"
}

Valid selectedMarket values: "1X2", "Over 2.5", "Over 1.5", "Over 3.5", "Over 4.5", "BTTS", "Double Chance"
Valid selectedOption values: "Home Win", "Away Win", "Draw", "Over 2.5", "Over 1.5", "Over 3.5", "Over 4.5", "Yes", "No", "Home or Draw", "Home or Away", "Draw or Away"`;

    const userPrompt = `Candidate matches (pre-filtered to odds ${minOdds}–${maxOdds}, sorted by conviction + quality):\n\n${matchData}\n\nBuild the best ${minMatches}–${maxMatches} leg betslip. Apply the scoring rubric to every match, then return only the top selections in the JSON format specified.`;

    // ── Call Gemini ───────────────────────────────────────────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.15, maxOutputTokens: 2500 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ error: "AI service failed." }, { status: 502 });
    }

    const aiData = await response.json();
    const rawText: string = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // ── Parse JSON from response ──────────────────────────────────────────
    let parsed: any;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse Gemini JSON:", rawText);
      return NextResponse.json({ error: "AI returned invalid format. Try again." }, { status: 502 });
    }

    const selections: any[] = parsed.selections || [];

    // ── Post-process: enforce hard constraints server-side ────────────────
    const seenTeams = new Set<string>();
    const leagueCounts = new Map<string, number>();

    const betslipMatches = selections
      .filter((sel) => {
        // Guard: odds range
        const idx = (sel.matchIndex || 1) - 1;
        const row = topMatches[idx] || topMatches[0];
        const odds = resolveSelectionOdds(row, sel.selectedOption || "", sel.odds);
        if (odds < minOdds || odds > maxOdds) return false;

        // Guard: team deduplication
        const parts = (sel.match || "").split(/\s+vs\s+|\s+-\s+/);
        const home = (parts[0] || "").trim().toLowerCase();
        const away = (parts[1] || "").trim().toLowerCase();
        if (seenTeams.has(home) || seenTeams.has(away)) return false;
        seenTeams.add(home);
        seenTeams.add(away);

        // Guard: max 2 per league
        const league = (sel.league || "").toLowerCase();
        const lc = leagueCounts.get(league) || 0;
        if (lc >= 2) return false;
        leagueCounts.set(league, lc + 1);

        return true;
      })
      .slice(0, maxMatches)
      .map((sel) => {
        const idx = (sel.matchIndex || 1) - 1;
        const row = topMatches[idx] || topMatches[0];
        const odds = resolveSelectionOdds(row, sel.selectedOption || "", sel.odds);
        return {
          ...row,
          match: sel.match || row.match,
          league: sel.league || row.league || "",
          selectedMarket: sel.selectedMarket || "1X2",
          selectedOption: sel.selectedOption || "Home Win",
          odds,
          score: sel.score || null,
          aiReason: sel.reasoning?.keyStats || sel.reason || "",
          aiRisk: sel.reasoning?.risk || "",
          aiVerdict: sel.reasoning?.verdict || "",
          addedAt: new Date().toISOString(),
        };
      });

    return NextResponse.json({
      matches: betslipMatches,
      summary: parsed.summary || "",
      diversityNote: parsed.diversityNote || "",
      count: betslipMatches.length,
    });
  } catch (error) {
    console.error("AI Recommend Slip Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
