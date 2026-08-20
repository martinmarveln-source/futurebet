const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: "./apps/web/.env" });
require("dotenv").config({ path: "./apps/web/.env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const decodedTeamId = 'Greenville';
    const season = '2026/27';
    const teamLeague = 'USL League One';
    const cols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'matches_cache'
    `;
    console.log(cols);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
