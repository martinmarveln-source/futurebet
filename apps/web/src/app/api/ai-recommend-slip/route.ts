import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

interface RecommendConfig {
  minMatches: number;
  maxMatches: number;
  minOdds: number;
  maxOdds: number;
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });

    // Fetch today's matches from cache
    const today = new Date().toISOString().split("T")[0];
    const rows = await sql`
      SELECT match_name, home_team, away_team, league, match_date, match_time,
             home_odds, draw_odds, away_odds, o25_odds, u25_odds, btts_yes_odds, btts_no_odds,
             chance, rating, guide, pick, home_pts, away_pts, o25, gg
      FROM matches_cache
      WHERE match_date = ${today}
      ORDER BY chance DESC NULLS LAST
      LIMIT 40
    `.catch(() => [] as any[]);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No matches found for today. Try again later." }, { status: 404 });
    }

    // Filter by odds range
    const eligibleMatches = rows.filter((r: any) => {
      const guide = (r.guide || r.pick || "").toLowerCase();
      let odds = 0;
      if (guide.includes("home")) odds = Number(r.home_odds) || 0;
      else if (guide.includes("away")) odds = Number(r.away_odds) || 0;
      else if (guide.includes("draw")) odds = Number(r.draw_odds) || 0;
      else if (guide.includes("over 2.5") || guide.includes("o2.5")) odds = Number(r.o25_odds) || 0;
      else if (guide.includes("btts") || guide === "gg") odds = Number(r.btts_yes_odds) || 0;
      else odds = Math.max(Number(r.home_odds) || 0, Number(r.draw_odds) || 0, Number(r.away_odds) || 0);
      return odds >= minOdds && odds <= maxOdds;
    });

    if (eligibleMatches.length < minMatches) {
      return NextResponse.json({
        error: `Only ${eligibleMatches.length} matches found within odds range ${minOdds}-${maxOdds}. Try widening the odds range.`,
      }, { status: 422 });
    }

    // Format matches for Gemini
    const matchData = eligibleMatches.map((r: any, i: number) => {
      const guide = (r.guide || r.pick || "—").toUpperCase();
      const homeOdds = Number(r.home_odds) || 0;
      const drawOdds = Number(r.draw_odds) || 0;
      const awayOdds = Number(r.away_odds) || 0;
      const o25Odds = Number(r.o25_odds) || 0;
      const bttsOdds = Number(r.btts_yes_odds) || 0;
      const chance = Number(r.chance) || 0;
      const rating = Number(r.rating) || 0;
      const hPts = Number(r.home_pts) || 0;
      const aPts = Number(r.away_pts) || 0;

      return `Match ${i + 1}: ${r.match_name || `${r.home_team} vs ${r.away_team}`} | ${r.league || ""}
  Pick: ${guide} | Chance: ${chance > 1 ? chance : (chance * 100).toFixed(0)}% | Rating: ${rating > 1 ? rating : (rating * 100).toFixed(0)}%
  Odds → Home: ${homeOdds > 0 ? homeOdds.toFixed(2) : "—"} | Draw: ${drawOdds > 0 ? drawOdds.toFixed(2) : "—"} | Away: ${awayOdds > 0 ? awayOdds.toFixed(2) : "—"} | O2.5: ${o25Odds > 0 ? o25Odds.toFixed(2) : "—"} | BTTS: ${bttsOdds > 0 ? bttsOdds.toFixed(2) : "—"}
  Form Pts → Home: ${hPts} | Away: ${aPts}`;
    }).join("\n\n");

    const systemPrompt = `You are an elite sports betting analyst building an optimized betslip. 
Your task: Select exactly between ${minMatches} and ${maxMatches} matches from the list provided.
Criteria for selection:
- Prioritize matches with the HIGHEST chance % AND rating % combined
- Only pick selections where the odds are between ${minOdds} and ${maxOdds}  
- Favor matches where the pick/guide is strongly supported by both chance AND rating
- Avoid picks where the two teams have very similar form points (suggests too close to call)

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
      const row = eligibleMatches[idx] || eligibleMatches[0];

      // Determine odds based on selected option
      const option = (sel.selectedOption || "").toLowerCase();
      let resolvedOdds = sel.odds;
      if (!resolvedOdds || resolvedOdds < 1.01) {
        if (option.includes("home win") || option === "home") resolvedOdds = Number(row.home_odds);
        else if (option.includes("away win") || option === "away") resolvedOdds = Number(row.away_odds);
        else if (option === "draw") resolvedOdds = Number(row.draw_odds);
        else if (option === "over") resolvedOdds = Number(row.o25_odds);
        else if (option === "yes") resolvedOdds = Number(row.btts_yes_odds);
        else resolvedOdds = Number(row.home_odds) || Number(row.draw_odds) || Number(row.away_odds);
      }

      return {
        match: sel.match || row.match_name,
        league: sel.league || row.league || "",
        selectedMarket: sel.selectedMarket || "1X2",
        selectedOption: sel.selectedOption || "Home Win",
        odds: Number(resolvedOdds) || 2.0,
        chance: Number(row.chance) > 1 ? Number(row.chance) : Number(row.chance) * 100,
        rating: Number(row.rating) > 1 ? Number(row.rating) : Number(row.rating) * 100,
        hPts: Number(row.home_pts) || 0,
        aPts: Number(row.away_pts) || 0,
        aiReason: sel.reason || "",
        homeOdds: Number(row.home_odds) || 0,
        drawOdds: Number(row.draw_odds) || 0,
        awayOdds: Number(row.away_odds) || 0,
        o25Odds: Number(row.o25_odds) || 0,
        bttsYesOdds: Number(row.btts_yes_odds) || 0,
        guide: row.guide || row.pick || "",
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
