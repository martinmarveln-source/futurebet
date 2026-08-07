import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    
    if (!dateParam) {
      return Response.json({ error: "Missing date parameter" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "UNAUTHORIZED", message: "Please sign in" }, { status: 401 });
    }

    // Load user tier
    const [userRecord] = await sql`
      SELECT user_role, subscription_status, subscription_expires_at
      FROM auth_users
      WHERE id = ${session.user.id}
      LIMIT 1
    `;

    const role = userRecord?.user_role || "free";
    const subStatus = userRecord?.subscription_status || "free";
    const subValid =
      !userRecord?.subscription_expires_at ||
      new Date(userRecord.subscription_expires_at) > new Date();

    const isAdmin = role === "admin";
    const isPremium = isAdmin || role === "premium" || (subStatus === "premium" && subValid);
    const isSilver = isPremium || role === "silver" || (subStatus === "silver" && subValid);

    const hasAccess = isAdmin || isPremium || isSilver;

    if (!hasAccess) {
      return Response.json(
        { error: "FORBIDDEN", message: "Past Results archive is available to Silver, Premium, and Admin users only." },
        { status: 403 }
      );
    }

    // Fetch matches for this specific date
    const rows = await sql`
      SELECT raw_data 
      FROM matches_cache
      WHERE match_date = ${dateParam}
      ORDER BY match_time ASC
    `;

    // Filter to only include matches that have a valid full-time score
    const matchesWithResults = rows
      .map((r) => r.raw_data)
      .filter((m) => {
        const score = m.ftScore || m.ft_score || (m.raw_data && m.raw_data.ftScore);
        return score && typeof score === 'string' && score !== '#N/A' && score.includes(':');
      });

    return Response.json({
      matches: matchesWithResults,
      count: matchesWithResults.length,
      access: { isAdmin, isPremium, isSilver }
    });
  } catch (error: any) {
    console.error("GET /api/archive error:", error);
    return Response.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
