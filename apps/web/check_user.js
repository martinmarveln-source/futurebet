const { Pool } = require('@neondatabase/serverless'); 
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }); 
pool.query("SELECT email, user_role, subscription_status FROM auth_users WHERE email LIKE '%shackurah%'").then(res => { console.log(res.rows); process.exit(0); }).catch(console.error);
