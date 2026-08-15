const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    const res = await sql`SELECT id, match_id, match_date FROM vip_picks LIMIT 5`;
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  }
}
run();
