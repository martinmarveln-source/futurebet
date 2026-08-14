import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import { getOddsForPick } from "../../utils/oddsMath";

// ── Auto-migrate new alert columns if they don't exist ──────────────────────
async function ensureAlertColumns() {
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
      ADD COLUMN IF NOT EXISTS alert_max_matches    INT      DEFAULT 10
  `;
}

// ── Build a rich Telegram message for one match (matches screenshot style) ──
function formatMatchAlert(match: any, index: number, total: number): string {
  const fmtPct = (v: any) => {
    const n = Number(v ?? 0);
    return (n > 1 ? n : n * 100).toFixed(0);
  };

  const formBar = (form: string) =>
    String(form ?? "")
      .slice(-5)
      .split("")
      .map((c) => (c === "W" ? "🟢" : c === "L" ? "🔴" : "🟡"))
      .join("");

  const pickLabel = String(match.guide || match.pick || "").toUpperCase();
  const chance = fmtPct(match.chance);
  const rating = fmtPct(match.rating);
  const league = match.league ? `${match.country} — ${match.league}` : match.country || "";
  const score = match.c_score || match.cScore || "";
  const scorePercent = match.model_cs_percent ?? match.modelCSPercent ?? "";

  const hForm = formBar(match.h_recent ?? match.hRecent ?? "");
  const aForm = formBar(match.a_recent ?? match.aRecent ?? "");

  const hppg = Number(match.hppg ?? 0).toFixed(2);
  const appg = Number(match.appg ?? 0).toFixed(2);
  const hBtts = fmtPct(match.h_btts ?? match.hBtts);
  const aBtts = fmtPct(match.a_btts ?? match.aBtts);
  const hOv2 = fmtPct(match.h_ov2 ?? match.hOv2);
  const aOv2 = fmtPct(match.a_ov2 ?? match.aOv2);

  const lines = [];
  if (index === 1) {
    lines.push(`📨 *FutureBet Daily Alerts* — ${total} match${total > 1 ? "es" : ""} found`);
    lines.push("━━━━━━━━━━━━━━━━━━");
    lines.push("");
  }

  lines.push(`*${index}. ${match.home_team} vs ${match.away_team}*`);
  if (league) lines.push(`🏆 ${league}`);
  if (match.match_time) lines.push(`🕐 Kickoff: ${match.match_time}`);
  lines.push("");
  const odds = getOddsForPick(match.raw_data, pickLabel);
  const oddsLabel = odds > 1 ? ` | 💰 Odds: ${odds.toFixed(2)}` : "";

  lines.push(`🎯 *Pick: ${pickLabel}*${oddsLabel}`);
  lines.push(`📊 Confidence: ${chance}% | ⭐ Rating: ${rating}%`);
  if (score) lines.push(`📉 Score Tip: ${score}${scorePercent ? ` (${fmtPct(scorePercent)}%)` : ""}`);
  lines.push("");
  lines.push(`📈 PPG: ${hppg} vs ${appg}`);
  lines.push(`💥 BTTS: ${hBtts}% vs ${aBtts}% | OV2.5: ${hOv2}% vs ${aOv2}%`);
  if (hForm || aForm) {
    lines.push(`⚡ Form: ${hForm || "—"} vs ${aForm || "—"}`);
  }
  if (match.flag) lines.push(`${match.flag} Model aligned`);
  lines.push("────────────────");

  return lines.join("\n");
}

// Fixed daily alert slots (UTC hours). Must match the cron schedule.
const ALERT_SLOTS_UTC = [10, 14, 16, 18];

// Check if the user's chosen slot matches the current UTC hour being fired
function isInWindow(sendTime: string): boolean {
  const now = new Date();
  const currentUTCHour = now.getUTCHours();

  // Only proceed if cron is firing at one of the designated slots
  if (!ALERT_SLOTS_UTC.includes(currentUTCHour)) return false;

  // Match user's chosen send time to the current slot (within 10 minutes for safety)
  const [hh] = (sendTime || "10:00").split(":").map(Number);
  return hh === currentUTCHour;
}

// ── Map pick label to market key ────────────────────────────────────────────
function matchesMarket(guide: string, markets: string[]): boolean {
  if (!markets || markets.length === 0) return true;
  const g = String(guide || "").toUpperCase().trim();
  return markets.some((m) => {
    switch (m) {
      case "homeWin": return g === "HOME WIN" || g === "1";
      case "draw":    return g === "DRAW" || g === "X";
      case "awayWin": return g === "AWAY WIN" || g === "2";
      case "gg":      return g === "GG";
      case "ng":      return g === "NG";
      case "ov25":    return g === "OV.2.5" || g === "OVER 2.5";
      case "un25":    return g === "UN2.5" || g === "UNDER 2.5";
      default:        return false;
    }
  });
}

// ── Send one Telegram message ────────────────────────────────────────────────
async function sendTelegram(token: string, chatId: string, text: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
  const data = await res.json();
  return data.ok === true;
}

// ── Main cron handler ────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret =
    searchParams.get("secret") || request.headers.get("Authorization");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureAlertColumns();

    // Only Premium/Admin users have access to auto-alerts
    const users = await sql`
      SELECT
        up.user_id,
        up.telegram_bot_token,
        up.telegram_chat_id,
        up.alert_enabled,
        up.alert_send_time,
        up.alert_min_chance,
        up.alert_min_rating,
        up.alert_min_odds,
        up.alert_min_hist_rate,
        up.alert_markets,
        up.alert_pick_type,
        up.alert_max_matches,
        au.user_role,
        au.subscription_status
      FROM user_preferences up
      JOIN auth_users au ON au.id = up.user_id
      WHERE
        up.alert_enabled = TRUE
        AND up.telegram_bot_token IS NOT NULL
        AND up.telegram_bot_token != ''
        AND up.telegram_chat_id IS NOT NULL
        AND up.telegram_chat_id != ''
        AND (
          au.user_role IN ('admin', 'premium')
          OR au.subscription_status IN ('admin', 'premium')
        )
    `;

    const today = new Date().toISOString().split("T")[0];

    const results = { sent: 0, skipped: 0, failed: 0, users_processed: 0 };

    for (const user of users) {
      // Check if this user's send window is now
      if (!isInWindow(user.alert_send_time ?? "08:00")) {
        results.skipped++;
        continue;
      }

      results.users_processed++;

      const minChance = Number(user.alert_min_chance ?? 60);
      const minRating = Number(user.alert_min_rating ?? 50);
      const minOdds = Number(user.alert_min_odds ?? 1.0);
      const minHistRate = Number(user.alert_min_hist_rate ?? 0);
      const markets = (user.alert_markets as string[]) ?? [];
      const pickType = user.alert_pick_type ?? "all";
      const maxMatches = Number(user.alert_max_matches ?? 10);

      // Fetch today's matches
      const matches = await sql`
        SELECT * FROM matches_cache
        WHERE match_date = ${today}
        ORDER BY chance DESC NULLS LAST
      `;

      if (matches.length === 0) {
        results.skipped++;
        continue;
      }

      // Current time in WAT (UTC+1) — match times in DB are stored in WAT
      const nowUTC = new Date();
      const nowWATMinutes =
        nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes() + 60; // +60 = WAT offset

      // Apply user's filters
      let filtered = matches.filter((m) => {
        const chanceVal = Number(m.chance ?? 0);
        const ratingVal = Number(m.rating ?? 0);
        // Normalise 0-1 vs 0-100
        const chanceP = chanceVal > 1 ? chanceVal : chanceVal * 100;
        const ratingP = ratingVal > 1 ? ratingVal : ratingVal * 100;

        if (chanceP < minChance) return false;
        if (ratingP < minRating) return false;
        if (pickType === "aligned_only" && m.flag !== "✅") return false;
        if (!matchesMarket(m.guide, markets)) return false;

        // ── Odds guards: skip if missing or below threshold ─────────
        const odds = getOddsForPick(m.raw_data, m.guide);
        if (odds <= 1.01) return false; // Missing odds completely
        if (odds < minOdds) return false; // Below user's threshold

        // ── Kickoff time guard: skip matches that have already started ──────
        // match_time is stored as "HH:MM" in WAT
        if (m.match_time) {
          const parts = String(m.match_time).split(":");
          const kickoffWATMinutes =
            parseInt(parts[0] ?? "0", 10) * 60 + parseInt(parts[1] ?? "0", 10);
          // Exclude if kickoff has already passed (allow up to 5 min grace window)
          if (kickoffWATMinutes < nowWATMinutes - 5) return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        results.skipped++;
        continue;
      }

      // Cap to user's max
      if (maxMatches > 0 && filtered.length > maxMatches) {
        filtered = filtered.slice(0, maxMatches);
      }

      // Build full message
      const messageParts = filtered.map((m, i) =>
        formatMatchAlert(m, i + 1, filtered.length)
      );
      const footer = `\n🤖 _Powered by FutureBet AI_\n🔗 futurebet.com.ng`;
      const fullMessage = messageParts.join("\n") + footer;

      // Telegram has a 4096 char limit — chunk if needed
      const chunks: string[] = [];
      let current = "";
      for (const part of messageParts) {
        if ((current + part).length > 3800) {
          chunks.push(current);
          current = part;
        } else {
          current += "\n" + part;
        }
      }
      chunks.push(current + footer);

      let allOk = true;
      for (const chunk of chunks) {
        const ok = await sendTelegram(
          user.telegram_bot_token,
          user.telegram_chat_id,
          chunk.trim()
        );
        if (!ok) allOk = false;
      }

      if (allOk) {
        results.sent++;
      } else {
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      ...results,
    });
  } catch (error: any) {
    console.error("Telegram alert cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
