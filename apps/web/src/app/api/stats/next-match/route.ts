import { NextResponse } from "next/server";
import sql from "../../utils/sql";

/**
 * GET /api/stats/next-match
 *
 * Query params:
 *   ?team=Arsenal&league=Premier+League  → single team next match
 *   ?league=Premier+League               → batch: all teams in league
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team") || "";
  const league = searchParams.get("league") || "";

  if (!league) {
    return NextResponse.json({ success: false, error: "league is required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  function buildLabel(matchDate: string): string {
    const diffMs = new Date(matchDate).getTime() - new Date(today).getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days > 1 && days < 7) return `In ${days} Days`;
    const d = new Date(matchDate);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function buildUrgency(label: string): "today" | "tomorrow" | "soon" | "upcoming" {
    if (label === "Today") return "today";
    if (label === "Tomorrow") return "tomorrow";
    if (label.startsWith("In")) return "soon";
    return "upcoming";
  }

  try {
    if (team) {
      // Single team query
      const rows = await sql`
        SELECT match_date, match_time, home_team, away_team, league, country
        FROM matches_cache
        WHERE (
            LOWER(TRIM(home_team)) = LOWER(TRIM(${team}))
            OR LOWER(TRIM(away_team)) = LOWER(TRIM(${team}))
          )
          AND LOWER(TRIM(league)) = LOWER(TRIM(${league}))
          AND match_date >= ${today}::date
          AND (raw_data->>'ft_score' IS NULL OR raw_data->>'ft_score' = '')
        ORDER BY match_date ASC, match_time ASC
        LIMIT 1
      `;

      if (!rows || rows.length === 0) {
        return NextResponse.json({ success: true, data: null });
      }

      const r = rows[0];
      const isHome = r.home_team.toLowerCase().trim() === team.toLowerCase().trim();
      const label = buildLabel(String(r.match_date).split("T")[0]);
      return NextResponse.json({
        success: true,
        data: {
          match_date: String(r.match_date).split("T")[0],
          match_time: r.match_time || "",
          home_team: r.home_team,
          away_team: r.away_team,
          opponent: isHome ? r.away_team : r.home_team,
          venue: isHome ? "Home" : "Away",
          label,
          urgency: buildUrgency(label),
          league: r.league,
          country: r.country,
        },
      });
    } else {
      // Batch query — all teams in league
      const rows = await sql`
        SELECT DISTINCT ON (LEAST(LOWER(TRIM(home_team)), LOWER(TRIM(away_team))), GREATEST(LOWER(TRIM(home_team)), LOWER(TRIM(away_team))))
          match_date, match_time, home_team, away_team
        FROM matches_cache
        WHERE LOWER(TRIM(league)) = LOWER(TRIM(${league}))
          AND match_date >= ${today}::date
          AND (raw_data->>'ft_score' IS NULL OR raw_data->>'ft_score' = '')
        ORDER BY 
          LEAST(LOWER(TRIM(home_team)), LOWER(TRIM(away_team))),
          GREATEST(LOWER(TRIM(home_team)), LOWER(TRIM(away_team))),
          match_date ASC
      `;

      // Build a map: teamName (lowercase) → next match info
      const teamMap: Record<string, any> = {};
      for (const r of rows) {
        const dateStr = String(r.match_date).split("T")[0];
        const label = buildLabel(dateStr);
        const urgency = buildUrgency(label);
        const entry = {
          match_date: dateStr,
          match_time: r.match_time || "",
          home_team: r.home_team,
          away_team: r.away_team,
          label,
          urgency,
        };
        const hKey = r.home_team.toLowerCase().trim();
        const aKey = r.away_team.toLowerCase().trim();
        if (!teamMap[hKey]) teamMap[hKey] = { ...entry, venue: "Home", opponent: r.away_team };
        if (!teamMap[aKey]) teamMap[aKey] = { ...entry, venue: "Away", opponent: r.home_team };
      }

      return NextResponse.json({ success: true, data: teamMap });
    }
  } catch (error: any) {
    console.error("next-match API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
