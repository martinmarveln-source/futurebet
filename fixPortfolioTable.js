const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api/portfolio/route.ts', 'utf8');

code = code.replace(
  'await sql`ALTER TABLE user_picks_log ALTER COLUMN user_id TYPE TEXT`;',
  'await sql`ALTER TABLE user_picks_log ALTER COLUMN user_id TYPE TEXT USING user_id::text`;'
);

// We should also ensure any other potential errors in ensureTable don't crash POST silently.
fs.writeFileSync('apps/web/src/app/api/portfolio/route.ts', code);
console.log("Fixed ensureTable");
