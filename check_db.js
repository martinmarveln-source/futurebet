const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_fvcnduJ5o1MZ@ep-wild-pond-ax4pdmil-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});
pool.query('SELECT team, market_stats FROM league_table_cache WHERE market_stats IS NOT NULL LIMIT 2', (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
