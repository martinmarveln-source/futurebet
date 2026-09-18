const fs = require('fs');

// ─── PART 1: betslipStore.ts ────────────────────────────────────────────────
let store = fs.readFileSync('apps/web/src/store/betslipStore.ts', 'utf8');

// 1a. Default maxMatches state: 20 → 40
store = store.replace(/maxMatches:\s*20,/g, 'maxMatches: 40,');

// 1b. trackThisBet hard slice: slice(0, 20) → slice(0, 40)
store = store.replace(/uniqueMatches\.slice\(0,\s*20\)/g, 'uniqueMatches.slice(0, 40)');

// 1c. Migration cap slices
store = store.replace(/matches:\s*uniqueMatches\.slice\(0,\s*20\)/g, 'matches: uniqueMatches.slice(0, 40)');
store = store.replace(/selections\.length\s*<=\s*20/g, 'selections.length <= 40');

// 1d. Any other explicit 20 limits related to betslip match cap
// covers: `slip.slice(0, 20)`
store = store.replace(/const slip = uniqueMatches\.slice\(0,\s*20\)/g, 'const slip = uniqueMatches.slice(0, 40)');

fs.writeFileSync('apps/web/src/store/betslipStore.ts', store);
console.log('✅ betslipStore.ts updated');
