const postgres = require('postgres');
const sql = postgres('postgresql://neondb_owner:npg_fvcnduJ5o1MZ@ep-wild-pond-ax4pdmil-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require');
async function check() {
  const res = await sql`SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL LIMIT 2`;
  console.log(res);
  process.exit(0);
}
check();
