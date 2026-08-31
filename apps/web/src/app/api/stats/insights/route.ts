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

    const today = new Date().toISOString().split("T")[0];
    
    // Always fetch upcoming matches to display predictions/odds
    const allUpcomingMatches = await sql`
      SELECT home_team, away_team, league, raw_data, match_date, match_time 
      FROM matches_cache 
      WHERE match_date >= ${today}::date
        AND raw_data IS NOT NULL
      ORDER BY match_date ASC, match_time ASC
    `;

    // Map each team to their immediate next match
    const nextMatchMap = new Map();
    for (const m of allUpcomingMatches) {
      const h = m.home_team?.trim().toLowerCase();
      const a = m.away_team?.trim().toLowerCase();
      
      let raw = m.raw_data;
      if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch (e) { raw = {}; }
      }

      if (h && !nextMatchMap.has(h)) {
        nextMatchMap.set(h, { opponent: m.away_team, isHome: true, raw, date: m.match_date, time: m.match_time });
      }
      if (a && !nextMatchMap.has(a)) {
        nextMatchMap.set(a, { opponent: m.home_team, isHome: false, raw, date: m.match_date, time: m.match_time });
      }
    }

    let dateFilterSet: Set<string> | null = null;
    if (startDate || endDate) {
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

    const teams = rows.map((r: any) => {
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
    const getTop15 = (getValue: (t: any) => number, isAsc: boolean = false, gpOverride?: (t: any) => number, marketKey?: string, baseStatKey?: string) => {
      const top15 = [...validTeams]
        .sort((a, b) => isAsc ? getValue(a) - getValue(b) : getValue(b) - getValue(a))
        .slice(0, 15);

      return top15.map(t => {
        const tName = t.team?.trim().toLowerCase();
        const nextMatchInfo = nextMatchMap.get(tName);
        
        let opponentStatValue = null;
        let opponentGp = null;
        let prediction = null;
        let odds = null;
        let nextOpponent = null;
        let nextDate = null;
        let nextTime = null;

        if (nextMatchInfo && baseStatKey) {
          nextOpponent = nextMatchInfo.opponent;
          nextDate = nextMatchInfo.date;
          nextTime = nextMatchInfo.time;
          const oppName = nextOpponent.trim().toLowerCase();
          const oppTeamObj = validTeams.find(vt => vt.team?.trim().toLowerCase() === oppName) 
                          || teams.find(vt => vt.team?.trim().toLowerCase() === oppName);
          
          if (oppTeamObj) {
            const teamVenueKey = nextMatchInfo.isHome ? '_HOME' : '_AWAY';
            const oppVenueKey = nextMatchInfo.isHome ? '_AWAY' : '_HOME';
            
            let tVal, oVal;
            
            if (baseStatKey.includes('HGS') || baseStatKey.includes('HGC') || baseStatKey.includes('AGS') || baseStatKey.includes('AGC')) {
               tVal = getValue(t);
               oVal = getValue(oppTeamObj);
            } else {
               const rawTeamVal = parsePct(t.market_stats[`${baseStatKey}${teamVenueKey}`]);
               const rawOppVal = parsePct(oppTeamObj.market_stats[`${baseStatKey}${oppVenueKey}`]);
               
               const isInverse = marketKey?.startsWith('U') || marketKey?.startsWith('N');
               
               tVal = isInverse ? 100 - rawTeamVal : rawTeamVal;
               oVal = isInverse ? 100 - rawOppVal : rawOppVal;
            }

            opponentStatValue = oVal;
            prediction = (tVal + oVal) / 2;
            opponentGp = parseInt(oppTeamObj.market_stats[nextMatchInfo.isHome ? 'GP_AWAY' : 'GP_HOME'] || '0', 10) || 0;
          }

          if (marketKey) {
            const raw = nextMatchInfo.raw;
            if (marketKey === 'BTTS' || marketKey === 'NBTTS') odds = raw.bttsOdds;
            else if (marketKey === 'O15' || marketKey === 'U15') odds = raw.o15Odds;
            else if (marketKey === 'O25' || marketKey === 'U25') odds = raw.o25Odds;
            else if (marketKey === 'O35' || marketKey === 'U35') odds = raw.o35Odds;
            else if (marketKey === 'O45' || marketKey === 'U45') odds = raw.o45Odds;
          }
        }

        return { 
          team: t.team, 
          league: t.league, 
          country: t.country, 
          value: getValue(t), 
          gp: gpOverride ? gpOverride(t) : getGp(t),
          nextOpponent,
          nextDate,
          nextTime,
          opponentStatValue,
          opponentGp,
          prediction,
          odds
        };
      });
    };

    const teamData = {
      btts: getTop15(t => getStat(t, 'BTTS'), false, undefined, 'BTTS', 'BTTS'),
      nbtts: getTop15(t => getInverse(t, 'BTTS'), false, undefined, 'NBTTS', 'BTTS'),
      o15: getTop15(t => getStat(t, 'O15'), false, undefined, 'O15', 'O15'),
      u15: getTop15(t => getInverse(t, 'O15'), false, undefined, 'U15', 'O15'),
      o25: getTop15(t => getStat(t, 'O25'), false, undefined, 'O25', 'O25'),
      u25: getTop15(t => getInverse(t, 'O25'), false, undefined, 'U25', 'O25'),
      o35: getTop15(t => getStat(t, 'O35'), false, undefined, 'O35', 'O35'),
      u35: getTop15(t => getInverse(t, 'O35'), false, undefined, 'U35', 'O35'),
      o45: getTop15(t => getStat(t, 'O45'), false, undefined, 'O45', 'O45'),
      u45: getTop15(t => getInverse(t, 'O45'), false, undefined, 'U45', 'O45'),
      fts: getTop15(t => getStat(t, 'FTS'), false, undefined, undefined, 'FTS'),
      nfts: getTop15(t => getInverse(t, 'FTS'), false, undefined, undefined, 'FTS'),
      cleanSheet: getTop15(t => getStat(t, 'CS'), false, undefined, undefined, 'CS'),
      bestHome: getTop15(t => parsePct(t.market_stats.Home_Win), false, undefined, undefined, 'Home_Win'),
      worstHome: getTop15(t => parsePct(t.market_stats.Home_Win), true, undefined, undefined, 'Home_Win'), // Ascending
      hgsO15: getTop15(t => parsePct(t.market_stats.HGS_Over_15 ?? t.market_stats["HGS_Over_1.5"]), false, t => parseInt(t.market_stats.GP_HOME || '0', 10) || 0, 'O15', 'HGS_Over_15'),
      hgcO15: getTop15(t => parsePct(t.market_stats.HGC_Over_15 ?? t.market_stats["HGC_Over_1.5"]), false, t => parseInt(t.market_stats.GP_HOME || '0', 10) || 0, 'O15', 'HGC_Over_15'),
      agsO15: getTop15(t => parsePct(t.market_stats.AGS_Over_15 ?? t.market_stats["AGS_Over_1.5"]), false, t => parseInt(t.market_stats.GP_AWAY || '0', 10) || 0, 'O15', 'AGS_Over_15'),
      agcO15: getTop15(t => parsePct(t.market_stats.AGC_Over_15 ?? t.market_stats["AGC_Over_1.5"]), false, t => parseInt(t.market_stats.GP_AWAY || '0', 10) || 0, 'O15', 'AGC_Over_15'),
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
          hgsO15: lTeams.reduce((sum, t) => sum + parsePct(t.market_stats.HGS_Over_15 ?? t.market_stats["HGS_Over_1.5"]), 0) / lTeams.length,
          hgcO15: lTeams.reduce((sum, t) => sum + parsePct(t.market_stats.HGC_Over_15 ?? t.market_stats["HGC_Over_1.5"]), 0) / lTeams.length,
          agsO15: lTeams.reduce((sum, t) => sum + parsePct(t.market_stats.AGS_Over_15 ?? t.market_stats["AGS_Over_1.5"]), 0) / lTeams.length,
          agcO15: lTeams.reduce((sum, t) => sum + parsePct(t.market_stats.AGC_Over_15 ?? t.market_stats["AGC_Over_1.5"]), 0) / lTeams.length,
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
      hgsO15: getTop15Leagues('hgsO15'),
      hgcO15: getTop15Leagues('hgcO15'),
      agsO15: getTop15Leagues('agsO15'),
      agcO15: getTop15Leagues('agcO15'),
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
