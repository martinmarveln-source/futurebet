import { NextResponse } from "next/server";
import sql from "../../../utils/sql";
import { auth } from "@/auth";
import { hasPremiumAccess } from "@/utils/premium";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const sessionResponse = await auth();
    const isPremium = hasPremiumAccess(sessionResponse?.user);

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || '2026/27';
    const league = searchParams.get('league') || '';
    
    const decodedTeamId = decodeURIComponent(teamId);
    
    // 1. Fetch general stats from league_table_cache
    let generalStatsRows;
    if (league) {
      generalStatsRows = await sql`
        SELECT * FROM league_table_cache 
        WHERE REPLACE(LOWER(team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
          AND REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${league}), ' ', '-')
        LIMIT 1
      `;
    } else {
      generalStatsRows = await sql`
        SELECT * FROM league_table_cache 
        WHERE REPLACE(LOWER(team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
        LIMIT 1
      `;
    }

    const teamLeague = generalStatsRows?.[0]?.league || league;

    // 2. Fetch matches to compute betting and form stats
    let matchesRows;
    if (teamLeague) {
       matchesRows = await sql`
        SELECT * FROM matches_cache 
        WHERE (REPLACE(LOWER(home_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
           OR REPLACE(LOWER(away_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-'))
          AND REPLACE(LOWER(league), ' ', '-') = REPLACE(LOWER(${teamLeague}), ' ', '-')
          AND raw_data IS NOT NULL
        ORDER BY match_date DESC
      `;
    } else {
      matchesRows = await sql`
        SELECT * FROM matches_cache 
        WHERE (REPLACE(LOWER(home_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-')
           OR REPLACE(LOWER(away_team), ' ', '-') = REPLACE(LOWER(${decodedTeamId}), ' ', '-'))
          AND raw_data IS NOT NULL
        ORDER BY match_date DESC
      `;
    }

    // Default response structure
    const responseData = {
      team: decodedTeamId,
      season,
      general: { gp: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0 },
      goals: { scored: 0, conceded: 0, gf_per_game: 0, ga_per_game: 0 },
      home_away: {
        home: { gp: 0, wins: 0, gf_per_game: 0 },
        away: { gp: 0, wins: 0, gf_per_game: 0 }
      },
      betting: { over_15: 0, over_25: 0, btts_yes: 0, clean_sheet: 0 },
      market_stats: null,
      form: { overall: "", home: "", away: "" }
    };

    if (generalStatsRows && generalStatsRows.length > 0) {
      const g = generalStatsRows[0];
      const gp = parseInt(g.gp || '0');
      responseData.general = {
        gp,
        wins: parseInt(g.win || '0'),
        draws: parseInt(g.draw || '0'),
        losses: parseInt(g.lost || '0'),
        points: parseInt(g.pts || '0'),
        ppg: parseFloat(g.ppg || '0')
      };
      
      responseData.goals.scored = parseInt(g.gs || '0');
      responseData.goals.conceded = parseInt(g.gc || '0');
      if (gp > 0) {
        responseData.goals.gf_per_game = parseFloat((responseData.goals.scored / gp).toFixed(2));
        responseData.goals.ga_per_game = parseFloat((responseData.goals.conceded / gp).toFixed(2));
      }
      
      // Inject the rich market stats from Google Sheet if they exist
      if (g.market_stats) {
        responseData.market_stats = typeof g.market_stats === 'string' ? JSON.parse(g.market_stats) : g.market_stats;
      }
    }

    if (matchesRows && matchesRows.length > 0) {
      let over15 = 0, over25 = 0, btts = 0, cleanSheets = 0;
      let homeGp = 0, homeWins = 0, homeGoals = 0;
      let awayGp = 0, awayWins = 0, awayGoals = 0;
      
      const overallForm: string[] = [];
      const homeForm: string[] = [];
      const awayForm: string[] = [];

      // matches are sorted DESC by date. Let's compute form from the first 5 matches.
      
      for (const match of matchesRows) {
        const isHome = match.home_team.toLowerCase().replace(/\s+/g, '-') === decodedTeamId.toLowerCase().replace(/\s+/g, '-');
        let rd = match.raw_data;
        if (typeof rd === 'string') {
          try { rd = JSON.parse(rd); } catch(e) {}
        }
        if (!rd || typeof rd !== 'object') continue;
        
        const hgs = parseInt(rd.hgs || '0');
        const ags = parseInt(rd.ags || '0');
        const totalGoals = hgs + ags;

        if (totalGoals > 1.5) over15++;
        if (totalGoals > 2.5) over25++;
        if (hgs > 0 && ags > 0) btts++;

        let result = 'D';
        if (isHome) {
          if (ags === 0) cleanSheets++;
          if (hgs > ags) result = 'W';
          else if (hgs < ags) result = 'L';
          
          homeGp++;
          homeGoals += hgs;
          if (result === 'W') homeWins++;
          
          if (homeForm.length < 5) homeForm.push(result);
        } else {
          if (hgs === 0) cleanSheets++;
          if (ags > hgs) result = 'W';
          else if (ags < hgs) result = 'L';
          
          awayGp++;
          awayGoals += ags;
          if (result === 'W') awayWins++;
          
          if (awayForm.length < 5) awayForm.push(result);
        }
        
        if (overallForm.length < 5) overallForm.push(result);
      }

      const totalMatches = matchesRows.length;
      if (totalMatches > 0) {
        responseData.betting.over_15 = parseFloat(((over15 / totalMatches) * 100).toFixed(1));
        responseData.betting.over_25 = parseFloat(((over25 / totalMatches) * 100).toFixed(1));
        responseData.betting.btts_yes = parseFloat(((btts / totalMatches) * 100).toFixed(1));
        responseData.betting.clean_sheet = parseFloat(((cleanSheets / totalMatches) * 100).toFixed(1));
      }

      responseData.home_away.home = {
        gp: homeGp,
        wins: homeWins,
        gf_per_game: homeGp > 0 ? parseFloat((homeGoals / homeGp).toFixed(2)) : 0
      };

      responseData.home_away.away = {
        gp: awayGp,
        wins: awayWins,
        gf_per_game: awayGp > 0 ? parseFloat((awayGoals / awayGp).toFixed(2)) : 0
      };

      responseData.form = {
        overall: overallForm.reverse().join(''),
        home: homeForm.reverse().join(''),
        away: awayForm.reverse().join('')
      };
    }

    return NextResponse.json({
      success: true,
      isPremium,
      ...responseData
    });

  } catch (error: any) {
    console.error("Team stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch team stats." },
      { status: 500 }
    );
  }
}
