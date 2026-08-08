import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import webpush from "web-push";

// Configure web-push with VAPID keys from environment variables
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

// VAPID keys will be configured inside the GET handler to catch initialization errors

// Ensure the push_subscriptions table exists (failsafe)
async function ensureSubscriptionsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, endpoint)
    )
  `;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") || request.headers.get("Authorization");
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: "VAPID keys not configured on server" },
      { status: 500 }
    );
  }

  try {
    webpush.setVapidDetails(
      "mailto:admin@futurebet.com", 
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (error: any) {
    console.error("VAPID Key Configuration Error:", error);
    return NextResponse.json(
      { error: "Invalid VAPID keys format in environment variables: " + error.message },
      { status: 500 }
    );
  }

  try {
    await ensureSubscriptionsTable();

    // 1. Fetch today's high-value matches
    const today = new Date().toISOString().split("T")[0];
    const matches = await sql`
      SELECT * FROM matches_cache 
      WHERE match_date = ${today}
        AND (guide IS NOT NULL AND guide != 'N/A')
        AND chance >= 70
        AND rating >= 60
      ORDER BY rating DESC, chance DESC
      LIMIT 10
    `;

    if (matches.length === 0) {
      return NextResponse.json({ message: "No high-value matches found today. Skipping push alerts." });
    }

    // 2. Format the push payload
    const bestMatch = matches[0];
    const pickLabel = bestMatch.guide;
    const bodyText = `${bestMatch.home_team} vs ${bestMatch.away_team}\nPick: ${pickLabel} (${bestMatch.chance}% Confidence)\nTotal top picks today: ${matches.length}`;
    
    const payload = JSON.stringify({
      title: "🔥 High-Value Picks Detected!",
      body: bodyText,
      url: "/",
    });

    // 3. Fetch all active subscriptions
    const subscriptions = await sql`SELECT * FROM push_subscriptions`;
    
    if (subscriptions.length === 0) {
      return NextResponse.json({ message: "No active push subscriptions found." });
    }

    let successCount = 0;
    let failureCount = 0;

    // 4. Broadcast to all subscriptions
    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (error: any) {
        console.error("Error sending push to endpoint:", sub.endpoint, error);
        
        // If the subscription is expired/invalid (410 or 404), delete it from our DB
        if (error.statusCode === 410 || error.statusCode === 404) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        }
        failureCount++;
      }
    });

    await Promise.all(pushPromises);

    return NextResponse.json({
      message: "Push alerts broadcast complete",
      stats: {
        matchesFound: matches.length,
        totalSubscriptions: subscriptions.length,
        successCount,
        failureCount
      }
    });

  } catch (error: any) {
    console.error("Push Alert Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
