const { Pool } = require('@neondatabase/serverless'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 

async function run() {
  try {
    const res = await pool.query(`SELECT setval(pg_get_serial_sequence('user_sessions', 'id'), COALESCE(MAX(id), 1) + 1) FROM user_sessions;`);
    console.log("Sequence reset!", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
