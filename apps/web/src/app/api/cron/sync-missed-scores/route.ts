import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function parseMatchDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch (_) {}
  return null;
}

// Simple CSV parser for Google Sheets output
function parseCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const result = [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  
  for (let i = 1; i < lines.length; i++) {
    // Regex matches values inside quotes or unquoted values
    const rowRe = /(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    let match;
    const row = [];
    while ((match = rowRe.exec(lines[i])) !== null) {
      if (match[1] !== undefined) {
        row.push(match[1].replace(/""/g, '"'));
      } else if (match[2] !== undefined) {
        row.push(match[2]);
      }
      // Stop if we matched the end of the line
      if (rowRe.lastIndex === lines[i].length) break;
      // Skip the comma
      rowRe.lastIndex++;
    }
    
    if (row.length === 0) continue;
    
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || "";
    });
    result.push(obj);
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/1FkwBHYn00egVeyKVgI7OBEU96wMmf30v-aLKosFdDok/gviz/tq?tqx=out:csv&sheet=missed_Results';
    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch Google Sheet CSV", status: response.status }, { status: 500 });
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    let updatedCount = 0;
    
    for (const row of rows) {
      const matchDate = parseMatchDate(row.match_date);
      const homeTeam = row.home_team;
      const awayTeam = row.away_team;
      const ftScore = row.ft_score?.trim();

      // Only update if we have a valid date, teams, and a non-empty score
      if (matchDate && homeTeam && awayTeam && ftScore) {
        // Execute the update
        await sql`
          UPDATE matches_cache 
          SET ft_score = ${ftScore}, updated_at = NOW()
          WHERE match_date = ${matchDate} 
            AND home_team = ${homeTeam} 
            AND away_team = ${awayTeam}
            AND (ft_score IS NULL OR ft_score = '')
        `;
        updatedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      rowsProcessed: rows.length, 
      scoresUpdated: updatedCount 
    });

  } catch (error: any) {
    console.error("sync-missed-scores error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
