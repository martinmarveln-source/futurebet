require('dotenv').config({path: '.env.local'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || process.env.POSTGRES_URL);
async function run() {
  try {
    const res = await sql`SELECT COUNT(*) FROM user_picks_log`;
    console.log('Picks count:', res);
    
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_picks_log'`;
    console.log('Columns:', cols);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
