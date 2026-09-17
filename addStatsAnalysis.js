const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api/ai-slip-analysis/route.ts', 'utf8');

const target = `const slipData = matches.map((m, i) => \`Leg \${i + 1}: \${m.match}\\n- Market: \${m.selectedMarket} -> \${m.selectedOption}\\n- AI Chance: \${m.chance}%\\n- Rating: \${m.rating}%\\n- Odds: \${m.odds}\\n- Home Pts: \${m.hPts || 0} / Away Pts: \${m.aPts || 0}\`).join("\\n\\n");`;

const replacement = `
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

    const slipData = matches.map((m: any, i: number) => {
      let homeTeam = "Unknown", awayTeam = "Unknown";
      if (m.match) {
        const parts = m.match.split(/\\s+vs\\s+|\\s+-\\s+/);
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

      return \`Leg \${i + 1}: \${m.match}\\n- Market: \${m.selectedMarket} -> \${m.selectedOption}\\n- AI Chance: \${m.chance}% | Rating: \${m.rating}%\\n- Odds: \${m.odds}\\n- Form Pts -> Home: \${m.hPts || 0} | Away: \${m.aPts || 0}\\n- Historical Hit Rates -> Home: [Win: \${homeWinPct}, O2.5: \${homeO25}, BTTS: \${homeBtts}] | Away: [Win: \${awayWinPct}, O2.5: \${awayO25}, BTTS: \${awayBtts}]\`;
    }).join("\\n\\n");
`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('apps/web/src/app/api/ai-slip-analysis/route.ts', code);
  console.log("✅ Updated AI slip analysis route");
} else {
  console.log("❌ Target not found in ai-slip-analysis/route.ts");
}
