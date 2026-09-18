import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const [userRecord] = await sql`SELECT user_role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
    const role = userRecord?.user_role || "free";
    if (role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    
    const { matches } = await req.json();
    if (!matches || !Array.isArray(matches) || matches.length === 0) return NextResponse.json({ error: "No matches provided" }, { status: 400 });
    
    
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

    const slipData = matches.map((m: any, i: number) => {
      let homeTeam = "Unknown", awayTeam = "Unknown";
      if (m.match) {
        const parts = m.match.split(/\s+vs\s+|\s+-\s+/);
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

      return `Leg ${i + 1}: ${m.match}\n- Market: ${m.selectedMarket} -> ${m.selectedOption}\n- AI Chance: ${m.chance}% | Rating: ${m.rating}%\n- Odds: ${m.odds}\n- Form Pts -> Home: ${m.hPts || 0} | Away: ${m.aPts || 0}\n- Historical Hit Rates -> Home: [Win: ${homeWinPct}, O2.5: ${homeO25}, BTTS: ${homeBtts}] | Away: [Win: ${awayWinPct}, O2.5: ${awayO25}, BTTS: ${awayBtts}]`;
    }).join("\n\n");

    
    const systemPrompt = "You are an elite sports betting risk analyst. Analyze the betslip and identify any SIGNIFICANT risks. If the slip is structurally solid with strong stats across the board, DO NOT force a negative critique.\n\nFormat your response EXACTLY like this:\n\nIf there are risky picks, flag max 2:\n⚠️ **[Match Name] — [Market/Pick]**\n[2-3 sentences explaining the specific statistical risk.]\n\nIf ALL picks are mathematically strong (e.g., high chance/rating, good historicals), output instead:\n🎯 **Solid Premium Selections**\n[1-2 sentences praising the statistical strength of the slip.]\n\nAlways end with:\n✅ **Overall Verdict:**\n[One sentence summary — e.g. 'Safe to lock', 'Proceed with caution', or 'Too risky to play'].\n\nRules: Only flag a match if it has genuine statistical flaws (e.g. low rating, conflicting historicals). No intro text. Start directly with the first flag or praise.";
    const userPrompt = "Here is the current betslip:\n\n" + slipData + "\n\nPlease analyze this slip and highlight the biggest risks before I lock it in.";
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    
<<<<<<< HEAD
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
        }),
      }
    );
=======
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        },
      }),
    });
>>>>>>> parent of b639cad (feat: major AI upgrade - rich 18-field match data, independent market decision tree, gemini-2.0-flash, betslip expanded to 40 selections)
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ error: "Failed to generate AI analysis." }, { status: 502 });
    }
    
    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated.";
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("AI Slip Analysis Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
