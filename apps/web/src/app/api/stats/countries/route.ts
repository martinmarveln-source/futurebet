import { NextResponse } from "next/server";
import sql from "../../utils/sql";

export async function GET(request: Request) {
  try {
    // Get distinct countries + leagues with team count and basic market averages
    const rows = await sql`
      SELECT 
        country,
        league,
        COUNT(*) AS team_count,
        ROUND(AVG((market_stats->>'BTTS_ALL')::numeric), 0)::int AS btts_percent,
        ROUND(AVG((market_stats->>'O25_ALL')::numeric), 0)::int AS over_25_percent,
        ROUND(AVG((market_stats->>'O15_ALL')::numeric), 0)::int AS over_15_percent
      FROM league_table_cache
      WHERE country IS NOT NULL 
        AND country != ''
        AND LOWER(country) != 'country'
        AND market_stats IS NOT NULL
      GROUP BY country, league

      UNION ALL

      SELECT 
        country,
        league,
        COUNT(*) AS team_count,
        NULL AS btts_percent,
        NULL AS over_25_percent,
        NULL AS over_15_percent
      FROM league_table_cache
      WHERE country IS NOT NULL 
        AND country != ''
        AND LOWER(country) != 'country'
        AND market_stats IS NULL
      GROUP BY country, league

      ORDER BY country, league
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const countryMap = new Map<string, any[]>();

    for (const row of rows) {
      const country = row.country;
      if (!countryMap.has(country)) countryMap.set(country, []);

      const leagues = countryMap.get(country)!;
      // deduplicate leagues (union may produce dupes for same league with/without market_stats)
      const existing = leagues.find((l: any) => l.league === row.league);
      if (!existing) {
        leagues.push({
          league: row.league,
          teamCount: parseInt(row.team_count ?? "0"),
          overview: {
            btts_percent: row.btts_percent ?? null,
            over_25_percent: row.over_25_percent ?? null,
            over_15_percent: row.over_15_percent ?? null,
          },
        });
      }
    }

    const data = Array.from(countryMap.entries()).map(([country, leagues]) => ({
      country,
      leagues,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Countries stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch countries." },
      { status: 500 }
    );
  }
}
