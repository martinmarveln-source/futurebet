import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';

async function ensureTable() {
  try {
    await sql`ALTER TABLE user_picks_log ALTER COLUMN user_id TYPE TEXT USING user_id::text`;
  } catch(e) {}

  await sql`
    CREATE TABLE IF NOT EXISTS user_picks_log (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      match_id TEXT NOT NULL DEFAULT '',
      match_name TEXT NOT NULL,
      match_date TEXT NOT NULL,
      league TEXT NOT NULL DEFAULT '',
      market TEXT NOT NULL,
      selection TEXT NOT NULL,
      odds NUMERIC(6,2),
      chance INT,
      rating INT,
      result TEXT NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_picks_user ON user_picks_log(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_picks_date ON user_picks_log(match_date)`;
}

export function evaluateBet(market: string, selection: string, ftScore: string): string {
  if (!ftScore || typeof ftScore !== 'string') return "Pending";
  const clean = ftScore.replace(/\s+/g, '').replace('-', ':');
  const parts = clean.split(':');
  if (parts.length !== 2) return "Pending";
  const hg = parseInt(parts[0], 10);
  const ag = parseInt(parts[1], 10);
  if (isNaN(hg) || isNaN(ag)) return "Pending";

  const m = String(market || "").toUpperCase().trim();
  const s = String(selection || "").toUpperCase().replace(/\s+/g, '');
  
  if (m === "1X2") {
    if (s.includes("HOME") || s === "1") return hg > ag ? "Won" : "Lost";
    if (s.includes("AWAY") || s === "2") return ag > hg ? "Won" : "Lost";
    if (s.includes("DRAW") || s === "X") return hg === ag ? "Won" : "Lost";
  }
  else if (m === "OVER 2.5" || m === "UNDER 2.5" || m.includes("2.5")) {
    if (s.includes("OVER") || s === "YES") return hg + ag > 2.5 ? "Won" : "Lost";
    if (s.includes("UNDER") || s === "NO") return hg + ag < 2.5 ? "Won" : "Lost";
  }
  else if (m === "OVER 1.5" || m === "UNDER 1.5" || m.includes("1.5")) {
    if (s.includes("OVER") || s === "YES") return hg + ag > 1.5 ? "Won" : "Lost";
    if (s.includes("UNDER") || s === "NO") return hg + ag < 1.5 ? "Won" : "Lost";
  }
  else if (m === "OVER 3.5" || m === "UNDER 3.5" || m.includes("3.5")) {
    if (s.includes("OVER") || s === "YES") return hg + ag > 3.5 ? "Won" : "Lost";
    if (s.includes("UNDER") || s === "NO") return hg + ag < 3.5 ? "Won" : "Lost";
  }
  else if (m === "OVER 4.5" || m === "UNDER 4.5" || m.includes("4.5")) {
    if (s.includes("OVER") || s === "YES") return hg + ag > 4.5 ? "Won" : "Lost";
    if (s.includes("UNDER") || s === "NO") return hg + ag < 4.5 ? "Won" : "Lost";
  }
  else if (m === "BTTS" || m === "BOTH TEAMS TO SCORE") {
    if (s === "YES" || s === "GG" || s.includes("BTTSYES")) return (hg > 0 && ag > 0) ? "Won" : "Lost";
    if (s === "NO" || s === "NG" || s.includes("BTTSNO")) return (hg === 0 || ag === 0) ? "Won" : "Lost";
  }
  else if (m === "DOUBLE CHANCE") {
    if (s === "1X" || s.includes("HOMEORDRAW")) return hg >= ag ? "Won" : "Lost";
    if (s === "X2" || s.includes("DRAWORAWAY") || s.includes("AWAYORDRAW")) return ag >= hg ? "Won" : "Lost";
    if (s === "12" || s.includes("HOMEORAWAY")) return hg !== ag ? "Won" : "Lost";
  }

  return "Pending";
}

function normalizeDateStr(d: any): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  // Format MM/DD/YYYY or M/D/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, day, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  } catch (_) {}
  return s.slice(0, 10);
}

const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, '');

function findMatchCandidate(pickName: string, candidates: any[]) {
  const pNorm = norm(pickName);
  
  // 1. Exact normalized match_label
  let found = candidates.find(c => norm(c.match_label) === pNorm);
  if (found) return found;

  // 2. Combined home + away
  found = candidates.find(c => {
    const combined = norm(`${c.home_team || ''}${c.away_team || ''}`);
    const reverse = norm(`${c.away_team || ''}${c.home_team || ''}`);
    return combined === pNorm || reverse === pNorm || pNorm.includes(combined) || combined.includes(pNorm);
  });
  if (found) return found;

  // 3. Home/Away split fuzzy match
  let separator = null;
  if (pickName.includes(' vs ')) separator = ' vs ';
  else if (pickName.includes(' - ')) separator = ' - ';

  if (separator) {
    const parts = pickName.split(separator);
    const home = norm(parts[0]);
    const away = norm(parts[1] || '');
    
    if (home.length >= 3 && away.length >= 3) {
      found = candidates.find(c => {
        const cHome = norm(c.home_team || '');
        const cAway = norm(c.away_team || '');
        const cLabel = norm(c.match_label || '');

        const homeMatches = (cHome && (cHome.includes(home.substring(0, 5)) || home.includes(cHome.substring(0, 5)))) ||
                            cLabel.includes(home.substring(0, 5));
        const awayMatches = (cAway && (cAway.includes(away.substring(0, 5)) || away.includes(cAway.substring(0, 5)))) ||
                            cLabel.includes(away.substring(0, 5));

        return homeMatches && awayMatches;
      });
      if (found) return found;
    }
  }

  // 4. Substring fallback (first 7 chars)
  if (pNorm.length >= 7) {
    const prefix = pNorm.substring(0, 7);
    found = candidates.find(c => norm(c.match_label).includes(prefix) || norm(c.home_team || '').includes(prefix));
    if (found) return found;
  }

  return null;
}

// Simple CSV parser for Google Sheets missed_Results
function parseSheetCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  const result: any[] = [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  for (let i = 1; i < lines.length; i++) {
    const rowRe = /(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    let match;
    const row: string[] = [];
    while ((match = rowRe.exec(lines[i])) !== null) {
      if (match[1] !== undefined) row.push(match[1].replace(/""/g, '"'));
      else if (match[2] !== undefined) row.push(match[2]);
      if (rowRe.lastIndex === lines[i].length) break;
      rowRe.lastIndex++;
    }
    if (row.length === 0) continue;
    const obj: any = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] || ""; });
    result.push(obj);
  }
  return result;
}

async function settlePendingPicks(userId: string) {
  // 1. Fetch user's pending picks
  const pending = await sql`
    SELECT * FROM user_picks_log 
    WHERE user_id = ${userId} AND result = 'Pending'
  `;
  if (pending.length === 0) return;

  // 2. Fetch matches_cache rows using explicit ::text casting
  const rawDates = pending.map(p => normalizeDateStr(p.match_date)).filter(Boolean);
  const dates = [...new Set(rawDates)];
  if (dates.length === 0) return;

  let cacheRows: any[] = [];
  try {
    cacheRows = await sql`
      SELECT 
        match_label, 
        match_date::text as match_date_str, 
        home_team, 
        away_team, 
        COALESCE(NULLIF(ft_score, ''), raw_data->>'ftScore', raw_data->>'ft_score') as ft_score 
      FROM matches_cache 
      WHERE match_date::text = ANY(${dates}::text[])
        AND (
          (ft_score IS NOT NULL AND ft_score != '')
          OR (raw_data->>'ftScore' IS NOT NULL AND raw_data->>'ftScore' != '')
          OR (raw_data->>'ft_score' IS NOT NULL AND raw_data->>'ft_score' != '')
        )
    `;
  } catch (err) {
    console.warn("matches_cache query warning in auto-settle:", err);
  }

  const cacheByDate = new Map<string, any[]>();
  for (const row of cacheRows) {
    const dStr = normalizeDateStr(row.match_date_str);
    if (!cacheByDate.has(dStr)) cacheByDate.set(dStr, []);
    cacheByDate.get(dStr)!.push(row);
  }

  const stillPending: any[] = [];

  // 3. Evaluate against matches_cache
  for (const pick of pending) {
    const pDate = normalizeDateStr(pick.match_date);
    const candidates = cacheByDate.get(pDate) || cacheRows;
    const matchedRow = findMatchCandidate(pick.match_name, candidates);

    if (matchedRow && matchedRow.ft_score) {
      const outcome = evaluateBet(pick.market, pick.selection, matchedRow.ft_score);
      if (outcome === 'Won' || outcome === 'Lost') {
        await sql`
          UPDATE user_picks_log 
          SET result = ${outcome} 
          WHERE id = ${pick.id}
        `;
        continue;
      }
    }
    stillPending.push(pick);
  }

  // 4. Fallback: If any picks still remain pending, pull live from missed_Results sheet
  if (stillPending.length > 0) {
    try {
      const csvUrl = 'https://docs.google.com/spreadsheets/d/1FkwBHYn00egVeyKVgI7OBEU96wMmf30v-aLKosFdDok/gviz/tq?tqx=out:csv&sheet=missed_Results';
      const res = await fetch(csvUrl, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const sheetRows = parseSheetCSV(text);

        const sheetByDate = new Map<string, any[]>();
        for (const sr of sheetRows) {
          const sDate = normalizeDateStr(sr.match_date);
          const score = (sr.ft_score || "").trim();
          if (!score || score === "#N/A") continue;
          if (!sheetByDate.has(sDate)) sheetByDate.set(sDate, []);
          sheetByDate.get(sDate)!.push({
            match_label: sr.match_label || `${sr.home_team} - ${sr.away_team}`,
            home_team: sr.home_team,
            away_team: sr.away_team,
            ft_score: score,
            match_date_str: sDate,
          });
        }

        for (const pick of stillPending) {
          const pDate = normalizeDateStr(pick.match_date);
          const candidates = sheetByDate.get(pDate) || [];
          const matched = findMatchCandidate(pick.match_name, candidates);

          if (matched && matched.ft_score) {
            const outcome = evaluateBet(pick.market, pick.selection, matched.ft_score);
            if (outcome === 'Won' || outcome === 'Lost') {
              await sql`
                UPDATE user_picks_log 
                SET result = ${outcome} 
                WHERE id = ${pick.id}
              `;

              // Backfill into matches_cache so next lookup is instantaneous
              try {
                await sql`
                  UPDATE matches_cache 
                  SET ft_score = ${matched.ft_score}, synced_at = NOW()
                  WHERE match_date::text = ${pDate}
                    AND (ft_score IS NULL OR ft_score = '')
                    AND (
                      match_label = ${matched.match_label}
                      OR (home_team = ${matched.home_team} AND away_team = ${matched.away_team})
                    )
                `;
              } catch (_) {}
            }
          }
        }
      }
    } catch (sheetErr) {
      console.warn("Sheet fallback auto-settle error:", sheetErr);
    }
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureTable();
    
    // Auto-settle any pending picks before returning
    try { 
      await settlePendingPicks(session.user.id); 
    } catch(e) { 
      console.error("Auto-settle error:", e); 
    }

    const picks = await sql`
      SELECT * FROM user_picks_log
      WHERE user_id = ${session.user.id}
      ORDER BY match_date DESC, created_at DESC
      LIMIT 200
    `;
    return NextResponse.json({ success: true, picks });
  } catch (error: any) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { match_name, match_date, league, market, selection, odds, chance, rating } = body;
    if (!match_name || !market || !selection) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    await ensureTable();
    await sql`
      INSERT INTO user_picks_log (user_id, match_name, match_date, league, market, selection, odds, chance, rating)
      VALUES (
        ${session.user.id}, 
        ${match_name}, 
        ${match_date || ''}, 
        ${league || ''}, 
        ${market}, 
        ${selection}, 
        ${odds || null}, 
        ${chance || null}, 
        ${rating || null}
      )
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving pick:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
