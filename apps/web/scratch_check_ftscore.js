require('dotenv').config();
const {neon} = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql(`SELECT raw_data FROM matches_cache WHERE raw_data->>'ftScore' != '' AND raw_data->>'ftScore' IS NOT NULL LIMIT 2`)
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(console.error);
