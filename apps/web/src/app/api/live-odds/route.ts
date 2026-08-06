import { NextResponse } from "next/server";

export async function GET() {
  try {
    const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Odds2`;

    const response = await fetch(CSV_URL, {
      next: { revalidate: 300 }, // Cache on the server for 5 minutes
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch live odds" }, { status: response.status });
    }

    const csvText = await response.text();
    const rows = csvText.split("\n");
    if (rows.length < 2) return NextResponse.json([]);

    const headers = rows[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const archiveData: Record<string, string | null>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const rowText = rows[i].trim();
      if (!rowText) continue;
      const values = rowText.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      let rowObj: Record<string, string | null> = {};
      headers.forEach((header, index) => {
        let val = values[index]
          ? values[index].trim().replace(/^"|"$/g, "")
          : null;
        rowObj[header] = val;
      });
      archiveData.push(rowObj);
    }
    
    // Use proper cache-control for Vercel/Railway Edge caching
    return NextResponse.json(archiveData, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=59",
      },
    });
  } catch (error) {
    console.error("Live odds fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
