import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

const SILVER_DAILY_LIMIT = 20;

const toInt = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Load tier
    const [userRecord] = await sql`
      SELECT user_role, subscription_status, subscription_expires_at
      FROM auth_users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const role = userRecord?.user_role || "free";
    const subStatus = userRecord?.subscription_status || "free";
    const subValid =
      !userRecord?.subscription_expires_at ||
      new Date(userRecord.subscription_expires_at) > new Date();

    const isAdmin = role === "admin";
    const isPremium =
      isAdmin || role === "premium" || (subStatus === "premium" && subValid);
    const isSilver =
      isPremium || role === "silver" || (subStatus === "silver" && subValid);

    const isUnlimited = isAdmin || isPremium;

    // Today usage
    const [todayUsage] = await sql`
      SELECT COUNT(*)::int AS today_insights
      FROM ai_insight_usage
      WHERE user_id = ${userId}
        AND DATE(created_at) = CURRENT_DATE
    `;

    const used = toInt(todayUsage?.today_insights, 0);

    const dailyLimit = isUnlimited ? null : isSilver ? SILVER_DAILY_LIMIT : 0;
    const remaining = isUnlimited ? "unlimited" : Math.max(0, (dailyLimit ?? 0) - used);

    return Response.json({
      ok: true,
      isUnlimited,
      dailyLimit,
      used,
      remaining,
      canUse: isUnlimited || (typeof remaining === "number" && remaining > 0)
    });
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return Response.json(
      {
        ok: false,
        error: "We couldn't load your AI usage right now.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Load tier
    const [userRecord] = await sql`
      SELECT user_role, subscription_status, subscription_expires_at
      FROM auth_users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const role = userRecord?.user_role || "free";
    const subStatus = userRecord?.subscription_status || "free";
    const subValid =
      !userRecord?.subscription_expires_at ||
      new Date(userRecord.subscription_expires_at) > new Date();

    const isAdmin = role === "admin";
    const isPremium =
      isAdmin || role === "premium" || (subStatus === "premium" && subValid);
    const isSilver =
      isPremium || role === "silver" || (subStatus === "silver" && subValid);

    const isUnlimited = isAdmin || isPremium;

    if (!isSilver) {
       return Response.json(
         { ok: false, error: "Upgrade to Silver or Premium to use AI Insights." },
         { status: 403 }
       );
    }

    if (!isUnlimited) {
      const [todayUsage] = await sql`
        SELECT COUNT(*)::int AS today_insights
        FROM ai_insight_usage
        WHERE user_id = ${userId}
          AND DATE(created_at) = CURRENT_DATE
      `;

      const used = toInt(todayUsage?.today_insights, 0);
      if (used >= SILVER_DAILY_LIMIT) {
        return Response.json(
          { ok: false, error: "Daily limit reached. Upgrade to Premium for unlimited." },
          { status: 403 }
        );
      }
    }

    // Record the usage
    await sql`
      INSERT INTO ai_insight_usage (user_id, match_id)
      VALUES (${userId}, 'local-insight')
    `;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error tracking AI usage:", error);
    return Response.json(
      { ok: false, error: "Failed to track usage" },
      { status: 500 }
    );
  }
}
