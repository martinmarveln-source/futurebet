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
      
      // Normalize Market Name
      let market = "";
      if (rawMarket.includes("HOME") || rawMarket === "1") market = "HOME";
      else if (rawMarket.includes("AWAY") || rawMarket === "2") market = "AWAY";
      else if (rawMarket.includes("DRAW") || rawMarket === "X") market = "DRAW";
      else if (rawMarket === "GG" || rawMarket.includes("BTTS - YES")) market = "GG";
      else if (rawMarket === "NG" || rawMarket.includes("BTTS - NO")) market = "NG";
      else if (rawMarket.includes("OV") || rawMarket.includes("OVER")) market = "OV";
      else if (rawMarket.includes("UN") || rawMarket.includes("UNDER")) market = "UN";
      else market = rawMarket;

      // Evaluate W / L / D based on Scoreline
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
          finalResult = "D"; // invalid score
        }
      } else {
        // No score means it hasn't played or is pending
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
