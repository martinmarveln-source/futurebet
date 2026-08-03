import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const result = await sql`SELECT COUNT(*) FROM sandbox_archive`;
    console.log(`Sandbox table has ${result[0].count} rows.`);
  } catch (err) {
    console.error("Error querying sandbox:", err);
  }
}
main();
