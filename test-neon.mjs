import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&options=-csearch_path%3Dpublic");

async function test() {
  try {
    const result = await sql`SELECT * FROM matches_cache LIMIT 1`;
    console.log(result);
  } catch(e) {
    console.error(e);
  }
}
test();
