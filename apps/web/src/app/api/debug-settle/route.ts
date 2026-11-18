import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';

function normalizeDateStr(d: any): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, day, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return s.slice(0, 10);
}

export async function GET() {
  try {
    const pending = await sql`
      SELECT id, match_name, match_date, market, selection, result 
      FROM user_picks_log 
      WHERE result = 'Pending' 
      ORDER BY match_date DESC 
      LIMIT 20
    `;

    const rawDates = pending.map(p => normalizeDateStr(p.match_date)).filter(Boolean);
    const dates = [...new Set(rawDates)];
    
    let cache: any[] = [];
    if (dates.length > 0) {
      cache = await sql`
        SELECT 
          match_label, 
          match_date::text as match_date_str, 
          home_team,
          away_team,
          COALESCE(NULLIF(ft_score, ''), raw_data->>'ftScore', raw_data->>'ft_score') as ft_score 
        FROM matches_cache 
        WHERE match_date::text = ANY(${dates}::text[])
      `;
    }

    const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const debugInfo = pending.map(p => {
      const pNorm = norm(p.match_name);
      const pDate = normalizeDateStr(p.match_date);
      const possibleMatches = cache.filter(c => normalizeDateStr(c.match_date_str) === pDate);
      const exactMatch = possibleMatches.find(c => norm(c.match_label) === pNorm);
      const partialMatches = possibleMatches.filter(c => norm(c.match_label).includes(pNorm.substring(0, 5)));
      
      return {
        id: p.id,
        match_name: p.match_name,
        match_date: p.match_date,
        normalizedDate: pDate,
        hasExactMatch: !!exactMatch,
        exactMatchScore: exactMatch?.ft_score,
        possibleMatchesCount: possibleMatches.length,
        partialMatchesFound: partialMatches.map(m => `${m.match_label} (${m.ft_score || 'no score'})`)
      };
    });

    return NextResponse.json({ 
      pendingCount: pending.length, 
      datesChecked: dates, 
      cacheMatchesFound: cache.length,
      debugInfo 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
