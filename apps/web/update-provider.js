require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("UPDATE auth_accounts SET provider = 'credential' WHERE provider = 'credentials'");
    console.log("Updated provider to credential");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
