const sql = require('./app/api/utils/sql').default;
sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_preferences'`.then(console.log).catch(console.error).finally(()=>process.exit(0));
