const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

const target = `        for (const m of data.matches) {
          try { store.addMatch?.(m); added++; } catch(e) {}
        }`;

const replacement = `        for (const m of data.matches) {
          try { 
            // If the store rejects it (e.g. duplicate or missing odds), it returns false or current state.
            const result = store.addMatch?.(m);
            if (result !== false) added++; 
          } catch(e) {}
        }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
  console.log("✅ Fixed added counter in BetSlip");
} else {
  // LF
  const targetLF = target.replace(/\r\n/g, '\n');
  if (code.includes(targetLF)) {
    code = code.replace(targetLF, replacement);
    fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
    console.log("✅ Fixed added counter in BetSlip (LF)");
  } else {
    console.warn("⚠️ Target not found for addMatch counter tweak");
  }
}
