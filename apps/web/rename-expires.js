require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('ALTER TABLE auth_sessions RENAME COLUMN expires TO "expiresAt"');
    
    // Let's also check data types of id across tables to see if they need changing to VARCHAR
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('auth_users', 'auth_accounts', 'auth_sessions') AND column_name = 'id'
    `);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
