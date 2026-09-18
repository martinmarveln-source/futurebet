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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [userRecord] = await sql`SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
    const role = userRecord?.user_role || "free";
    if (role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json() as RecommendConfig;
    const minMatches = Math.max(1, Math.min(40, Number(body.minMatches) || 3));
    const maxMatches = Math.max(minMatches, Math.min(40, Number(body.maxMatches) || 5));
    const minOdds = Math.max(1.01, Number(body.minOdds) || 1.5);
    const maxOdds = Math.max(minOdds, Number(body.maxOdds) || 4.0);
    const targetDate = body.targetDate || "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });

    // Fetch today's matches using the standard matches endpoint
    const mockReq = new Request(req.url.replace('/ai-recommend-slip', '/matches'));
    const matchesRes = await getMatches(mockReq);
    if (!matchesRes.ok) {
      return NextResponse.json({ error: "Failed to fetch matches for analysis." }, { status: 502 });
    }
    const payload = await matchesRes.json();
    const rows = payload.matches || [];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No matches found for today. Try again later." }, { status: 404 });
    }

    // Filter by date - accept any match if odds in ANY market are in range
    const eligibleMatches = rows.filter((r: any) => {
      if (targetDate && r.date !== targetDate) return false;
      const allOdds = [
        Number(r.homeOdds) || 0,
        Number(r.drawOdds) || 0,
        Number(r.awayOdds) || 0,
        Number(r.o25Odds) || 0,
        Number(r.bttsYesOdds) || 0,
        Number(r.dc1X) || 0,
        Number(r.dc12) || 0,
        Number(r.dcX2) || 0,
        Number(r.o15Odds) || 0,
        Number(r.o35Odds) || 0,
      ].filter(o => o > 1.01);
      // Accept if at least one market has odds in range
      return allOdds.some(o => o >= minOdds && o <= maxOdds);
    });

    if (eligibleMatches.length < minMatches) {
      return NextResponse.json({
        error: `Only ${eligibleMatches.length} matches found within odds range ${minOdds}-${maxOdds}. Try widening the odds range.`,
      }, { status: 422 });
    }

    // Sort by rating+chance descending, take top 60 for AI to choose from
    eligibleMatches.sort((a: any, b: any) => (Number(b.chance) + Number(b.rating)) - (Number(a.chance) + Number(a.rating)));
    const topMatches = eligibleMatches.slice(0, 60);

    // Fetch league stats for all teams
    let teamStatsMap = new Map();
    try {
      const stats = await sql`SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL`;
      for (const row of stats) {
        if (!row.team || !row.market_stats) continue;
        let ms = row.market_stats;
        if (typeof ms === "string") {
          try { ms = JSON.parse(ms); } catch(e) { ms = {}; }
        }
        teamStatsMap.set(row.team.trim().toLowerCase(), ms);
      }
    } catch(e) {
      console.warn("Could not fetch team stats:", e);
    }

    const fmt = (val: any, decimals = 0) => {
      if (val === null || val === undefined || val === "" || val === "0" || val === 0) return "—";
      const n = Number(val);
      if (isNaN(n)) return String(val);
      return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
    };
    const fmtPct = (val: any) => {
      if (!val || val === "0") return "—";
      const n = Number(String(val).replace('%',''));
      return isNaN(n) ? "—" : Math.round(n) + "%";
    };
    const fmtOdds = (val: any) => {
      const n = Number(val);
      return (n > 1.01) ? n.toFixed(2) : "—";
    };
    const fmtStat = (val: any) => val ? (String(val).includes('%') ? val : val + '%') : '—';

    // Format matches for AI — rich 18-field block
    const matchData = topMatches.map((r: any, i: number) => {
      let homeTeam = "Unknown", awayTeam = "Unknown";
      if (r.match) {
        const parts = r.match.split(/\s+vs\s+|\s+-\s+/);
        homeTeam = (parts[0] || "").trim();
        awayTeam = (parts[1] || "").trim();
      }

      const homeStats = teamStatsMap.get(homeTeam.toLowerCase()) || {};
      const awayStats = teamStatsMap.get(awayTeam.toLowerCase()) || {};

      const homeWinPct = fmtStat(homeStats.W_ALL || homeStats.W_HOME);
      const awayWinPct = fmtStat(awayStats.W_ALL || awayStats.W_AWAY);
      const homeO25 = fmtStat(homeStats.O25_ALL || homeStats.O25_HOME);
      const awayO25 = fmtStat(awayStats.O25_ALL || awayStats.O25_AWAY);
      const homeBtts = fmtStat(homeStats.BTTS_ALL || homeStats.BTTS_HOME);
      const awayBtts = fmtStat(awayStats.BTTS_ALL || awayStats.BTTS_AWAY);

      const guide = (r.guide || r.pick || "—").toUpperCase();
      const chance = Number(r.chance) || 0;
      const rating = Number(r.rating) || 0;

      // Rich data from raw_data (already merged into match object by matches route)
      const raw = r; // matches route spreads raw_data into the match object

      return `Match ${i + 1}: ${r.match || "Unknown"} | ${r.league || ""} | ${r.country || ""}
  Model Tip: ${guide} | Chance: ${chance > 1 ? chance : (chance * 100).toFixed(0)}% | Rating: ${rating > 1 ? rating : (rating * 100).toFixed(0)}%
  Win Probabilities → Home: ${fmtPct(raw.homeWin)} | Draw: ${fmtPct(raw.draw)} | Away: ${fmtPct(raw.awayWin)}
  Goals Avg → Home: scores ${fmt(raw.hgs,1)}/g, concedes ${fmt(raw.hgc,1)}/g | Away: scores ${fmt(raw.ags,1)}/g, concedes ${fmt(raw.agc,1)}/g
  Season Record → Home: W${fmt(raw.hWin)} D${fmt(raw.hDraw)} L${fmt(raw.hLost)} | Away: W${fmt(raw.aWin)} D${fmt(raw.aDraw)} L${fmt(raw.aLost)}
  Form (last 5) → Home: ${raw.hForm || "—"} (${fmt(raw.hPts)}pts) | Away: ${raw.aForm || "—"} (${fmt(raw.aPts)}pts)
  BTTS Rate → Home: ${fmtPct(raw.hBtts)} | Away: ${fmtPct(raw.aBtts)}
  Over 2.5 Rate → Home: ${fmtPct(raw.hOv2)} | Away: ${fmtPct(raw.aOv2)}
  H2H (last ${fmt(raw.H2H_GP) || "?"} games) → Home W:${fmt(raw.H2H_H)} D:${fmt(raw.H2H_D)} Away:${fmt(raw.H2H_A)} | Over2.5:${fmtPct(raw.H2H_OV)} | BTTS:${fmtPct(raw.H2H_GG)}
  Predicted Score: ${raw.likelyCS || "—"} (${fmtPct(raw.scorelineCSPercent)} confidence) | Tips: ${raw.tips || "—"}
  Odds 1X2 → Home:${fmtOdds(raw.homeOdds)} | Draw:${fmtOdds(raw.drawOdds)} | Away:${fmtOdds(raw.awayOdds)}
  Odds DC → 1X:${fmtOdds(raw.dc1X)} | 12:${fmtOdds(raw.dc12)} | X2:${fmtOdds(raw.dcX2)}
  Odds Goals → O1.5:${fmtOdds(raw.o15Odds)} | O2.5:${fmtOdds(raw.o25Odds)} | O3.5:${fmtOdds(raw.o35Odds)} | BTTS-Y:${fmtOdds(raw.bttsYesOdds)} | BTTS-N:${fmtOdds(raw.bttsNoOdds)}
  League Hit Rates → Home team: [Win:${homeWinPct} O2.5:${homeO25} BTTS:${homeBtts}] | Away team: [Win:${awayWinPct} O2.5:${awayO25} BTTS:${awayBtts}]`;
    }).join("\n\n");

    const systemPrompt = `You are an elite sports betting analyst. Your job is to build an optimised betslip by making COMPLETELY INDEPENDENT market decisions based on ALL the data provided below. Do NOT blindly follow the "Model Tip" — that is just a starting point. Evaluate every market on its own merits.

MARKET SELECTION DECISION TREE (evaluate each market in this order for every match):

1. BTTS YES: Consider if hBtts >= 60% AND aBtts >= 60% AND H2H BTTS rate supports it. Both teams must be known scorers.
2. BTTS NO: Consider if hBtts <= 35% AND aBtts <= 35% AND combined goals avg per game <= 2.0. At least one side must be very defensively solid.
3. OVER 2.5: Consider if (hgs + ags + home conceded + away conceded) / 2 > 2.7 per game AND hOv2 + aOv2 average >= 60% AND H2H_OV >= 55%.
4. UNDER 2.5: Consider if combined goals avg <= 2.0 AND both Over-2.5 team rates are <= 40%. 
5. HOME WIN: Consider if homeWin probability >= 65% AND H2H home wins > H2H away wins AND home form shows 3+ wins in last 5.
6. AWAY WIN: Consider if awayWin probability >= 60% AND H2H away wins or draws are strong AND away form shows strength.
7. DOUBLE CHANCE (1X / X2): Use as fallback for tight matches where no single market strongly dominates but the risk is too high to pick 1X2 outright.
8. DRAW: Only pick if Draw probability >= 40% AND H2H draws are frequent AND both teams have similarly poor form.

RULES:
- Selected odds MUST be between ${minOdds} and ${maxOdds}. ONLY select a market if its odds are in this range.
- Avoid both teams where form points are almost equal (within 2 pts of each other) for 1X2 picks — it signals a tight match.
- Never pick the same market for a match if the data clearly contradicts it (e.g. do NOT pick Over 2.5 if both teams average < 1.5 goals per game).
- Always cite the key data numbers in your "reason" field (e.g. "hBtts 72%, aBtts 68%, H2H BTTS 6/8 — both teams are prolific scorers").
- If there are not enough qualifying matches, return FEWER than ${minMatches} picks. Never pad the slip with a bad bet.

Return ONLY this exact JSON (no markdown, no extra text):
{
  "selections": [
    {
      "matchIndex": 1,
      "match": "Home Team vs Away Team",
      "league": "League Name",
      "selectedMarket": "BTTS",
      "selectedOption": "Yes",
      "odds": 1.85,
      "reason": "hBtts 72%, aBtts 68%, H2H BTTS 6/8 — both sides prolific scorers in consistent scoring run."
    }
  ],
  "summary": "Brief 2-sentence overall slip assessment with key stat highlights."
}

Valid selectedMarket values: "1X2", "Over 2.5", "Under 2.5", "BTTS", "Double Chance", "Over 1.5", "Over 3.5"
Valid selectedOption values: "Home Win", "Away Win", "Draw", "Over", "Under", "Yes", "No", "Home or Draw", "Home or Away", "Draw or Away"`;

    const userPrompt = `Here are today's top ${topMatches.length} matches with full stats:\n\n${matchData}\n\nBuild the best ${minMatches}–${maxMatches} pick betslip. Each pick's odds must be between ${minOdds} and ${maxOdds}. Use the decision tree and data — not just the Model Tip.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 3000 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ error: "AI service failed." }, { status: 502 });
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed: any;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse Gemini JSON:", rawText);
      return NextResponse.json({ error: "AI returned invalid format. Try again." }, { status: 502 });
    }

    const selections = parsed.selections || [];

    const betslipMatches = selections.map((sel: any) => {
      const idx = (sel.matchIndex || 1) - 1;
      const row = topMatches[idx] || topMatches[0];

      const option = (sel.selectedOption || "").toLowerCase();
      let resolvedOdds = sel.odds;
      if (!resolvedOdds || resolvedOdds < 1.01) {
        if (option.includes("home win") || option === "home") resolvedOdds = Number(row.homeOdds);
        else if (option.includes("away win") || option === "away") resolvedOdds = Number(row.awayOdds);
        else if (option === "draw") resolvedOdds = Number(row.drawOdds);
        else if (option === "over") resolvedOdds = Number(row.o25Odds);
        else if (option === "yes") resolvedOdds = Number(row.bttsYesOdds);
        else if (option === "no") resolvedOdds = Number(row.bttsNoOdds);
        else if (option === "home or draw") resolvedOdds = Number(row.dc1X);
        else if (option === "home or away") resolvedOdds = Number(row.dc12);
        else if (option === "draw or away") resolvedOdds = Number(row.dcX2);
        else resolvedOdds = Number(row.homeOdds) || Number(row.drawOdds) || Number(row.awayOdds);
      }

      return {
        ...row,
        match: sel.match || row.match,
        league: sel.league || row.league || "",
        selectedMarket: sel.selectedMarket || "1X2",
        selectedOption: sel.selectedOption || "Home Win",
        odds: Number(resolvedOdds) || 2.0,
        aiReason: sel.reason || "",
        addedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      matches: betslipMatches,
      summary: parsed.summary || "",
      count: betslipMatches.length,
    });
  } catch (error) {
    console.error("AI Recommend Slip Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
