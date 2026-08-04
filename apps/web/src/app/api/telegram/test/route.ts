import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { chatId } = await request.json();
    if (!chatId) {
      return Response.json({ error: "Chat ID is required" }, { status: 400 });
    }

    // Fetch the token securely from the database
    const prefs = await sql`SELECT telegram_bot_token FROM user_preferences WHERE user_id = ${userId}`;
    const botToken = prefs.length > 0 ? prefs[0].telegram_bot_token : null;

    if (!botToken) {
      return Response.json({ error: "No Telegram Bot Token configured. Please save your settings first." }, { status: 400 });
    }

    // Send the test message from the server side
    const telegramUrl = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: "✅ FutureBet Test Alert!\n\nYour bot is successfully connected and ready to receive automated prediction alerts.",
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return Response.json({ success: true, message: "Test alert sent successfully" });
    } else {
      console.error("Telegram API Error:", data);
      return Response.json({ error: "Telegram API Error", details: data.description }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error in /api/telegram/test:", error);
    return Response.json({ error: "Failed to send test message", details: error.message }, { status: 500 });
  }
}
