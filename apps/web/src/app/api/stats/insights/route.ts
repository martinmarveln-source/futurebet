import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();

    const rows = await sql`SELECT * FROM league_table_cache`;

    const teams = rows.map(r => {
      let ms = r.market_stats;
      if (typeof ms === "string" && ms) {
        try { ms = JSON.parse(ms); } catch (e) {}
      }
      return {
        ...r,
        market_stats: ms || {}
      };
    });

    const parsePct = (v: any) => {
      const n = parseFloat(String(v ?? "0").replace(/%/, ""));
      if (isNaN(n)) return 0;
      return n <= 1.0 ? n * 100 : n;
    };

    // Filter out teams with less than 5 games played to ensure statistical significance
    const validTeams = teams.filter(t => (t.gp || 0) >= 5);

    // Best BTTS
    const bestBTTS = [...validTeams].sort((a, b) => parsePct(b.market_stats.BTTS_ALL) - parsePct(a.market_stats.BTTS_ALL)).slice(0, 10).map(t => ({ team: t.team, league: t.league, country: t.country, value: parsePct(t.market_stats.BTTS_ALL) }));
    
    // Best Over 2.5
    const bestO25 = [...validTeams].sort((a, b) => parsePct(b.market_stats.O25_ALL) - parsePct(a.market_stats.O25_ALL)).slice(0, 10).map(t => ({ team: t.team, league: t.league, country: t.country, value: parsePct(t.market_stats.O25_ALL) }));

    // Best Home Teams (Home Win Rate)
    const bestHome = [...validTeams].sort((a, b) => parsePct(b.market_stats.Home_Win) - parsePct(a.market_stats.Home_Win)).slice(0, 10).map(t => ({ team: t.team, league: t.league, country: t.country, value: parsePct(t.market_stats.Home_Win) }));
    
    // Best Clean Sheet
    const bestCS = [...validTeams].sort((a, b) => parsePct(b.market_stats.CS_ALL) - parsePct(a.market_stats.CS_ALL)).slice(0, 10).map(t => ({ team: t.team, league: t.league, country: t.country, value: parsePct(t.market_stats.CS_ALL) }));

    return NextResponse.json({
      success: true,
      data: {
        btts: bestBTTS,
        o25: bestO25,
        homeWin: bestHome,
        cleanSheet: bestCS,
      }
    });

  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
