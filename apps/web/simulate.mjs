import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function simulate() {
  const data = await sql`
      SELECT 
        model_chance as chance, 
        model_rating as rating, 
        algorithm_pick as market, 
        ft_result as result
      FROM sandbox_archive
      WHERE ft_result IN ('W', 'L')
      ORDER BY match_date DESC
  `;

  let total = 0, wins = 0, losses = 0;
  
  const minChance = 0;
  const minRating = 0;
  const marketFilter = "ALL";
  
  console.log("Simulating with", data.length, "rows");

  data.forEach((row) => {
      const chance = Number(row.chance || 0);
      const rating = Number(row.rating || 0);
      const market = String(row.market || "").toUpperCase();
      const result = String(row.result || "").toUpperCase().trim();

      const normalizedChance = chance <= 1 && chance > 0 ? chance * 100 : chance;
      const normalizedRating = rating <= 1 && rating > 0 ? rating * 100 : rating;

      if (normalizedChance < minChance) return;
      if (normalizedRating < minRating) return;
      if (marketFilter !== "ALL" && market !== marketFilter) return;

      if (result === "W") wins++;
      else if (result === "L") losses++;

      if (result === "W" || result === "L") total++;
  });

  console.log(`Total: ${total}, Wins: ${wins}, Losses: ${losses}`);
}

simulate().catch(console.error);
