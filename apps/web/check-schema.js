require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r2 = await pool.query("SELECT id, email FROM auth_users");
    console.log("Users:", r2.rows);
    const r3 = await pool.query('SELECT * FROM auth_accounts');
    console.log("Accounts:", r3.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
