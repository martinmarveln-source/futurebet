import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await sql`SELECT COUNT(*) FROM user_picks_log`;
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_picks_log'`;
    return new Response(JSON.stringify({ count: res, cols }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
