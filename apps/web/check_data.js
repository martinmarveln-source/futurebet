require('dotenv').config();
const {neon} = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql(`SELECT raw_data FROM matches_cache WHERE match_date = '2026-08-15' LIMIT 1`)
    .then(r => console.log(JSON.stringify(r[0].raw_data, null, 2)))
    .catch(console.error);
