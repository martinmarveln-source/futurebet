import { NextResponse } from "next/server";
import sql from "../../utils/sql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('Authorization');
  
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Create team_stats_cache
    await sql`
      CREATE TABLE IF NOT EXISTS team_stats_cache (
        id BIGSERIAL PRIMARY KEY,
        team_id TEXT NOT NULL,
        league_id TEXT NOT NULL,
        country TEXT NOT NULL,
        season TEXT NOT NULL,

        gp INT DEFAULT 0,
        wins INT DEFAULT 0,
        draws INT DEFAULT 0,
        losses INT DEFAULT 0,
        points INT DEFAULT 0,

        goals_for INT DEFAULT 0,
        goals_against INT DEFAULT 0,
        goal_difference INT DEFAULT 0,

        home_gp INT DEFAULT 0,
        home_wins INT DEFAULT 0,
        home_draws INT DEFAULT 0,
        home_losses INT DEFAULT 0,
        home_goals_for INT DEFAULT 0,
        home_goals_against INT DEFAULT 0,

        away_gp INT DEFAULT 0,
        away_wins INT DEFAULT 0,
        away_draws INT DEFAULT 0,
        away_losses INT DEFAULT 0,
        away_goals_for INT DEFAULT 0,
        away_goals_against INT DEFAULT 0,

        ppg NUMERIC(5,2) DEFAULT 0,
        win_rate NUMERIC(5,2) DEFAULT 0,

        over_05 NUMERIC(5,2) DEFAULT 0,
        over_15 NUMERIC(5,2) DEFAULT 0,
        over_25 NUMERIC(5,2) DEFAULT 0,
        over_35 NUMERIC(5,2) DEFAULT 0,

        under_15 NUMERIC(5,2) DEFAULT 0,
        under_25 NUMERIC(5,2) DEFAULT 0,
        under_35 NUMERIC(5,2) DEFAULT 0,

        btts_yes NUMERIC(5,2) DEFAULT 0,
        btts_no NUMERIC(5,2) DEFAULT 0,

        clean_sheet NUMERIC(5,2) DEFAULT 0,
        failed_to_score NUMERIC(5,2) DEFAULT 0,

        first_half_stats JSONB,
        corner_stats JSONB,

        form_last_5 TEXT,
        form_last_10 TEXT,

        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(team_id, league_id, season)
      )
    `;

    // 2. Add indexes to team_stats_cache
    await sql`CREATE INDEX IF NOT EXISTS idx_team_stats_team_season ON team_stats_cache(team_id, season);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_team_stats_league_season ON team_stats_cache(league_id, season);`;

    // 3. Add season column to matches_cache if it doesn't exist
    // We catch errors in case the column already exists (postgres will throw error on duplicate column)
    try {
      await sql`ALTER TABLE matches_cache ADD COLUMN season TEXT;`;
    } catch (e: any) {
      if (e.code !== '42701') { // 42701 = duplicate_column
        console.error(e);
      }
    }

    // 4. Update existing matches_cache with a default season if null
    await sql`UPDATE matches_cache SET season = '2026/27' WHERE season IS NULL;`;

    // 5. Add requested indexes to matches_cache
    await sql`CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches_cache(home_team);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches_cache(away_team);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_matches_league ON matches_cache(league);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_matches_season ON matches_cache(season);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_matches_league_season ON matches_cache(league, season);`;

    return NextResponse.json({
      success: true,
      message: "Phase 1 complete: team_stats_cache created and indexes added."
    });

  } catch (error: any) {
    console.error("Init stats DB error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
