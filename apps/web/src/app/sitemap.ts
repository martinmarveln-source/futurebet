import type { MetadataRoute } from "next";
import sql from "@/app/api/utils/sql";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://futurebet.com.ng";
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/stats/insights`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/archive`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/account/signin`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/account/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/disclaimer`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/responsible-gaming`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  if (!process.env.DATABASE_URL) {
    return staticEntries;
  }

  try {
    const [leagueRows, teamRows] = await Promise.all([
      sql`
        SELECT DISTINCT TRIM(league) AS league, MAX(updated_at) AS updated_at
        FROM league_table_cache
        WHERE league IS NOT NULL
          AND TRIM(league) != ''
          AND LOWER(TRIM(league)) != 'league'
        GROUP BY TRIM(league)
        LIMIT 500
      `,
      sql`
        SELECT DISTINCT TRIM(team) AS team, MAX(updated_at) AS updated_at
        FROM league_table_cache
        WHERE team IS NOT NULL
          AND TRIM(team) != ''
          AND LOWER(TRIM(team)) != 'team'
        GROUP BY TRIM(team)
        LIMIT 5000
      `,
    ]);

    const leagueEntries: MetadataRoute.Sitemap = (leagueRows || [])
      .filter((r: any) => r.league)
      .map((r: any) => ({
        url: `${baseUrl}/stats/league/${encodeURIComponent(String(r.league).trim())}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: "daily",
        priority: 0.85,
      }));

    const teamEntries: MetadataRoute.Sitemap = (teamRows || [])
      .filter((r: any) => r.team)
      .map((r: any) => ({
        url: `${baseUrl}/stats/team/${encodeURIComponent(String(r.team).trim())}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: "daily",
        priority: 0.75,
      }));

    return [...staticEntries, ...leagueEntries, ...teamEntries];
  } catch (err) {
    console.warn("Dynamic sitemap DB query skipped:", err);
    return staticEntries;
  }
}
