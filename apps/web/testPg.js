require('dotenv').config({path: '.env.local'});
const { sql } = require('@vercel/postgres');
async function run() {
  const result = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'league_table_cache'`;
  console.log(result.rows);
}
run();
