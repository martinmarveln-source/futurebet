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

// Helper to check if a URL is up and returns a 2xx or 3xx status
async function pingRoute(baseUrl: string, path: string) {
  try {
    const start = Date.now();
    const res = await fetch(`${baseUrl}${path}`, { method: "HEAD", redirect: "manual" });
    const ms = Date.now() - start;
    if (res.status >= 200 && res.status < 400) {
      return { path, status: res.status, ok: true, ms };
    }
    return { path, status: res.status, ok: false, ms };
  } catch (err: any) {
    return { path, status: "ERR", ok: false, ms: 0 };
  }
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

    // 2. Determine base URL for pinging
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "futurebet.com.ng";
    const baseUrl = `${protocol}://${host}`;

    // 3. Ping critical routes
    const routesToPing = [
      "/",
      "/stats",
      "/archive",
      "/account/signin",
      "/api/cron/missing-scores" // Check if the missing scores CSV generator is alive
    ];
    
    const pingResults = await Promise.all(routesToPing.map(path => pingRoute(baseUrl, path)));
    const brokenRoutes = pingResults.filter(r => !r.ok);
    const allRoutesOk = brokenRoutes.length === 0;

    // 4. Run database diagnostics
    const today = new Date().toISOString().split("T")[0];
    const [matchesResult] = await sql`SELECT COUNT(*) as count FROM matches_cache WHERE match_date = ${today}`;
    const todayMatchCount = Number(matchesResult?.count || 0);

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

    // 5. Build the report
    const dbOk = (todayMatchCount > 0 && syncedTodayCount > 0);
    const overallOk = dbOk && allRoutesOk;
    const statusIcon = overallOk ? "🟢 OK" : "🔴 ERROR";
    
    let routeReport = "";
    if (allRoutesOk) {
      routeReport = "✅ All critical pages are up and responding.";
    } else {
      routeReport = brokenRoutes.map(r => `❌ \`${r.path}\` returned \`${r.status}\``).join("\n");
    }

    const report = `
📊 *FutureBet System Health Report*
_System Status:_ ${statusIcon}

*🌐 Uptime & Broken Links*
${routeReport}

*🗄️ Database Sync Status*
- Total Matches Today: \`${todayMatchCount}\`
- Synced Today: \`${syncedTodayCount}\`
- Stale Missing Scores: \`${missingScoresCount > 0 ? "⚠️ " + missingScoresCount : "✅ 0"}\`

${todayMatchCount === 0 ? "🚨 *CRITICAL:* No matches loaded for today! Please check the Match Sync cron." : ""}
${syncedTodayCount === 0 ? "🚨 *CRITICAL:* The Match Sync cron has not run today!" : ""}
    `.trim();

    // 6. Send to Telegram
    const ok = await sendTelegram(telegram_bot_token, telegram_chat_id, report);

    if (!ok) {
      throw new Error("Failed to send Telegram message");
    }

    return NextResponse.json({ 
      success: true, 
      overallOk,
      brokenRoutes,
      message: "Health check report sent to Admin Telegram." 
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
