// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

const PREMIUM_DAILY_LIMIT = 10;
const TZ = "Africa/Lagos";

const toInt = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "today").toLowerCase();

    // ✅ Load tier
    const [userRecord] = await sql`
      SELECT user_role, subscription_status, subscription_expires_at
      FROM auth_users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const isAdmin = userRecord?.user_role === "admin";
    const isPremium =
      userRecord?.subscription_status === "premium" &&
      userRecord?.subscription_expires_at &&
      new Date(userRecord.subscription_expires_at) > new Date();

    const isSilver =
      userRecord?.subscription_status === "silver" &&
      userRecord?.subscription_expires_at &&
      new Date(userRecord.subscription_expires_at) > new Date();

    const isPro = Boolean(isAdmin || isPremium || isSilver);

    // ✅ Totals for selected period
    let totalUsage;
    if (period === "today") {
      [totalUsage] = await sql`
        SELECT
          COUNT(*)::int AS total_insights,
          COALESCE(SUM(credits_used), 0)::int AS total_credits
        FROM ai_insight_usage
        WHERE user_id = ${userId}
        AND DATE(created_at) = CURRENT_DATE
      `;
    } else if (period === "7d") {
      [totalUsage] = await sql`
        SELECT
          COUNT(*)::int AS total_insights,
          COALESCE(SUM(credits_used), 0)::int AS total_credits
        FROM ai_insight_usage
        WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '7 days'
      `;
    } else if (period === "30d") {
      [totalUsage] = await sql`
        SELECT
          COUNT(*)::int AS total_insights,
          COALESCE(SUM(credits_used), 0)::int AS total_credits
        FROM ai_insight_usage
        WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '30 days'
      `;
    } else {
      [totalUsage] = await sql`
        SELECT
          COUNT(*)::int AS total_insights,
          COALESCE(SUM(credits_used), 0)::int AS total_credits
        FROM ai_insight_usage
        WHERE user_id = ${userId}
      `;
    }

    // ✅ 3AM Nigeria window (today window)
    const [todayUsage] = await sql`
      WITH bounds AS (
        SELECT
          (
            CASE
              WHEN (NOW() AT TIME ZONE ${TZ})::time >= time '03:00'
                THEN date_trunc('day', NOW() AT TIME ZONE ${TZ}) + time '03:00'
              ELSE (date_trunc('day', NOW() AT TIME ZONE ${TZ}) - interval '1 day') + time '03:00'
            END
          ) AT TIME ZONE ${TZ} AS start_utc,
          (
            (
              CASE
                WHEN (NOW() AT TIME ZONE ${TZ})::time >= time '03:00'
                  THEN date_trunc('day', NOW() AT TIME ZONE ${TZ}) + time '03:00'
                ELSE (date_trunc('day', NOW() AT TIME ZONE ${TZ}) - interval '1 day') + time '03:00'
              END
            ) + interval '1 day'
          ) AT TIME ZONE ${TZ} AS end_utc
      )
      SELECT
        COUNT(*)::int AS today_insights,
        COUNT(*) FILTER (WHERE insight_type = 'positive' OR insight_type IS NULL)::int AS today_positive,
        COUNT(*) FILTER (WHERE insight_type = 'reverse')::int AS today_reverse,
        (SELECT start_utc FROM bounds) AS window_start,
        (SELECT end_utc FROM bounds) AS window_end
      FROM ai_insight_usage, bounds
      WHERE user_id = ${userId}
        AND created_at >= bounds.start_utc
        AND created_at < bounds.end_utc
    `;

    const used = toInt(todayUsage?.today_insights, 0);

    const dailyLimit = (isAdmin || isPremium) ? null : isSilver ? 20 : 0;
    const remaining = (isAdmin || isPremium) ? null : Math.max(0, (dailyLimit ?? 0) - used);

    const resetsAt = todayUsage?.window_end
      ? new Date(todayUsage.window_end).toISOString()
      : null;

    const message = (isAdmin || isPremium)
      ? "Premium: unlimited AI Insights."
      : isSilver
        ? remaining > 0
          ? `You have ${remaining} AI Insight request${
              remaining === 1 ? "" : "s"
            } left. Reset is 3:00AM (WAT).`
          : "You’ve hit today’s AI Insight limit. It resets at 3:00AM (WAT)."
        : "AI Insights are Silver/Premium. Upgrade to unlock daily insights and risk analysis.";

    return Response.json({
      ok: true,
      period,

      isAdmin,
      isPremium,
      isPro,

      // limits (null = unlimited)
      dailyLimit,
      usedInWindow: used,
      remainingInWindow: remaining,
      windowStart: todayUsage?.window_start
        ? new Date(todayUsage.window_start).toISOString()
        : null,
      resetsAt,

      totalInsights: toInt(totalUsage?.total_insights, 0),
      totalCredits: toInt(totalUsage?.total_credits, 0),

      todayPositiveInsights: toInt(todayUsage?.today_positive, 0),
      todayReverseInsights: toInt(todayUsage?.today_reverse, 0),

      message,
    });
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return Response.json(
      {
        ok: false,
        error:
          "We couldn’t load your AI usage right now. Please refresh and try again.",
      },
      { status: 500 },
    );
  }
}
