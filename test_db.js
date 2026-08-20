const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: "./apps/web/.env" });
require("dotenv").config({ path: "./apps/web/.env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const decodedTeamId = "QPR";
    const league = "Championship";
    const season = "2026/27";
    const res = await fetch('http://localhost:3000/api/stats/team/QPR?league=Championship');
    console.log(await res.text());
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
