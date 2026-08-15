const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

// Simple fetch since we can't easily import the complex typescript here
async function triggerLocal() {
  console.log("Triggering local dev server request to populate DB...");
  try {
     const res = await fetch("http://localhost:3000/api/cron/generate-vip-picks");
     const data = await res.json();
     console.log("Response:", data);
  } catch (err) {
     console.error("Fetch failed:", err);
  }
}
triggerLocal();
