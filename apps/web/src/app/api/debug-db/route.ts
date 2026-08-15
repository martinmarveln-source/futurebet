import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const minChance = 65;
    const minRating = 55;

    const dbPicks = await sql`
      SELECT 
        v.id, v.match_id, v.match_date, v.chance_percent, v.rating_percent,
        m.ft_score as current_ft_score 
      FROM vip_picks v 
      LEFT JOIN matches_cache m ON v.match_id = m.id::VARCHAR
      WHERE v.match_date = ${today}
    `;

    const filtered = await sql`
      SELECT 
        v.id, v.match_id, v.chance_percent, v.rating_percent,
        m.ft_score as current_ft_score 
      FROM vip_picks v 
      LEFT JOIN matches_cache m ON v.match_id = m.id::VARCHAR
      WHERE v.match_date = ${today}
      AND REPLACE(v.chance_percent, '%', '')::NUMERIC >= ${minChance}
      AND v.rating_percent >= ${minRating}
      ORDER BY v.vip_score DESC
    `;

    const allMatches = await sql`
      SELECT id, match_date, home_team, away_team FROM matches_cache WHERE match_date = ${today}
    `;

    return NextResponse.json({
      today,
      dbPicksCount: dbPicks.length,
      dbPicks,
      filteredCount: filtered.length,
      filtered,
      allMatchesCount: allMatches.length
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
