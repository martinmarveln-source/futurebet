const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const res = await sql`
      SELECT id, match_date, home_team, away_team, ft_score 
      FROM matches_cache 
      WHERE match_date >= '2026-08-04' AND match_date <= '2026-08-07'
      ORDER BY match_date DESC 
      LIMIT 10
    `;
    console.log(res);
  } catch (err) {
    console.error(err);
  }
}
run();
