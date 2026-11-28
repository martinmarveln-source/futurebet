import type { Metadata } from "next";
import { Suspense } from "react";
import sql from "@/app/api/utils/sql";
import LeagueStatsClient from "./LeagueStatsClient";

export const revalidate = 1800;

function parsePctNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/%/g, "").trim());
  if (!Number.isFinite(n)) return null;
  return n > 0 && n <= 1.0 ? n * 100 : n;
}

async function getLeagueSeoSummary(leagueName: string) {
  if (!process.env.DATABASE_URL || !leagueName) return null;
  try {
    const slug = leagueName.toLowerCase().replace(/\s+/g, "-");
    const rows = await sql`
      SELECT country, league, team, gp, gs, gc, market_stats
      FROM league_table_cache
      WHERE REPLACE(LOWER(TRIM(league)), ' ', '-') = ${slug}
      LIMIT 40
    `;
    if (!rows?.length) return null;

    let totalGp = 0;
    let totalGs = 0;
    let totalGc = 0;
    const btts: number[] = [];
    const o25: number[] = [];
    const teams: string[] = [];

    for (const r of rows) {
      if (r.team) teams.push(String(r.team));
      totalGp += parseInt(String(r.gp || "0"), 10) || 0;
      totalGs += parseInt(String(r.gs || "0"), 10) || 0;
      totalGc += parseInt(String(r.gc || "0"), 10) || 0;
      let ms: any = r.market_stats;
      if (typeof ms === "string") {
        try { ms = JSON.parse(ms); } catch { ms = null; }
      }
      if (ms && typeof ms === "object") {
        const b = parsePctNum(ms.BTTS_ALL);
        const o = parsePctNum(ms.O25_ALL ?? ms["O2.5_ALL"]);
        if (b !== null) btts.push(b);
        if (o !== null) o25.push(o);
      }
    }

    const matchesPlayed = totalGp > 0 ? Math.round(totalGp / 2) : 0;
    const gpg = matchesPlayed > 0 ? ((totalGs + totalGc) / 2 / matchesPlayed).toFixed(2) : null;
    const avgBtts = btts.length ? `${(btts.reduce((a, b) => a + b, 0) / btts.length).toFixed(1)}%` : null;
    const avgO25 = o25.length ? `${(o25.reduce((a, b) => a + b, 0) / o25.length).toFixed(1)}%` : null;

    return {
      country: String(rows[0]?.country || ""),
      league: String(rows[0]?.league || leagueName),
      teamCount: rows.length,
      gpg,
      avgBtts,
      avgO25,
      teams: teams.slice(0, 24),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  const { leagueId } = await params;
  const leagueName = decodeURIComponent(leagueId || "").trim() || "League";
  const summary = await getLeagueSeoSummary(leagueName);
  const displayLeague = summary?.league || leagueName;
  const countryLabel = summary?.country ? `${summary.country} — ` : "";

  const statBits = [
    summary?.gpg ? `${summary.gpg} goals/game` : null,
    summary?.avgBtts ? `${summary.avgBtts} BTTS` : null,
    summary?.avgO25 ? `${summary.avgO25} Over 2.5` : null,
  ].filter(Boolean);

  const description = statBits.length
    ? `${countryLabel}${displayLeague} quantitative football stats on FutureBet: ${statBits.join(", ")} across ${summary?.teamCount || 0} teams. Compare league tables, home/away splits, and goal trends.`
    : `${displayLeague} football statistics, league standings, BTTS percentages, Over/Under goal trends, and home/away form splits on FutureBet.`;

  const canonical = `https://futurebet.com.ng/stats/league/${encodeURIComponent(displayLeague)}`;

  return {
    title: `${displayLeague} Stats, Table, BTTS & Over 2.5 Trends | FutureBet`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${displayLeague} Football Stats & Market Averages | FutureBet`,
      description,
      url: canonical,
      siteName: "FutureBet",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayLeague} Stats & Trends | FutureBet`,
      description,
    },
  };
}

export default async function LeagueStatsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const decodedLeague = decodeURIComponent(leagueId || "").trim();
  const summary = await getLeagueSeoSummary(decodedLeague);

  return (
    <>
      {summary && (
        <section className="sr-only" aria-label={`${summary.league} Overview`}>
          <h1>
            {summary.country ? `${summary.country} ` : ""}
            {summary.league} Football Statistics
          </h1>
          <p>
            {summary.league} statistical averages across {summary.teamCount} teams
            {summary.gpg ? `, averaging ${summary.gpg} goals per match` : ""}
            {summary.avgBtts ? `, ${summary.avgBtts} BTTS` : ""}
            {summary.avgO25 ? `, and ${summary.avgO25} Over 2.5 goals` : ""}.
          </p>
          {summary.teams.length > 0 && <p>Teams: {summary.teams.join(", ")}</p>}
        </section>
      )}
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#030712] flex items-center justify-center">
            <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <LeagueStatsClient initialLeagueId={decodedLeague} />
      </Suspense>
    </>
  );
}
