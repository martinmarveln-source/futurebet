import { NextResponse } from "next/server";
import sql from "../../utils/sql";

const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Odds2`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") || request.headers.get("Authorization");
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS live_odds_cache (
        id BIGSERIAL PRIMARY KEY,
        raw_data JSONB NOT NULL,
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const response = await fetch(CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheets data. Status: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = csvText.split("\n");
    
    if (rows.length < 2) {
      await sql`TRUNCATE TABLE live_odds_cache`;
      return NextResponse.json({ success: true, count: 0 });
    }

    const headers = rows[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const archiveData: Record<string, string | null>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const rowText = rows[i].trim();
      if (!rowText) continue;
      const values = rowText.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      let rowObj: Record<string, string | null> = {};
      headers.forEach((header, index) => {
        let val = values[index] ? values[index].trim().replace(/^"|"$/g, "") : null;
        rowObj[header] = val;
      });
      archiveData.push(rowObj);
    }

    await sql`TRUNCATE TABLE live_odds_cache`;
    
    await sql`
      INSERT INTO live_odds_cache (raw_data, synced_at)
      VALUES (${JSON.stringify(archiveData)}, NOW())
    `;

    return NextResponse.json({ success: true, count: archiveData.length });
  } catch (error: any) {
    console.error("Live odds sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
