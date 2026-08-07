const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    console.log('Testing user_comparisons sequence...');
    const guestIdentifier = 'test_user_id_123';
    
    // Just try inserting a fake user comparison to see if it fails
    // Wait, let's just fix the sequence directly, it's safer and idempotent!
    await sql`
      SELECT setval('user_comparisons_id_seq', COALESCE((SELECT MAX(id) FROM user_comparisons), 1));
    `;
    console.log('user_comparisons Sequence fixed');
    
    // Also ai_insight_logs might have the same problem!
    await sql`
      SELECT setval('ai_insight_logs_id_seq', COALESCE((SELECT MAX(id) FROM ai_insight_logs), 1));
    `;
    console.log('ai_insight_logs Sequence fixed');
    
  } catch (error) {
    console.error('Error fixing sequence:', error);
  }
}

run();
