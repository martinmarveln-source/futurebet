const { Pool } = require('@neondatabase/serverless'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 

async function run() {
  try {
    await pool.query(`ALTER TABLE user_sessions ALTER COLUMN user_id TYPE VARCHAR(255);`);
    console.log("Success");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
