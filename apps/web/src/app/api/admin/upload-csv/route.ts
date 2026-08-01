import { NextResponse } from "next/server";
import { sql } from "../../utils/sql";
import Papa from "papaparse";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const sessionData = await auth.api.getSession({
      headers: request.headers,
    });

    const user = sessionData?.user as any;
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      console.warn("CSV parse errors:", parsed.errors);
    }

    if (!parsed.data?.length) {
      return NextResponse.json({ error: "No valid data found in CSV" }, { status: 400 });
    }

    let inserted = 0;
    let skipped = 0;

    for (const row of parsed.data as any[]) {
      // Handle the first (Google Sheet) format or the detailed second format
      
      // Attempt to extract standard fields
      const chanceStr = row["Model_Chance"] || row["Chance"];
      const ratingStr = row["Model_Rating"] || row["Rating"];
      const pickStr = row["Algorithm_Pick"] || row["Prediction_Validation"] || row["TIPS"];
      const resultStr = row["FT_Result"] || row["FT-Result"];
      const dateStr = row["Date"] || row["DATE"];
      const leagueStr = row["League"] || row["LEAGUE"];
      
      // Parse team names from "Match" or "HOME/AWAY"
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
          // You might have a specific pending/draw mapping
          finalResult = "D"; 
        }
      }

      // If we don't have minimal data, skip
      if (!market || chance === null || rating === null) {
        skipped++;
        continue;
      }

      // Prepare date
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
            ${matchDate ? matchDate : sql\`NULL\`},
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

    return NextResponse.json({ 
      success: true, 
      message: \`Successfully processed CSV. Inserted/Updated: \${inserted}. Skipped: \${skipped}.\` 
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
