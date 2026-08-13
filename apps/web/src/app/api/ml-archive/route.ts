import { NextResponse } from "next/server";
import sql from "../utils/sql";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Check session
    const sessionData = await auth();

    const email = sessionData?.user?.email;

    if (email) {
      // Check role from DB
      const users = await sql`
        SELECT user_role, subscription_status, subscription_expires_at
        FROM auth_users
        WHERE email = ${email}
        LIMIT 1
      `;
      const user = users[0];
      const role = user?.user_role || "free";
      const sub = user?.subscription_status || "free";
      const expiresAt = user?.subscription_expires_at
        ? new Date(user.subscription_expires_at)
        : null;
      const subValid = !expiresAt || expiresAt > new Date();

      const isAdmin = role === "admin";
      const isPremium =
        isAdmin ||
        role === "premium" ||
        role === "pro" ||
        role === "silver" ||
        (subValid && (sub === "premium" || sub === "pro" || sub === "silver"));

      if (!isAdmin && !isPremium) {
        return NextResponse.json(
          { error: "Premium or Silver access required", code: "PREMIUM_REQUIRED" },
          { status: 200 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Premium access required", code: "PREMIUM_REQUIRED" },
        { status: 200 }
      );
    }

    const data = await sql`
      SELECT 
        model_chance as chance, 
        model_rating as rating, 
        algorithm_pick as market, 
        ft_result as result
      FROM sandbox_archive
      WHERE ft_result IN ('W', 'L')
      ORDER BY match_date DESC
    `;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: any) {
    console.error("Failed to load archive data:", err);
    return NextResponse.json(
      { error: "Failed to load archive data" },
      { status: 500 }
    );
  }
}