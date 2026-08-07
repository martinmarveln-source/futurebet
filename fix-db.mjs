import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&options=-csearch_path%3Dpublic");

async function fix() {
  try {
    const duplicates = await sql`
      SELECT user_id, COUNT(*)
      FROM user_preferences
      GROUP BY user_id
      HAVING COUNT(*) > 1;
    `;
    console.log("Duplicates:", duplicates);
    
    console.log("Adding UNIQUE constraint...");
    await sql`ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);`;
    console.log("Success!");
  } catch(e) {
    console.error(e);
  }
}
fix();
