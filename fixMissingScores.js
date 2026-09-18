const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/api/cron/missing-scores/route.ts', 'utf8');

// Update SQL query
const sqlTarget = `SELECT 
        match_date, 
        match_time, 
        league,
        home_team, 
        away_team, 
        match_label, 
        guide, 
        chance
      FROM matches_cache`;

const sqlReplace = `SELECT 
        match_date, 
        match_time,
        country, 
        league,
        home_team, 
        away_team, 
        match_label, 
        guide, 
        chance,
        '' as ft_score
      FROM matches_cache`;

if (code.includes(sqlTarget)) {
  code = code.replace(sqlTarget, sqlReplace);
} else {
  const lfTarget = sqlTarget.replace(/\r\n/g, '\n');
  if (code.includes(lfTarget)) {
    code = code.replace(lfTarget, sqlReplace);
  }
}

// Update CSV header
const headerTarget = `const header = ['match_date', 'match_time', 'league', 'home_team', 'away_team', 'match_label', 'guide', 'chance'];`;
const headerReplace = `const header = ['match_date', 'match_time', 'country', 'league', 'home_team', 'away_team', 'match_label', 'guide', 'chance', 'ft_score'];`;

if (code.includes(headerTarget)) {
  code = code.replace(headerTarget, headerReplace);
} else {
  const lfHeader = headerTarget.replace(/\r\n/g, '\n');
  if (code.includes(lfHeader)) {
    code = code.replace(lfHeader, headerReplace);
  }
}

fs.writeFileSync('apps/web/src/app/api/cron/missing-scores/route.ts', code);
console.log("✅ Updated missing-scores.csv with country and ft_score");
