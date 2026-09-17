import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Check for leagues where the most recent update is older than 3 days (72 hours)
    // We group by country and league
    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - 72);

    // Fetch the maximum updated_at for each league
    const rows = await sql`
      SELECT 
        country, 
        league, 
        MAX(updated_at) as last_updated
      FROM league_table_cache
      GROUP BY country, league
      HAVING MAX(updated_at) < ${staleThreshold}
      ORDER BY last_updated ASC
    `;

    // Also get the total number of leagues to ensure we know if EVERYTHING is stale
    const totalLeaguesRow = await sql`
      SELECT COUNT(DISTINCT league) as total FROM league_table_cache
    `;
    const totalLeagues = totalLeaguesRow[0]?.total || 0;

    return NextResponse.json({
      success: true,
      staleLeagues: rows.map(r => ({
        country: r.country,
        league: r.league,
        lastUpdated: r.last_updated
      })),
      totalLeagues: Number(totalLeagues)
    });
  } catch (error: any) {
    console.error('Error checking stale leagues:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
