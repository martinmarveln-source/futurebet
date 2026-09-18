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
    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json({ error: "No matches provided" }, { status: 400 });
    }
    
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

    const slipData = matches.map((m: any, i: number) => {
      let homeTeam = "Unknown", awayTeam = "Unknown";
      if (m.match) {
        const parts = m.match.split(/\s+vs\s+|\s+-\s+/);
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

      const chance = Number(m.chance) || 0;
      const rating = Number(m.rating) || 0;

      return `Leg ${i + 1}: ${m.match} [${m.selectedMarket} → ${m.selectedOption} @ ${m.odds}]
  Model: Chance ${chance > 1 ? chance : (chance * 100).toFixed(0)}% | Rating ${rating > 1 ? rating : (rating * 100).toFixed(0)}%
  Win Probabilities → Home: ${fmtPct(m.homeWin)} | Draw: ${fmtPct(m.draw)} | Away: ${fmtPct(m.awayWin)}
  Goals Avg → Home: scores ${fmt(m.hgs,1)}/g, concedes ${fmt(m.hgc,1)}/g | Away: scores ${fmt(m.ags,1)}/g, concedes ${fmt(m.agc,1)}/g
  Season Record → Home: W${fmt(m.hWin)}/D${fmt(m.hDraw)}/L${fmt(m.hLost)} | Away: W${fmt(m.aWin)}/D${fmt(m.aDraw)}/L${fmt(m.aLost)}
  Form → Home: ${m.hForm || "—"} (${fmt(m.hPts)}pts) | Away: ${m.aForm || "—"} (${fmt(m.aPts)}pts)
  BTTS Rate → Home: ${fmtPct(m.hBtts)} | Away: ${fmtPct(m.aBtts)}
  Over 2.5 Rate → Home: ${fmtPct(m.hOv2)} | Away: ${fmtPct(m.aOv2)}
  H2H (last ${fmt(m.H2H_GP) || "?"}) → Home W:${fmt(m.H2H_H)} D:${fmt(m.H2H_D)} Away:${fmt(m.H2H_A)} | O2.5:${fmtPct(m.H2H_OV)} | BTTS:${fmtPct(m.H2H_GG)}
  Predicted Score: ${m.likelyCS || "—"} (${fmtPct(m.scorelineCSPercent)} confidence)
  Odds → Home:${fmtOdds(m.homeOdds)} | Draw:${fmtOdds(m.drawOdds)} | Away:${fmtOdds(m.awayOdds)} | O2.5:${fmtOdds(m.o25Odds)} | BTTS:${fmtOdds(m.bttsYesOdds)}
  League Hit Rates → Home: [Win:${homeWinPct} O2.5:${homeO25} BTTS:${homeBtts}] | Away: [Win:${awayWinPct} O2.5:${awayO25} BTTS:${awayBtts}]`;
    }).join("\n\n");

    const systemPrompt = `You are an elite sports betting risk analyst with access to comprehensive statistical data for each leg. 

Your job:
1. For each leg, check if the market selection is SUPPORTED by the data (win probs, form, H2H, goals avg, BTTS rates, league hit rates).
2. Flag a leg as RISKY only if there is a genuine statistical contradiction — e.g. picking Over 2.5 when both teams average < 1.5 goals/game, or picking a Home Win when the away team is in superior form.
3. If a leg's data strongly backs the selection, say so positively.
4. If ALL legs have solid data support, say the slip is solid — do NOT invent fake risks.

Format your response EXACTLY as:

For each risky leg (max 3):
⚠️ **[Match] — [Market/Pick]**
[2-3 sentences citing specific numbers from the data that contradict the selection. e.g. "Home team averaging only 0.8 goals/game and hOv2 is just 28%. The H2H shows only 2/8 games went Over 2.5."]

If all legs are statistically strong:
🎯 **Solid Premium Selections**
[1-2 sentences citing the strongest supporting stats.]

Always end with:
✅ **Overall Verdict:** [One sentence: "Safe to lock in", "Proceed with caution on Leg X", or "Too risky — reconsider Legs X and Y"]

Rules:
- Only flag if data genuinely contradicts the selection.
- Quote actual numbers from the data.
- No intro or filler text. Start immediately with the first flag or praise.`;

    const userPrompt = `Here is the current betslip with full stats:\n\n${slipData}\n\nAnalyze each leg and highlight any genuine statistical risks before locking in.`;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.0, maxOutputTokens: 1500 },
        }),
      }
    );
    
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
