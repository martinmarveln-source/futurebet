import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import { deriveDoubleChance, deriveOverUnder } from "../../utils/oddsMath";

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

      // Derive Double Chance
      const hOdds = Number(rowObj.homeOdds) || Number(rowObj.home_odds) || 0;
      const dOdds = Number(rowObj.drawOdds) || Number(rowObj.draw_odds) || 0;
      const aOdds = Number(rowObj.awayOdds) || Number(rowObj.away_odds) || 0;
      const dc = deriveDoubleChance(hOdds, dOdds, aOdds);
      if (dc.dc1X) rowObj.dc1X = String(dc.dc1X);
      if (dc.dc12) rowObj.dc12 = String(dc.dc12);
      if (dc.dcX2) rowObj.dcX2 = String(dc.dcX2);

      // Derive Over/Under where missing
      const o25Odds = Number(rowObj.o25Odds) || Number(rowObj.o25_odds) || 0;
      const u25Odds = Number(rowObj.u25Odds) || Number(rowObj.u25_odds) || 0;
      const ou = deriveOverUnder(o25Odds, u25Odds);
      
      if (!rowObj.o15Odds && ou.o15Odds) rowObj.o15Odds = String(ou.o15Odds);
      if (!rowObj.u15Odds && ou.u15Odds) rowObj.u15Odds = String(ou.u15Odds);
      if (!rowObj.o35Odds && ou.o35Odds) rowObj.o35Odds = String(ou.o35Odds);
      if (!rowObj.u35Odds && ou.u35Odds) rowObj.u35Odds = String(ou.u35Odds);
      if (!rowObj.o45Odds && ou.o45Odds) rowObj.o45Odds = String(ou.o45Odds);
      if (!rowObj.u45Odds && ou.u45Odds) rowObj.u45Odds = String(ou.u45Odds);

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
