const fs = require('fs');

// 1. Update Recommend Slip Prompt
let recCode = fs.readFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', 'utf8');
const recTarget = `- STRICT RULE: Do not select any match with a Rating below 55% or where historical hit rates severely contradict the pick.`;
const recReplace = `- STRICT RULE: DO NOT select any match where Chance is < 70%, Rating is < 60%, or where the historical hit rate for the specific pick is < 50%.
- If there are not enough matches meeting these strict mathematical thresholds, you MUST return fewer matches (even just 1 or 2). Never pick a match that fails these thresholds.`;

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
  } else {
    console.log("❌ Recommend target not found");
  }
}

// 2. Update Risk Analysis Prompt
let anaCode = fs.readFileSync('apps/web/src/app/api/ai-slip-analysis/route.ts', 'utf8');
const anaTarget = `Rules: Only flag a match if it has genuine statistical flaws (e.g. low rating, conflicting historicals). No intro text. Start directly with the first flag or praise.`;
const anaReplace = `Rules: ONLY flag a match if its Chance is < 70%, OR its Rating is < 60%, OR its Historical Hit Rate for the selected market is < 50%. If ALL matches pass these thresholds, YOU MUST NOT flag anything and must output 🎯 Solid Premium Selections. No intro text.`;

if (anaCode.includes(anaTarget)) {
  anaCode = anaCode.replace(anaTarget, anaReplace);
  fs.writeFileSync('apps/web/src/app/api/ai-slip-analysis/route.ts', anaCode);
  console.log("✅ Updated Analysis boundaries");
} else {
  const lfTargetAna = anaTarget.replace(/\r\n/g, '\n');
  if (anaCode.includes(lfTargetAna)) {
    anaCode = anaCode.replace(lfTargetAna, anaReplace);
    fs.writeFileSync('apps/web/src/app/api/ai-slip-analysis/route.ts', anaCode);
    console.log("✅ Updated Analysis boundaries (LF)");
  } else {
    console.log("❌ Analysis target not found");
  }
}
