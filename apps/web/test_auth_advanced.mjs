import { betterAuth } from 'better-auth';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
});

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
  advanced: {
    useSchema: true // maybe?
  },
  user: { modelName: 'auth_users' },
  session: { modelName: 'auth_sessions' },
  account: { modelName: 'auth_accounts' },
  verification: { modelName: 'auth_verification_token' }
});

async function run() {
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: `test${Date.now()}@test.com`,
        password: "password123",
        name: "Test User"
      }
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error creating user:", err);
  } finally {
    await pool.end();
  }
}
run();
