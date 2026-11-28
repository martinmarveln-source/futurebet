import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import {
  ensureTelegramPreferencesSchema,
  generateTelegramLinkToken,
  resolveSharedBotToken,
  sendTelegramMessage,
} from "@/lib/telegram";

/**
 * Optional Telegram Bot Webhook endpoint (`/api/telegram/webhook`).
 * Handles `/start <link_token>` messages immediately when webhooks are enabled.
 */
export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (expectedSecret) {
      const providedSecret = request.headers.get("x-telegram-bot-api-secret-token") || "";
      if (providedSecret !== expectedSecret) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const update = await request.json().catch(() => null);
    const msg = update?.message;
    const text = String(msg?.text || "").trim();
    const chatId = msg?.chat?.id ? String(msg.chat.id) : "";

    if (!chatId || !text.startsWith("/start")) {
      return NextResponse.json({ ok: true });
    }

    const parts = text.split(/\s+/);
    const token = (parts[1] || "").trim();
    if (!token || !token.startsWith("fb_")) {
      return NextResponse.json({ ok: true });
    }

    await ensureTelegramPreferencesSchema();
    const nextToken = generateTelegramLinkToken();
    const updated = await sql`
      UPDATE user_preferences
      SET telegram_chat_id = ${chatId},
          alert_enabled = TRUE,
          telegram_link_token = ${nextToken},
          updated_at = CURRENT_TIMESTAMP
      WHERE telegram_link_token = ${token}
      RETURNING user_id
    `;

    const botToken = await resolveSharedBotToken();
    if (botToken && updated?.length > 0) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "✅ *FutureBet Connected!*\n\nYour Telegram account is linked. Daily high-conviction alerts are now enabled."
      );
    }

    return NextResponse.json({ ok: true, linked: updated?.length > 0 });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
