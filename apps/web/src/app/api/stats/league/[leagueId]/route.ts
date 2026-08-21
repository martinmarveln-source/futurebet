import { NextResponse } from "next/server";
import sql from "../../../utils/sql";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params;
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || '2026/27';
    const decodedLeagueId = decodeURIComponent(leagueId);

    // Fetch all teams in this league from league_table_cache
    const teamRows = await sql`
      SELECT gp, gs, gc, market_stats
      FROM league_table_cache
      WHERE REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${decodedLeagueId}), ' ', '-')
        AND market_stats IS NOT NULL
    `;

    if (!teamRows || teamRows.length === 0) {
      return NextResponse.json({
        success: true,
        league: decodedLeagueId,
        season,
        overview: {
          matches_played: 0, goals_per_game: "0.00",
          btts_percent: "0.0", over_15_percent: "0.0",
          over_25_percent: "0.0", over_35_percent: "0.0",
          clean_sheet_percent: "0.0", fts_percent: "0.0",
          home_win_percent: "0.0", avg_xg: "0.00"
        }
      });
    }

    // Safe percent parser: handles "65", "0.65", "65%" → always returns 0-100
    const parsePct = (v: any): number | null => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const n = parseFloat(String(v).replace(/%/g, "").trim());
      if (!isFinite(n)) return null;
      // If stored as decimal fraction (0.0–1.0), multiply by 100
      return n > 0 && n <= 1.0 ? n * 100 : n;
    };

    const parseNum = (v: any): number | null => {
      const n = parseFloat(String(v ?? ""));
      return isFinite(n) ? n : null;
    };

    let totalGp = 0, totalGs = 0, totalGc = 0;
    const bttsVals: number[] = [];
    const o15Vals: number[]  = [];
    const o25Vals: number[]  = [];
    const o35Vals: number[]  = [];
    const csVals: number[]   = [];
    const ftsVals: number[]  = [];
    const hwVals: number[]   = [];
    const xgVals: number[]   = [];

    for (const row of teamRows) {
      let ms = row.market_stats;
      if (typeof ms === "string") {
        try { ms = JSON.parse(ms); } catch (_) {}
      }
      if (!ms || typeof ms !== "object") continue;

      totalGp += parseInt(String(row.gp || "0"), 10) || 0;
      totalGs += parseInt(String(row.gs || "0"), 10) || 0;
      totalGc += parseInt(String(row.gc || "0"), 10) || 0;

      const push = (arr: number[], val: number | null) => { if (val !== null) arr.push(val); };
      push(bttsVals, parsePct(ms.BTTS_ALL));
      push(o15Vals,  parsePct(ms.O15_ALL));
      push(o25Vals,  parsePct(ms.O25_ALL));
      push(o35Vals,  parsePct(ms.O35_ALL));
      push(csVals,   parsePct(ms.CS_ALL));
      push(ftsVals,  parsePct(ms.FTS_ALL));
      push(hwVals,   parsePct(ms.Home_Win));
      push(xgVals,   parseNum(ms.XG_ALL));
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    // Estimate goals/game from totals (each team record includes home + away = league matches)
    // total GP across teams = sum of each team's games played (each match counted twice)
    const matchesPlayed = totalGp > 0 ? Math.round(totalGp / 2) : 0;
    const goalsPerGame  = matchesPlayed > 0 ? ((totalGs + totalGc) / 2 / matchesPlayed) : 0;

    return NextResponse.json({
      success: true,
      league: decodedLeagueId,
      season,
      overview: {
        matches_played:    matchesPlayed,
        goals_per_game:    goalsPerGame.toFixed(2),
        btts_percent:      avg(bttsVals).toFixed(1),
        over_15_percent:   avg(o15Vals).toFixed(1),
        over_25_percent:   avg(o25Vals).toFixed(1),
        over_35_percent:   avg(o35Vals).toFixed(1),
        clean_sheet_percent: avg(csVals).toFixed(1),
        fts_percent:       avg(ftsVals).toFixed(1),
        home_win_percent:  avg(hwVals).toFixed(1),
        avg_xg:            avg(xgVals).toFixed(2),
      }
    });

  } catch (error: any) {
    console.error("League stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch league stats." },
      { status: 500 }
    );
  }
}
