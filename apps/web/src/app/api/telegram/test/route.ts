import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { resolveSharedBotToken, sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json().catch(() => ({}));
    const prefs = await sql`
      SELECT telegram_bot_token, telegram_chat_id
      FROM user_preferences
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const chatId = String(body?.chatId || prefs?.[0]?.telegram_chat_id || "").trim();
    if (!chatId) {
      return Response.json(
        { error: "Telegram is not connected yet. Connect first or enter a Chat ID." },
        { status: 400 }
      );
    }

    const userToken = String(prefs?.[0]?.telegram_bot_token || "").trim();
    const botToken = userToken || (await resolveSharedBotToken());

    if (!botToken) {
      return Response.json(
        {
          error:
            "No Telegram bot token is configured yet. Admin must set TELEGRAM_BOT_TOKEN or save an Admin bot token.",
        },
        { status: 400 }
      );
    }

    const result = await sendTelegramMessage(
      botToken,
      chatId,
      "✅ *FutureBet Test Alert!*\n\nYour Telegram account is successfully connected and ready to receive automated prediction alerts."
    );

    if (result.ok) {
      return Response.json({ success: true, message: "Test alert sent successfully" });
    }

    console.error("Telegram API Error:", result.raw || result.description);
    return Response.json(
      { error: "Telegram API Error", details: result.description },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/telegram/test:", error);
    return Response.json(
      { error: "Failed to send test message", details: error.message },
      { status: 500 }
    );
  }
}
