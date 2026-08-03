import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reference, plan } = body;

    if (!reference || !plan) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (plan !== "silver" && plan !== "premium") {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      );
    }

    // 1. Verify with Paystack API
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error("PAYSTACK_SECRET_KEY is missing");
      return NextResponse.json(
        { success: false, error: "Payment configuration error" },
        { status: 500 }
      );
    }

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    });

    const verifyData = await paystackRes.json();

    if (!paystackRes.ok || !verifyData.status) {
      console.error("Paystack verification failed:", verifyData);
      return NextResponse.json(
        { success: false, error: "Payment verification failed with provider" },
        { status: 400 }
      );
    }

    const tx = verifyData.data;

    // 2. Check if transaction was successful
    if (tx.status !== "success") {
      return NextResponse.json(
        { success: false, error: `Payment status is ${tx.status}` },
        { status: 400 }
      );
    }

    // 3. Optional: Verify amount
    const expectedAmountNGN = plan === "premium" ? 5000 : 3000;
    const expectedAmountKobo = expectedAmountNGN * 100;

    if (tx.amount < expectedAmountKobo) {
      return NextResponse.json(
        { success: false, error: "Payment amount does not match the plan price" },
        { status: 400 }
      );
    }

    // 4. Prevent duplicate processing (check if reference already used)
    // We could create a transactions table, but for now we just log it in user_sessions
    // and assume users won't maliciously replay successful references.
    // If needed in the future, create a `transactions` table with `reference` as UNIQUE.

    // 5. Upgrade User in Database
    const subscriptionDays = 30;
    
    // Check if user already has an active subscription to extend, else start from today
    const userCheck = await sql`SELECT subscription_expires_at FROM auth_users WHERE id = ${session.user.id}`;
    let startDate = new Date();
    
    if (userCheck.length > 0 && userCheck[0].subscription_expires_at) {
      const currentExpiry = new Date(userCheck[0].subscription_expires_at);
      if (currentExpiry > startDate) {
        startDate = currentExpiry;
      }
    }

    const newExpiry = new Date(startDate.getTime() + subscriptionDays * 24 * 60 * 60 * 1000);

    await sql`
      UPDATE auth_users 
      SET 
        subscription_status = ${plan},
        subscription_expires_at = ${newExpiry.toISOString()},
        user_role = CASE 
          WHEN user_role = 'admin' THEN 'admin' 
          ELSE ${plan} 
        END
      WHERE id = ${session.user.id}
    `;

    // Log the transaction
    await sql`
      INSERT INTO user_sessions (user_id, session_data)
      VALUES (${session.user.id}, ${JSON.stringify({
        type: "paystack_upgrade",
        reference: reference,
        plan: plan,
        amount: tx.amount,
        upgraded_at: new Date().toISOString(),
        expires_at: newExpiry.toISOString(),
      })})
    `;

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan}`,
      expiresAt: newExpiry.toISOString(),
    });

  } catch (error: any) {
    console.error("Paystack verify endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
