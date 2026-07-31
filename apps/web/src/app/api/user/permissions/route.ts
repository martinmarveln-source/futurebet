// @ts-nocheck
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({
        hasAccess: false,
        role: "guest",
        subscription: "none",
        isAdmin: false,
        isPremium: false,
        isSilver: false,
        hasValidSubscription: false,
        hasFilterAccess: false,
        canAccessAIInsights: false,
      });
    }

    const users = await sql`
      SELECT user_role, subscription_status, subscription_expires_at 
      FROM auth_users 
      WHERE email = ${session.user.email}
    `;

    const user = users[0];

    if (!user) {
      return Response.json({
        hasAccess: false,
        role: "guest",
        subscription: "none",
        isAdmin: false,
        isPremium: false,
        isSilver: false,
        hasValidSubscription: false,
        hasFilterAccess: false,
        canAccessAIInsights: false,
      });
    }

    // 🔥 UPGRADE: Hierarchical & Subscription-Aware Role Checking
    const role = user.user_role || "free";
    const subStatus = user.subscription_status || "free";

    // Treat null/empty expiry as "lifetime" valid, otherwise check if date is in the future
    const subValid =
      !user.subscription_expires_at ||
      new Date(user.subscription_expires_at) > new Date();

    const isAdmin = role === "admin";
    const isPremium =
      isAdmin || role === "premium" || (subStatus === "premium" && subValid);
    // Silver inherits all Premium and Admin rights downwards
    const isSilver =
      isPremium || role === "silver" || (subStatus === "silver" && subValid);

    const hasValidSubscription = isAdmin || subValid;

    // Filter access: Admin, Premium, or Silver users (handled by the cascade)
    const hasFilterAccess = isSilver;

    // AI Insights access: Only Admin and Premium users (NOT Silver)
    const canAccessAIInsights = isPremium;

    return Response.json({
      hasAccess: true,
      role: role,
      subscription: subStatus,
      isAdmin,
      isPremium,
      isSilver,
      hasValidSubscription,
      hasFilterAccess,
      subscriptionExpiresAt: user.subscription_expires_at,

      // Feature access permissions
      canAccessAIInsights, // Only Admin & Premium
      canAccessAdvancedFilters: hasFilterAccess, // Admin, Premium, Silver
      canAccessAnalytics: hasFilterAccess, // Admin, Premium, Silver
      canAccessPremiumFeatures: isSilver, // All paid tiers
      canAccessAllFeatures: isAdmin, // Only Admins get everything

      // Admin override flags
      adminOverride: isAdmin,
      unlimitedAccess: isAdmin,
    });
  } catch (error) {
    console.error("Error checking user permissions:", error);
    return Response.json(
      {
        hasAccess: false,
        role: "guest",
        subscription: "none",
        isAdmin: false,
        isPremium: false,
        isSilver: false,
        hasValidSubscription: false,
        hasFilterAccess: false,
        canAccessAIInsights: false,
        error: "Failed to check permissions",
      },
      { status: 500 }
    );
  }
}