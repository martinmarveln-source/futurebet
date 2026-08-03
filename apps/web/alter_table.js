const { Pool } = require('@neondatabase/serverless'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 
(async () => { 
  try {
    await pool.query('DROP VIEW "user"'); 
    await pool.query('ALTER TABLE auth_users ALTER COLUMN "emailVerified" TYPE boolean USING CASE WHEN "emailVerified" IS NOT NULL THEN true ELSE false END'); 
    await pool.query('CREATE VIEW "user" AS SELECT * FROM auth_users'); 
    console.log('Successfully altered emailVerified to boolean'); 
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
