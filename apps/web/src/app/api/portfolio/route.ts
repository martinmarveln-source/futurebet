import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import { NextResponse } from 'next/server';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_picks_log (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await ensureTable();
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
