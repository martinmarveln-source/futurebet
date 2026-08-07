import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

async function ensureSchema() {
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
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSchema();

    const userId = session.user.id;

    const rows = await sql`
      SELECT * FROM user_preferences WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      return Response.json({
        preferences: {
          user_id: userId,
          favorite_leagues: [],
          default_chance_threshold: 0,
          default_rating_threshold: 0,
          favorite_markets: ["homeWin", "draw", "awayWin", "gg", "ov25"],
          telegram_bot_token: "",
          telegram_chat_id: "",
          // Alert defaults
          alert_enabled: false,
          alert_send_time: "08:00",
          alert_min_chance: 60,
          alert_min_rating: 50,
          alert_min_hist_rate: 0,
          alert_markets: ["homeWin", "draw", "awayWin"],
          alert_pick_type: "all",
          alert_max_matches: 10,
        },
      });
    }

    return Response.json({ preferences: rows[0] });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSchema();

    const userId = session.user.id;
    const body = await request.json();

    const existingRows = await sql`SELECT * FROM user_preferences WHERE user_id = ${userId}`;
    const existing = existingRows[0] || {};

    // ── Core preferences ───────────────────────────────────────────────────
    const favorite_leagues = body.favorite_leagues !== undefined
      ? (Array.isArray(body.favorite_leagues) ? body.favorite_leagues : [])
      : (existing.favorite_leagues || []);
    const favorite_markets = body.favorite_markets !== undefined
      ? (Array.isArray(body.favorite_markets) ? body.favorite_markets : [])
      : (existing.favorite_markets || ["homeWin", "draw", "awayWin", "gg", "ov25"]);
    const default_chance_threshold = body.default_chance_threshold !== undefined
      ? Number(body.default_chance_threshold) || 50
      : (existing.default_chance_threshold || 50);
    const default_rating_threshold = body.default_rating_threshold !== undefined
      ? Number(body.default_rating_threshold) || 50
      : (existing.default_rating_threshold || 50);
    const telegram_bot_token = body.telegram_bot_token !== undefined
      ? String(body.telegram_bot_token).trim()
      : (existing.telegram_bot_token || "");
    const telegram_chat_id = body.telegram_chat_id !== undefined
      ? String(body.telegram_chat_id).trim()
      : (existing.telegram_chat_id || "");

    // ── Alert preferences (Premium/Admin only — enforced server-side) ──────
    const alert_enabled = body.alert_enabled !== undefined
      ? body.alert_enabled === true
      : (existing.alert_enabled ?? false);
    const alert_send_time = body.alert_send_time !== undefined
      ? String(body.alert_send_time).trim()
      : (existing.alert_send_time || "08:00");
    const alert_min_chance = body.alert_min_chance !== undefined
      ? Math.min(100, Math.max(0, Number(body.alert_min_chance)))
      : (existing.alert_min_chance ?? 60);
    const alert_min_rating = body.alert_min_rating !== undefined
      ? Math.min(100, Math.max(0, Number(body.alert_min_rating)))
      : (existing.alert_min_rating ?? 50);
    const alert_min_hist_rate = body.alert_min_hist_rate !== undefined
      ? Math.min(100, Math.max(0, Number(body.alert_min_hist_rate)))
      : (existing.alert_min_hist_rate ?? 0);
    const alert_markets = body.alert_markets !== undefined
      ? (Array.isArray(body.alert_markets) ? body.alert_markets : ["homeWin", "draw", "awayWin"])
      : (existing.alert_markets || ["homeWin", "draw", "awayWin"]);
    const alert_pick_type = body.alert_pick_type !== undefined
      ? (["all", "aligned_only"].includes(body.alert_pick_type) ? body.alert_pick_type : "all")
      : (existing.alert_pick_type || "all");
    const alert_max_matches = body.alert_max_matches !== undefined
      ? Math.min(50, Math.max(1, Number(body.alert_max_matches)))
      : (existing.alert_max_matches ?? 10);

    let result;
    if (existingRows.length > 0) {
      result = await sql`
        UPDATE user_preferences SET
          favorite_leagues          = ${favorite_leagues},
          default_chance_threshold  = ${default_chance_threshold},
          default_rating_threshold  = ${default_rating_threshold},
          favorite_markets          = ${favorite_markets},
          telegram_bot_token        = ${telegram_bot_token},
          telegram_chat_id          = ${telegram_chat_id},
          alert_enabled             = ${alert_enabled},
          alert_send_time           = ${alert_send_time},
          alert_min_chance          = ${alert_min_chance},
          alert_min_rating          = ${alert_min_rating},
          alert_min_hist_rate       = ${alert_min_hist_rate},
          alert_markets             = ${alert_markets},
          alert_pick_type           = ${alert_pick_type},
          alert_max_matches         = ${alert_max_matches},
          updated_at                = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
        RETURNING *
      `;
    } else {
      result = await sql`
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
        RETURNING *
      `;
    }

    return Response.json({ preferences: result[0] });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}