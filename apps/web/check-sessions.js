require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'auth_sessions'
    `);
    console.log("Columns:", res.rows.map(r => r.column_name).join(", "));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
