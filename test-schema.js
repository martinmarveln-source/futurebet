import sql from './apps/web/src/app/api/utils/sql.js';

async function test() {
  try {
    console.log("Creating table...");
    await sql`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        favorite_leagues TEXT[],
        default_chance_threshold NUMERIC,
        default_rating_threshold NUMERIC,
        favorite_markets TEXT[],
        telegram_bot_token TEXT,
        telegram_chat_id TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("Table created.");

    console.log("Altering table...");
    await sql`
      ALTER TABLE user_preferences
        ADD COLUMN IF NOT EXISTS alert_enabled        BOOLEAN  DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS alert_send_time      TEXT     DEFAULT '08:00',
        ADD COLUMN IF NOT EXISTS alert_min_chance     NUMERIC  DEFAULT 60,
        ADD COLUMN IF NOT EXISTS alert_min_rating     NUMERIC  DEFAULT 50,
        ADD COLUMN IF NOT EXISTS alert_min_hist_rate  NUMERIC  DEFAULT 0,
        ADD COLUMN IF NOT EXISTS alert_markets        TEXT[]   DEFAULT ARRAY['homeWin','draw','awayWin'],
        ADD COLUMN IF NOT EXISTS alert_pick_type      TEXT     DEFAULT 'all',
        ADD COLUMN IF NOT EXISTS alert_max_matches    INT      DEFAULT 10
    `;
    console.log("Table altered.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

test();
