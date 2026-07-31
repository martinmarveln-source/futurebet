require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('ALTER TABLE auth_accounts RENAME COLUMN "providerAccountId" TO "accountId"');
    await pool.query('ALTER TABLE auth_accounts RENAME COLUMN "provider" TO "providerId"');
    console.log("Renamed columns");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
