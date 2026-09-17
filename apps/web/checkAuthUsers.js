require('dotenv').config({path: '.env.local'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || process.env.POSTGRES_URL);
async function run() {
  const res = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'auth_users'`;
  console.log(res);
  process.exit(0);
}
run();
