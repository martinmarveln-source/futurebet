require('dotenv').config({path: '.env.local'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || process.env.POSTGRES_URL);
async function run() {
  try {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'league_table_cache'`;
    console.log(cols);
  } finally {
    process.exit(0);
  }
}
run();
