const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

neonConfig.webSocketConstructor = ws;

async function run() {
  const connectionString = "postgresql://neondb_owner:npg_ufXopB20iEWS@ep-wild-pond-ax4pdmil-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  const pool = new Pool({ connectionString });
  
  let client;
  try {
    client = await pool.connect();
    
    console.log("Wiping existing schema to ensure a clean slate...");
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;");
    
    const filePath = path.join(__dirname, '../../insert_development.sql');
    console.log("Reading insert_development.sql from:", filePath);
    let sql = fs.readFileSync(filePath, 'utf8');
    
    // Fix search path for unqualified table names
    sql = "SET search_path = public;\n" + sql;

    console.log("Executing SQL dump... This might take a few seconds.");
    await client.query(sql);
    console.log("Import successful!");
  } catch (err) {
    console.error("Error importing:", err);
  } finally {
    if (client) client.release();
    pool.end();
  }
}

run();
