import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check how many PENDING_REWARD referrals this user has
    const referrals = await sql`
      SELECT * FROM referrals
      WHERE referrer_id = ${userId} AND status = 'PENDING_REWARD'
      ORDER BY created_at ASC
    `;

    if (referrals.length < 15) {
      return NextResponse.json(
        { error: `You need ${15 - referrals.length} more referrals to claim a reward.` },
        { status: 400 }
      );
    }

    // Take the first 15 pending referrals
    const batch = referrals.slice(0, 15);
    const batchIds = batch.map(r => r.id);

    // Check how many have upgraded within 10 days of signup
    const validUpgrades = batch.filter(r => {
      if (!r.has_upgraded || !r.upgraded_at || !r.created_at) return false;
      const upgradeTime = new Date(r.upgraded_at).getTime();
      const createTime = new Date(r.created_at).getTime();
      const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
      return (upgradeTime - createTime) <= tenDaysMs;
    });

    // If at least 5 upgraded within 10 days, grant 17 days of FULL premium.
    // Otherwise, grant 7 days of restricted premium.
    const hasEnoughUpgrades = validUpgrades.length >= 5;
    
    // Check current user status to extend if needed
    const currentUserReq = await sql`SELECT subscription_expires_at, is_restricted_trial FROM auth_users WHERE id = ${userId}`;
    const currentUser = currentUserReq[0];
    
    let baseDate = new Date();
    if (currentUser?.subscription_expires_at && new Date(currentUser.subscription_expires_at) > baseDate) {
      baseDate = new Date(currentUser.subscription_expires_at);
    }

    let newExpiry: Date;
    let newIsRestrictedTrial = currentUser?.is_restricted_trial || false;

    if (hasEnoughUpgrades) {
      newExpiry = new Date(baseDate.getTime() + 17 * 24 * 60 * 60 * 1000);
      newIsRestrictedTrial = false; // Remove restriction if they had it
    } else {
      newExpiry = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      // Keep their current restriction status (if they are on full premium, don't restrict them)
    }

    // Update user
    await sql`
      UPDATE auth_users 
      SET subscription_expires_at = ${newExpiry}, is_restricted_trial = ${newIsRestrictedTrial}
      WHERE id = ${userId}
    `;

    // Mark referrals as REWARDED
    await sql`
      UPDATE referrals
      SET status = 'REWARDED'
      WHERE id = ANY(${batchIds})
    `;

    return NextResponse.json({
      success: true,
      rewardType: hasEnoughUpgrades ? "FULL_PREMIUM_17_DAYS" : "RESTRICTED_PREMIUM_7_DAYS",
      expiresAt: newExpiry
    });

  } catch (error) {
    console.error("Error claiming referral reward:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
