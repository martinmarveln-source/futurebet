// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
async function hasCompareAccessByUserId(userId) {
  if (!userId) return false;

  const rows = await sql`
    SELECT user_role, subscription_status, subscription_expires_at
    FROM auth_users
    WHERE id = ${userId}
    LIMIT 1
  `;

  const user = rows?.[0];
  if (!user) return false;

  const role = String(user.user_role || "").toLowerCase();
  const subscription = String(user.subscription_status || "").toLowerCase();
  const expiresAt = user.subscription_expires_at
    ? new Date(user.subscription_expires_at)
    : null;

  if (role === "admin") return true;

  if (subscription === "silver" || subscription === "premium") {
    if (!expiresAt || expiresAt > new Date()) {
      return true;
    }
  }

  return false;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const country = searchParams.get("country") || "";
    const league = searchParams.get("league") || "";
    const isCompareRequest = searchParams.get("compare") === "true";

    if (isCompareRequest) {
      const session = await auth();
      const hasAccess = await hasCompareAccessByUserId(session?.user?.id);

      if (!session?.user?.id || !hasAccess) {
        return Response.json(
          {
            error: "COMPARE_ACCESS_DENIED",
            message:
              "Team Compare is available on Silver, Premium and Admin plans only.",
          },
          { status: 403 },
        );
      }
    }
    // Clean helper for normalization
    const clean = (v) => String(v || "").trim();
    const normalize = (v) => clean(v).toLowerCase().replace(/\s+/g, "-");

    const normCountry = normalize(country);
    const normLeague = normalize(league);

    // Fetch from database cache instead of live Google Sheets
    // If no country/league provided, return all rows
    let table = [];
    
    if (normCountry && normLeague) {
      const rows = await sql`SELECT * FROM league_table_cache`;
      table = rows.filter(
        (r) =>
          normalize(r.country) === normCountry &&
          normalize(r.league) === normLeague
      ).map(r => {
        let ms = r.market_stats;
        if (typeof ms === 'string' && ms) {
          try { ms = JSON.parse(ms); } catch(e) {}
        }
        return { ...r, market_stats: ms, winRate: r.win_rate };
      });
    } else {
      const rows = await sql`SELECT * FROM league_table_cache`;
      table = rows.map(r => {
        let ms = r.market_stats;
        if (typeof ms === 'string' && ms) {
          try { ms = JSON.parse(ms); } catch(e) {}
        }
        return { ...r, market_stats: ms, winRate: r.win_rate };
      });
    }

    // Sort by points desc, then gd desc
    const sorted = table.sort((a, b) => {
      const ptsA = parseInt(a.pts || 0, 10);
      const ptsB = parseInt(b.pts || 0, 10);
      if (ptsB !== ptsA) return ptsB - ptsA;

      const gdA = parseInt(a.gd || 0, 10);
      const gdB = parseInt(b.gd || 0, 10);
      return gdB - gdA;
    });

    return Response.json({ success: true, table: sorted }, { status: 200 });
  } catch (error) {
    console.error("League table error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch table" },
      { status: 500 },
    );
  }
}
