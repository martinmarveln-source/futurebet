const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.guest_comparisons (
        id SERIAL PRIMARY KEY,
        guest_identifier text NOT NULL,
        comparison_data jsonb,
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Table created or already exists');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_guest_comparisons_identifier ON guest_comparisons (guest_identifier)
    `;
    console.log('Index created or already exists');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

run();
