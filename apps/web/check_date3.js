require('dotenv').config();
const {neon} = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql(`SELECT raw_data FROM matches_cache WHERE match_date = '2026-08-15' LIMIT 3`)
    .then(r => console.log(r.map(x => x.raw_data.date)))
    .catch(console.error);
