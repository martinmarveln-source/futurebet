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
    
    // Normalize league name from URL
    const decodedLeagueId = decodeURIComponent(leagueId);
    
    // We compute the league overview from matches_cache directly for now
    // as it represents the raw events. (Alternatively, aggregate team_stats_cache)
    
    const rows = await sql`
      SELECT * FROM matches_cache
      WHERE REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${decodedLeagueId}), ' ', '-')
        AND raw_data IS NOT NULL
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        league: decodedLeagueId,
        season,
        overview: {
          matches_played: 0,
          goals_scored: 0,
          goals_per_game: 0,
          home_goals_per_game: 0,
          away_goals_per_game: 0,
          btts_percent: 0,
          over_15_percent: 0,
          over_25_percent: 0,
          over_35_percent: 0,
          clean_sheet_percent: 0
        }
      });
    }

    let matchesPlayed = 0, totalGoals = 0;
    let homeGoals = 0, awayGoals = 0;
    let btts = 0, over15 = 0, over25 = 0, over35 = 0, cleanSheets = 0;

    for (const row of rows) {
      let rd = row.raw_data;
      if (typeof rd === 'string') {
        try { rd = JSON.parse(rd); } catch(e) {}
      }
      if (!rd || typeof rd !== 'object') continue;
      if (!rd.ft_score) continue; // Only count completed matches

      const hg = parseInt(rd.hgs || '0');
      const ag = parseInt(rd.ags || '0');
      const tg = hg + ag;

      matchesPlayed++;
      totalGoals += tg;
      homeGoals += hg;
      awayGoals += ag;

      if (hg > 0 && ag > 0) btts++;
      if (tg > 1.5) over15++;
      if (tg > 2.5) over25++;
      if (tg > 3.5) over35++;
      if (hg === 0) cleanSheets++;
      if (ag === 0) cleanSheets++;
    }

    if (matchesPlayed === 0) {
      return NextResponse.json({
        success: true,
        league: decodedLeagueId,
        season,
        overview: {
          matches_played: 0, goals_scored: 0, goals_per_game: 0, home_goals_per_game: 0,
          away_goals_per_game: 0, btts_percent: 0, over_15_percent: 0, over_25_percent: 0,
          over_35_percent: 0, clean_sheet_percent: 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      league: decodedLeagueId,
      season,
      overview: {
        matches_played: matchesPlayed,
        goals_scored: totalGoals,
        goals_per_game: (totalGoals / matchesPlayed).toFixed(2),
        home_goals_per_game: (homeGoals / matchesPlayed).toFixed(2),
        away_goals_per_game: (awayGoals / matchesPlayed).toFixed(2),
        btts_percent: ((btts / matchesPlayed) * 100).toFixed(1),
        over_15_percent: ((over15 / matchesPlayed) * 100).toFixed(1),
        over_25_percent: ((over25 / matchesPlayed) * 100).toFixed(1),
        over_35_percent: ((over35 / matchesPlayed) * 100).toFixed(1),
        clean_sheet_percent: ((cleanSheets / (matchesPlayed * 2)) * 100).toFixed(1)
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
