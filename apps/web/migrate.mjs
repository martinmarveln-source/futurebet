import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    console.log('Adding missing columns to user_preferences...');
    await sql`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_send_time TEXT DEFAULT '09:00'`;
    await sql`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_min_chance NUMERIC DEFAULT 60`;
    await sql`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_min_rating NUMERIC DEFAULT 50`;
    await sql`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_min_hist_rate NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_markets JSONB DEFAULT '["homeWin", "draw", "awayWin"]'`;
    await sql`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_pick_type TEXT DEFAULT 'all'`;
    await sql`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS alert_max_matches INTEGER DEFAULT 10`;
    console.log('Successfully added missing alert columns to user_preferences!');
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

run();
