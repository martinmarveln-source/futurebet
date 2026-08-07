import { NextResponse } from "next/server";
import sql from "../../utils/sql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('Authorization');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS league_table_cache (
        id BIGSERIAL PRIMARY KEY,
        country TEXT NOT NULL,
        league TEXT NOT NULL,
        team TEXT NOT NULL,
        sn TEXT,
        gp TEXT,
        win TEXT,
        draw TEXT,
        lost TEXT,
        gs TEXT,
        gc TEXT,
        gd TEXT,
        pts TEXT,
        ppg TEXT,
        win_rate TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(country, league, team)
      )
    `;

    // 2. Fetch from Google Sheets
    const SHEET_ID = "1efYsSPNw6LJOmguPfJmzvq92o30ooAY2UgH_dbdYjq8";
    const SHEET_NAME = "table";
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch Sheet: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows || [];

    const clean = (v: any) => String(v || "").replace(/"/g, "").trim();

    let inserted = 0;
    let errors = 0;

    // Helper to chunk arrays
    const chunkArray = (arr: any[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    // 3. Upsert into database in chunks to prevent timeouts
    const chunks = chunkArray(rows, 50);
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (r: any) => {
          const country = clean(r.c?.[1]?.v);
          const league = clean(r.c?.[2]?.v);
          const team = clean(r.c?.[3]?.v);

          if (!country || !league || !team || team === "Team") return;

          try {
            await sql`
              INSERT INTO league_table_cache (
                country, league, team, sn, gp, win, draw, lost, gs, gc, gd, pts, ppg, win_rate, updated_at
              ) VALUES (
                ${country}, ${league}, ${team}, 
                ${clean(r.c?.[0]?.v)}, ${clean(r.c?.[4]?.v)}, ${clean(r.c?.[5]?.v)}, 
                ${clean(r.c?.[6]?.v)}, ${clean(r.c?.[7]?.v)}, ${clean(r.c?.[8]?.v)}, 
                ${clean(r.c?.[9]?.v)}, ${clean(r.c?.[10]?.v)}, ${clean(r.c?.[11]?.v)}, 
                ${clean(r.c?.[12]?.v)}, ${clean(r.c?.[13]?.v)}, NOW()
              )
              ON CONFLICT (country, league, team) 
              DO UPDATE SET 
                sn = EXCLUDED.sn,
                gp = EXCLUDED.gp,
                win = EXCLUDED.win,
                draw = EXCLUDED.draw,
                lost = EXCLUDED.lost,
                gs = EXCLUDED.gs,
                gc = EXCLUDED.gc,
                gd = EXCLUDED.gd,
                pts = EXCLUDED.pts,
                ppg = EXCLUDED.ppg,
                win_rate = EXCLUDED.win_rate,
                updated_at = NOW();
            `;
            inserted++;
          } catch (err) {
            console.error("Error inserting row:", err);
            errors++;
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      inserted,
      errors,
      message: `Successfully synchronized ${inserted} teams.`
    });

  } catch (error: any) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
