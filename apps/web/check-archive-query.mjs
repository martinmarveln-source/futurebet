import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function check() {
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
  
  console.log("Total matched rows:", data.length);
  if (data.length > 0) {
    console.log("Sample 5 rows:");
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
    
    // Group by market
    const markets = data.reduce((acc, row) => {
      acc[row.market] = (acc[row.market] || 0) + 1;
      return acc;
    }, {});
    console.log("Markets:", markets);
  }
}

check().catch(console.error);
