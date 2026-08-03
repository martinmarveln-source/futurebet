import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function inspectAccount() {
  const accounts = await sql`SELECT * FROM auth_accounts WHERE "userId" = '1'`;
  console.log("Accounts for user 1:", JSON.stringify(accounts, null, 2));
}

inspectAccount().catch(console.error);
