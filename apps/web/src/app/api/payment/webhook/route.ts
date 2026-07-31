// @ts-nocheck
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    // Get the webhook payload from Selar
    const payload = await request.json();

    console.log("Selar webhook received:", payload);

    // Verify webhook authenticity (Selar sends specific fields)
    if (!payload.event_type || !payload.data) {
      console.error("Invalid webhook payload structure");
      return Response.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    }

    // Handle successful payment events
    if (
      payload.event_type === "payment.successful" ||
      payload.event_type === "order.successful"
    ) {
      const paymentData = payload.data;

      // Extract customer email and transaction details
      const customerEmail = paymentData.customer_email || paymentData.email;
      const transactionId = paymentData.transaction_id || paymentData.id;
      const amount = paymentData.amount || paymentData.total;
      const currency = paymentData.currency || "USD";

      if (!customerEmail || !transactionId) {
        console.error("Missing required fields in webhook payload:", {
          customerEmail,
          transactionId,
        });
        return Response.json(
          { error: "Customer email and transaction ID required" },
          { status: 400 },
        );
      }

      console.log(
        `Processing payment for ${customerEmail}, transaction: ${transactionId}`,
      );

      // Check if transaction already processed
      const existingTransaction = await sql`
        SELECT id, status FROM payment_transactions 
        WHERE transaction_id = ${transactionId}
      `;

      if (existingTransaction.length > 0) {
        console.log(
          `Transaction ${transactionId} already processed with status: ${existingTransaction[0].status}`,
        );
        return Response.json({
          success: true,
          message: "Transaction already processed",
          status: existingTransaction[0].status,
        });
      }

      // Find user by email
      const userRows = await sql`
        SELECT id, email, subscription_status, subscription_expires_at 
        FROM auth_users 
        WHERE email = ${customerEmail}
      `;

      if (userRows.length === 0) {
        console.error(`User not found for email: ${customerEmail}`);

        // Still record the transaction for manual processing later
        await sql`
          INSERT INTO payment_transactions (
            transaction_id, customer_email, amount, currency, 
            status, raw_webhook_data, payment_provider
          ) VALUES (
            ${transactionId}, ${customerEmail}, ${amount}, ${currency},
            'user_not_found', ${JSON.stringify(paymentData)}, 'selar'
          )
        `;

        return Response.json(
          {
            error:
              "User not found - transaction recorded for manual processing",
          },
          { status: 404 },
        );
      }

      const user = userRows[0];

      // Calculate subscription expiry (30 days from now)
      const subscriptionExpiry = new Date();
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);

      try {
        // Use transaction to ensure data consistency
        const results = await sql.transaction([
          // Update user to premium status
          sql`
            UPDATE auth_users 
            SET 
              subscription_status = 'premium',
              subscription_expires_at = ${subscriptionExpiry.toISOString()},
              user_role = CASE 
                WHEN user_role = 'admin' THEN 'admin' 
                ELSE 'premium' 
              END
            WHERE id = ${user.id}
          `,
          // Record the successful transaction
          sql`
            INSERT INTO payment_transactions (
              user_id, transaction_id, customer_email, amount, currency,
              status, subscription_days, raw_webhook_data, payment_provider,
              expires_at, processed_at
            ) VALUES (
              ${user.id}, ${transactionId}, ${customerEmail}, ${amount}, ${currency},
              'successful', 30, ${JSON.stringify(paymentData)}, 'selar',
              ${subscriptionExpiry.toISOString()}, CURRENT_TIMESTAMP
            )
          `,
          // Keep legacy session log for compatibility
          sql`
            INSERT INTO user_sessions (user_id, session_data)
            VALUES (${user.id}, ${JSON.stringify({
              type: "payment_upgrade",
              transaction_id: transactionId,
              amount: amount,
              currency: currency,
              upgraded_at: new Date().toISOString(),
              expires_at: subscriptionExpiry.toISOString(),
              payment_method: "selar",
              webhook_data: paymentData,
            })})
          `,
        ]);

        console.log(
          `Successfully upgraded user ${customerEmail} to premium (Transaction: ${transactionId})`,
        );

        return Response.json({
          success: true,
          message: "User upgraded to premium successfully",
          transactionId: transactionId,
          expiresAt: subscriptionExpiry.toISOString(),
        });
      } catch (dbError) {
        console.error("Database transaction failed:", dbError);

        // Record failed transaction
        await sql`
          INSERT INTO payment_transactions (
            user_id, transaction_id, customer_email, amount, currency,
            status, raw_webhook_data, payment_provider
          ) VALUES (
            ${user.id}, ${transactionId}, ${customerEmail}, ${amount}, ${currency},
            'processing_failed', ${JSON.stringify({ ...paymentData, error: dbError.message })}, 'selar'
          )
        `;

        throw dbError;
      }
    } else {
      console.log(`Unhandled webhook event: ${payload.event_type}`);
      return Response.json({
        success: true,
        message: "Webhook received but no action taken",
      });
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return Response.json(
      {
        error: "Webhook processing failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(request) {
  return Response.json({
    message: "FutureBet Payment Webhook Endpoint",
    status: "active",
  });
}
