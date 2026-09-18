const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', 'utf8');

const regex = /- Prioritize matches with the HIGHEST chance % AND rating % combined.\s*- STRICT RULE: DO NOT select any match where Chance is < 70%, or Rating is < 60%. NEVER select a match where the historical hit rate for the specific market contradicts the pick./;

const replaceStr = `- STRICT RULE for Primary Pick: If you select the primary "Pick" shown, ensure Chance is >= 70% and Rating is >= 60%.
  - STRICT RULE for Alternative Markets: You are HIGHLY ENCOURAGED to explore other markets (Over 2.5, BTTS, Double Chance) instead of just the primary Pick! However, if you choose an alternative market, the Historical Hit Rates for that market must support it strongly (e.g. >= 70%).`;

code = code.replace(regex, replaceStr);

fs.writeFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', code);
console.log('Done replacing via regex.');
