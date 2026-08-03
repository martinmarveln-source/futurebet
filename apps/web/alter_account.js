const { Pool } = require('@neondatabase/serverless'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 
(async () => { 
  try {
    await pool.query('DROP VIEW IF EXISTS "account"'); 
    await pool.query('ALTER TABLE auth_accounts ALTER COLUMN "type" DROP NOT NULL'); 
    await pool.query('CREATE VIEW "account" AS SELECT * FROM auth_accounts'); 
    console.log('Successfully altered type to nullable'); 
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
