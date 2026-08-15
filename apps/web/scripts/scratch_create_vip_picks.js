import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function createTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vip_picks (
        id VARCHAR(255) PRIMARY KEY,
        match_id VARCHAR(255),
        match_date DATE,
        time VARCHAR(50),
        match VARCHAR(255),
        league VARCHAR(255),
        market VARCHAR(50),
        selection VARCHAR(50),
        odds NUMERIC,
        vip_score NUMERIC,
        predicted_score VARCHAR(50),
        chance_percent VARCHAR(50),
        rating_percent NUMERIC,
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Created vip_picks table successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  }
}

createTable();
