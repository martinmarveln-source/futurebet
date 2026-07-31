require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      ALTER TABLE ai_insight_usage DROP CONSTRAINT IF EXISTS "ai_insight_usage_user_id_fkey";
      ALTER TABLE auth_accounts DROP CONSTRAINT IF EXISTS "auth_accounts_userId_fkey";
      ALTER TABLE auth_sessions DROP CONSTRAINT IF EXISTS "auth_sessions_userId_fkey";
      ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS "payment_transactions_user_id_fkey";
      ALTER TABLE user_betslips DROP CONSTRAINT IF EXISTS "user_betslips_user_id_fkey";
      ALTER TABLE user_comparisons DROP CONSTRAINT IF EXISTS "user_comparisons_user_id_fkey";
      ALTER TABLE user_performance_tracking DROP CONSTRAINT IF EXISTS "user_performance_tracking_user_id_fkey";

      ALTER TABLE auth_users ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
      
      ALTER TABLE auth_accounts ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
      ALTER TABLE auth_accounts ALTER COLUMN "userId" TYPE VARCHAR(255) USING "userId"::VARCHAR;
      
      ALTER TABLE auth_sessions ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
      ALTER TABLE auth_sessions ALTER COLUMN "userId" TYPE VARCHAR(255) USING "userId"::VARCHAR;

      ALTER TABLE ai_insight_usage ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR;
      ALTER TABLE payment_transactions ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR;
      ALTER TABLE user_betslips ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR;
      ALTER TABLE user_comparisons ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR;
      ALTER TABLE user_performance_tracking ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR;

      ALTER TABLE ai_insight_usage ADD CONSTRAINT "ai_insight_usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
      ALTER TABLE auth_accounts ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth_users(id) ON DELETE CASCADE;
      ALTER TABLE auth_sessions ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth_users(id) ON DELETE CASCADE;
      ALTER TABLE payment_transactions ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
      ALTER TABLE user_betslips ADD CONSTRAINT "user_betslips_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
      ALTER TABLE user_comparisons ADD CONSTRAINT "user_comparisons_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
      ALTER TABLE user_performance_tracking ADD CONSTRAINT "user_performance_tracking_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    `);
    console.log("Successfully altered ALL IDs to VARCHAR!");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
main();
