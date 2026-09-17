const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', 'utf8');

const injectionTarget = `    const topMatches = eligibleMatches.slice(0, 40);`;

const newCode = `    const topMatches = eligibleMatches.slice(0, 40);

    // Fetch league stats for all teams to give AI more insight
    let teamStatsMap = new Map();
    try {
      const stats = await sql\`SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL\`;
      for (const row of stats) {
        if (!row.team || !row.market_stats) continue;
        let ms = row.market_stats;
        if (typeof ms === "string") {
          try { ms = JSON.parse(ms); } catch(e) { ms = {}; }
        }
        teamStatsMap.set(row.team.trim().toLowerCase(), ms);
      }
    } catch(e) {
      console.warn("Could not fetch team stats:", e);
    }
`;

if (code.includes(injectionTarget)) {
  code = code.replace(injectionTarget, newCode);
  
  // Now update the matchData map
  const matchDataTarget = `const matchData = topMatches.map((r: any, i: number) => {`;
  const newMatchData = `const matchData = topMatches.map((r: any, i: number) => {
      // Parse out home/away teams to look up stats
      let homeTeam = "Unknown", awayTeam = "Unknown";
      if (r.match) {
        const parts = r.match.split(/\\s+vs\\s+|\\s+-\\s+/);
        homeTeam = (parts[0] || "").trim();
        awayTeam = (parts[1] || "").trim();
      }
      
      const homeStats = teamStatsMap.get(homeTeam.toLowerCase()) || {};
      const awayStats = teamStatsMap.get(awayTeam.toLowerCase()) || {};
      
      const formatStat = (val: any) => val ? (String(val).includes('%') ? val : val + '%') : '—';
      
      const homeWinPct = formatStat(homeStats.W_ALL || homeStats.W_HOME);
      const awayWinPct = formatStat(awayStats.W_ALL || awayStats.W_AWAY);
      const homeO25 = formatStat(homeStats.O25_ALL || homeStats.O25_HOME);
      const awayO25 = formatStat(awayStats.O25_ALL || awayStats.O25_AWAY);
      const homeBtts = formatStat(homeStats.BTTS_ALL || homeStats.BTTS_HOME);
      const awayBtts = formatStat(awayStats.BTTS_ALL || awayStats.BTTS_AWAY);
`;
  code = code.replace(matchDataTarget, newMatchData);
  
  // And update the return string
  const returnTarget = `  Form Pts → Home: \${hPts} | Away: \${aPts}\`;`;
  const newReturn = `  Form Pts → Home: \${hPts} | Away: \${aPts}
  Historical Hit Rates → Home: [Win: \${homeWinPct}, O2.5: \${homeO25}, BTTS: \${homeBtts}] | Away: [Win: \${awayWinPct}, O2.5: \${awayO25}, BTTS: \${awayBtts}]\`;`;
  code = code.replace(returnTarget, newReturn);
  
  fs.writeFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', code);
  console.log("✅ Updated AI recommend slip route");
} else {
  console.log("❌ Target not found");
}
