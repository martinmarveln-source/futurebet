import sql from './src/app/api/utils/sql.ts';
import fs from 'fs';
import Papa from 'papaparse';

async function seed() {
  console.log('Reading CSV...');
  const text = fs.readFileSync('sandbox_data_sample.csv', 'utf-8');
  
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`Parsed ${parsed.data.length} rows.`);

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
    const market = String(pickStr || "").trim().toUpperCase();
    const resultRaw = String(resultStr || "").trim().toUpperCase();
    
    let isWin = null;
    let finalResult = null;
    
    if (resultRaw) {
      if (["W", "WON", "WIN", "✅"].includes(resultRaw)) {
        isWin = true;
        finalResult = "W";
      } else if (["L", "LOST", "LOSS", "❌"].includes(resultRaw)) {
        isWin = false;
        finalResult = "L";
      } else if (["D", "DRAW", "⚠️", "PENDING"].includes(resultRaw)) {
        finalResult = "D"; 
      }
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
      console.error("Failed to insert row:", err.message);
      skipped++;
    }
  }

  console.log(`Done! Inserted: ${inserted}, Skipped: ${skipped}`);
  process.exit(0);
}

seed();
