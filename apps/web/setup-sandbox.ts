import { sql } from './src/app/api/utils/sql.js';

async function setup() {
  console.log('Creating sandbox_archive table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS sandbox_archive (
        id SERIAL PRIMARY KEY,
        match_date TIMESTAMP,
        home_team VARCHAR(255),
        away_team VARCHAR(255),
        league VARCHAR(255),
        model_chance NUMERIC(5,2),
        model_rating NUMERIC(5,2),
        algorithm_pick VARCHAR(50),
        ft_result VARCHAR(50),
        is_win BOOLEAN,
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Table created successfully!');
    
    // Add unique constraint separately in case it already exists
    try {
      await sql`
        ALTER TABLE sandbox_archive 
        ADD CONSTRAINT unique_match_prediction UNIQUE (match_date, home_team, away_team, algorithm_pick);
      `;
      console.log('Added unique constraint.');
    } catch (err) {
      if (err.code === '42710') { // duplicate_object
        console.log('Unique constraint already exists.');
      } else {
        console.warn('Warning on constraint:', err.message);
      }
    }
    
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    process.exit(0);
  }
}

setup();
