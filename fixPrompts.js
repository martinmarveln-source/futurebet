const fs = require('fs');

// ------------------------------------------------------------------
// 1. Update AI Recommend Slip Prompt
// ------------------------------------------------------------------
let recCode = fs.readFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', 'utf8');

const recTarget = `Criteria for selection:
- Prioritize matches with the HIGHEST chance % AND rating % combined
- Only pick selections where the odds are between \${minOdds} and \${maxOdds}  
- Favor matches where the pick/guide is strongly supported by both chance AND rating
- Avoid picks where the two teams have very similar form points (suggests too close to call)

Return your response in this EXACT JSON format (no markdown, no explanation outside JSON):`;

const recReplace = `Criteria for selection:
- Prioritize matches with the HIGHEST chance % AND rating % combined.
- STRICT RULE: Do not select any match with a Rating below 55% or where historical hit rates severely contradict the pick.
- Only pick selections where the odds are between \${minOdds} and \${maxOdds}.
- Avoid picks where the two teams have very similar form points (suggests a tight match).
- If there are not enough high-quality matches meeting these strict criteria, you may return FEWER than \${minMatches} matches. Never recommend a bad bet just to fill the quota.

Return your response in this EXACT JSON format (no markdown, no explanation outside JSON):`;

if (recCode.includes(recTarget)) {
  recCode = recCode.replace(recTarget, recReplace);
  fs.writeFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', recCode);
  console.log("✅ Updated AI Recommend Prompt");
} else {
  // LF
  const targetLF = recTarget.replace(/\r\n/g, '\n');
  if (recCode.includes(targetLF)) {
    recCode = recCode.replace(targetLF, recReplace);
    fs.writeFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', recCode);
    console.log("✅ Updated AI Recommend Prompt (LF)");
  } else {
    console.warn("⚠️ Recommend prompt target not found");
  }
}

// ------------------------------------------------------------------
// 2. Update AI Slip Analysis Prompt
// ------------------------------------------------------------------
let anaCode = fs.readFileSync('apps/web/src/app/api/ai-slip-analysis/route.ts', 'utf8');

const anaTarget = `const systemPrompt = "You are an elite sports betting risk analyst. Analyze the betslip and flag the WEAKEST picks.\\n\\nFormat your response EXACTLY like this:\\n\\n⚠️ **[Match Name] — [Market/Pick]**\\n[2-3 sentences max about the risk. Be direct and specific about the stats.]\\n\\n⚠️ **[Match Name 2 — if there is a 2nd weak pick]**\\n[2-3 sentences max.]\\n\\n✅ **Overall Verdict:**\\n[One sentence summary — safe to lock or risky?]\\n\\nRules: Flag max 2 picks. Use exact numbers from the data. No intro text. Start directly with the first flag.";`;

const anaReplace = `const systemPrompt = "You are an elite sports betting risk analyst. Analyze the betslip and identify any SIGNIFICANT risks. If the slip is structurally solid with strong stats across the board, DO NOT force a negative critique.\\n\\nFormat your response EXACTLY like this:\\n\\nIf there are risky picks, flag max 2:\\n⚠️ **[Match Name] — [Market/Pick]**\\n[2-3 sentences explaining the specific statistical risk.]\\n\\nIf ALL picks are mathematically strong (e.g., high chance/rating, good historicals), output instead:\\n🎯 **Solid Premium Selections**\\n[1-2 sentences praising the statistical strength of the slip.]\\n\\nAlways end with:\\n✅ **Overall Verdict:**\\n[One sentence summary — e.g. 'Safe to lock', 'Proceed with caution', or 'Too risky to play'].\\n\\nRules: Only flag a match if it has genuine statistical flaws (e.g. low rating, conflicting historicals). No intro text. Start directly with the first flag or praise.";`;

if (anaCode.includes(anaTarget)) {
  anaCode = anaCode.replace(anaTarget, anaReplace);
  fs.writeFileSync('apps/web/src/app/api/ai-slip-analysis/route.ts', anaCode);
  console.log("✅ Updated AI Analysis Prompt");
} else {
  console.warn("⚠️ Analysis prompt target not found");
}

