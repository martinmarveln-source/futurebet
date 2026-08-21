import { NextResponse } from "next/server";
import sql from "../../utils/sql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('Authorization');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Ensure table exists with all columns
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

    // Try to add columns if they don't exist (backward compatibility)
    for (const colDef of [
      `ALTER TABLE league_table_cache ADD COLUMN market_stats JSONB DEFAULT '{}'::jsonb`,
    ]) {
      try { await sql.unsafe(colDef); } catch (_) { /* already exists */ }
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

    const clean = (v: any) => String(v ?? "").replace(/"/g, "").trim();

    let inserted = 0;
    let errors = 0;

    // 2.5 Generate SN per league synchronously based on row order
    const leagueRanks: Record<string, number> = {};
    const validRows: any[] = [];
    for (const r of rows) {
      const country = clean(r.c?.[1]?.v);
      const league  = clean(r.c?.[2]?.v);
      const team    = clean(r.c?.[3]?.v);
      
      if (!country || !league || !team || team === "Team" || team === "TEAMS") continue;
      
      const leagueKey = `${country}-${league}`;
      leagueRanks[leagueKey] = (leagueRanks[leagueKey] || 0) + 1;
      r._generated_sn = leagueRanks[leagueKey].toString();
      r._country = country;
      r._league  = league;
      r._team    = team;
      
      validRows.push(r);
    }

    // Helper to chunk arrays
    const chunkArray = (arr: any[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    };

    // 3. Upsert into database in chunks to prevent timeouts
    const chunks = chunkArray(validRows, 50);
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (r: any) => {
          const country  = r._country;
          const league   = r._league;
          const team     = r._team;
          const snValue  = r._generated_sn;

          try {
            // Column layout (0-indexed from Google Sheets gviz response):
            // [0]=hidden/SN  [1]=Country  [2]=League  [3]=TEAMS
            // [4]=GP  [5]=WIN  [6]=DRAW  [7]=LOST  [8]=GS  [9]=GC  [10]=GD  [11]=PTS  [12]=PPG
            // [13]=PPG_Home  [14]=PPG_Away
            // [15]=GP_HOME  [16]=GP_AWAY
            // [17]=Home_Win  [18]=Away_Win  [19]=HOME_DRAW  [20]=AWAY_DRAW  [21]=HOME_LOST  [22]=AWAY_LOST
            // [23]=O1.5_ALL  [24]=O1.5_HOME  [25]=O1.5_AWAY
            // [26]=O2.5_ALL  [27]=O2.5_HOME  [28]=O2.5_AWAY
            // [29]=O3.5_ALL  [30]=O3.5_HOME  [31]=O3.5_AWAY
            // [32]=O4.5_ALL  [33]=O4.5_HOME  [34]=O4.5_AWAY
            // [35]=BTTS_ALL  [36]=BTTS_HOME  [37]=BTTS_AWAY
            // [38]=CS_ALL  [39]=CS_HOME  [40]=CS_AWAY
            // [41]=XG_ALL  [42]=XG_HOME  [43]=XG_AWAY
            // [44]=XGA_ALL  [45]=XGA_HOME  [46]=XGA_AWAY
            // [47]=FTS_ALL  [48]=FTS_HOME  [49]=FTS_AWAY
            // [50]=HGS_Over_1.5  [51]=HGC_Over_1.5  [52]=AGS_Over_1.5  [53]=AGC_Over_1.5
            // [54]=RANK  [55]=Overall_Form  [56]=Home_Form  [57]=Away_Form  ← NEW

            const market_stats = JSON.stringify({
              PPG_Home:    clean(r.c?.[13]?.v),
              PPG_Away:    clean(r.c?.[14]?.v),
              GP_HOME:     clean(r.c?.[15]?.v),
              GP_AWAY:     clean(r.c?.[16]?.v),
              Home_Win:    clean(r.c?.[17]?.v),
              Away_Win:    clean(r.c?.[18]?.v),
              HOME_DRAW:   clean(r.c?.[19]?.v),
              AWAY_DRAW:   clean(r.c?.[20]?.v),
              HOME_LOST:   clean(r.c?.[21]?.v),
              AWAY_LOST:   clean(r.c?.[22]?.v),
              O15_ALL:  clean(r.c?.[23]?.v), O15_HOME: clean(r.c?.[24]?.v), O15_AWAY: clean(r.c?.[25]?.v),
              O25_ALL:  clean(r.c?.[26]?.v), O25_HOME: clean(r.c?.[27]?.v), O25_AWAY: clean(r.c?.[28]?.v),
              O35_ALL:  clean(r.c?.[29]?.v), O35_HOME: clean(r.c?.[30]?.v), O35_AWAY: clean(r.c?.[31]?.v),
              O45_ALL:  clean(r.c?.[32]?.v), O45_HOME: clean(r.c?.[33]?.v), O45_AWAY: clean(r.c?.[34]?.v),
              BTTS_ALL: clean(r.c?.[35]?.v), BTTS_HOME: clean(r.c?.[36]?.v), BTTS_AWAY: clean(r.c?.[37]?.v),
              CS_ALL:   clean(r.c?.[38]?.v), CS_HOME:  clean(r.c?.[39]?.v), CS_AWAY:  clean(r.c?.[40]?.v),
              XG_ALL:   clean(r.c?.[41]?.v), XG_HOME:  clean(r.c?.[42]?.v), XG_AWAY:  clean(r.c?.[43]?.v),
              XGA_ALL:  clean(r.c?.[44]?.v), XGA_HOME: clean(r.c?.[45]?.v), XGA_AWAY: clean(r.c?.[46]?.v),
              FTS_ALL:  clean(r.c?.[47]?.v), FTS_HOME: clean(r.c?.[48]?.v), FTS_AWAY: clean(r.c?.[49]?.v),
              HGS_Over_15: clean(r.c?.[50]?.v),
              HGC_Over_15: clean(r.c?.[51]?.v),
              AGS_Over_15: clean(r.c?.[52]?.v),
              AGC_Over_15: clean(r.c?.[53]?.v),
              // ─── NEW columns ───
              RANK:         clean(r.c?.[54]?.v),
              Overall_Form: clean(r.c?.[55]?.v),
              Home_Form:    clean(r.c?.[56]?.v),
              Away_Form:    clean(r.c?.[57]?.v),
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
                sn           = EXCLUDED.sn,
                gp           = EXCLUDED.gp,
                win          = EXCLUDED.win,
                draw         = EXCLUDED.draw,
                lost         = EXCLUDED.lost,
                gs           = EXCLUDED.gs,
                gc           = EXCLUDED.gc,
                gd           = EXCLUDED.gd,
                pts          = EXCLUDED.pts,
                ppg          = EXCLUDED.ppg,
                market_stats = EXCLUDED.market_stats,
                updated_at   = NOW();
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
      message: `Successfully synchronized ${inserted} teams. New columns: RANK, Overall_Form, Home_Form, Away_Form.`
    });

  } catch (error: any) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
