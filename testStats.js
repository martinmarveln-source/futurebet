const sql = require('./apps/web/src/app/api/utils/sql.js').default;
async function run() {
  const rows = await sql`SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL LIMIT 2`;
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
