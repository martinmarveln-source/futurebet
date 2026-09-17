import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';
    const limit = Number(searchParams.get('limit')) || 500;

    // Get matches from the past that don't have a final score yet
    const rows = await sql`
      SELECT 
        match_date, 
        match_time,
        country, 
        league,
        home_team, 
        away_team, 
        match_label, 
        guide, 
        chance,
        '' as ft_score
      FROM matches_cache
      WHERE match_date < CURRENT_DATE
        AND (ft_score IS NULL OR trim(ft_score) = '')
      ORDER BY match_date DESC
      LIMIT ${limit}
    `;

    if (format === 'json') {
      return new Response(JSON.stringify({ success: true, count: rows.length, data: rows }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Default to CSV so Google Sheets IMPORTDATA can read it easily
    const header = ['match_date', 'match_time', 'country', 'league', 'home_team', 'away_team', 'match_label', 'guide', 'chance', 'ft_score'];
    const csvRows = [header.join(',')];
    
    for (const row of rows) {
      const csvRow = header.map(col => {
        let val = row[col] === null || row[col] === undefined ? '' : String(row[col]);
        // Escape quotes and wrap in quotes if there is a comma
        if (val.includes(',') || val.includes('"')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(csvRow.join(','));
    }

    return new Response(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="missing-scores.csv"'
      }
    });
  } catch (error: any) {
    console.error('Error fetching missing scores:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
