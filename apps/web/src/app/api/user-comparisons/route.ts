// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;

    // Check user permissions
    const [userRecord] = await sql`
      SELECT user_role, subscription_status, subscription_expires_at 
      FROM auth_users 
      WHERE id = ${user.id}
    `;

    // 🔥 UPGRADE: Hierarchical & Subscription-Aware Role Checking
    const role = userRecord?.user_role || "free";
    const subStatus = userRecord?.subscription_status || "free";
    const subValid =
      userRecord?.subscription_expires_at &&
      new Date(userRecord.subscription_expires_at) > new Date();

    const isAdmin = role === "admin";
    const isPremium =
      isAdmin || role === "premium" || (subStatus === "premium" && subValid);
    const isSilver =
      isPremium || role === "silver" || (subStatus === "silver" && subValid);

    // Admin, Premium, and Silver users have unlimited access
    if (isSilver) {
      return Response.json({
        canUse: true,
        remaining: "unlimited",
        isUnlimited: true,
        userType: isAdmin ? "admin" : isPremium ? "premium" : "silver",
      });
    }

    // Regular logged-in users have 10 comparisons per day
    const [usage] = await sql`
      SELECT COUNT(*) as comparison_count
      FROM user_comparisons 
      WHERE user_id = ${user.id}
      AND DATE(created_at) = CURRENT_DATE
    `;

    const todayUsage = parseInt(usage.comparison_count) || 0;
    const canUse = todayUsage < 10;
    const remaining = Math.max(0, 10 - todayUsage);

    return Response.json({
      canUse,
      remaining,
      used: todayUsage,
      limit: 10,
      isUnlimited: false,
      userType: "logged-in",
    });
  } catch (error) {
    console.error("Error fetching user comparison usage:", error);
    return Response.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;
    const { matchData } = await req.json();

    // Check user permissions
    const [userRecord] = await sql`
      SELECT user_role, subscription_status, subscription_expires_at 
      FROM auth_users 
      WHERE id = ${user.id}
    `;

    // 🔥 UPGRADE: Hierarchical & Subscription-Aware Role Checking
    const role = userRecord?.user_role || "free";
    const subStatus = userRecord?.subscription_status || "free";
    const subValid =
      userRecord?.subscription_expires_at &&
      new Date(userRecord.subscription_expires_at) > new Date();

    const isAdmin = role === "admin";
    const isPremium =
      isAdmin || role === "premium" || (subStatus === "premium" && subValid);
    const isSilver =
      isPremium || role === "silver" || (subStatus === "silver" && subValid);

    // Admin, Premium, and Silver users have unlimited access - just track usage
    if (isSilver) {
      await sql`
        INSERT INTO user_comparisons (user_id, comparison_data)
        VALUES (${user.id}, ${JSON.stringify(matchData)})
      `;

      return Response.json({
        success: true,
        unlimited: true,
        userType: isAdmin ? "admin" : isPremium ? "premium" : "silver",
      });
    }

    // Regular logged-in users: check daily limit
    const [usage] = await sql`
      SELECT COUNT(*) as comparison_count
      FROM user_comparisons 
      WHERE user_id = ${user.id}
      AND DATE(created_at) = CURRENT_DATE
    `;

    const todayUsage = parseInt(usage.comparison_count) || 0;

    if (todayUsage >= 10) {
      return Response.json(
        { error: "Daily comparison limit reached (10 per day)" },
        { status: 429 }
      );
    }

    // Track the comparison usage
    await sql`
      INSERT INTO user_comparisons (user_id, comparison_data)
      VALUES (${user.id}, ${JSON.stringify(matchData)})
    `;

    const remaining = 10 - (todayUsage + 1);

    return Response.json({
      success: true,
      used: todayUsage + 1,
      remaining,
      limit: 10,
      unlimited: false,
      userType: "logged-in",
    });
  } catch (error) {
    console.error("Error tracking user comparison:", error);
    return Response.json(
      { error: "Failed to track comparison usage" },
      { status: 500 }
    );
  }
}