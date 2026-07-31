// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Cache payment verifications to save API credits
const verificationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MANUAL_UPGRADE_PLANS = ["silver", "premium"];

function normalizeManualUpgradePlan(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const adminCheck = await sql`
      SELECT user_role FROM auth_users WHERE id = ${session.user.id}
    `;

    if (adminCheck.length === 0 || adminCheck[0].user_role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = String(searchParams.get("email") || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const users = await sql`
      SELECT
        id,
        email,
        user_role,
        subscription_status,
        subscription_expires_at
      FROM auth_users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `;

    if (!users.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("User lookup error:", error);

    return Response.json(
      {
        error: "User lookup failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { transactionId, email } = await request.json();

    if (!transactionId && !email) {
      return Response.json(
        { error: "Transaction ID or email required" },
        { status: 400 },
      );
    }

    // Check cache first (lightweight approach)
    const cacheKey = `verify_${transactionId || email}_${session.user.id}`;
    const cachedResult = verificationCache.get(cacheKey);

    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      console.log("Returning cached verification result");
      return Response.json({
        ...cachedResult.data,
        cached: true,
      });
    }

    // Verify payment with Selar API
    const selarApiKey = process.env.SELAR_API_KEY;
    if (!selarApiKey) {
      console.error("SELAR_API_KEY not configured");
      return Response.json(
        { error: "Payment verification service not configured" },
        { status: 500 },
      );
    }

    let verificationUrl;
    let queryParam;

    if (transactionId) {
      verificationUrl = `https://selar.com/api/transactions/${transactionId}`;
      queryParam = "";
    } else {
      verificationUrl = "https://selar.com/api/transactions";
      queryParam = `?customer_email=${encodeURIComponent(email)}&limit=10`;
    }

    console.log(
      `Verifying payment with Selar API: ${verificationUrl}${queryParam}`,
    );

    const selarResponse = await fetch(`${verificationUrl}${queryParam}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${selarApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!selarResponse.ok) {
      const errorText = await selarResponse.text();
      console.error("Selar API error:", selarResponse.status, errorText);

      // Cache negative result to avoid repeated API calls
      const negativeResult = {
        verified: false,
        error: "Payment verification failed",
        status: selarResponse.status,
      };

      verificationCache.set(cacheKey, {
        data: negativeResult,
        timestamp: Date.now(),
      });

      return Response.json(negativeResult, { status: 400 });
    }

    const verificationData = await selarResponse.json();
    console.log("Selar verification response:", verificationData);

    let paymentFound = false;
    let paymentData = null;

    if (transactionId) {
      // Direct transaction lookup
      paymentFound =
        verificationData.status === "successful" ||
        verificationData.status === "completed";
      paymentData = verificationData;
    } else {
      // Search by email in transactions list
      const transactions = verificationData.data || [];
      paymentData = transactions.find(
        (tx) =>
          tx.customer_email === email &&
          (tx.status === "successful" || tx.status === "completed"),
      );
      paymentFound = !!paymentData;
    }

    const result = {
      verified: paymentFound,
      transactionId: paymentData?.transaction_id || paymentData?.id,
      customerEmail: paymentData?.customer_email,
      amount: paymentData?.amount,
      status: paymentData?.status,
      date: paymentData?.created_at || paymentData?.date,
      cached: false,
    };

    // Cache the result
    verificationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return Response.json(result);
  } catch (error) {
    console.error("Payment verification error:", error);
    return Response.json(
      {
        error: "Payment verification failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
}

// Manual upgrade endpoint (for admin use or manual verification)
export async function PUT(request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Check if user is admin
    const adminCheck = await sql`
      SELECT user_role FROM auth_users WHERE id = ${session.user.id}
    `;

    if (adminCheck.length === 0 || adminCheck[0].user_role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const {
      userId,
      subscriptionDays = 30,
      plan = "premium",
    } = await request.json();

    const normalizedPlan = normalizeManualUpgradePlan(plan);

    if (!MANUAL_UPGRADE_PLANS.includes(normalizedPlan)) {
      return Response.json(
        { error: "Valid plan required (silver or premium)" },
        { status: 400 },
      );
    }

    const validSubscriptionDays = Math.min(
      365,
      Math.max(1, Number(subscriptionDays) || 30),
    );

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    // Calculate subscription expiry
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setDate(
      subscriptionExpiry.getDate() + validSubscriptionDays,
    );

    // Update user to premium status
    await sql`
  UPDATE auth_users 
  SET 
    subscription_status = ${normalizedPlan},
    subscription_expires_at = ${subscriptionExpiry.toISOString()},
    user_role = CASE 
      WHEN user_role = 'admin' THEN 'admin' 
      ELSE ${normalizedPlan} 
    END
  WHERE id = ${userId}
`;

    // Log the manual upgrade
    await sql`
      INSERT INTO user_sessions (user_id, session_data)
      VALUES (${userId}, ${JSON.stringify({
        type: "manual_upgrade",
        upgraded_by: session.user.id,
        upgraded_at: new Date().toISOString(),
        expires_at: subscriptionExpiry.toISOString(),
        subscription_days: validSubscriptionDays,
        plan: normalizedPlan,
      })})
    `;

    return Response.json({
      success: true,
      message: `User manually upgraded to ${normalizedPlan}`,
      expiresAt: subscriptionExpiry.toISOString(),
      plan: normalizedPlan,
    });
  } catch (error) {
    console.error("Manual upgrade error:", error);
    return Response.json(
      {
        error: "Manual upgrade failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
