import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function PUT(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = Number(params?.id);
    if (!Number.isFinite(id)) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // Only allow updating manual bet rows (ticket_code is null)
    const [updated] = await sql`
      UPDATE user_performance_tracking
      SET
        status = COALESCE(${body.status}, status),
        actual_payout = COALESCE(${body.actual_payout}, actual_payout),
        match_name = COALESCE(${body.match_name}, match_name),
        league = COALESCE(${body.league}, league),
        prediction = COALESCE(${body.prediction}, prediction),
        bet_amount = COALESCE(${body.bet_amount}, bet_amount),
        potential_payout = COALESCE(${body.potential_payout}, potential_payout),
        match_date = COALESCE(${body.match_date}, match_date),
        updated_at = NOW()
      WHERE id = ${id}
        AND user_id = ${session.user.id}
        AND ticket_code IS NULL
      RETURNING *
    `;

    if (!updated) {
      return Response.json({ error: "Bet not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (err) {
    console.error("Bet PUT error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = Number(params?.id);
    if (!Number.isFinite(id)) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const res = await sql`
      DELETE FROM user_performance_tracking
      WHERE id = ${id}
        AND user_id = ${session.user.id}
        AND ticket_code IS NULL
      RETURNING id
    `;

    if (!res?.length) {
      return Response.json({ error: "Bet not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Bet DELETE error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
