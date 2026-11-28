import { NextResponse } from "next/server";
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  ensureTelegramPreferencesSchema,
  generateTelegramLinkToken,
  resolveBotUsername,
  resolveSharedBotToken,
  sendTelegramMessage,
} from "@/lib/telegram";

async function getOrCreateUserPrefsRow(userId: string) {
  await ensureTelegramPreferencesSchema();
  const rows = await sql`
    SELECT telegram_bot_token, telegram_chat_id, telegram_link_token, alert_enabled
    FROM user_preferences
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    const token = generateTelegramLinkToken();
    await sql`
      INSERT INTO user_preferences (user_id, telegram_link_token)
      VALUES (${userId}, ${token})
      ON CONFLICT (user_id) DO NOTHING
    `;
    return {
      telegram_bot_token: "",
      telegram_chat_id: "",
      telegram_link_token: token,
      alert_enabled: false,
    };
  }

  const row = rows[0];
  let linkToken = String(row.telegram_link_token || "").trim();
  if (!linkToken) {
    linkToken = generateTelegramLinkToken();
    await sql`
      UPDATE user_preferences
      SET telegram_link_token = ${linkToken}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `;
  }

  return {
    telegram_bot_token: String(row.telegram_bot_token || "").trim(),
    telegram_chat_id: String(row.telegram_chat_id || "").trim(),
    telegram_link_token: linkToken,
    alert_enabled: row.alert_enabled === true,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefs = await getOrCreateUserPrefsRow(session.user.id);
    const sharedToken = await resolveSharedBotToken();
    const botUsername = sharedToken ? await resolveBotUsername(sharedToken) : "";
    const deepLink = botUsername
      ? `https://t.me/${botUsername}?start=${encodeURIComponent(prefs.telegram_link_token)}`
      : null;

    return NextResponse.json({
      success: true,
      connected: Boolean(prefs.telegram_chat_id),
      chatId: prefs.telegram_chat_id,
      hasSharedBot: Boolean(sharedToken),
      botUsername,
      deepLink,
      usingCustomBot: Boolean(prefs.telegram_bot_token),
    });
  } catch (err: any) {
    console.error("GET /api/telegram/connect error:", err);
    return NextResponse.json({ error: "Failed to initialize Telegram connection" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "verify").toLowerCase();

    const prefs = await getOrCreateUserPrefsRow(userId);
    const sharedToken = await resolveSharedBotToken();
    const botUsername = sharedToken ? await resolveBotUsername(sharedToken) : "";

    if (action === "regenerate") {
      const nextToken = generateTelegramLinkToken();
      await sql`
        UPDATE user_preferences
        SET telegram_link_token = ${nextToken}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `;
      return NextResponse.json({
        success: true,
        connected: Boolean(prefs.telegram_chat_id),
        chatId: prefs.telegram_chat_id,
        botUsername,
        deepLink: botUsername ? `https://t.me/${botUsername}?start=${encodeURIComponent(nextToken)}` : null,
      });
    }

    if (action === "disconnect") {
      const nextToken = generateTelegramLinkToken();
      await sql`
        UPDATE user_preferences
        SET telegram_chat_id = '',
            alert_enabled = FALSE,
            telegram_link_token = ${nextToken},
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `;
      return NextResponse.json({
        success: true,
        connected: false,
        chatId: "",
        botUsername,
        deepLink: botUsername ? `https://t.me/${botUsername}?start=${encodeURIComponent(nextToken)}` : null,
      });
    }

    // action === "verify"
    // 1. If webhook already linked it, succeed immediately
    if (prefs.telegram_chat_id) {
      return NextResponse.json({
        success: true,
        connected: true,
        chatId: prefs.telegram_chat_id,
        botUsername,
      });
    }

    if (!sharedToken) {
      return NextResponse.json(
        {
          error: "Shared FutureBet Telegram bot is not configured yet. Admin must set TELEGRAM_BOT_TOKEN or save an Admin bot token.",
        },
        { status: 400 }
      );
    }

    // 2. Poll recent bot updates cleanly (works out of the box without configuring webhooks)
    let matchedChatId = "";
    let webhookConflict = false;
    try {
      const updatesRes = await fetch(
        `https://api.telegram.org/bot${sharedToken}/getUpdates?limit=100`,
        { cache: "no-store" }
      );
      if (updatesRes.status === 409) {
        webhookConflict = true;
      } else if (updatesRes.ok) {
        const updatesJson = await updatesRes.json();
        const updates: any[] = Array.isArray(updatesJson?.result) ? updatesJson.result : [];
        for (let i = updates.length - 1; i >= 0; i--) {
          const msg = updates[i]?.message;
          const txt = String(msg?.text || "").trim();
          const cid = msg?.chat?.id ? String(msg.chat.id) : "";
          if (!cid || !txt) continue;
          if (txt.includes(prefs.telegram_link_token)) {
            matchedChatId = cid;
            break;
          }
        }
      }
    } catch (pollErr) {
      console.warn("Telegram getUpdates check failed:", pollErr);
    }

    if (!matchedChatId) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          message: webhookConflict
            ? "Waiting for webhook confirmation. Open the bot in Telegram, tap Start, then click Verify again."
            : "We haven't received your Start message yet. Tap 'Connect in 1 Tap', press Start in Telegram, then click Verify Connection.",
        },
        { status: 200 }
      );
    }

    await sql`
      UPDATE user_preferences
      SET telegram_chat_id = ${matchedChatId},
          alert_enabled = TRUE,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `;

    await sendTelegramMessage(
      sharedToken,
      matchedChatId,
      "✅ *FutureBet Connected!*\n\nYour account is now linked to FutureBet Auto-Alerts. You can customize your time slot, confidence, odds, and markets anytime in Settings."
    );

    return NextResponse.json({
      success: true,
      connected: true,
      chatId: matchedChatId,
      botUsername,
    });
  } catch (err: any) {
    console.error("POST /api/telegram/connect error:", err);
    return NextResponse.json({ error: "Failed to verify Telegram connection" }, { status: 500 });
  }
}
