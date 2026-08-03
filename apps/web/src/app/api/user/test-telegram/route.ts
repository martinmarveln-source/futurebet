import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, chatId } = await request.json();

    if (!token || !chatId) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const message = `
🚨 *FUTUREBET SYSTEM TEST* 🚨
━━━━━━━━━━━━━━━━━━
⚙️ _Your webhook integration is live._

The FutureBet AI engine is now authorized to push Elite Edge alerts directly to this device. 

Keep notifications on. When the algorithm detects a massive market mispricing, you will be the first to know.
━━━━━━━━━━━━━━━━━━
💰 *Command Center Active.*
    `;

    const url = `https://api.telegram.org/bot${token.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId.trim(), text: message, parse_mode: "Markdown" }),
    });

    const data = await response.json();
    
    if (data.ok) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Telegram API error", details: data }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error testing telegram:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
