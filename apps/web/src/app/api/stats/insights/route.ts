import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import { auth } from "@/auth";
import { hasPremiumAccess } from "@/utils/premium";

// ─── helpers ─────────────────────────────────────────────────────────────────

const parsePct = (v: any): number => {
  const n = parseFloat(String(v ?? "0").replace(/%/, ""));
  if (isNaN(n)) return 0;
  return n <= 1.0 ? n * 100 : n;
};

/** Pick whichever of home/away next game is soonest. Returns null if neither has data. */
function pickSoonestGame(
  hOpponent: string, hDate: string,
  aOpponent: string, aDate: string
): { opponent: string; date: string; isHome: boolean } | null {
  const hValid = !!(hOpponent && hDate);
  const aValid = !!(aOpponent && aDate);
  if (!hValid && !aValid) return null;
  if (hValid && !aValid) return { opponent: hOpponent, date: hDate, isHome: true };
  if (!hValid && aValid) return { opponent: aOpponent, date: aDate, isHome: false };
  return hDate <= aDate
    ? { opponent: hOpponent, date: hDate, isHome: true }
    : { opponent: aOpponent, date: aDate, isHome: false };
}

/** Deterministic confidence score 0-100. No AI. */
function calcConfidence(teamGp: number, teamStat: number, oppGp: number): number {
  const sampleScore    = Math.min(teamGp / 20, 1) * 35;
  const signalScore    = (Math.abs(teamStat - 50) / 50) * 35;
  const oppSampleScore = Math.min(oppGp / 20, 1) * 30;
  return Math.round(Math.min(100, sampleScore + signalScore + oppSampleScore));
}

// ─── route ───────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const sessionResponse = await auth();
    const user = sessionResponse?.user;
    if (!hasPremiumAccess(user)) {
      return NextResponse.json({ success: false, error: "premium_required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const minGames  = parseInt(searchParams.get("minGames") || "4", 10);
    const split     = searchParams.get("split")     || "overall";
    const startDate = searchParams.get("startDate") || "";
    const endDate   = searchParams.get("endDate")   || "";

    // 1. Fetch all teams
    const rows = await sql`SELECT * FROM league_table_cache`;
    const teams = rows.map((r: any) => {
      let ms = r.market_stats;
      if (typeof ms === "string" && ms) { try { ms = JSON.parse(ms); } catch (_) {} }
      return { ...r, market_stats: ms || {} };
    });

    // 2. Lightweight odds lookup from matches_cache
    const today = new Date().toISOString().split("T")[0];
    const upcomingMatches = await sql`
      SELECT home_team, away_team, raw_data
      FROM matches_cache
      WHERE match_date >= ${today}::date AND raw_data IS NOT NULL
      ORDER BY match_date ASC
    `;
    const oddsMap = new Map<string, any>();
    for (const m of upcomingMatches) {
      const key = `${m.home_team?.trim().toLowerCase()}|${m.away_team?.trim().toLowerCase()}`;
      if (!oddsMap.has(key)) {
        let raw = m.raw_data;
        if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch (_) { raw = {}; } }
        oddsMap.set(key, raw);
      }
    }

    // 3. Optional date filter using sheet next-match dates
    let dateFilterTeamSet: Set<string> | null = null;
    if (startDate || endDate) {
      const start = startDate || today;
      const end   = endDate   || "2099-12-31";
      dateFilterTeamSet = new Set<string>();
      for (const t of teams) {
        const ms    = t.market_stats;
        const hDate = ms.Next_H_Game_Date || "";
        const aDate = ms.Next_A_Game_Date || "";
        const inRange = (d: string) => d && d >= start && d <= end;
        if (inRange(hDate) || inRange(aDate)) {
          dateFilterTeamSet.add(`${t.team?.trim().toLowerCase()}|${t.league?.trim().toLowerCase()}`);
        }
      }
    }

    // 4. Filter valid teams
    const validTeams = teams.filter((t: any) => {
      if ((parseInt(t.gp || "0", 10) || 0) < minGames) return false;
      if (dateFilterTeamSet) {
        const key = `${t.team?.trim().toLowerCase()}|${t.league?.trim().toLowerCase()}`;
        if (!dateFilterTeamSet.has(key)) return false;
      }
      return true;
    });

    // 5. Stat helpers
    const keySuffix  = split === "home" ? "_HOME" : split === "away" ? "_AWAY" : "_ALL";
    const getStat    = (t: any, base: string) => parsePct(t.market_stats[`${base}${keySuffix}`]);
    const getInverse = (t: any, base: string) => 100 - parsePct(t.market_stats[`${base}${keySuffix}`]);
    const getGp      = (t: any) =>
      split === "home" ? parseInt(t.market_stats.GP_HOME || "0", 10) || 0 :
      split === "away" ? parseInt(t.market_stats.GP_AWAY || "0", 10) || 0 :
      parseInt(t.gp || "0", 10) || 0;

    // 6. Build top-15 for teams
    const getTop15 = (
      getValue:    (t: any) => number,
      isAsc:       boolean = false,
      gpOverride?: (t: any) => number,
      marketKey?:  string,
      baseStatKey?: string
    ) => {
      const top15 = [...validTeams]
        .sort((a: any, b: any) => isAsc ? getValue(a) - getValue(b) : getValue(b) - getValue(a))
        .slice(0, 15);

      return top15.map((t: any) => {
        const ms = t.market_stats;

        const nextMatch = pickSoonestGame(
          ms.NEXT_H_Game_Against || "", ms.Next_H_Game_Date    || "",
          ms.NEXT_A_Game_Against || "", ms.Next_A_Game_Date    || ""
        );
        const nextHomeFixture = ms.NEXT_H_Game_Against
          ? { opponent: ms.NEXT_H_Game_Against, date: ms.Next_H_Game_Date || "" } : null;
        const nextAwayFixture = ms.NEXT_A_Game_Against
          ? { opponent: ms.NEXT_A_Game_Against, date: ms.Next_A_Game_Date || "" } : null;

        let opponentStatValue: number | null = null;
        let opponentGp: number | null        = null;
        let prediction: number | null        = null;
        let confidence: number | null        = null;
        let odds: any                        = null;
        let nextOpponent: string | null      = null;
        let nextDate: string | null          = null;
        let isHome                           = false;

        if (nextMatch) {
          nextOpponent = nextMatch.opponent;
          nextDate     = nextMatch.date;
          isHome       = nextMatch.isHome;
          const oppName    = nextOpponent.trim().toLowerCase();
          const oppTeamObj: any = validTeams.find((vt: any) => vt.team?.trim().toLowerCase() === oppName)
                             || teams.find((vt: any) => vt.team?.trim().toLowerCase() === oppName);

          if (oppTeamObj && baseStatKey) {
            let tVal = NaN, oVal = NaN, calcPred = true;

            if (baseStatKey === "Home_Win" || baseStatKey === "Worst_Home") {
              if (!isHome) calcPred = false;
              else { tVal = parsePct(ms.Home_Win); oVal = parsePct(oppTeamObj.market_stats.AWAY_LOST); }
            } else if (baseStatKey === "Away_Win" || baseStatKey === "Worst_Away") {
              if (isHome) calcPred = false;
              else { tVal = parsePct(ms.Away_Win); oVal = parsePct(oppTeamObj.market_stats.HOME_LOST); }
            } else if (baseStatKey === "HOME_DRAW") {
              if (!isHome) calcPred = false;
              else { tVal = parsePct(ms.HOME_DRAW); oVal = parsePct(oppTeamObj.market_stats.AWAY_DRAW); }
            } else if (baseStatKey === "AWAY_DRAW") {
              if (isHome) calcPred = false;
              else { tVal = parsePct(ms.AWAY_DRAW); oVal = parsePct(oppTeamObj.market_stats.HOME_DRAW); }
            } else if (baseStatKey.includes("HGS")) {
              if (!isHome) calcPred = false;
              else {
                const ok = baseStatKey.replace("HGS", "AGC");
                tVal = parsePct(ms[baseStatKey] ?? ms[baseStatKey.replace("_15","_1.5")]);
                oVal = parsePct(oppTeamObj.market_stats[ok] ?? oppTeamObj.market_stats[ok.replace("_15","_1.5")]);
              }
            } else if (baseStatKey.includes("HGC")) {
              if (!isHome) calcPred = false;
              else {
                const ok = baseStatKey.replace("HGC", "AGS");
                tVal = parsePct(ms[baseStatKey] ?? ms[baseStatKey.replace("_15","_1.5")]);
                oVal = parsePct(oppTeamObj.market_stats[ok] ?? oppTeamObj.market_stats[ok.replace("_15","_1.5")]);
              }
            } else if (baseStatKey.includes("AGS")) {
              if (isHome) calcPred = false;
              else {
                const ok = baseStatKey.replace("AGS", "HGC");
                tVal = parsePct(ms[baseStatKey] ?? ms[baseStatKey.replace("_15","_1.5")]);
                oVal = parsePct(oppTeamObj.market_stats[ok] ?? oppTeamObj.market_stats[ok.replace("_15","_1.5")]);
              }
            } else if (baseStatKey.includes("AGC")) {
              if (isHome) calcPred = false;
              else {
                const ok = baseStatKey.replace("AGC", "HGS");
                tVal = parsePct(ms[baseStatKey] ?? ms[baseStatKey.replace("_15","_1.5")]);
                oVal = parsePct(oppTeamObj.market_stats[ok] ?? oppTeamObj.market_stats[ok.replace("_15","_1.5")]);
              }
            } else if (baseStatKey === "FTS" || baseStatKey === "CS") {
              const tv = isHome ? "_HOME" : "_AWAY";
              const ov = isHome ? "_AWAY" : "_HOME";
              if (baseStatKey === "FTS") {
                tVal = parsePct(ms[`FTS${tv}`]); oVal = parsePct(oppTeamObj.market_stats[`CS${ov}`]);
              } else {
                tVal = parsePct(ms[`CS${tv}`]); oVal = parsePct(oppTeamObj.market_stats[`FTS${ov}`]);
              }
              if (marketKey?.startsWith("N")) { tVal = 100 - tVal; oVal = 100 - oVal; }
            } else {
              const tv   = isHome ? "_HOME" : "_AWAY";
              const ov   = isHome ? "_AWAY" : "_HOME";
              const rawT = parsePct(ms[`${baseStatKey}${tv}`]);
              const rawO = parsePct(oppTeamObj.market_stats[`${baseStatKey}${ov}`]);
              const inv  = marketKey?.startsWith("U") || marketKey?.startsWith("N");
              tVal = inv ? 100 - rawT : rawT;
              oVal = inv ? 100 - rawO : rawO;
            }

            if (calcPred && !isNaN(tVal) && !isNaN(oVal)) {
              opponentStatValue = oVal;
              prediction        = (tVal + oVal) / 2;
              const tGp  = gpOverride ? gpOverride(t) : getGp(t);
              const oGp  = parseInt(oppTeamObj.market_stats[isHome ? "GP_AWAY" : "GP_HOME"] || "0", 10) || 0;
              opponentGp = oGp;
              confidence = calcConfidence(tGp, tVal, oGp);
            } else {
              opponentStatValue = NaN;
              prediction        = NaN;
            }

            if (marketKey) {
              const hLc = isHome ? t.team?.trim().toLowerCase() : oppName;
              const aLc = isHome ? oppName : t.team?.trim().toLowerCase();
              const ro  = oddsMap.get(`${hLc}|${aLc}`) || {};
              if (marketKey === "BTTS" || marketKey === "NBTTS")    odds = ro.bttsOdds;
              else if (marketKey === "O15" || marketKey === "U15")  odds = ro.o15Odds;
              else if (marketKey === "O25" || marketKey === "U25")  odds = ro.o25Odds;
              else if (marketKey === "O35" || marketKey === "U35")  odds = ro.o35Odds;
              else if (marketKey === "O45" || marketKey === "U45")  odds = ro.o45Odds;
            }
          }
        }

        return {
          team: t.team, league: t.league, country: t.country,
          value: getValue(t),
          gp: gpOverride ? gpOverride(t) : getGp(t),
          nextOpponent, nextDate, isHome,
          nextHomeFixture, nextAwayFixture,
          opponentStatValue, opponentGp, prediction, confidence, odds,
        };
      });
    };

    // 7. Team data
    const gpHome = (t: any) => parseInt(t.market_stats.GP_HOME || "0", 10) || 0;
    const gpAway = (t: any) => parseInt(t.market_stats.GP_AWAY || "0", 10) || 0;

    const teamData = {
      btts:       getTop15(t => getStat(t,"BTTS"),    false, undefined, "BTTS",  "BTTS"),
      nbtts:      getTop15(t => getInverse(t,"BTTS"), false, undefined, "NBTTS", "BTTS"),
      o15:        getTop15(t => getStat(t,"O15"),     false, undefined, "O15",   "O15"),
      u15:        getTop15(t => getInverse(t,"O15"),  false, undefined, "U15",   "O15"),
      o25:        getTop15(t => getStat(t,"O25"),     false, undefined, "O25",   "O25"),
      u25:        getTop15(t => getInverse(t,"O25"),  false, undefined, "U25",   "O25"),
      o35:        getTop15(t => getStat(t,"O35"),     false, undefined, "O35",   "O35"),
      u35:        getTop15(t => getInverse(t,"O35"),  false, undefined, "U35",   "O35"),
      o45:        getTop15(t => getStat(t,"O45"),     false, undefined, "O45",   "O45"),
      u45:        getTop15(t => getInverse(t,"O45"),  false, undefined, "U45",   "O45"),
      fts:        getTop15(t => getStat(t,"FTS"),     false, undefined, undefined, "FTS"),
      nfts:       getTop15(t => getInverse(t,"FTS"),  false, undefined, undefined, "FTS"),
      cleanSheet: getTop15(t => getStat(t,"CS"),      false, undefined, undefined, "CS"),
      bestHome:   getTop15(t => parsePct(t.market_stats.Home_Win), false, gpHome, undefined, "Home_Win"),
      worstHome:  getTop15(t => parsePct(t.market_stats.Home_Win), true,  gpHome, undefined, "Home_Win"),
      bestAway:   getTop15(t => parsePct(t.market_stats.Away_Win), false, gpAway, undefined, "Away_Win"),
      worstAway:  getTop15(t => parsePct(t.market_stats.Away_Win), true,  gpAway, undefined, "Away_Win"),
      homeDraw:   getTop15(t => parsePct(t.market_stats.HOME_DRAW), false, gpHome, undefined, "HOME_DRAW"),
      awayDraw:   getTop15(t => parsePct(t.market_stats.AWAY_DRAW), false, gpAway, undefined, "AWAY_DRAW"),
      hgsO15:     getTop15(t => parsePct(t.market_stats.HGS_Over_15 ?? t.market_stats["HGS_Over_1.5"]), false, gpHome, "O15", "HGS_Over_15"),
      hgcO15:     getTop15(t => parsePct(t.market_stats.HGC_Over_15 ?? t.market_stats["HGC_Over_1.5"]), false, gpHome, "O15", "HGC_Over_15"),
      agsO15:     getTop15(t => parsePct(t.market_stats.AGS_Over_15 ?? t.market_stats["AGS_Over_1.5"]), false, gpAway, "O15", "AGS_Over_15"),
      agcO15:     getTop15(t => parsePct(t.market_stats.AGC_Over_15 ?? t.market_stats["AGC_Over_1.5"]), false, gpAway, "O15", "AGC_Over_15"),
    };

    // 8. League data
    const leaguesMap: Record<string, any[]> = {};
    validTeams.forEach((t: any) => {
      if (!leaguesMap[t.league]) leaguesMap[t.league] = [];
      leaguesMap[t.league].push(t);
    });
    const validLeagues = Object.entries(leaguesMap)
      .filter(([_, lTeams]) => lTeams.length >= 4)
      .map(([leagueName, lTeams]: [string, any[]]) => {
        const avg = (fn: (t: any) => number) => lTeams.reduce((s, t) => s + fn(t), 0) / lTeams.length;
        return {
          league: leagueName, country: lTeams[0].country, teamsCount: lTeams.length,
          gp: Math.floor(lTeams.reduce((s, t) => s + getGp(t), 0) / 2),
          btts: avg(t => getStat(t,"BTTS")),      nbtts: avg(t => getInverse(t,"BTTS")),
          o15:  avg(t => getStat(t,"O15")),        u15:   avg(t => getInverse(t,"O15")),
          o25:  avg(t => getStat(t,"O25")),        u25:   avg(t => getInverse(t,"O25")),
          o35:  avg(t => getStat(t,"O35")),        u35:   avg(t => getInverse(t,"O35")),
          o45:  avg(t => getStat(t,"O45")),        u45:   avg(t => getInverse(t,"O45")),
          fts:  avg(t => getStat(t,"FTS")),        nfts:  avg(t => getInverse(t,"FTS")),
          cleanSheet: avg(t => getStat(t,"CS")),
          hgsO15: avg(t => parsePct(t.market_stats.HGS_Over_15 ?? t.market_stats["HGS_Over_1.5"])),
          hgcO15: avg(t => parsePct(t.market_stats.HGC_Over_15 ?? t.market_stats["HGC_Over_1.5"])),
          agsO15: avg(t => parsePct(t.market_stats.AGS_Over_15 ?? t.market_stats["AGS_Over_1.5"])),
          agcO15: avg(t => parsePct(t.market_stats.AGC_Over_15 ?? t.market_stats["AGC_Over_1.5"])),
          homeDraw: avg(t => parsePct(t.market_stats.HOME_DRAW)),
          awayDraw: avg(t => parsePct(t.market_stats.AWAY_DRAW)),
          bestHome: avg(t => parsePct(t.market_stats.Home_Win)),
          bestAway: avg(t => parsePct(t.market_stats.Away_Win)),
        };
      });

    const top15L = (key: string, asc = false) =>
      [...validLeagues].sort((a,b) => asc ? (a as any)[key]-(b as any)[key] : (b as any)[key]-(a as any)[key])
        .slice(0,15).map(l => ({ team: l.league, league: l.league, country: l.country, value: (l as any)[key], gp: l.gp }));

    const leagueData = {
      btts: top15L("btts"),   nbtts: top15L("nbtts"),
      o15:  top15L("o15"),    u15:   top15L("u15"),
      o25:  top15L("o25"),    u25:   top15L("u25"),
      o35:  top15L("o35"),    u35:   top15L("u35"),
      o45:  top15L("o45"),    u45:   top15L("u45"),
      fts:  top15L("fts"),    nfts:  top15L("nfts"),
      cleanSheet: top15L("cleanSheet"),
      hgsO15: top15L("hgsO15"), hgcO15: top15L("hgcO15"),
      agsO15: top15L("agsO15"), agcO15: top15L("agcO15"),
      homeDraw: top15L("homeDraw"), awayDraw: top15L("awayDraw"),
      bestHome: top15L("bestHome"), bestAway: top15L("bestAway"),
    };

    return NextResponse.json({ success: true, data: { team: teamData, league: leagueData } });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
