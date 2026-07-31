require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const { hashPassword } = require('better-auth/crypto');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("Hashing password...");
    // better-auth uses its internal hashPassword function
    const hash = await hashPassword("password123");
    
    console.log("Updating database...");
    const result = await pool.query(`
      UPDATE public.auth_accounts 
      SET password = $1 
      WHERE "userId" = (SELECT id FROM public.auth_users WHERE email = 'shackurah@gmail.com')
      AND provider = 'credentials'
    `, [hash]);

    console.log(`Updated ${result.rowCount} account(s)!`);
    console.log("You can now log in with email: shackurah@gmail.com and password: password123");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

main();
