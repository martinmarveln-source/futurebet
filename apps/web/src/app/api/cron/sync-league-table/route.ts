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
        market_stats JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(country, league, team)
      )
    `;

    // Try to add the column if it doesn't exist (for backward compatibility)
    try {
      await sql`ALTER TABLE league_table_cache ADD COLUMN market_stats JSONB DEFAULT '{}'::jsonb`;
    } catch (e) {
      // Column likely already exists, ignore
    }

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
            // Determine if SN is at index 0 or index 54 based on user's new format where Column A (0) is League
            const isColumnALeague = clean(r.c?.[0]?.v) === clean(r.c?.[2]?.v) || isNaN(Number(clean(r.c?.[0]?.v)));
            const snValue = isColumnALeague ? clean(r.c?.[54]?.v) : clean(r.c?.[0]?.v);

            const market_stats = JSON.stringify({
              PPG_Home: clean(r.c?.[13]?.v),
              PPG_Away: clean(r.c?.[14]?.v),
              GP_HOME: clean(r.c?.[15]?.v),
              GP_AWAY: clean(r.c?.[16]?.v),
              Home_Win: clean(r.c?.[17]?.v),
              Away_Win: clean(r.c?.[18]?.v),
              HOME_DRAW: clean(r.c?.[19]?.v),
              AWAY_DRAW: clean(r.c?.[20]?.v),
              HOME_LOST: clean(r.c?.[21]?.v),
              AWAY_LOST: clean(r.c?.[22]?.v),
              O15_ALL: clean(r.c?.[23]?.v), O15_HOME: clean(r.c?.[24]?.v), O15_AWAY: clean(r.c?.[25]?.v),
              O25_ALL: clean(r.c?.[26]?.v), O25_HOME: clean(r.c?.[27]?.v), O25_AWAY: clean(r.c?.[28]?.v),
              O35_ALL: clean(r.c?.[29]?.v), O35_HOME: clean(r.c?.[30]?.v), O35_AWAY: clean(r.c?.[31]?.v),
              O45_ALL: clean(r.c?.[32]?.v), O45_HOME: clean(r.c?.[33]?.v), O45_AWAY: clean(r.c?.[34]?.v),
              BTTS_ALL: clean(r.c?.[35]?.v), BTTS_HOME: clean(r.c?.[36]?.v), BTTS_AWAY: clean(r.c?.[37]?.v),
              CS_ALL: clean(r.c?.[38]?.v), CS_HOME: clean(r.c?.[39]?.v), CS_AWAY: clean(r.c?.[40]?.v),
              XG_ALL: clean(r.c?.[41]?.v), XG_HOME: clean(r.c?.[42]?.v), XG_AWAY: clean(r.c?.[43]?.v),
              XGA_ALL: clean(r.c?.[44]?.v), XGA_HOME: clean(r.c?.[45]?.v), XGA_AWAY: clean(r.c?.[46]?.v),
              FTS_ALL: clean(r.c?.[47]?.v), FTS_HOME: clean(r.c?.[48]?.v), FTS_AWAY: clean(r.c?.[49]?.v),
              HGS_Over_15: clean(r.c?.[50]?.v), HGC_Over_15: clean(r.c?.[51]?.v),
              AGS_Over_15: clean(r.c?.[52]?.v), AGC_Over_15: clean(r.c?.[53]?.v)
            });

            await sql`
              INSERT INTO league_table_cache (
                country, league, team, sn, gp, win, draw, lost, gs, gc, gd, pts, ppg, win_rate, market_stats, updated_at
              ) VALUES (
                ${country}, ${league}, ${team}, 
                ${snValue}, ${clean(r.c?.[4]?.v)}, ${clean(r.c?.[5]?.v)}, 
                ${clean(r.c?.[6]?.v)}, ${clean(r.c?.[7]?.v)}, ${clean(r.c?.[8]?.v)}, 
                ${clean(r.c?.[9]?.v)}, ${clean(r.c?.[10]?.v)}, ${clean(r.c?.[11]?.v)}, 
                ${clean(r.c?.[12]?.v)}, null, ${market_stats}::jsonb, NOW()
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
                market_stats = EXCLUDED.market_stats,
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
