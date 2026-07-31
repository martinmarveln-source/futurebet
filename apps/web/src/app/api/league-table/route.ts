// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
async function hasCompareAccessByUserId(userId) {
  if (!userId) return false;

  const rows = await sql`
    SELECT user_role, subscription_status, subscription_expires_at
    FROM auth_users
    WHERE id = ${userId}
    LIMIT 1
  `;

  const user = rows?.[0];
  if (!user) return false;

  const role = String(user.user_role || "").toLowerCase();
  const subscription = String(user.subscription_status || "").toLowerCase();
  const expiresAt = user.subscription_expires_at
    ? new Date(user.subscription_expires_at)
    : null;

  if (role === "admin") return true;

  if (subscription === "silver" || subscription === "premium") {
    if (!expiresAt || expiresAt > new Date()) {
      return true;
    }
  }

  return false;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const country = searchParams.get("country") || "";
    const league = searchParams.get("league") || "";
    const isCompareRequest = searchParams.get("compare") === "true";

    if (isCompareRequest) {
      const session = await auth();
      const hasAccess = await hasCompareAccessByUserId(session?.user?.id);

      if (!session?.user?.id || !hasAccess) {
        return Response.json(
          {
            error: "COMPARE_ACCESS_DENIED",
            message:
              "Team Compare is available on Silver, Premium and Admin plans only.",
          },
          { status: 403 },
        );
      }
    }
    const SHEET_ID = "1efYsSPNw6LJOmguPfJmzvq92o30ooAY2UgH_dbdYjq8";
    const SHEET_NAME = "table";

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

    const res = await fetch(url);
    const text = await res.text();

    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows || [];

    // Clean helper
    const clean = (v) =>
      String(v || "")
        .replace(/"/g, "")
        .trim();

    // Normalize helper (for matching league names)
    const normalize = (v) => clean(v).toLowerCase().replace(/\s+/g, "-");

    // Convert sheet rows to objects
    const table = rows.map((r) => ({
      sn: clean(r.c?.[0]?.v),
      country: clean(r.c?.[1]?.v),
      league: clean(r.c?.[2]?.v),
      team: clean(r.c?.[3]?.v),
      gp: clean(r.c?.[4]?.v),
      win: clean(r.c?.[5]?.v),
      draw: clean(r.c?.[6]?.v),
      lost: clean(r.c?.[7]?.v),
      gs: clean(r.c?.[8]?.v),
      gc: clean(r.c?.[9]?.v),
      gd: clean(r.c?.[10]?.v),
      pts: clean(r.c?.[11]?.v),
      ppg: clean(r.c?.[12]?.v),
      winRate: clean(r.c?.[13]?.v),
    }));

    // Filter requested league
    const filtered = table.filter(
      (r) =>
        normalize(r.country) === normalize(country) &&
        normalize(r.league) === normalize(league),
    );
    const sorted = filtered
      .sort((a, b) => b.pts - a.pts)
      .map((team, index) => ({
        ...team,
        sn: index + 1,
      }));

    return Response.json(sorted);
  } catch (err) {
    console.error("League table API error:", err);
    return Response.json([]);
  }
}
