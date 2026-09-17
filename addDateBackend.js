const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', 'utf8');

const interfaceTarget = `  maxOdds: number;
}`;
const interfaceReplace = `  maxOdds: number;
  targetDate?: string;
}`;
code = code.replace(interfaceTarget, interfaceReplace);

const bodyTarget = `    const maxOdds = Math.max(minOdds, Number(body.maxOdds) || 4.0);`;
const bodyReplace = `    const maxOdds = Math.max(minOdds, Number(body.maxOdds) || 4.0);
    const targetDate = body.targetDate || "";`;
code = code.replace(bodyTarget, bodyReplace);

const filterTarget = `    // Filter by odds range
    const eligibleMatches = rows.filter((r: any) => {`;
const filterReplace = `    // Filter by date and odds range
    const eligibleMatches = rows.filter((r: any) => {
      if (targetDate && r.date !== targetDate) return false;`;
code = code.replace(filterTarget, filterReplace);

fs.writeFileSync('apps/web/src/app/api/ai-recommend-slip/route.ts', code);
console.log("✅ Added targetDate filter to backend");
