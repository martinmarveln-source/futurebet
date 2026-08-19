import { NextResponse } from "next/server";
import sql from "../../../../utils/sql";

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
      SELECT 
        COUNT(*) as total_matches,
        SUM((raw_data->>'hgs')::int + (raw_data->>'ags')::int) as total_goals,
        AVG((raw_data->>'hgs')::int) as avg_home_goals,
        AVG((raw_data->>'ags')::int) as avg_away_goals,
        AVG((raw_data->>'hgs')::int + (raw_data->>'ags')::int) as avg_goals_per_game,
        SUM(CASE WHEN (raw_data->>'hgs')::int > 0 AND (raw_data->>'ags')::int > 0 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100 as btts_percent,
        SUM(CASE WHEN ((raw_data->>'hgs')::int + (raw_data->>'ags')::int) > 1.5 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100 as over_15_percent,
        SUM(CASE WHEN ((raw_data->>'hgs')::int + (raw_data->>'ags')::int) > 2.5 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100 as over_25_percent,
        SUM(CASE WHEN ((raw_data->>'hgs')::int + (raw_data->>'ags')::int) > 3.5 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100 as over_35_percent,
        SUM(CASE WHEN (raw_data->>'hgs')::int = 0 THEN 1 ELSE 0 END + CASE WHEN (raw_data->>'ags')::int = 0 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*) * 2, 0) * 100 as clean_sheet_percent
      FROM matches_cache
      WHERE 
        REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${decodedLeagueId}), ' ', '-')
        AND season = ${season}
        AND raw_data->>'ft_score' IS NOT NULL
        AND raw_data->>'ft_score' != ''
    `;

    if (!rows || rows.length === 0 || rows[0].total_matches === '0') {
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

    const stats = rows[0];

    return NextResponse.json({
      success: true,
      league: decodedLeagueId,
      season,
      overview: {
        matches_played: parseInt(stats.total_matches || '0', 10),
        goals_scored: parseInt(stats.total_goals || '0', 10),
        goals_per_game: parseFloat(stats.avg_goals_per_game || '0').toFixed(2),
        home_goals_per_game: parseFloat(stats.avg_home_goals || '0').toFixed(2),
        away_goals_per_game: parseFloat(stats.avg_away_goals || '0').toFixed(2),
        btts_percent: parseFloat(stats.btts_percent || '0').toFixed(1),
        over_15_percent: parseFloat(stats.over_15_percent || '0').toFixed(1),
        over_25_percent: parseFloat(stats.over_25_percent || '0').toFixed(1),
        over_35_percent: parseFloat(stats.over_35_percent || '0').toFixed(1),
        clean_sheet_percent: parseFloat(stats.clean_sheet_percent || '0').toFixed(1)
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
