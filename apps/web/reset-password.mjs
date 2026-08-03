import { hashPassword } from 'better-auth/crypto';
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function reset() {
  const newHash = await hashPassword('warwar99');
  await sql`
    UPDATE auth_accounts
    SET password = ${newHash}
    WHERE "userId" = '1'
  `;
  console.log("Password for shackurah@gmail.com reset successfully to: warwar99");
}

reset().catch(console.error);
