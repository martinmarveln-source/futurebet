import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&options=-csearch_path%3Dpublic");

async function checkSchema() {
  try {
    const cols = await sql`
      SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns 
      WHERE table_name = 'user_preferences';
    `;
    console.log("Columns:", cols);

    const constraints = await sql`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'user_preferences'::regclass;
    `;
    console.log("Constraints:", constraints);
  } catch (e) {
    console.error(e);
  }
}

checkSchema();
