const { Pool } = require('@neondatabase/serverless');

async function main() {
  const url = "postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&options=-csearch_path%3Dpublic";
  const pool = new Pool({ connectionString: url });
  try {
    const r = await pool.query("SHOW search_path");
    console.log("Search path:", r.rows[0].search_path);
    const r2 = await pool.query("SELECT id, email FROM auth_users");
    console.log("Users:", r2.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
