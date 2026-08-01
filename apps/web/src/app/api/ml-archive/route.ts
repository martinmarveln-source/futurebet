import { NextResponse } from "next/server";
import sql from "../utils/sql";
import { auth } from "@/lib/auth";

// Helper to check premium access using better-auth session
async function checkPremiumAccess(request: Request) {
  const sessionData = await auth.api.getSession({
    headers: request.headers,
  });

  const user = sessionData?.user as any;
  return user?.isAdmin || user?.isPremium;
}

export async function GET(request: Request) {
  const hasAccess = await checkPremiumAccess(request);

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Premium access required" },
      { status: 403 }
    );
  }

  try {
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