import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const minGames = parseInt(searchParams.get("minGames") || "4", 10);

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

    // Filter out teams with less than required games played
    const validTeams = teams.filter(t => (t.gp || 0) >= minGames);

    // Helper to get top 10
    const getTop10 = (getValue: (t: any) => number) => {
      return [...validTeams]
        .sort((a, b) => getValue(b) - getValue(a))
        .slice(0, 10)
        .map(t => ({ team: t.team, league: t.league, country: t.country, value: getValue(t) }));
    };

    // Best BTTS
    const bestBTTS = getTop10(t => parsePct(t.market_stats.BTTS_ALL));
    
    // Overs
    const bestO15 = getTop10(t => parsePct(t.market_stats.O15_ALL));
    const bestO25 = getTop10(t => parsePct(t.market_stats.O25_ALL));
    const bestO35 = getTop10(t => parsePct(t.market_stats.O35_ALL));

    // Unders (Inverse of Overs)
    const bestU15 = getTop10(t => 100 - parsePct(t.market_stats.O15_ALL));
    const bestU25 = getTop10(t => 100 - parsePct(t.market_stats.O25_ALL));
    const bestU35 = getTop10(t => 100 - parsePct(t.market_stats.O35_ALL));

    // Best Home Teams (Home Win Rate)
    const bestHome = getTop10(t => parsePct(t.market_stats.Home_Win));
    
    // Best Clean Sheet
    const bestCS = getTop10(t => parsePct(t.market_stats.CS_ALL));

    // Failed to Score
    const bestFTS = getTop10(t => parsePct(t.market_stats.FTS_ALL));

    return NextResponse.json({
      success: true,
      data: {
        btts: bestBTTS,
        o15: bestO15,
        o25: bestO25,
        o35: bestO35,
        u15: bestU15,
        u25: bestU25,
        u35: bestU35,
        homeWin: bestHome,
        cleanSheet: bestCS,
        fts: bestFTS
      }
    });

  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
