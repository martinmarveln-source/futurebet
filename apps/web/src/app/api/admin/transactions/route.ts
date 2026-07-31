// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();

    // Check if user is logged in
    if (!session?.user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Check if user is admin
    const userRows = await sql`
      SELECT user_role FROM auth_users WHERE id = ${session.user.id}
    `;

    if (userRows.length === 0 || userRows[0].user_role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get query parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100,
    );
    const status = url.searchParams.get("status");
    const offset = (page - 1) * limit;

    // Build query with optional status filter
    let baseQuery = `
      SELECT 
        pt.id,
        pt.user_id,
        pt.transaction_id,
        pt.payment_provider,
        pt.customer_email,
        pt.amount,
        pt.currency,
        pt.status,
        pt.subscription_days,
        pt.processed_at,
        pt.expires_at,
        pt.created_at,
        pt.updated_at,
        au.name as user_name,
        au.email as user_email
      FROM payment_transactions pt
      LEFT JOIN auth_users au ON pt.user_id = au.id
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      baseQuery += ` WHERE pt.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    baseQuery += ` ORDER BY pt.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Fetch transactions
    const transactions = await sql(baseQuery, queryParams);

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM payment_transactions";
    const countParams = [];

    if (status) {
      countQuery += " WHERE status = $1";
      countParams.push(status);
    }

    const countResult = await sql(countQuery, countParams);
    const totalCount = parseInt(countResult[0].total);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return Response.json({
      transactions: transactions.map((t) => ({
        ...t,
        // Format dates for better display
        created_at: t.created_at,
        processed_at: t.processed_at,
        expires_at: t.expires_at,
        updated_at: t.updated_at,
      })),
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        status: status || null,
      },
    });
  } catch (error) {
    console.error("Error fetching payment transactions:", error);
    return Response.json(
      {
        error: "Failed to fetch payment transactions",
        message: error.message,
      },
      { status: 500 },
    );
  }
}

// Update transaction status (for admin use)
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
    const userRows = await sql`
      SELECT user_role FROM auth_users WHERE id = ${session.user.id}
    `;

    if (userRows.length === 0 || userRows[0].user_role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { transactionId, status, notes } = await request.json();

    if (!transactionId || !status) {
      return Response.json(
        { error: "Transaction ID and status required" },
        { status: 400 },
      );
    }

    // Valid status values
    const validStatuses = [
      "successful",
      "processing_failed",
      "user_not_found",
      "pending",
      "refunded",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return Response.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Update transaction status
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      // Add admin notes to raw_webhook_data
      const existingTransaction = await sql`
        SELECT raw_webhook_data FROM payment_transactions 
        WHERE transaction_id = ${transactionId}
      `;

      if (existingTransaction.length > 0) {
        const existingData = existingTransaction[0].raw_webhook_data || {};
        updateData.raw_webhook_data = JSON.stringify({
          ...existingData,
          admin_notes: notes,
          admin_updated_by: session.user.id,
          admin_updated_at: new Date().toISOString(),
        });
      }
    }

    await sql`
      UPDATE payment_transactions 
      SET 
        status = ${status},
        updated_at = ${updateData.updated_at}
        ${notes ? sql`, raw_webhook_data = ${updateData.raw_webhook_data}` : sql``}
      WHERE transaction_id = ${transactionId}
    `;

    return Response.json({
      success: true,
      message: "Transaction status updated successfully",
      transactionId,
      newStatus: status,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return Response.json(
      {
        error: "Failed to update transaction",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
