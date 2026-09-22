import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pending = await sql`
      SELECT id, match_name, match_date, market, selection, result 
      FROM user_picks_log 
      WHERE result = 'Pending' 
      ORDER BY match_date DESC 
      LIMIT 10
    `;

    const dates = [...new Set(pending.map(p => p.match_date))].filter(Boolean);
    
    let cache = [];
    if (dates.length > 0) {
      cache = await sql`
        SELECT match_label, match_date, ft_score 
        FROM matches_cache 
        WHERE match_date = ANY(${dates}::text[])
      `;
    }

    const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const debugInfo = pending.map(p => {
      const pNorm = norm(p.match_name);
      const possibleMatches = cache.filter(c => c.match_date === p.match_date);
      const exactMatch = possibleMatches.find(c => norm(c.match_label) === pNorm);
      const partialMatches = possibleMatches.filter(c => norm(c.match_label).includes(pNorm.substring(0, 5)));
      
      return {
        id: p.id,
        match_name: p.match_name,
        pNorm,
        hasExactMatch: !!exactMatch,
        exactMatchScore: exactMatch?.ft_score,
        partialMatchesFound: partialMatches.map(m => m.match_label)
      };
    });

    return NextResponse.json({ pendingCount: pending.length, debugInfo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
