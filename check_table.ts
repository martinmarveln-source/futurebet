import sql from "./apps/web/src/app/api/utils/sql.ts";

async function check() {
  try {
    const table = await sql`
      SELECT team, sn, gp, market_stats 
      FROM league_table_cache 
      WHERE market_stats IS NOT NULL 
      LIMIT 3
    `;
    console.log(JSON.stringify(table, null, 2));
  } catch (error) {
    console.error("DB Error:", error);
  }
  process.exit(0);
}

check();
