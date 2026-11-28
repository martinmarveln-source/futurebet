import type { Metadata } from "next";
import sql from "@/app/api/utils/sql";
import TeamStatsClient from "./TeamStatsClient";

export const revalidate = 1800;

function parsePctStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/%/g, "").trim());
  if (!Number.isFinite(n)) return null;
  const pct = n > 0 && n <= 1.0 ? n * 100 : n;
  return `${pct.toFixed(0)}%`;
}

async function getTeamSeoSummary(teamName: string, leagueHint = "") {
  if (!process.env.DATABASE_URL || !teamName) return null;
  try {
    const slug = teamName.toLowerCase().trim();
    const rows = leagueHint
      ? await sql`
          SELECT country, league, team, gp, gs, gc, pts, market_stats
          FROM league_table_cache
          WHERE LOWER(TRIM(team)) = ${slug}
            AND LOWER(TRIM(league)) = ${leagueHint.toLowerCase().trim()}
          LIMIT 1
        `
      : await sql`
          SELECT country, league, team, gp, gs, gc, pts, market_stats
          FROM league_table_cache
          WHERE LOWER(TRIM(team)) = ${slug}
          LIMIT 1
        `;

    const row = rows?.[0];
    if (!row) return null;

    let ms: any = row.market_stats;
    if (typeof ms === "string") {
      try { ms = JSON.parse(ms); } catch { ms = null; }
    }

    return {
      team: String(row.team || teamName),
      country: String(row.country || ""),
      league: String(row.league || ""),
      gp: row.gp ? Number(row.gp) : null,
      gs: row.gs ? Number(row.gs) : null,
      gc: row.gc ? Number(row.gc) : null,
      pts: row.pts ? Number(row.pts) : null,
      btts: parsePctStr(ms?.BTTS_ALL),
      o25: parsePctStr(ms?.O25_ALL ?? ms?.["O2.5_ALL"]),
      cs: parsePctStr(ms?.CS_ALL),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ league?: string; country?: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const sp = await searchParams;
  const rawTeam = decodeURIComponent(teamId || "").trim() || "Team";
  const leagueHint = sp?.league ? decodeURIComponent(sp.league).trim() : "";

  const summary = await getTeamSeoSummary(rawTeam, leagueHint);
  const displayTeam = summary?.team || rawTeam;
  const leagueLabel = summary?.league || leagueHint;
  const contextParts = [summary?.country, leagueLabel].filter(Boolean).join(" • ");

  const statBits = [
    summary?.gp ? `${summary.gp} matches` : null,
    summary?.btts ? `${summary.btts} BTTS` : null,
    summary?.o25 ? `${summary.o25} Over 2.5` : null,
    summary?.cs ? `${summary.cs} Clean Sheets` : null,
  ].filter(Boolean);

  const description = statBits.length
    ? `${displayTeam}${contextParts ? ` (${contextParts})` : ""} stats on FutureBet: ${statBits.join(", ")}. Full home/away goal splits, form trajectory, and upcoming fixture trends.`
    : `${displayTeam} football statistics: BTTS %, Over/Under 1.5/2.5/3.5 rates, home/away scoring averages, clean sheets, and form analytics on FutureBet.`;

  const canonical = `https://futurebet.com.ng/stats/team/${encodeURIComponent(displayTeam)}`;

  return {
    title: `${displayTeam} Stats, Goals, BTTS & Over 2.5 Trends | FutureBet`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${displayTeam} Statistical Profile | FutureBet`,
      description,
      url: canonical,
      siteName: "FutureBet",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayTeam} Stats & Trends | FutureBet`,
      description,
    },
  };
}

export default async function TeamStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ league?: string; country?: string }>;
}) {
  const { teamId } = await params;
  const sp = await searchParams;
  const decodedTeam = decodeURIComponent(teamId || "").trim();
  const leagueHint = sp?.league ? decodeURIComponent(sp.league).trim() : "";
  const summary = await getTeamSeoSummary(decodedTeam, leagueHint);

  return (
    <>
      {summary && (
        <section className="sr-only" aria-label={`${summary.team} Summary`}>
          <h1>
            {summary.team} Football Stats
            {summary.league ? ` — ${summary.league}` : ""}
          </h1>
          <p>
            {summary.team}
            {summary.country ? ` (${summary.country})` : ""} season record:
            {summary.gp != null ? ` ${summary.gp} played` : ""}
            {summary.gs != null && summary.gc != null ? `, ${summary.gs} scored / ${summary.gc} conceded` : ""}
            {summary.btts ? `, ${summary.btts} BTTS` : ""}
            {summary.o25 ? `, ${summary.o25} Over 2.5` : ""}
            {summary.cs ? `, ${summary.cs} Clean Sheets` : ""}.
          </p>
        </section>
      )}
      <TeamStatsClient initialTeamId={decodedTeam} />
    </>
  );
}
