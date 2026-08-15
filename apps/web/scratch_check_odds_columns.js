require('dotenv').config();
const {neon} = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql(`SELECT raw_data FROM matches_cache LIMIT 50`)
    .then(r => {
        const keys = new Set();
        r.forEach(row => Object.keys(row.raw_data).forEach(k => keys.add(k)));
        console.log(Array.from(keys).filter(k => k.toLowerCase().includes('odd')));
    })
    .catch(console.error);
