import 'dotenv/config';
import sql from './src/app/api/utils/sql.ts';
import Papa from 'papaparse';
import cron from 'node-cron';

const SHEET_ID = "1JlcJ1qGZ0IOTnDamMHuhcJ2wAxozTRmfhYs96GbPoJQ";
const GID = "0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

async function sync() {
  console.log(`Starting automated sync from ${CSV_URL}...`);
  
  try {
    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS sandbox_archive (
        id BIGSERIAL PRIMARY KEY,
        match_date TIMESTAMPTZ,
        home_team TEXT NOT NULL DEFAULT 'Unknown',
        away_team TEXT NOT NULL DEFAULT 'Unknown',
        league TEXT DEFAULT 'Unknown',
        model_chance NUMERIC,
        model_rating NUMERIC,
        algorithm_pick TEXT NOT NULL,
        ft_result TEXT,
        is_win BOOLEAN,
        raw_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(match_date, home_team, away_team, algorithm_pick)
      )
    `;
    const res = await fetch(CSV_URL, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
    }
    
    const text = await res.text();
    
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      console.warn("CSV parse errors:", parsed.errors);
    }

    if (!parsed.data?.length) {
      throw new Error("No valid data found in CSV");
    }

    console.log(`Parsed ${parsed.data.length} rows. Upserting to database...`);

    let inserted = 0;
    let skipped = 0;

    for (const row of parsed.data as any[]) {
      // Map properties based on the format provided previously
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

      const chance = chanceStr !== undefined && chanceStr !== '' ? Number(chanceStr) : null;
      const rating = ratingStr !== undefined && ratingStr !== '' ? Number(ratingStr) : null;
      let rawMarket = String(pickStr || "").trim().toUpperCase();
      const resultRaw = String(resultStr || "").trim().toUpperCase();
      
      // Normalize Market Name — handle all common formats
      let market = "";
      if (rawMarket === "HOME WIN" || rawMarket === "HOME" || rawMarket === "1") market = "HOME";
      else if (rawMarket === "AWAY WIN" || rawMarket === "AWAY" || rawMarket === "2") market = "AWAY";
      else if (rawMarket === "DRAW" || rawMarket === "X") market = "DRAW";
      else if (rawMarket === "GG" || rawMarket === "BTTS - YES" || rawMarket === "BTTS YES") market = "GG";
      else if (rawMarket === "NG" || rawMarket === "BTTS - NO" || rawMarket === "BTTS NO") market = "NG";
      else if (rawMarket === "OV2.5" || rawMarket === "OV.2.5" || rawMarket === "OVER 2.5" || rawMarket === "OVER2.5" || rawMarket === "OV") market = "OV";
      else if (rawMarket === "UN2.5" || rawMarket === "UN.2.5" || rawMarket === "UNDER 2.5" || rawMarket === "UNDER2.5" || rawMarket === "UN") market = "UN";
      else if (rawMarket.includes("HOME")) market = "HOME";
      else if (rawMarket.includes("AWAY")) market = "AWAY";
      else if (rawMarket.includes("OV") || rawMarket.includes("OVER")) market = "OV";
      else if (rawMarket.includes("UN") || rawMarket.includes("UNDER")) market = "UN";
      else market = rawMarket;

      // Also check FT_Outcome column for direct W/L signal
      const ftOutcome = String(row["FT_Outcome"] || "").trim().toUpperCase();
      const hFtg = row["H_FTG"] !== undefined ? parseInt(row["H_FTG"], 10) : null;
      const aFtg = row["A_FTG"] !== undefined ? parseInt(row["A_FTG"], 10) : null;
      const ftGt = row["FT_GT"] !== undefined ? parseInt(row["FT_GT"], 10) : null;

      // Evaluate W / L / D based on actual goal data (more reliable than parsing scoreline string)
      let isWin = null;
      let finalResult = null;

      if (hFtg !== null && aFtg !== null && !isNaN(hFtg) && !isNaN(aFtg)) {
        const totalGoals = ftGt !== null && !isNaN(ftGt) ? ftGt : hFtg + aFtg;
        let won = false;

        if (market === "HOME" && hFtg > aFtg) won = true;
        else if (market === "AWAY" && aFtg > hFtg) won = true;
        else if (market === "DRAW" && hFtg === aFtg) won = true;
        else if (market === "GG" && hFtg > 0 && aFtg > 0) won = true;
        else if (market === "NG" && (hFtg === 0 || aFtg === 0)) won = true;
        else if (market === "OV" && totalGoals > 2) won = true;
        else if (market === "UN" && totalGoals <= 2) won = true;

        isWin = won;
        finalResult = won ? "W" : "L";
      } else if (resultRaw && resultRaw.includes(":")) {
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
          else if (market === "UN" && totalGoals <= 2) won = true;

          isWin = won;
          finalResult = won ? "W" : "L";
        } else {
          finalResult = "D";
        }
      } else {
        finalResult = "D";
      }

      if (!market || chance === null || isNaN(chance) || rating === null || isNaN(rating)) {
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
        console.error("Failed to insert row:", err.message);
        skipped++;
      }
    }

    console.log(`Sync complete! Upserted: ${inserted}, Skipped: ${skipped}`);
    
  } catch (error: any) {
    console.error("Error during sync:", error);
  }
}

// Run immediately on start
sync();

// Schedule to run 4 times a day (9:00, 14:00, 18:00, 23:00)
cron.schedule('0 9,14,18,23 * * *', () => {
  console.log('Running scheduled sync task...');
  sync();
});

console.log("Background worker is now running. Scheduled to sync at 09:00, 14:00, 18:00, and 23:00.");
