import { NextResponse } from "next/server";
import sql from "../utils/sql";

export async function GET() {
  try {
    const rows = await sql`SELECT raw_data FROM live_odds_cache LIMIT 1`;
    
    if (rows.length === 0) {
      return NextResponse.json([]);
    }

    const archiveData = rows[0].raw_data || [];

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
