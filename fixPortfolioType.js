const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api/portfolio/route.ts', 'utf8');

if (code.includes('user_id UUID NOT NULL')) {
  code = code.replace('user_id UUID NOT NULL', 'user_id TEXT NOT NULL');
  
  // Also we must alter the table if it exists
  const ensureTableBlock = `async function ensureTable() {`;
  const ensureTableReplace = `async function ensureTable() {
  try {
    await sql\`ALTER TABLE user_picks_log ALTER COLUMN user_id TYPE TEXT\`;
  } catch(e) {}
`;
  code = code.replace(ensureTableBlock, ensureTableReplace);

  fs.writeFileSync('apps/web/src/app/api/portfolio/route.ts', code);
  console.log("✅ Fixed user_id type in portfolio");
}
