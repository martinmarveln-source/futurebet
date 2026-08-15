const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function testQuery() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const minChance = 65;
    const minRating = 55;

    console.log("Running query for date:", today);
    const dbPicks = await sql`
      SELECT 
        v.*, 
        m.ft_score as current_ft_score 
      FROM vip_picks v 
      LEFT JOIN matches_cache m ON v.match_id = m.id::VARCHAR
      WHERE v.match_date = ${today}
      AND v.chance_percent::NUMERIC >= ${minChance}
      AND v.rating_percent >= ${minRating}
      ORDER BY v.vip_score DESC
    `;
    console.log("Success! Found records:", dbPicks.length);
  } catch (err) {
    console.error("SQL Error:", err);
  }
}

testQuery();
