import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&options=-csearch_path%3Dpublic");

async function test() {
  try {
    const userId = "test_user_123";
    const favorite_leagues = [];
    const default_chance_threshold = 50;
    const default_rating_threshold = 50;
    const favorite_markets = [];
    const telegram_bot_token = "";
    const telegram_chat_id = "";
    const alert_enabled = false;
    const alert_send_time = "08:00";
    const alert_min_chance = 60;
    const alert_min_rating = 50;
    const alert_min_hist_rate = 0;
    const alert_markets = ["homeWin", "draw", "awayWin"];
    const alert_pick_type = "all";
    const alert_max_matches = 10;

    const result = await sql`
      INSERT INTO user_preferences (
        user_id,
        favorite_leagues,
        default_chance_threshold,
        default_rating_threshold,
        favorite_markets,
        telegram_bot_token,
        telegram_chat_id,
        alert_enabled,
        alert_send_time,
        alert_min_chance,
        alert_min_rating,
        alert_min_hist_rate,
        alert_markets,
        alert_pick_type,
        alert_max_matches
      ) VALUES (
        ${userId},
        ${favorite_leagues},
        ${default_chance_threshold},
        ${default_rating_threshold},
        ${favorite_markets},
        ${telegram_bot_token},
        ${telegram_chat_id},
        ${alert_enabled},
        ${alert_send_time},
        ${alert_min_chance},
        ${alert_min_rating},
        ${alert_min_hist_rate},
        ${alert_markets},
        ${alert_pick_type},
        ${alert_max_matches}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        favorite_leagues          = EXCLUDED.favorite_leagues,
        default_chance_threshold  = EXCLUDED.default_chance_threshold,
        default_rating_threshold  = EXCLUDED.default_rating_threshold,
        favorite_markets          = EXCLUDED.favorite_markets,
        telegram_bot_token        = EXCLUDED.telegram_bot_token,
        telegram_chat_id          = EXCLUDED.telegram_chat_id,
        alert_enabled             = EXCLUDED.alert_enabled,
        alert_send_time           = EXCLUDED.alert_send_time,
        alert_min_chance          = EXCLUDED.alert_min_chance,
        alert_min_rating          = EXCLUDED.alert_min_rating,
        alert_min_hist_rate       = EXCLUDED.alert_min_hist_rate,
        alert_markets             = EXCLUDED.alert_markets,
        alert_pick_type           = EXCLUDED.alert_pick_type,
        alert_max_matches         = EXCLUDED.alert_max_matches,
        updated_at                = CURRENT_TIMESTAMP
      RETURNING *
    `;
    console.log("Insert success:", result);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

test();
