const sql = require('./apps/web/src/app/api/utils/sql.js').default;
async function run() {
  const rows = await sql`SELECT market_stats FROM league_table_cache WHERE market_stats IS NOT NULL LIMIT 1`;
  let parsed = typeof rows[0].market_stats === 'string' ? JSON.parse(rows[0].market_stats) : rows[0].market_stats;
  console.log(Object.keys(parsed));
  process.exit(0);
}
run();
