import sql from "./apps/web/src/app/api/utils/sql.ts";

async function check() {
  const matches = await sql`
    SELECT COUNT(*) as count FROM matches_cache 
    WHERE raw_data->>'ft_score' IS NOT NULL 
    AND raw_data->>'ft_score' != ''
  `;
  console.log("Matches with ft_score:", matches[0].count);
  
  const sample = await sql`
    SELECT home_team, away_team, raw_data->>'ft_score' as ft_score
    FROM matches_cache 
    WHERE raw_data->>'ft_score' IS NOT NULL 
    AND raw_data->>'ft_score' != ''
    LIMIT 5
  `;
  console.log("Sample matches:", sample);
}

check().catch(console.error).finally(() => process.exit(0));
