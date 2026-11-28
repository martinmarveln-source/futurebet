import { NextResponse } from "next/server";
import sql from "../../utils/sql";

export const dynamic = "force-dynamic";

const COUNTRIES_CACHE_TTL = 5 * 60 * 1000;
let countriesCache: { data: any[] | null; ts: number; inflight: Promise<any[]> | null } = {
  data: null,
  ts: 0,
  inflight: null,
};

function parseNum(val: any): number | null {
  if (val == null || val === "") return null;
  const n = parseFloat(String(val).replace(/%/, ""));
  if (isNaN(n)) return null;
  return n <= 1.0 && n > 0 ? n * 100 : n;
}

async function loadCountriesData() {
  const rows = await sql`
    SELECT country, league, market_stats
    FROM league_table_cache
    WHERE country IS NOT NULL 
      AND country != ''
      AND LOWER(country) != 'country'
  `;

  if (!rows || rows.length === 0) return [];

  const countryMap = new Map<string, Map<string, any>>();

  for (const row of rows) {
    const country = row.country;
    const league = row.league;

    if (!countryMap.has(country)) {
      countryMap.set(country, new Map());
    }
    const leagueMap = countryMap.get(country)!;

    if (!leagueMap.has(league)) {
      leagueMap.set(league, { teams: 0, btts: [], o25: [], o15: [] });
    }

    const stats = leagueMap.get(league)!;
    stats.teams += 1;

    if (row.market_stats) {
      let ms = row.market_stats;
      if (typeof ms === "string") {
        try { ms = JSON.parse(ms); } catch {}
      }

      if (ms && typeof ms === "object") {
        const btts = parseNum(ms.BTTS_ALL);
        const o25 = parseNum(ms["O2.5_ALL"] ?? ms.O25_ALL);
        const o15 = parseNum(ms["O1.5_ALL"] ?? ms.O15_ALL);

        if (btts !== null) stats.btts.push(btts);
        if (o25 !== null) stats.o25.push(o25);
        if (o15 !== null) stats.o15.push(o15);
      }
    }
  }

  const data = [];
  for (const [country, leagueMap] of countryMap.entries()) {
    const leagues = [];
    for (const [league, stats] of leagueMap.entries()) {
      const avgBtts = stats.btts.length > 0 ? Math.round(stats.btts.reduce((a: number, b: number) => a + b, 0) / stats.btts.length) : null;
      const avgO25 = stats.o25.length > 0 ? Math.round(stats.o25.reduce((a: number, b: number) => a + b, 0) / stats.o25.length) : null;
      const avgO15 = stats.o15.length > 0 ? Math.round(stats.o15.reduce((a: number, b: number) => a + b, 0) / stats.o15.length) : null;

      leagues.push({
        league,
        teamCount: stats.teams,
        overview: {
          btts_percent: avgBtts,
          over_25_percent: avgO25,
          over_15_percent: avgO15,
        },
      });
    }

    leagues.sort((a, b) => a.league.localeCompare(b.league));
    data.push({ country, leagues });
  }

  data.sort((a, b) => a.country.localeCompare(b.country));
  return data;
}

export async function GET(request: Request) {
  try {
    const now = Date.now();
    if (countriesCache.data && now - countriesCache.ts < COUNTRIES_CACHE_TTL) {
      return NextResponse.json(
        { success: true, data: countriesCache.data },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    if (!countriesCache.inflight) {
      countriesCache.inflight = loadCountriesData().then((d) => {
        if (d.length > 0) {
          countriesCache.data = d;
          countriesCache.ts = Date.now();
        }
        return d;
      }).finally(() => {
        countriesCache.inflight = null;
      });
    }

    const data = await countriesCache.inflight;
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (error: any) {
    console.error("Countries stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch countries." },
      { status: 500 }
    );
  }
}
