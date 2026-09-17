require('dotenv').config({path: '.env.local'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || process.env.POSTGRES_URL);
async function run() {
  const res = await sql`SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL LIMIT 1`;
  let ms = res[0].market_stats;
  if (typeof ms === 'string') ms = JSON.parse(ms);
  console.log(Object.keys(ms).slice(0, 30));
  process.exit(0);
}
run();
