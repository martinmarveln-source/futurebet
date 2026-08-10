import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_bWZfuj36stXc@ep-wild-pond-ax4pdmil-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function main() {
  console.log("Updating database schema for IP tracking...");
  
  await sql`
    CREATE TABLE IF NOT EXISTS signup_ips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ip_address TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_signup_ips_ip_address ON signup_ips(ip_address);
  `;
  
  console.log("Schema updated successfully.");
}

main().catch(console.error);
