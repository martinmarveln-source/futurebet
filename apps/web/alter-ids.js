require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      ALTER TABLE auth_accounts DROP CONSTRAINT "auth_accounts_userId_fkey";
      ALTER TABLE auth_sessions DROP CONSTRAINT "auth_sessions_userId_fkey";

      ALTER TABLE auth_users ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
      ALTER TABLE auth_accounts ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
      ALTER TABLE auth_accounts ALTER COLUMN "userId" TYPE VARCHAR(255) USING "userId"::VARCHAR;
      ALTER TABLE auth_sessions ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
      ALTER TABLE auth_sessions ALTER COLUMN "userId" TYPE VARCHAR(255) USING "userId"::VARCHAR;

      ALTER TABLE auth_accounts ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth_users(id) ON DELETE CASCADE;
      ALTER TABLE auth_sessions ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth_users(id) ON DELETE CASCADE;
    `);
    console.log("Successfully altered IDs and recreated foreign keys.");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
