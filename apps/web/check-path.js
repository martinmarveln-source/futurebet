require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await pool.query("SHOW search_path");
    console.log("Search path:", r.rows[0].search_path);
    const r2 = await pool.query("SELECT current_schema()");
    console.log("Current schema:", r2.rows[0].current_schema);
    const r3 = await pool.query("SELECT current_user");
    console.log("Current user:", r3.rows[0].current_user);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
