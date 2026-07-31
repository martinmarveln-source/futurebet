// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(req) {
  try {
    const session = await auth();

    // If user is logged in, they don't need guest tracking
    if (session?.user?.id) {
      return Response.json({ canUse: true, remaining: "unlimited" });
    }

    // For guest users, get IP address as identifier
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    // Create a more unique identifier combining IP and user agent hash
    const guestIdentifier = `${ip}_${userAgent.slice(0, 50)}`;

    const { matchData } = await req.json();

    // Check today's usage for this guest
    const [todayUsage] = await sql`
      SELECT COUNT(*) as comparison_count
      FROM guest_comparisons 
      WHERE guest_identifier = ${guestIdentifier}
      AND DATE(created_at) = CURRENT_DATE
    `;

    const usageCount = parseInt(todayUsage.comparison_count) || 0;

    if (usageCount >= 5) {
      return Response.json(
        {
          canUse: false,
          remaining: 0,
          error: "Daily limit reached. Sign in for unlimited access.",
        },
        { status: 429 },
      );
    }

    // Record the usage
    await sql`
      INSERT INTO guest_comparisons (guest_identifier, comparison_data, created_at)
      VALUES (${guestIdentifier}, ${JSON.stringify(matchData || {})}, NOW())
    `;

    return Response.json({
      canUse: true,
      remaining: 5 - usageCount - 1,
    });
  } catch (error) {
    console.error("Error tracking guest comparison:", error);
    return Response.json({ error: "Failed to track usage" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await auth();

    // If user is logged in, they have unlimited access
    if (session?.user?.id) {
      return Response.json({ remaining: "unlimited", canUse: true });
    }

    // For guest users, check remaining uses
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    const guestIdentifier = `${ip}_${userAgent.slice(0, 50)}`;

    const [todayUsage] = await sql`
      SELECT COUNT(*) as comparison_count
      FROM guest_comparisons 
      WHERE guest_identifier = ${guestIdentifier}
      AND DATE(created_at) = CURRENT_DATE
    `;

    const usageCount = parseInt(todayUsage.comparison_count) || 0;
    const remaining = Math.max(0, 5 - usageCount);

    return Response.json({
      remaining,
      canUse: remaining > 0,
    });
  } catch (error) {
    console.error("Error checking guest comparison usage:", error);
    return Response.json({ error: "Failed to check usage" }, { status: 500 });
  }
}
