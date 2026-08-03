const { Pool } = require('@neondatabase/serverless'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 
pool.query("SELECT column_name, column_default, data_type FROM information_schema.columns WHERE table_name = 'user_sessions'").then(res => { console.log(res.rows); process.exit(0); }).catch(console.error);
