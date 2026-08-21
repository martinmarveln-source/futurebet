import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import { auth } from "@/auth";
import { hasPremiumAccess } from "@/utils/premium";

export async function GET(request: Request) {
  try {
    const sessionResponse = await auth();
    const user = sessionResponse?.user;

    if (!hasPremiumAccess(user)) {
      return NextResponse.json({ success: false, error: "premium_required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const minGames = parseInt(searchParams.get("minGames") || "4", 10);
    const split = searchParams.get("split") || "overall"; // overall, home, away
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const rows = await sql`SELECT * FROM league_table_cache`;

    let dateFilterSet: Set<string> | null = null;
    if (startDate || endDate) {
      const today = new Date().toISOString().split("T")[0];
      const start = startDate || today;
      const end = endDate || '2099-12-31';
      
      const matches = await sql`
        SELECT home_team, away_team, league 
        FROM matches_cache 
        WHERE match_date >= ${start}::date 
          AND match_date <= ${end}::date
          AND raw_data IS NOT NULL
      `;
      
      dateFilterSet = new Set();
      for (const m of matches) {
        const h = m.home_team?.trim().toLowerCase();
        const a = m.away_team?.trim().toLowerCase();
        const l = m.league?.trim().toLowerCase();
        if (h) dateFilterSet.add(`${h}|${l}`);
        if (a) dateFilterSet.add(`${a}|${l}`);
      }
    }

    const teams = rows.map(r => {
      let ms = r.market_stats;
      if (typeof ms === "string" && ms) {
        try { ms = JSON.parse(ms); } catch (e) {}
      }
      return {
        ...r,
        market_stats: ms || {}
      };
    });

    const parsePct = (v: any) => {
      const n = parseFloat(String(v ?? "0").replace(/%/, ""));
      if (isNaN(n)) return 0;
      return n <= 1.0 ? n * 100 : n;
    };

    // Filter out teams with less than required games played, and apply date filter if active
    const validTeams = teams.filter(t => {
      if ((t.gp || 0) < minGames) return false;
      if (dateFilterSet) {
        const tName = t.team?.trim().toLowerCase();
        const lName = t.league?.trim().toLowerCase();
        if (!dateFilterSet.has(`${tName}|${lName}`)) {
          return false;
        }
      }
      return true;
    });

    // Dynamic keys based on split
    const keySuffix = split === 'home' ? '_HOME' : split === 'away' ? '_AWAY' : '_ALL';
    
    // Helper to extract specific stat for a team based on split
    const getStat = (t: any, baseKey: string) => parsePct(t.market_stats[`${baseKey}${keySuffix}`]);
    const getInverse = (t: any, baseKey: string) => 100 - parsePct(t.market_stats[`${baseKey}${keySuffix}`]);

    const getGp = (t: any) => {
      if (split === 'home') return parseInt(t.market_stats.GP_HOME || '0', 10) || 0;
      if (split === 'away') return parseInt(t.market_stats.GP_AWAY || '0', 10) || 0;
      return parseInt(t.gp || '0', 10) || 0;
    };

    // Helper to get top 15 teams
    const getTop15 = (getValue: (t: any) => number, isAsc: boolean = false) => {
      return [...validTeams]
        .sort((a, b) => isAsc ? getValue(a) - getValue(b) : getValue(b) - getValue(a))
        .slice(0, 15)
        .map(t => ({ team: t.team, league: t.league, country: t.country, value: getValue(t), gp: getGp(t) }));
    };

    const teamData = {
      btts: getTop15(t => getStat(t, 'BTTS')),
      nbtts: getTop15(t => getInverse(t, 'BTTS')),
      o15: getTop15(t => getStat(t, 'O15')),
      u15: getTop15(t => getInverse(t, 'O15')),
      o25: getTop15(t => getStat(t, 'O25')),
      u25: getTop15(t => getInverse(t, 'O25')),
      o35: getTop15(t => getStat(t, 'O35')),
      u35: getTop15(t => getInverse(t, 'O35')),
      o45: getTop15(t => getStat(t, 'O45')),
      u45: getTop15(t => getInverse(t, 'O45')),
      fts: getTop15(t => getStat(t, 'FTS')),
      nfts: getTop15(t => getInverse(t, 'FTS')),
      cleanSheet: getTop15(t => getStat(t, 'CS')),
      bestHome: getTop15(t => parsePct(t.market_stats.Home_Win)),
      worstHome: getTop15(t => parsePct(t.market_stats.Home_Win), true), // Ascending
    };

    // Calculate League Insights by grouping
    const leaguesMap: Record<string, any[]> = {};
    validTeams.forEach(t => {
      if (!leaguesMap[t.league]) leaguesMap[t.league] = [];
      leaguesMap[t.league].push(t);
    });

    const validLeagues = Object.entries(leaguesMap)
      .filter(([_, lTeams]) => lTeams.length >= 4) // Require at least 4 teams in the league with minGames
      .map(([leagueName, lTeams]) => {
        const country = lTeams[0].country;
        return {
          league: leagueName,
          country,
          teamsCount: lTeams.length,
          gp: Math.floor(lTeams.reduce((sum, t) => sum + getGp(t), 0) / 2),
          btts: lTeams.reduce((sum, t) => sum + getStat(t, 'BTTS'), 0) / lTeams.length,
          nbtts: lTeams.reduce((sum, t) => sum + getInverse(t, 'BTTS'), 0) / lTeams.length,
          o15: lTeams.reduce((sum, t) => sum + getStat(t, 'O15'), 0) / lTeams.length,
          u15: lTeams.reduce((sum, t) => sum + getInverse(t, 'O15'), 0) / lTeams.length,
          o25: lTeams.reduce((sum, t) => sum + getStat(t, 'O25'), 0) / lTeams.length,
          u25: lTeams.reduce((sum, t) => sum + getInverse(t, 'O25'), 0) / lTeams.length,
          o35: lTeams.reduce((sum, t) => sum + getStat(t, 'O35'), 0) / lTeams.length,
          u35: lTeams.reduce((sum, t) => sum + getInverse(t, 'O35'), 0) / lTeams.length,
          o45: lTeams.reduce((sum, t) => sum + getStat(t, 'O45'), 0) / lTeams.length,
          u45: lTeams.reduce((sum, t) => sum + getInverse(t, 'O45'), 0) / lTeams.length,
        };
      });

    const getTop15Leagues = (key: string, isAsc: boolean = false) => {
      return [...validLeagues]
        .sort((a, b) => isAsc ? (a as any)[key] - (b as any)[key] : (b as any)[key] - (a as any)[key])
        .slice(0, 15)
        .map(l => ({ team: l.league, league: l.league, country: l.country, value: (l as any)[key], gp: l.gp }));
    };

    const leagueData = {
      btts: getTop15Leagues('btts'),
      nbtts: getTop15Leagues('nbtts'),
      o15: getTop15Leagues('o15'),
      u15: getTop15Leagues('u15'),
      o25: getTop15Leagues('o25'),
      u25: getTop15Leagues('u25'),
      o35: getTop15Leagues('o35'),
      u35: getTop15Leagues('u35'),
      o45: getTop15Leagues('o45'),
      u45: getTop15Leagues('u45'),
    };

    return NextResponse.json({
      success: true,
      data: {
        team: teamData,
        league: leagueData,
      }
    });

  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
