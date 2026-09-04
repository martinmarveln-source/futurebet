import { NextResponse } from "next/server";
import sql from "../../../utils/sql";
import { auth } from "@/auth";
import { hasPremiumAccess } from "@/utils/premium";

// ─── helpers ─────────────────────────────────────────────────────────────────

const parsePct = (v: any): number => {
  const n = parseFloat(String(v ?? "0").replace(/%/, ""));
  if (isNaN(n)) return 0;
  return n <= 1.0 ? n * 100 : n;
};

function calcConfidence(teamGp: number, teamStat: number, oppGp: number): number {
  const sampleScore    = Math.min(teamGp / 20, 1) * 35;
  const signalScore    = (Math.abs(teamStat - 50) / 50) * 35;
  const oppSampleScore = Math.min(oppGp / 20, 1) * 30;
  return Math.round(Math.min(100, sampleScore + signalScore + oppSampleScore));
}

interface FixturePredictions {
  opponent: string;
  date: string;
  isHome: boolean;
  markets: {
    btts: number | null;
    o15: number | null;
    o25: number | null;
    teamWin: number | null;
  };
  confidences: {
    btts: number | null;
    o15: number | null;
    o25: number | null;
    teamWin: number | null;
  };
  odds: {
    btts: any;
    o15: any;
    o25: any;
  };
}

function predictFixture(
  ms: any,
  oppMs: any,
  isHome: boolean,
  tGp: number,
  oGp: number,
  rawOdds: any
): FixturePredictions["markets"] & { confidences: FixturePredictions["confidences"] } {
  const tv = isHome ? "_HOME" : "_AWAY";
  const ov = isHome ? "_AWAY" : "_HOME";

  const calc = (tStat: number, oStat: number) => {
    if (isNaN(tStat) || isNaN(oStat)) return { pred: null, conf: null };
    return {
      pred: Math.round((tStat + oStat) / 2),
      conf: calcConfidence(tGp, tStat, oGp),
    };
  };

  const btts    = calc(parsePct(ms[`BTTS${tv}`]), parsePct(oppMs[`BTTS${ov}`]));
  const o15     = calc(parsePct(ms[`O15${tv}`]),  parsePct(oppMs[`O15${ov}`]));
  const o25     = calc(parsePct(ms[`O25${tv}`]),  parsePct(oppMs[`O25${ov}`]));
  const winT    = isHome ? parsePct(ms.Home_Win) : parsePct(ms.Away_Win);
  const winO    = isHome ? parsePct(oppMs.AWAY_LOST) : parsePct(oppMs.HOME_LOST);
  const teamWin = calc(winT, winO);

  return {
    btts:    btts.pred,
    o15:     o15.pred,
    o25:     o25.pred,
    teamWin: teamWin.pred,
    confidences: {
      btts:    btts.conf,
      o15:     o15.conf,
      o25:     o25.conf,
      teamWin: teamWin.conf,
    },
  };
}

// ─── route ───────────────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const sessionResponse = await auth();
    const isPremium = hasPremiumAccess(sessionResponse?.user);

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") || "2026/27";
    const league = searchParams.get("league") || "";

    const decodedTeamId = decodeURIComponent(teamId);

    // 1. Fetch this team's general stats from league_table_cache
    let generalStatsRows;
    if (league) {
      generalStatsRows = await sql`
        SELECT *, updated_at FROM league_table_cache
        WHERE REPLACE(LOWER(team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
          AND REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${league}), ' ', '-')
        LIMIT 1
      `;
    } else {
      generalStatsRows = await sql`
        SELECT *, updated_at FROM league_table_cache
        WHERE REPLACE(LOWER(team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
        LIMIT 1
      `;
    }

    const teamLeague = generalStatsRows?.[0]?.league || league;

    // 2. Fetch historical match data for form / betting stats
    let matchesRows;
    if (teamLeague) {
      matchesRows = await sql`
        SELECT * FROM matches_cache
        WHERE (REPLACE(LOWER(home_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
           OR  REPLACE(LOWER(away_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-'))
          AND REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${teamLeague}), ' ', '-')
          AND raw_data IS NOT NULL
        ORDER BY match_date DESC
      `;
    } else {
      matchesRows = await sql`
        SELECT * FROM matches_cache
        WHERE (REPLACE(LOWER(home_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
           OR  REPLACE(LOWER(away_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-'))
          AND raw_data IS NOT NULL
        ORDER BY match_date DESC
      `;
    }

    // 3. Parse market_stats
    let ms: any = null;
    if (generalStatsRows?.[0]?.market_stats) {
      ms = generalStatsRows[0].market_stats;
      if (typeof ms === "string") { try { ms = JSON.parse(ms); } catch (_) { ms = {}; } }
    }

    // 4. Compute next-fixture predictions from sheet data
    let homeFixture: FixturePredictions | null = null;
    let awayFixture: FixturePredictions | null = null;

    if (ms?.NEXT_H_Game_Against) {
      const oppName = ms.NEXT_H_Game_Against.trim().toLowerCase();
      // Look up opponent in same league
      const oppRows = await sql`
        SELECT market_stats FROM league_table_cache
        WHERE REPLACE(LOWER(team), ' ', '-') = REPLACE(LOWER(${oppName}), ' ', '-')
          AND REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${teamLeague}), ' ', '-')
        LIMIT 1
      `;
      const oppMs = (() => {
        if (!oppRows?.[0]) return null;
        let v = oppRows[0].market_stats;
        if (typeof v === "string") { try { v = JSON.parse(v); } catch (_) { v = null; } }
        return v;
      })();

      // Odds lookup from matches_cache
      const today = new Date().toISOString().split("T")[0];
      const oddsRow = await sql`
        SELECT raw_data FROM matches_cache
        WHERE REPLACE(LOWER(home_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
          AND REPLACE(LOWER(away_team), ' ', '-') = REPLACE(LOWER(${ms.NEXT_H_Game_Against}), ' ', '-')
          AND match_date >= ${today}::date
        LIMIT 1
      `;
      let rawOdds: any = {};
      if (oddsRow?.[0]?.raw_data) {
        rawOdds = typeof oddsRow[0].raw_data === "string"
          ? JSON.parse(oddsRow[0].raw_data) : oddsRow[0].raw_data;
      }

      const tGp = parseInt(ms.GP_HOME || "0", 10) || 0;
      const oGp = oppMs ? parseInt(oppMs.GP_AWAY || "0", 10) || 0 : 0;

      if (oppMs) {
        const pred = predictFixture(ms, oppMs, true, tGp, oGp, rawOdds);
        homeFixture = {
          opponent: ms.NEXT_H_Game_Against,
          date: ms.Next_H_Game_Date || "",
          isHome: true,
          markets: { btts: pred.btts, o15: pred.o15, o25: pred.o25, teamWin: pred.teamWin },
          confidences: pred.confidences,
          odds: { btts: rawOdds.bttsOdds, o15: rawOdds.o15Odds, o25: rawOdds.o25Odds },
        };
      } else {
        homeFixture = {
          opponent: ms.NEXT_H_Game_Against,
          date: ms.Next_H_Game_Date || "",
          isHome: true,
          markets: { btts: null, o15: null, o25: null, teamWin: null },
          confidences: { btts: null, o15: null, o25: null, teamWin: null },
          odds: { btts: rawOdds.bttsOdds, o15: rawOdds.o15Odds, o25: rawOdds.o25Odds },
        };
      }
    }

    if (ms?.NEXT_A_Game_Against) {
      const oppName = ms.NEXT_A_Game_Against.trim().toLowerCase();
      const oppRows = await sql`
        SELECT market_stats FROM league_table_cache
        WHERE REPLACE(LOWER(team), ' ', '-') = REPLACE(LOWER(${oppName}), ' ', '-')
          AND REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${teamLeague}), ' ', '-')
        LIMIT 1
      `;
      const oppMs = (() => {
        if (!oppRows?.[0]) return null;
        let v = oppRows[0].market_stats;
        if (typeof v === "string") { try { v = JSON.parse(v); } catch (_) { v = null; } }
        return v;
      })();

      const today = new Date().toISOString().split("T")[0];
      const oddsRow = await sql`
        SELECT raw_data FROM matches_cache
        WHERE REPLACE(LOWER(home_team), ' ', '-') = REPLACE(LOWER(${ms.NEXT_A_Game_Against}), ' ', '-')
          AND REPLACE(LOWER(away_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
          AND match_date >= ${today}::date
        LIMIT 1
      `;
      let rawOdds: any = {};
      if (oddsRow?.[0]?.raw_data) {
        rawOdds = typeof oddsRow[0].raw_data === "string"
          ? JSON.parse(oddsRow[0].raw_data) : oddsRow[0].raw_data;
      }

      const tGp = parseInt(ms.GP_AWAY || "0", 10) || 0;
      const oGp = oppMs ? parseInt(oppMs.GP_HOME || "0", 10) || 0 : 0;

      if (oppMs) {
        const pred = predictFixture(ms, oppMs, false, tGp, oGp, rawOdds);
        awayFixture = {
          opponent: ms.NEXT_A_Game_Against,
          date: ms.Next_A_Game_Date || "",
          isHome: false,
          markets: { btts: pred.btts, o15: pred.o15, o25: pred.o25, teamWin: pred.teamWin },
          confidences: pred.confidences,
          odds: { btts: rawOdds.bttsOdds, o15: rawOdds.o15Odds, o25: rawOdds.o25Odds },
        };
      } else {
        awayFixture = {
          opponent: ms.NEXT_A_Game_Against,
          date: ms.Next_A_Game_Date || "",
          isHome: false,
          markets: { btts: null, o15: null, o25: null, teamWin: null },
          confidences: { btts: null, o15: null, o25: null, teamWin: null },
          odds: { btts: rawOdds.bttsOdds, o15: rawOdds.o15Odds, o25: rawOdds.o25Odds },
        };
      }
    }

    // 5. Build response
    const responseData: any = {
      team: decodedTeamId,
      season,
      updated_at: generalStatsRows?.[0]?.updated_at || null,
      general: { gp: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0 },
      goals: { scored: 0, conceded: 0, gf_per_game: 0, ga_per_game: 0 },
      home_away: { home: { gp: 0, wins: 0, gf_per_game: 0 }, away: { gp: 0, wins: 0, gf_per_game: 0 } },
      betting: { over_15: 0, over_25: 0, btts_yes: 0, clean_sheet: 0 },
      market_stats: ms,
      form: { overall: "", home: "", away: "" },
      fixtures: { home: homeFixture, away: awayFixture },
    };

    if (generalStatsRows?.[0]) {
      const g = generalStatsRows[0];
      const gp = parseInt(g.gp || "0");
      responseData.general = {
        gp,
        wins:    parseInt(g.win  || "0"),
        draws:   parseInt(g.draw || "0"),
        losses:  parseInt(g.lost || "0"),
        points:  parseInt(g.pts  || "0"),
        ppg:     parseFloat(g.ppg || "0"),
        scored:  parseInt(g.gs   || "0"),
        conceded:parseInt(g.gc   || "0"),
      };
      responseData.goals.scored   = parseInt(g.gs || "0");
      responseData.goals.conceded = parseInt(g.gc || "0");
      if (gp > 0) {
        responseData.goals.gf_per_game = parseFloat((responseData.goals.scored   / gp).toFixed(2));
        responseData.goals.ga_per_game = parseFloat((responseData.goals.conceded / gp).toFixed(2));
      }
    }

    if (matchesRows?.length) {
      let over15 = 0, over25 = 0, btts = 0, cleanSheets = 0;
      let homeGp = 0, homeWins = 0, homeGoals = 0;
      let awayGp = 0, awayWins = 0, awayGoals = 0;
      const overallForm: string[] = [];
      const homeForm: string[]    = [];
      const awayForm: string[]    = [];

      for (const match of matchesRows) {
        const isHome = match.home_team.toLowerCase().replace(/\s+/g, "-") === decodedTeamId.toLowerCase().replace(/\s+/g, "-");
        let rd = match.raw_data;
        if (typeof rd === "string") { try { rd = JSON.parse(rd); } catch (_) {} }
        if (!rd || typeof rd !== "object") continue;

        const hgs = parseInt(rd.hgs || "0");
        const ags = parseInt(rd.ags || "0");
        const totalGoals = hgs + ags;

        if (totalGoals > 1.5) over15++;
        if (totalGoals > 2.5) over25++;
        if (hgs > 0 && ags > 0) btts++;

        let result = "D";
        if (isHome) {
          if (ags === 0) cleanSheets++;
          if (hgs > ags) result = "W";
          else if (hgs < ags) result = "L";
          homeGp++; homeGoals += hgs;
          if (result === "W") homeWins++;
          if (homeForm.length < 5) homeForm.push(result);
        } else {
          if (hgs === 0) cleanSheets++;
          if (ags > hgs) result = "W";
          else if (ags < hgs) result = "L";
          awayGp++; awayGoals += ags;
          if (result === "W") awayWins++;
          if (awayForm.length < 5) awayForm.push(result);
        }
        if (overallForm.length < 5) overallForm.push(result);
      }

      const totalMatches = matchesRows.length;
      if (totalMatches > 0) {
        responseData.betting.over_15    = parseFloat(((over15 / totalMatches) * 100).toFixed(1));
        responseData.betting.over_25    = parseFloat(((over25 / totalMatches) * 100).toFixed(1));
        responseData.betting.btts_yes   = parseFloat(((btts / totalMatches) * 100).toFixed(1));
        responseData.betting.clean_sheet = parseFloat(((cleanSheets / totalMatches) * 100).toFixed(1));
      }

      responseData.home_away.home = {
        gp: homeGp, wins: homeWins,
        gf_per_game: homeGp > 0 ? parseFloat((homeGoals / homeGp).toFixed(2)) : 0,
        winRate: homeGp > 0 ? Math.round((homeWins / homeGp) * 100) : 0,
      };
      responseData.home_away.away = {
        gp: awayGp, wins: awayWins,
        gf_per_game: awayGp > 0 ? parseFloat((awayGoals / awayGp).toFixed(2)) : 0,
        winRate: awayGp > 0 ? Math.round((awayWins / awayGp) * 100) : 0,
      };

      responseData.form = {
        overall: overallForm.reverse().join(""),
        home:    homeForm.reverse().join(""),
        away:    awayForm.reverse().join(""),
      };
    }

    return NextResponse.json({ success: true, isPremium, ...responseData });
  } catch (error: any) {
    console.error("Team stats error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch team stats." }, { status: 500 });
  }
}
