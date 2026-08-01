import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import Papa from "papaparse";

const SHEET_ID = "1JlcJ1qGZ0IOTnDamMHuhcJ2wAxozTRmfhYs96GbPoJQ";
const GID = "0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

export async function GET(request: Request) {
  // Check CRON_SECRET for security
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('Authorization');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(CSV_URL, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
    }
    
    const text = await res.text();
    
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (!parsed.data?.length) {
      throw new Error("No valid data found in CSV");
    }

    let inserted = 0;
    let skipped = 0;

    for (const row of parsed.data as any[]) {
      const chanceStr = row["Model_Chance"] || row["Chance"];
      const ratingStr = row["Model_Rating"] || row["Rating"];
      const pickStr = row["Algorithm_Pick"] || row["Prediction_Validation"] || row["TIPS"];
      const resultStr = row["FT_Result"] || row["FT-Result"];
      const dateStr = row["Date"] || row["DATE"];
      const leagueStr = row["League"] || row["LEAGUE"];
      
      let homeTeam = row["HOME"] || "";
      let awayTeam = row["AWAY"] || "";
      
      if (!homeTeam && row["Match"]) {
         const parts = row["Match"].split(" - ");
         if (parts.length === 2) {
           homeTeam = parts[0];
           awayTeam = parts[1];
         }
      }

      if (!homeTeam && row["HOME/AWAY"]) {
         const parts = row["HOME/AWAY"].split(" - ");
         if (parts.length === 2) {
           homeTeam = parts[0];
           awayTeam = parts[1];
         }
      }

      const chance = Number(chanceStr) || null;
      const rating = Number(ratingStr) || null;
      let rawMarket = String(pickStr || "").trim().toUpperCase();
      const resultRaw = String(resultStr || "").trim().toUpperCase();
      
      let market = "";
      if (rawMarket.includes("HOME") || rawMarket === "1") market = "HOME";
      else if (rawMarket.includes("AWAY") || rawMarket === "2") market = "AWAY";
      else if (rawMarket.includes("DRAW") || rawMarket === "X") market = "DRAW";
      else if (rawMarket === "GG" || rawMarket.includes("BTTS - YES")) market = "GG";
      else if (rawMarket === "NG" || rawMarket.includes("BTTS - NO")) market = "NG";
      else if (rawMarket.includes("OV") || rawMarket.includes("OVER")) market = "OV";
      else if (rawMarket.includes("UN") || rawMarket.includes("UNDER")) market = "UN";
      else market = rawMarket;

      let isWin = null;
      let finalResult = null;
      
      if (resultRaw && resultRaw.includes(":")) {
        const parts = resultRaw.split(":");
        const hg = parseInt(parts[0], 10);
        const ag = parseInt(parts[1], 10);
        
        if (!isNaN(hg) && !isNaN(ag)) {
          const totalGoals = hg + ag;
          let won = false;

          if (market === "HOME" && hg > ag) won = true;
          else if (market === "AWAY" && ag > hg) won = true;
          else if (market === "DRAW" && hg === ag) won = true;
          else if (market === "GG" && hg > 0 && ag > 0) won = true;
          else if (market === "NG" && (hg === 0 || ag === 0)) won = true;
          else if (market === "OV" && totalGoals > 2) won = true;
          else if (market === "UN" && totalGoals < 3) won = true;

          isWin = won;
          finalResult = won ? "W" : "L";
        } else {
          finalResult = "D";
        }
      } else {
        finalResult = "D";
      }

      if (!market || chance === null || rating === null) {
        skipped++;
        continue;
      }

      let matchDate = null;
      if (dateStr) {
         try {
           matchDate = new Date(dateStr).toISOString();
         } catch (e) {
           matchDate = null;
         }
      }

      try {
        await sql`
          INSERT INTO sandbox_archive (
            match_date, 
            home_team, 
            away_team, 
            league, 
            model_chance, 
            model_rating, 
            algorithm_pick, 
            ft_result, 
            is_win, 
            raw_data
          ) VALUES (
            ${matchDate ? matchDate : null},
            ${homeTeam || 'Unknown'},
            ${awayTeam || 'Unknown'},
            ${leagueStr || 'Unknown'},
            ${chance},
            ${rating},
            ${market},
            ${finalResult},
            ${isWin},
            ${JSON.stringify(row)}
          )
          ON CONFLICT (match_date, home_team, away_team, algorithm_pick) 
          DO UPDATE SET 
            ft_result = EXCLUDED.ft_result,
            is_win = EXCLUDED.is_win,
            raw_data = EXCLUDED.raw_data;
        `;
        inserted++;
      } catch (err: any) {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      message: `Synced ${inserted} records.`
    });
    
  } catch (error: any) {
    console.error("Error during sync:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
