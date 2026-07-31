require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS "createdAt" timestamp, ADD COLUMN IF NOT EXISTS "updatedAt" timestamp;
      ALTER TABLE public.auth_accounts ADD COLUMN IF NOT EXISTS "createdAt" timestamp, ADD COLUMN IF NOT EXISTS "updatedAt" timestamp;
      ALTER TABLE public.auth_sessions ADD COLUMN IF NOT EXISTS "createdAt" timestamp, ADD COLUMN IF NOT EXISTS "updatedAt" timestamp;
      ALTER TABLE public.auth_verification_token ADD COLUMN IF NOT EXISTS "createdAt" timestamp, ADD COLUMN IF NOT EXISTS "updatedAt" timestamp;
    `);
    console.log("Columns added successfully");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
