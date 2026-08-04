import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("Starting DB Index Creation...");

  const queries = [
    `CREATE INDEX IF NOT EXISTS idx_payment_transactions_tx_id ON payment_transactions (transaction_id);`,
    `CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences (user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (LOWER(email));`,
    `CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_key ON ai_insights_cache (cache_key);`,
    `CREATE INDEX IF NOT EXISTS idx_guest_comparisons_identifier ON guest_comparisons (guest_identifier);`,
  ];

  for (const q of queries) {
    try {
      console.log(`Executing: ${q}`);
      await pool.query(q);
      console.log("Success.");
    } catch (e: any) {
      console.error(`Failed: ${e.message}`);
    }
  }

  console.log("Finished adding indexes.");
  await pool.end();
}

main().catch(console.error);
