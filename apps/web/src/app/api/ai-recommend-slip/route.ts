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
    const minMatches = Math.max(1, Math.min(15, Number(body.minMatches) || 3));
    const maxMatches = Math.max(minMatches, Math.min(15, Number(body.maxMatches) || 5));
    const minOdds = Math.max(1.01, Number(body.minOdds) || 1.5);
    const maxOdds = Math.max(minOdds, Number(body.maxOdds) || 4.0);
    const targetDate = body.targetDate || "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });

    // Fetch today's matches using the standard matches endpoint logic
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

    // Filter by date and odds range
    const eligibleMatches = rows.filter((r: any) => {
      if (targetDate && r.date !== targetDate) return false;
      const guide = (r.guide || r.pick || "").toLowerCase();
      let odds = 0;
      if (guide.includes("home")) odds = Number(r.homeOdds) || 0;
      else if (guide.includes("away")) odds = Number(r.awayOdds) || 0;
      else if (guide.includes("draw")) odds = Number(r.drawOdds) || 0;
      else if (guide.includes("over 2.5") || guide.includes("o2.5")) odds = Number(r.o25Odds) || 0;
      else if (guide.includes("btts") || guide === "gg") odds = Number(r.bttsYesOdds) || 0;
      else odds = Math.max(Number(r.homeOdds) || 0, Number(r.drawOdds) || 0, Number(r.awayOdds) || 0);
      return odds >= minOdds && odds <= maxOdds;
    });

    if (eligibleMatches.length < minMatches) {
      return NextResponse.json({
        error: `Only ${eligibleMatches.length} matches found within odds range ${minOdds}-${maxOdds}. Try widening the odds range.`,
      }, { status: 422 });
    }

    // Sort by rating+chance descending, take top 40 for AI
    eligibleMatches.sort((a: any, b: any) => (Number(b.chance) + Number(b.rating)) - (Number(a.chance) + Number(a.rating)));
    const topMatches = eligibleMatches.slice(0, 40);

    // Fetch league stats for all teams to give AI more insight
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


    // Format matches for Gemini
    const matchData = topMatches.map((r: any, i: number) => {
      // Parse out home/away teams to look up stats
      let homeTeam = "Unknown", awayTeam = "Unknown";
      if (r.match) {
        const parts = r.match.split(/\s+vs\s+|\s+-\s+/);
        homeTeam = (parts[0] || "").trim();
        awayTeam = (parts[1] || "").trim();
      }
      
      const homeStats = teamStatsMap.get(homeTeam.toLowerCase()) || {};
      const awayStats = teamStatsMap.get(awayTeam.toLowerCase()) || {};
      
      const formatStat = (val: any) => val ? (String(val).includes('%') ? val : val + '%') : '—';
      
      const homeWinPct = formatStat(homeStats.W_ALL || homeStats.W_HOME);
      const awayWinPct = formatStat(awayStats.W_ALL || awayStats.W_AWAY);
      const homeO25 = formatStat(homeStats.O25_ALL || homeStats.O25_HOME);
      const awayO25 = formatStat(awayStats.O25_ALL || awayStats.O25_AWAY);
      const homeBtts = formatStat(homeStats.BTTS_ALL || homeStats.BTTS_HOME);
      const awayBtts = formatStat(awayStats.BTTS_ALL || awayStats.BTTS_AWAY);

      const guide = (r.guide || r.pick || "—").toUpperCase();
      const homeOdds = Number(r.homeOdds) || 0;
      const drawOdds = Number(r.drawOdds) || 0;
      const awayOdds = Number(r.awayOdds) || 0;
      const o25Odds = Number(r.o25Odds) || 0;
      const bttsOdds = Number(r.bttsYesOdds) || 0;
      const chance = Number(r.chance) || 0;
      const rating = Number(r.rating) || 0;
      const hPts = Number(r.hPts) || 0;
      const aPts = Number(r.aPts) || 0;

      return `Match ${i + 1}: ${r.match || "Unknown"} | ${r.league || ""}
  Pick: ${guide} | Chance: ${chance > 1 ? chance : (chance * 100).toFixed(0)}% | Rating: ${rating > 1 ? rating : (rating * 100).toFixed(0)}%
  Odds → Home: ${homeOdds > 0 ? homeOdds.toFixed(2) : "—"} | Draw: ${drawOdds > 0 ? drawOdds.toFixed(2) : "—"} | Away: ${awayOdds > 0 ? awayOdds.toFixed(2) : "—"} | O2.5: ${o25Odds > 0 ? o25Odds.toFixed(2) : "—"} | BTTS: ${bttsOdds > 0 ? bttsOdds.toFixed(2) : "—"}
  Form Pts → Home: ${hPts} | Away: ${aPts}
  Historical Hit Rates → Home: [Win: ${homeWinPct}, O2.5: ${homeO25}, BTTS: ${homeBtts}] | Away: [Win: ${awayWinPct}, O2.5: ${awayO25}, BTTS: ${awayBtts}]`;
    }).join("\n\n");

    const systemPrompt = `You are an elite sports betting analyst building an optimized betslip. 
Your task: Select exactly between ${minMatches} and ${maxMatches} matches from the list provided.
Criteria for selection:
- STRICT RULE for Primary Pick: If you select the primary "Pick" shown, ensure Chance is >= 70% and Rating is >= 60%.
  - STRICT RULE for Alternative Markets: You are HIGHLY ENCOURAGED to explore other markets (Over 2.5, BTTS, Double Chance) instead of just the primary Pick! However, if you choose an alternative market, the Historical Hit Rates for that market must support it strongly (e.g. >= 70%).
- Only pick selections where the odds are between ${minOdds} and ${maxOdds}.
- Avoid picks where the two teams have very similar form points (suggests a tight match).
- If there are not enough high-quality matches meeting these strict criteria, you may return FEWER than ${minMatches} matches. Never recommend a bad bet just to fill the quota.

Return your response in this EXACT JSON format (no markdown, no explanation outside JSON):
{
  "selections": [
    {
      "matchIndex": 1,
      "match": "Home Team vs Away Team",
      "league": "League Name",
      "selectedMarket": "1X2",
      "selectedOption": "Home Win",
      "odds": 2.10,
      "reason": "One sentence max explaining the pick"
    }
  ],
  "summary": "Brief 1-2 sentence overall slip assessment"
}

Market values for selectedMarket: "1X2", "Over 2.5", "BTTS", "Double Chance"
Option values for selectedOption: "Home Win", "Away Win", "Draw", "Over", "Under", "Yes", "No", "Home or Draw", "Home or Away", "Draw or Away"`;

    const userPrompt = `Here are today's matches:\n\n${matchData}\n\nSelect the best ${minMatches}-${maxMatches} matches for the betslip. Odds must be between ${minOdds} and ${maxOdds}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
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

    // Parse JSON from response
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

    // Map AI selections to betslip match objects
    const betslipMatches = selections.map((sel: any) => {
      const idx = (sel.matchIndex || 1) - 1;
      const row = topMatches[idx] || topMatches[0];

      // Determine odds based on selected option
      const option = (sel.selectedOption || "").toLowerCase();
      let resolvedOdds = sel.odds;
      if (!resolvedOdds || resolvedOdds < 1.01) {
        if (option.includes("home win") || option === "home") resolvedOdds = Number(row.homeOdds);
        else if (option.includes("away win") || option === "away") resolvedOdds = Number(row.awayOdds);
        else if (option === "draw") resolvedOdds = Number(row.drawOdds);
        else if (option === "over") resolvedOdds = Number(row.o25Odds);
        else if (option === "yes") resolvedOdds = Number(row.bttsYesOdds);
        else resolvedOdds = Number(row.homeOdds) || Number(row.drawOdds) || Number(row.awayOdds);
      }

      return {
        ...row, // Copy all existing fields from the original match object
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
