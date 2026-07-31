require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r1 = await pool.query('SELECT * FROM auth_accounts WHERE "userId" = 1');
    console.log("auth_accounts:", r1.rows);
    const r2 = await pool.query('SELECT * FROM auth_users WHERE id = 1');
    console.log("auth_users:", r2.rows);
  } finally {
    await pool.end();
  }
}
main();
