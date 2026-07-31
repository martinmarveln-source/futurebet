const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('auth_users', 'auth_accounts', 'auth_sessions')
      ORDER BY table_name;
    `);
    console.log("Schema:");
    console.table(res.rows);

    const users = await pool.query(`SELECT email, password FROM auth_users LIMIT 5;`);
    console.log("Users passwords:");
    console.log(users.rows);

    const accounts = await pool.query(`SELECT * FROM auth_accounts LIMIT 5;`);
    console.log("Accounts:");
    console.log(accounts.rows);

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();
