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

function evaluateBet(market: string, selection: string, ftScore: string): string {
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
    if (s.includes("OVER")) return hg + ag > 2.5 ? "Won" : "Lost";
    if (s.includes("UNDER")) return hg + ag < 2.5 ? "Won" : "Lost";
  }
  else if (m === "OVER 1.5" || m === "UNDER 1.5" || m.includes("1.5")) {
    if (s.includes("OVER")) return hg + ag > 1.5 ? "Won" : "Lost";
    if (s.includes("UNDER")) return hg + ag < 1.5 ? "Won" : "Lost";
  }
  else if (m === "OVER 3.5" || m === "UNDER 3.5" || m.includes("3.5")) {
    if (s.includes("OVER")) return hg + ag > 3.5 ? "Won" : "Lost";
    if (s.includes("UNDER")) return hg + ag < 3.5 ? "Won" : "Lost";
  }
  else if (m === "BTTS" || m === "BOTH TEAMS TO SCORE") {
    if (s === "YES" || s === "GG") return (hg > 0 && ag > 0) ? "Won" : "Lost";
    if (s === "NO" || s === "NG") return (hg === 0 || ag === 0) ? "Won" : "Lost";
  }
  else if (m === "DOUBLE CHANCE") {
    if (s === "1X" || s.includes("HOMEORDRAW")) return hg >= ag ? "Won" : "Lost";
    if (s === "X2" || s.includes("DRAWORAWAY") || s.includes("AWAYORDRAW")) return ag >= hg ? "Won" : "Lost";
    if (s === "12" || s.includes("HOMEORAWAY")) return hg !== ag ? "Won" : "Lost";
  }

  return "Pending";
}

async function settlePendingPicks(userId: string) {
  // 1. Fetch user's pending picks
  const pending = await sql`
    SELECT * FROM user_picks_log 
    WHERE user_id = ${userId} AND result = 'Pending'
  `;
  if (pending.length === 0) return;

  // 2. Fetch matches_cache rows that might match
  // We can just fetch matches_cache where match_date IN (...)
  const dates = [...new Set(pending.map(p => p.match_date))].filter(Boolean);
  if (dates.length === 0) return;

  const cache = await sql`
    SELECT match_label, match_date, ft_score 
    FROM matches_cache 
    WHERE match_date = ANY(${dates}::text[])
      AND ft_score IS NOT NULL
      AND ft_score != ''
  `;

  // Create a lookup map: "match_date|match_name" -> ft_score
  // Normalize match_name slightly to help matching
  const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, '');
  const scoreMap = new Map();
  for (const row of cache) {
    scoreMap.set(`${row.match_date}|${norm(row.match_label)}`, row.ft_score);
  }

  // 3. Evaluate and update
  for (const pick of pending) {
    const score = scoreMap.get(`${pick.match_date}|${norm(pick.match_name)}`);
    if (score) {
      const outcome = evaluateBet(pick.market, pick.selection, score);
      if (outcome === 'Won' || outcome === 'Lost') {
        await sql`
          UPDATE user_picks_log 
          SET result = ${outcome} 
          WHERE id = ${pick.id}
        `;
      }
    }
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureTable();
    
    // Auto-settle any pending picks before returning
    try { await settlePendingPicks(session.user.id); } catch(e) { console.error("Auto-settle error:", e); }

    const picks = await sql`
      SELECT * FROM user_picks_log
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
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
