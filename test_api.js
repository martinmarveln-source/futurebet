const sql = require("./apps/web/src/utils/sql");

async function check() {
  try {
    const rows = await sql`
      SELECT 
        country,
        league,
        COUNT(*) AS team_count,
        ROUND(AVG(((market_stats::jsonb)->>'BTTS_ALL')::numeric), 0)::int AS btts_percent
      FROM league_table_cache
      WHERE country IS NOT NULL 
        AND country != ''
        AND LOWER(country) != 'country'
        AND market_stats IS NOT NULL
      GROUP BY country, league
      LIMIT 5
    `;
    console.log("SUCCESS:", rows);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
check();
