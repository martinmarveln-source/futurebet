import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Auth check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const session = await auth();
      if (!session?.user?.email) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const users = await sql`SELECT user_role, subscription_status, subscription_expires_at FROM auth_users WHERE email = ${session.user.email}`;
      const u = users[0];
      const role = u?.user_role || "free";
      const sub = u?.subscription_status || "free";
      const valid = !u?.subscription_expires_at || new Date(u.subscription_expires_at) > new Date();
      const isPremiumOrAdmin =
        role === "admin" ||
        role === "pro" ||
        role === "premium" ||
        (valid && (sub === "premium" || sub === "pro"));

      if (!isPremiumOrAdmin) {
        return Response.json({ error: "Forbidden: Requires premium access" }, { status: 403 });
      }
    }

    const minChance = Number(url.searchParams.get("minChance") ?? 65);
    const minRating = Number(url.searchParams.get("minRating") ?? 55);
    const minRecents = Number(url.searchParams.get("minRecents") ?? 0);

    const today = new Date().toISOString().split('T')[0];

    // Fetch from database with live ft_score
    const dbPicks = await sql`
      SELECT 
        v.*, 
        m.ft_score as current_ft_score 
      FROM vip_picks v 
      LEFT JOIN matches_cache m ON v.match = m.match_label AND v.match_date = m.match_date
      WHERE v.match_date = ${today}
      AND REPLACE(v.chance_percent, '%', '')::NUMERIC >= ${minChance}
      AND v.rating_percent >= ${minRating}
      ORDER BY v.vip_score DESC
    `;
    
    // Map back to the exact JSON schema the frontend expects, replacing the ftScore in the payload with the current_ft_score!
    const mappedPicks = dbPicks.map(row => {
       const payload = row.payload;
       if (row.current_ft_score) {
         payload.ftScore = row.current_ft_score; // Ensures it's always auto-updated
       }
       return payload;
    });
    
    // JS filtering for recents
    const finalPicks = mappedPicks.filter(p => {
       if (minRecents > 0) {
         if ((p.meta?.H_Recent || 0) < minRecents || (p.meta?.A_Recent || 0) < minRecents) return false;
       }
       return true;
    });

    return Response.json({
      meta: {
        total: finalPicks.length,
        minChance,
        minRating,
        minRecents,
        source: "db-cache",
        cacheStatus: "fresh",
        date: today
      },
      picks: finalPicks
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });

  } catch (error) {
    console.error("Daily Generate Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}