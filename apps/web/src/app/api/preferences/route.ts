// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const rows = await sql`
      SELECT * FROM user_preferences WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      // Return enterprise default profile perfectly mapped to DB schema
      return Response.json({
        preferences: {
          user_id: userId,
          favorite_leagues: [],
          default_chance_threshold: 0, // Aligned to 0-100 UI sliders
          default_rating_threshold: 0, // Aligned to 0-100 UI sliders
          favorite_markets: ["homeWin", "draw", "awayWin", "gg", "ov25"],
          telegram_bot_token: "",
          telegram_chat_id: "",
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

    const userId = session.user.id;
    const body = await request.json();

    // 1. Strict Type Coercion (Never trust frontend payloads blindly)
    const favorite_leagues = Array.isArray(body.favorite_leagues)
      ? body.favorite_leagues
      : [];
    const favorite_markets = Array.isArray(body.favorite_markets)
      ? body.favorite_markets
      : [];
    const default_chance_threshold =
      Number(body.default_chance_threshold) || 50;
    const default_rating_threshold =
      Number(body.default_rating_threshold) || 50;
    const telegram_bot_token = String(body.telegram_bot_token || "").trim();
    const telegram_chat_id = String(body.telegram_chat_id || "").trim();

    // 2. The Atomic Upsert (Top 1% Concurrency Protection)
    // This inserts the row. If the user_id already exists, it instantly updates it instead.
    const result = await sql`
      INSERT INTO user_preferences (
        user_id, 
        favorite_leagues, 
        default_chance_threshold,
        default_rating_threshold, 
        favorite_markets, 
        telegram_bot_token,
        telegram_chat_id
      ) VALUES (
        ${userId}, 
        ${favorite_leagues}, 
        ${default_chance_threshold},
        ${default_rating_threshold}, 
        ${favorite_markets}, 
        ${telegram_bot_token},
        ${telegram_chat_id}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        favorite_leagues = EXCLUDED.favorite_leagues,
        default_chance_threshold = EXCLUDED.default_chance_threshold,
        default_rating_threshold = EXCLUDED.default_rating_threshold,
        favorite_markets = EXCLUDED.favorite_markets,
        telegram_bot_token = EXCLUDED.telegram_bot_token,
        telegram_chat_id = EXCLUDED.telegram_chat_id,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    return Response.json({ preferences: result[0] });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}