const fs = require('fs');

let recCode = fs.readFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', 'utf8');
const recTarget = `- STRICT RULE: Do not select any match with a Rating below 55% or where historical hit rates severely contradict the pick.`;
const recReplace = `- STRICT RULE: DO NOT select any match where Chance is < 70%, or Rating is < 60%. NEVER select a match where the historical hit rate for the specific market contradicts the pick.`;

if (recCode.includes(recTarget)) {
  recCode = recCode.replace(recTarget, recReplace);
  fs.writeFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', recCode);
  console.log("✅ Updated Recommend boundaries");
} else {
  const lfTarget = recTarget.replace(/\r\n/g, '\n');
  if (recCode.includes(lfTarget)) {
    recCode = recCode.replace(lfTarget, recReplace);
    fs.writeFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', recCode);
    console.log("✅ Updated Recommend boundaries (LF)");
  }
}
