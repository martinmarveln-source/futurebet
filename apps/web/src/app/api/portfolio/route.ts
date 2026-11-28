import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';
import {
  addScoreRecord,
  createScoreLookupIndex,
  evaluateMarketOutcome,
  findScoreInIndex,
  MISSED_RESULTS_CSV_URL,
  parseQuotedCSV,
  toSafeDateISO,
} from '@/lib/settlement';

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

function evaluateBet(market: string, selection: string, ftScore: string): string {
  const outcome = evaluateMarketOutcome(market, selection, ftScore);
  if (outcome === 'won') return 'Won';
  if (outcome === 'lost') return 'Lost';
  return 'Pending';
}

async function settlePendingPicks(userId: string) {
  // 1. Fetch user's pending picks
  const pending = await sql`
    SELECT * FROM user_picks_log 
    WHERE user_id = ${userId} AND result = 'Pending'
  `;
  if (pending.length === 0) return;

  // 2. Fetch matches_cache rows using explicit ::text casting (allow +/-1 day for timezone offsets)
  const rawDates = pending.map((p) => toSafeDateISO(p.match_date)).filter(Boolean);
  const dates = [...new Set(rawDates)];
  if (dates.length === 0) return;

  const queryDates = new Set<string>();
  for (const d of dates) {
    queryDates.add(d);
    const t = Date.parse(`${d}T12:00:00Z`);
    if (Number.isFinite(t)) {
      queryDates.add(new Date(t - 86400000).toISOString().slice(0, 10));
      queryDates.add(new Date(t + 86400000).toISOString().slice(0, 10));
    }
  }
  const dateList = [...queryDates];

  let cacheRows: any[] = [];
  try {
    cacheRows = await sql`
      SELECT 
        match_label, 
        match_date::text as match_date_str, 
        home_team, 
        away_team, 
        COALESCE(NULLIF(TRIM(ft_score), ''), NULLIF(TRIM(raw_data->>'ftScore'), ''), NULLIF(TRIM(raw_data->>'ft_score'), '')) as ft_score 
      FROM matches_cache 
      WHERE match_date::text = ANY(${dateList}::text[])
        AND (
          (ft_score IS NOT NULL AND TRIM(ft_score) != '')
          OR (raw_data->>'ftScore' IS NOT NULL AND TRIM(raw_data->>'ftScore') != '')
          OR (raw_data->>'ft_score' IS NOT NULL AND TRIM(raw_data->>'ft_score') != '')
        )
    `;
  } catch (err) {
    console.warn("matches_cache query warning in auto-settle:", err);
  }

  const scoreIndex = createScoreLookupIndex();
  for (const row of cacheRows) {
    addScoreRecord(scoreIndex, {
      date: row.match_date_str,
      home: row.home_team,
      away: row.away_team,
      label: row.match_label,
      score: row.ft_score,
    });
  }

  const stillPending: any[] = [];

  // 3. Evaluate strictly by fixture date + ordered home/away pair
  for (const pick of pending) {
    const pDate = toSafeDateISO(pick.match_date);
    const ftScore = findScoreInIndex(scoreIndex, pick.match_name, pDate, 1);

    if (ftScore) {
      const outcome = evaluateBet(pick.market, pick.selection, ftScore);
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
      const res = await fetch(MISSED_RESULTS_CSV_URL, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const sheetRows = parseQuotedCSV(text);

        const sheetIndex = createScoreLookupIndex();
        const sheetMetaByKey = new Map<string, { label: string; home: string; away: string; score: string; date: string }>();
        for (const sr of sheetRows) {
          const sDate = toSafeDateISO(sr.match_date);
          const score = (sr.ft_score || "").trim();
          if (!score || score === "#N/A") continue;
          const label = sr.match_label || `${sr.home_team} - ${sr.away_team}`;
          addScoreRecord(sheetIndex, {
            date: sDate,
            home: sr.home_team,
            away: sr.away_team,
            label,
            score,
          });
          if (sDate) {
            sheetMetaByKey.set(`${sDate}|${score}`, {
              label,
              home: sr.home_team || "",
              away: sr.away_team || "",
              score,
              date: sDate,
            });
          }
        }

        for (const pick of stillPending) {
          const pDate = toSafeDateISO(pick.match_date);
          const ftScore = findScoreInIndex(sheetIndex, pick.match_name, pDate, 1);

          if (ftScore) {
            const outcome = evaluateBet(pick.market, pick.selection, ftScore);
            if (outcome === 'Won' || outcome === 'Lost') {
              await sql`
                UPDATE user_picks_log 
                SET result = ${outcome} 
                WHERE id = ${pick.id}
              `;

              // Date-guarded backfill into matches_cache
              const meta = sheetMetaByKey.get(`${pDate}|${ftScore}`);
              if (meta && pDate) {
                try {
                  await sql`
                    UPDATE matches_cache 
                    SET ft_score = ${ftScore}, synced_at = NOW()
                    WHERE match_date = ${pDate}::date
                      AND (ft_score IS NULL OR ft_score = '')
                      AND (
                        match_label = ${meta.label}
                        OR (home_team = ${meta.home} AND away_team = ${meta.away})
                      )
                  `;
                } catch (_) {}
              }
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
