import crypto from "crypto";
import sql from "@/app/api/utils/sql";

const BOT_CACHE_TTL = 5 * 60 * 1000;

let sharedTokenCache: { token: string; ts: number } = { token: "", ts: 0 };
const botUsernameCache = new Map<string, { username: string; ts: number }>();

export function invalidateSharedBotCache() {
  sharedTokenCache = { token: "", ts: 0 };
}

export async function ensureTelegramPreferencesSchema() {
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
      ADD COLUMN IF NOT EXISTS alert_min_odds       NUMERIC  DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS alert_min_hist_rate  NUMERIC  DEFAULT 0,
      ADD COLUMN IF NOT EXISTS alert_markets        TEXT[]   DEFAULT ARRAY['homeWin','draw','awayWin'],
      ADD COLUMN IF NOT EXISTS alert_pick_type      TEXT     DEFAULT 'all',
      ADD COLUMN IF NOT EXISTS alert_max_matches    INT      DEFAULT 10,
      ADD COLUMN IF NOT EXISTS telegram_link_token  TEXT
  `;
}

export function generateTelegramLinkToken(): string {
  return `fb_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Resolves the shared FutureBet Telegram bot token:
 * 1. `process.env.TELEGRAM_BOT_TOKEN`
 * 2. Fallback to the first admin user's configured `telegram_bot_token` in `user_preferences`
 */
export async function resolveSharedBotToken(): Promise<string> {
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (envToken) return envToken;

  if (sharedTokenCache.token && Date.now() - sharedTokenCache.ts < BOT_CACHE_TTL) {
    return sharedTokenCache.token;
  }

  try {
    const rows = await sql`
      SELECT up.telegram_bot_token
      FROM user_preferences up
      JOIN auth_users au ON au.id = up.user_id
      WHERE au.user_role = 'admin'
        AND up.telegram_bot_token IS NOT NULL
        AND TRIM(up.telegram_bot_token) != ''
      ORDER BY up.updated_at DESC NULLS LAST
      LIMIT 1
    `;
    const dbToken = String(rows?.[0]?.telegram_bot_token || "").trim();
    if (dbToken) {
      sharedTokenCache = { token: dbToken, ts: Date.now() };
      return dbToken;
    }
  } catch (err) {
    console.warn("Could not resolve shared Telegram bot token:", err);
  }

  return "";
}

/** Resolve Telegram bot username via env or Telegram `getMe` (cached in memory). */
export async function resolveBotUsername(botToken: string): Promise<string> {
  const envUser =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ||
    process.env.TELEGRAM_BOT_USERNAME?.trim() ||
    "";
  if (envUser) return envUser.replace(/^@/, "");
  if (!botToken) return "";

  const cached = botUsernameCache.get(botToken);
  if (cached && Date.now() - cached.ts < BOT_CACHE_TTL) {
    return cached.username;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      cache: "no-store",
    });
    if (!res.ok) return "";
    const json = await res.json();
    const username = String(json?.result?.username || "").replace(/^@/, "").trim();
    if (username) {
      botUsernameCache.set(botToken, { username, ts: Date.now() });
      return username;
    }
  } catch (err) {
    console.warn("Failed to resolve Telegram bot username:", err);
  }

  return "";
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  parseMode: "Markdown" | "HTML" | undefined = "Markdown"
): Promise<{ ok: boolean; description?: string; raw?: any }> {
  if (!botToken || !chatId) {
    return { ok: false, description: "Missing bot token or chat ID" };
  }
  try {
    const body: Record<string, unknown> = {
      chat_id: String(chatId).trim(),
      text,
    };
    if (parseMode) body.parse_mode = parseMode;

    const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
      ok: data?.ok === true,
      description: data?.description,
      raw: data,
    };
  } catch (err: any) {
    return { ok: false, description: err?.message || "Telegram network error" };
  }
}
