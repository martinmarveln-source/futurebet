import { NextResponse } from "next/server";
import sql from "../../utils/sql";

export async function GET(request: Request) {
  try {
    // We group leagues by country using the team_stats_cache.
    // If team_stats_cache is empty, fallback to league_table_cache.
    
    // First, let's try league_table_cache since it definitely has data currently
    const rows = await sql`
      SELECT DISTINCT country, league 
      FROM league_table_cache
      WHERE country IS NOT NULL 
        AND country != ''
        AND LOWER(country) != 'country'
      ORDER BY country, league
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const countryMap = new Map<string, string[]>();

    for (const row of rows) {
      const country = row.country;
      const league = row.league;

      if (!countryMap.has(country)) {
        countryMap.set(country, []);
      }
      
      const leagues = countryMap.get(country)!;
      if (!leagues.includes(league)) {
        leagues.push(league);
      }
    }

    const data = Array.from(countryMap.entries()).map(([country, leagues]) => ({
      country,
      leagues
    }));

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error("Countries stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch countries." },
      { status: 500 }
    );
  }
}
