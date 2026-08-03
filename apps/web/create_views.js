const { Pool } = require('@neondatabase/serverless'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 
(async () => { 
  try {
    await pool.query('CREATE OR REPLACE VIEW "user" AS SELECT * FROM auth_users'); 
    await pool.query('CREATE OR REPLACE VIEW "session" AS SELECT * FROM auth_sessions'); 
    await pool.query('CREATE OR REPLACE VIEW "account" AS SELECT * FROM auth_accounts'); 
    await pool.query('CREATE OR REPLACE VIEW "verification" AS SELECT * FROM auth_verification_token'); 
    console.log('Views created'); 
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
