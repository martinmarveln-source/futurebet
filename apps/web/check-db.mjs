import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import Papa from 'papaparse';

const sql = neon(process.env.DATABASE_URL);
const SHEET_ID = "1JlcJ1qGZ0IOTnDamMHuhcJ2wAxozTRmfhYs96GbPoJQ";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;

console.log("Fetching CSV...");
const res = await fetch(CSV_URL);
const text = await res.text();
const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

console.log(`Parsed ${parsed.data.length} rows. Processing...`);

let inserted = 0, skipped = 0, wins = 0, losses = 0;

for (const row of parsed.data) {
  const chanceStr = row["Model_Chance"] || row["Chance"];
  const ratingStr = row["Model_Rating"] || row["Rating"];
  const pickStr = row["Algorithm_Pick"] || row["Prediction_Validation"] || row["TIPS"];
  const resultStr = row["FT_Result"] || row["FT-Result"];
  const dateStr = row["Date"] || row["DATE"];
  const leagueStr = row["League"] || row["LEAGUE"] || row["Country"];

  let homeTeam = row["HOME"] || "";
  let awayTeam = row["AWAY"] || "";
  if (!homeTeam && row["Match"]) {
    const parts = row["Match"].split(" - ");
    if (parts.length === 2) { homeTeam = parts[0].trim(); awayTeam = parts[1].trim(); }
  }

  const chance = chanceStr !== undefined && chanceStr !== '' ? Number(chanceStr) : null;
  const rating = ratingStr !== undefined && ratingStr !== '' ? Number(ratingStr) : null;
  let rawMarket = String(pickStr || "").trim().toUpperCase();

  let market = "";
  if (rawMarket === "HOME WIN" || rawMarket === "HOME" || rawMarket === "1") market = "HOME";
  else if (rawMarket === "AWAY WIN" || rawMarket === "AWAY" || rawMarket === "2") market = "AWAY";
  else if (rawMarket === "DRAW" || rawMarket === "X") market = "DRAW";
  else if (rawMarket === "GG" || rawMarket === "BTTS - YES" || rawMarket === "BTTS YES") market = "GG";
  else if (rawMarket === "NG" || rawMarket === "BTTS - NO" || rawMarket === "BTTS NO") market = "NG";
  else if (rawMarket === "OV2.5" || rawMarket === "OV.2.5" || rawMarket === "OVER 2.5" || rawMarket === "OV") market = "OV";
  else if (rawMarket === "UN2.5" || rawMarket === "UN.2.5" || rawMarket === "UNDER 2.5" || rawMarket === "UN") market = "UN";
  else if (rawMarket.includes("HOME")) market = "HOME";
  else if (rawMarket.includes("AWAY")) market = "AWAY";
  else if (rawMarket.includes("OV") || rawMarket.includes("OVER")) market = "OV";
  else if (rawMarket.includes("UN") || rawMarket.includes("UNDER")) market = "UN";
  else market = rawMarket;

  const hFtg = row["H_FTG"] !== undefined && row["H_FTG"] !== "" ? parseInt(row["H_FTG"], 10) : null;
  const aFtg = row["A_FTG"] !== undefined && row["A_FTG"] !== "" ? parseInt(row["A_FTG"], 10) : null;
  const ftGt = row["FT_GT"] !== undefined && row["FT_GT"] !== "" ? parseInt(row["FT_GT"], 10) : null;

  let isWin = null, finalResult = null;

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
    if (won) wins++; else losses++;
  } else {
    finalResult = "D";
  }

  if (!market || chance === null || isNaN(chance) || rating === null || isNaN(rating)) {
    skipped++;
    continue;
  }

  let matchDate = null;
  if (dateStr) {
    try { matchDate = new Date(dateStr).toISOString(); } catch(e) { matchDate = null; }
  }

  try {
    await sql`
      INSERT INTO sandbox_archive (
        match_date, home_team, away_team, league,
        model_chance, model_rating, algorithm_pick,
        ft_result, is_win, raw_data
      ) VALUES (
        ${matchDate}, ${homeTeam || 'Unknown'}, ${awayTeam || 'Unknown'}, ${leagueStr || 'Unknown'},
        ${chance}, ${rating}, ${market},
        ${finalResult}, ${isWin}, ${JSON.stringify(row)}
      )
      ON CONFLICT (match_date, home_team, away_team, algorithm_pick) 
      DO UPDATE SET 
        ft_result = EXCLUDED.ft_result,
        is_win = EXCLUDED.is_win,
        raw_data = EXCLUDED.raw_data
    `;
    inserted++;
  } catch(e) {
    skipped++;
  }
}

console.log(`\nDONE! Inserted: ${inserted}, Skipped: ${skipped}`);
console.log(`Results: ${wins} Wins, ${losses} Losses`);
