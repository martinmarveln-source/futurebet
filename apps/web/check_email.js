const { Pool } = require('@neondatabase/serverless'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 
(async () => {
  try {
    const res = await pool.query("SELECT email FROM auth_users WHERE email = 'shackurah2@gmail.com'");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
