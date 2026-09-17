const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', 'utf8');

const target1 = `    const rows = await matchesRes.json();

    if (!rows || rows.length === 0) {`;

const replacement1 = `    const payload = await matchesRes.json();
    const rows = payload.matches || [];

    if (!rows || rows.length === 0) {`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', code);
  console.log("✅ Fixed array access in ai-recommend-slip");
} else {
  console.log("❌ Target not found");
}
