require('dotenv').config({path: '.env'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

function num(v) {
  const s = String(v ?? '').replace(/[%$,]/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const rows = await sql(`
    SELECT 
      raw_data->>'match' as match_name,
      raw_data->>'chance' as chance,
      raw_data->>'rating' as rating
    FROM matches_cache
    WHERE match_date = '2026-08-15'
    LIMIT 20
  `);
  
  const minChance = 65, minRating = 55;
  let pass = 0, fail = 0;
  for (const r of rows) {
    const c = num(r.chance);
    const rt = num(r.rating);
    const ok = c >= minChance && rt >= minRating;
    if (ok) pass++;
    else fail++;
    console.log(`${ok ? '✅' : '❌'} ${r.match_name}: chance=${r.chance}(${c}) rating=${r.rating}(${rt})`);
  }
  console.log(`\nPassing (of first 20): ${pass}, Failing: ${fail}`);

  // Count all
  const allRows = await sql(`
    SELECT raw_data->>'chance' as chance, raw_data->>'rating' as rating
    FROM matches_cache
    WHERE match_date = '2026-08-15'
  `);
  const totalPass = allRows.filter(r => num(r.chance) >= minChance && num(r.rating) >= minRating).length;
  console.log(`Total today (${allRows.length}) passing minChance(${minChance})/minRating(${minRating}): ${totalPass}`);
}

main();
