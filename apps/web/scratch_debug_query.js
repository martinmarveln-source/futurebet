const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const sql = neon(process.env.DATABASE_URL);

async function testQuery() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const dbPicks = await sql`
      SELECT 
        v.id as vip_id, 
        v.match_id as vip_match_id, 
        m.id as cache_id,
        m.home_team,
        v.payload->>'match' as payload_match,
        v.payload->>'ftScore' as payload_score,
        m.ft_score as cache_score
      FROM vip_picks v 
      LEFT JOIN matches_cache m ON v.match_id = m.id::VARCHAR
      WHERE v.match_date = ${today}
    `;
    console.table(dbPicks);
  } catch (err) {
    console.error("SQL Error:", err);
  }
}

testQuery();
