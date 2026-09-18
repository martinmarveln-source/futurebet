import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") || request.headers.get("Authorization");
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get admin telegram credentials for the report
    const admins = await sql`
      SELECT up.telegram_bot_token, up.telegram_chat_id
      FROM user_preferences up
      JOIN auth_users au ON au.id = up.user_id
      WHERE au.user_role = 'admin' 
        AND up.telegram_bot_token IS NOT NULL 
        AND up.telegram_bot_token != ''
        AND up.telegram_chat_id IS NOT NULL 
        AND up.telegram_chat_id != ''
      LIMIT 1
    `;

    if (admins.length === 0) {
      return NextResponse.json({ error: "No admin configured with Telegram credentials." }, { status: 400 });
    }

    const { telegram_bot_token, telegram_chat_id } = admins[0];

    // 2. Run diagnostics
    const today = new Date().toISOString().split("T")[0];
    
    // Check total matches loaded for today
    const [matchesResult] = await sql`SELECT COUNT(*) as count FROM matches_cache WHERE match_date = ${today}`;
    const todayMatchCount = Number(matchesResult?.count || 0);

    // Check last sync time (has the scraper run today?)
    const [syncResult] = await sql`
      SELECT COUNT(*) as count 
      FROM matches_cache 
      WHERE DATE(synced_at) = CURRENT_DATE
    `;
    const syncedTodayCount = Number(syncResult?.count || 0);

    // Check for stale missing scores (matches older than 3 hours with no score)
    const [missingScoresResult] = await sql`
      SELECT COUNT(*) as count 
      FROM matches_cache 
      WHERE match_date = ${today} 
        AND match_time IS NOT NULL
        AND (ft_score IS NULL OR ft_score = '')
        AND (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') > 
            (match_date::timestamp + match_time::time + interval '3 hours')
    `;
    const missingScoresCount = Number(missingScoresResult?.count || 0);
    
    // Total DB Size
    const [dbSizeResult] = await sql`SELECT COUNT(*) as count FROM matches_cache`;
    const totalDbMatches = Number(dbSizeResult?.count || 0);

    // AI Configuration Check
    const geminiKeyStatus = process.env.GEMINI_API_KEY ? "✅ Configured" : "❌ Missing";
    const cronSecretStatus = process.env.CRON_SECRET ? "✅ Configured" : "❌ Missing";

    // 3. Build the report
    const statusIcon = (todayMatchCount > 0 && syncedTodayCount > 0) ? "🟢 OK" : "🔴 ERROR";
    
    const report = `
📊 *FutureBet System Health Report*
_System Status:_ ${statusIcon}

*Database Diagnostics*
- Total Matches Today: \`${todayMatchCount}\`
- Synced Today: \`${syncedTodayCount}\`
- Stale Missing Scores: \`${missingScoresCount > 0 ? "⚠️ " + missingScoresCount : "✅ 0"}\`
- Total Matches in DB: \`${totalDbMatches}\`

*Environment Integrity*
- Gemini AI Key: ${geminiKeyStatus}
- Cron Secret: ${cronSecretStatus}

${todayMatchCount === 0 ? "🚨 *CRITICAL:* No matches loaded for today! Please check the Match Sync cron." : ""}
${syncedTodayCount === 0 ? "🚨 *CRITICAL:* The Match Sync cron has not run today!" : ""}
    `.trim();

    // 4. Send to Telegram
    const ok = await sendTelegram(telegram_bot_token, telegram_chat_id, report);

    if (!ok) {
      throw new Error("Failed to send Telegram message");
    }

    return NextResponse.json({ success: true, message: "Health check report sent to Admin Telegram." });
  } catch (error: any) {
    console.error("Health check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
