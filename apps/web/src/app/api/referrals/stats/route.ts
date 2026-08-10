import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check and auto-generate referral code if missing
    const userRow = await sql`
      SELECT referral_code FROM auth_users WHERE id = ${userId}
    `;
    let referralCode = userRow[0]?.referral_code;

    if (!referralCode) {
      referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await sql`
        UPDATE auth_users 
        SET referral_code = ${referralCode} 
        WHERE id = ${userId}
      `;
    }

    // Count pending referrals for this user
    const stats = await sql`
      SELECT COUNT(*) as count 
      FROM referrals
      WHERE referrer_id = ${userId} AND status = 'PENDING_REWARD'
    `;

    const pendingCount = parseInt(stats[0].count, 10);

    return NextResponse.json({
      pendingCount,
      referralCode,
    });

  } catch (error) {
    console.error("Error fetching referral stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
