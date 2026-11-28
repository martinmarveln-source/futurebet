import sql from "@/app/api/utils/sql";

/**
 * Privacy-safe, read-only database retriever for the Admin FutureBet Bot.
 *
 * Strictly accesses ONLY public/editorial football & model analytics tables:
 *   - matches_cache
 *   - league_table_cache
 *   - vip_picks
 *   - curated_multi_bet_history
 *   - sandbox_archive
 *
 * NEVER queries or forwards auth_users PII, emails, passwords, tokens,
 * user_preferences, payments/transactions, referrals, or user tracking logs.
 */

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "what", "which", "when",
  "where", "who", "how", "why", "are", "you", "can", "could", "would", "should",
  "give", "show", "tell", "find", "list", "best", "top", "good", "safe", "safest",
  "today", "tomorrow", "yesterday", "week", "weekend", "match", "matches", "game",
  "games", "team", "teams", "league", "leagues", "stats", "stat", "odds", "pick",
  "picks", "slip", "slips", "bet", "bets", "betslip", "over", "under", "btts",
  "draw", "home", "away", "win", "wins", "rate", "rates", "compare", "between",
  "vs", "versus", "have", "has", "about", "all", "more", "most", "high", "highest",
  "lowest", "goals", "goal", "score", "scores", "result", "results", "data",
  "please", "check", "analyze", "analysis", "report", "build", "make", "need",
  "want", "will", "futurebet", "bot", "history", "vip", "multi", "acca",
]);

function getLagosDateISO(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function pct(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(String(v).replace("%", "").trim());
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${Math.round(n <= 1 && n > 0 ? n * 100 : n)}%`;
}

function numStr(v: unknown, dec = 2): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n.toFixed(dec) : "—";
}

function parseMarketStats(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, any>) : {};
}

function extractKeywords(prompt: string, recentUserTurns: string[]): string[] {
  const combined = [prompt, ...recentUserTurns.slice(-2)].join(" ");
  const tokens = combined
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

  return [...new Set(tokens)].slice(0, 10);
}

function formatMatchRow(m: any): string {
  const r = parseMarketStats(m.raw_data);
  const dateStr = String(m.match_date || "").slice(0, 10);
  const label = m.match_label || `${m.home_team} - ${m.away_team}`;
  const league = [m.country, m.league].filter(Boolean).join(" • ");
  const ft = m.ft_score ? ` | FT: ${m.ft_score}` : "";

  return `• [${dateStr} ${m.match_time || ""}] ${label} (${league})${ft}
  Pick: ${m.guide || r.pick || "—"} | Chance: ${pct(m.chance ?? r.chance)} | Rating: ${pct(m.rating ?? r.rating)} | Flag: ${m.flag || r.flag || "—"} | PredScore: ${r.likelyCS || r.cScore || "—"} (${pct(r.scorelineCSPercent || r.modelCSPercent)})
  1X2 Probs: H ${pct(m.home_win ?? r.homeWin)} / D ${pct(m.draw_prob ?? r.draw)} / A ${pct(m.away_win ?? r.awayWin)} | GG: ${pct(m.gg ?? r.gg)} | O2.5: ${pct(m.ov25 ?? r.ov25)}
  Odds: 1=${numStr(r.homeOdds)} X=${numStr(r.drawOdds)} 2=${numStr(r.awayOdds)} | 1X=${numStr(r.dc1X)} 12=${numStr(r.dc12)} X2=${numStr(r.dcX2)} | O1.5=${numStr(r.o15Odds)} O2.5=${numStr(r.o25Odds)} U2.5=${numStr(r.u25Odds)} O3.5=${numStr(r.o35Odds)} U3.5=${numStr(r.u35Odds)} | BTTS Y=${numStr(r.bttsYesOdds)} N=${numStr(r.bttsNoOdds)}
  Goals & PPG: H(${numStr(r.hgs)} GF, ${numStr(r.hgc)} GA, ${numStr(r.hppg)} PPG, Form ${r.hForm || "—"}, ${r.hPts || 0}pts) | A(${numStr(r.ags)} GF, ${numStr(r.agc)} GA, ${numStr(r.appg)} PPG, Form ${r.aForm || "—"}, ${r.aPts || 0}pts)
  Team Hit Rates: H[BTTS ${pct(r.hBtts)}, O2.5 ${pct(r.hOv2)}, CS ${pct(r.hcs)}, FTS ${pct(r.hfts)}] | A[BTTS ${pct(r.aBtts)}, O2.5 ${pct(r.aOv2)}, CS ${pct(r.acs)}, FTS ${pct(r.afts)}]
  H2H (${r.H2H_GP || r.h2hGP || "?"}g): H ${r.H2H_H ?? r.h2hH ?? 0}W / ${r.H2H_D ?? r.h2hD ?? 0}D / A ${r.H2H_A ?? r.h2hA ?? 0}W | O2.5 ${pct(r.H2H_OV ?? r.h2hOV)} | BTTS ${pct(r.H2H_GG ?? r.h2hGG)}`;
}

function formatTeamStatsRow(t: any): string {
  const ms = parseMarketStats(t.market_stats);
  return `• ${t.team} (${t.country || ""} • ${t.league || ""}) | Pos #${t.sn || "?"} | GP:${t.gp || 0} W:${t.win || 0} D:${t.draw || 0} L:${t.lost || 0} GF:${t.gs || 0} GA:${t.gc || 0} Pts:${t.pts || 0} PPG:${numStr(t.ppg)}
  All Splits: BTTS ${pct(ms.BTTS_ALL)} | O1.5 ${pct(ms.O15_ALL ?? ms["O1.5_ALL"])} | O2.5 ${pct(ms.O25_ALL ?? ms["O2.5_ALL"])} | O3.5 ${pct(ms.O35_ALL ?? ms["O3.5_ALL"])} | CS ${pct(ms.CS_ALL)} | FTS ${pct(ms.FTS_ALL)} | xG ${numStr(ms.XG_ALL)}
  Home Split (GP ${ms.GP_HOME || "?"}): Win ${pct(ms.Home_Win)} | BTTS ${pct(ms.BTTS_HOME)} | O2.5 ${pct(ms.O25_HOME)} | Away Split (GP ${ms.GP_AWAY || "?"}): Win ${pct(ms.Away_Win)} | BTTS ${pct(ms.BTTS_AWAY)} | O2.5 ${pct(ms.O25_AWAY)}
  Next Home: ${ms.NEXT_H_Game_Against || "—"} (${ms.Next_H_Game_Date || "—"}) | Next Away: ${ms.NEXT_A_Game_Against || "—"} (${ms.Next_A_Game_Date || "—"})`;
}

export interface AdminBotContextResult {
  contextText: string;
  statsSnapshot: {
    todayISO: string;
    totalCachedMatches: number;
    todayMatchesCount: number;
    leaguesTracked: number;
    teamsTracked: number;
    matchedFixturesCount: number;
    matchedTeamsCount: number;
    vipPicksTodayCount: number;
    recentSlipsCount: number;
  };
  suggestedFixtures: any[];
}

export async function buildAdminBotContext(
  prompt: string,
  recentUserTurns: string[] = []
): Promise<AdminBotContextResult> {
  const todayISO = getLagosDateISO(0);
  const yesterdayISO = getLagosDateISO(-1);
  const tomorrowISO = getLagosDateISO(1);
  const keywords = extractKeywords(prompt, recentUserTurns);
  const qLower = prompt.toLowerCase();

  const wantsYesterday = qLower.includes("yesterday") || qLower.includes("settled") || qLower.includes("result");
  const wantsTomorrow = qLower.includes("tomorrow");
  const explicitDateMatch = prompt.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const explicitDate = explicitDateMatch ? explicitDateMatch[1] : null;

  // 1. Global overview counts (always fast)
  const [matchOverviewRows, leagueOverviewRows] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_matches,
        COUNT(*) FILTER (WHERE match_date = ${todayISO}::date)::int AS today_matches,
        COUNT(*) FILTER (WHERE match_date >= ${todayISO}::date)::int AS upcoming_matches,
        COUNT(*) FILTER (WHERE ft_score IS NOT NULL AND TRIM(ft_score) != '')::int AS finished_matches
      FROM matches_cache
    `.catch(() => [{ total_matches: 0, today_matches: 0, upcoming_matches: 0, finished_matches: 0 }]),
    sql`
      SELECT
        COUNT(*)::int AS teams_count,
        COUNT(DISTINCT league)::int AS leagues_count,
        COUNT(DISTINCT country)::int AS countries_count
      FROM league_table_cache
    `.catch(() => [{ teams_count: 0, leagues_count: 0, countries_count: 0 }]),
  ]);

  const mOverview = matchOverviewRows?.[0] || {};
  const lOverview = leagueOverviewRows?.[0] || {};

  // 2. Fetch targeted fixtures from matches_cache if keywords or explicit dates were mentioned
  let matchedFixtures: any[] = [];
  if (keywords.length > 0) {
    const patterns = keywords.map((k) => `%${k}%`);
    matchedFixtures = await sql`
      SELECT match_date::text as match_date, match_time, country, league, home_team, away_team, match_label, guide, chance, rating, home_win, draw_prob, away_win, gg, ov25, un25, ft_score, flag, raw_data
      FROM matches_cache
      WHERE (
        LOWER(COALESCE(home_team, '')) LIKE ANY(${patterns})
        OR LOWER(COALESCE(away_team, '')) LIKE ANY(${patterns})
        OR LOWER(COALESCE(league, '')) LIKE ANY(${patterns})
        OR LOWER(COALESCE(country, '')) LIKE ANY(${patterns})
        OR LOWER(COALESCE(match_label, '')) LIKE ANY(${patterns})
      )
      AND match_date >= (${todayISO}::date - INTERVAL '14 days')
      ORDER BY
        CASE WHEN match_date >= ${todayISO}::date THEN 0 ELSE 1 END,
        match_date ASC,
        chance DESC NULLS LAST
      LIMIT 30
    `.catch(() => []);
  } else if (explicitDate || wantsYesterday || wantsTomorrow) {
    const targetDate = explicitDate || (wantsYesterday ? yesterdayISO : tomorrowISO);
    matchedFixtures = await sql`
      SELECT match_date::text as match_date, match_time, country, league, home_team, away_team, match_label, guide, chance, rating, home_win, draw_prob, away_win, gg, ov25, un25, ft_score, flag, raw_data
      FROM matches_cache
      WHERE match_date = ${targetDate}::date
      ORDER BY chance DESC NULLS LAST, rating DESC NULLS LAST
      LIMIT 30
    `.catch(() => []);
  }

  // 3. Always fetch Today's & Top Upcoming Fixtures
  const [todayFixtures, topUpcomingFixtures] = await Promise.all([
    sql`
      SELECT match_date::text as match_date, match_time, country, league, home_team, away_team, match_label, guide, chance, rating, home_win, draw_prob, away_win, gg, ov25, un25, ft_score, flag, raw_data
      FROM matches_cache
      WHERE match_date = ${todayISO}::date
      ORDER BY chance DESC NULLS LAST, rating DESC NULLS LAST
      LIMIT 30
    `.catch(() => []),
    sql`
      SELECT match_date::text as match_date, match_time, country, league, home_team, away_team, match_label, guide, chance, rating, home_win, draw_prob, away_win, gg, ov25, un25, ft_score, flag, raw_data
      FROM matches_cache
      WHERE match_date > ${todayISO}::date
        AND match_date <= (${todayISO}::date + INTERVAL '7 days')
      ORDER BY chance DESC NULLS LAST, rating DESC NULLS LAST
      LIMIT 20
    `.catch(() => []),
  ]);

  // 4. Targeted Team & League Table Data from league_table_cache
  let matchedTeamRows: any[] = [];
  if (keywords.length > 0) {
    const patterns = keywords.map((k) => `%${k}%`);
    matchedTeamRows = await sql`
      SELECT country, league, team, sn, gp, win, draw, lost, gs, gc, pts, ppg, market_stats
      FROM league_table_cache
      WHERE LOWER(COALESCE(team, '')) LIKE ANY(${patterns})
         OR LOWER(COALESCE(league, '')) LIKE ANY(${patterns})
         OR LOWER(COALESCE(country, '')) LIKE ANY(${patterns})
      ORDER BY pts::numeric DESC NULLS LAST
      LIMIT 35
    `.catch(() => []);
  }

  // Global Market Leaders from league_table_cache when stats/leaders/best teams requested
  let leaderboardText = "";
  const wantsStatsLeaderboard =
    matchedTeamRows.length === 0 ||
    /\b(best|top|highest|lowest|leader|trend|btts|over|under|clean sheet|home|away|league)\b/.test(qLower);

  if (wantsStatsLeaderboard) {
    const allTeams = await sql`
      SELECT country, league, team, gp, ppg, market_stats
      FROM league_table_cache
      WHERE gp >= 4 AND market_stats IS NOT NULL
    `.catch(() => []);

    if (allTeams.length > 0) {
      const parsedTeams = allTeams.map((t: any) => {
        const ms = parseMarketStats(t.market_stats);
        const normPct = (v: any) => {
          const n = Number(String(v ?? "").replace("%", "").trim());
          if (!Number.isFinite(n) || n <= 0) return 0;
          return n <= 1 ? n * 100 : n;
        };
        return {
          team: t.team,
          league: `${t.country} • ${t.league}`,
          gp: Number(t.gp) || 0,
          ppg: Number(t.ppg) || 0,
          btts: normPct(ms.BTTS_ALL),
          o15: normPct(ms.O15_ALL ?? ms["O1.5_ALL"]),
          o25: normPct(ms.O25_ALL ?? ms["O2.5_ALL"]),
          cs: normPct(ms.CS_ALL),
          homeWin: normPct(ms.Home_Win),
          awayWin: normPct(ms.Away_Win),
        };
      });

      const topBy = (key: keyof (typeof parsedTeams)[number], limit = 8) =>
        [...parsedTeams]
          .sort((a, b) => Number(b[key]) - Number(a[key]))
          .slice(0, limit)
          .map((t) => `${t.team} (${t.league}, GP ${t.gp}: ${Math.round(Number(t[key]))}%)`)
          .join("; ");

      leaderboardText = [
        `• Top BTTS Teams: ${topBy("btts")}`,
        `• Top Over 2.5 Teams: ${topBy("o25")}`,
        `• Top Over 1.5 Teams: ${topBy("o15")}`,
        `• Top Clean Sheet Teams: ${topBy("cs")}`,
        `• Strongest Home Win Teams: ${topBy("homeWin")}`,
        `• Strongest Away Win Teams: ${topBy("awayWin")}`,
      ].join("\n");
    }
  }

  // 5. Editorial VIP Picks, Multi-Bet History (non-user) & Sandbox ML Backtest Accuracy
  const [vipRows, curatedSlips, sandboxRows] = await Promise.all([
    sql`
      SELECT match, league, market, selection, chance_percent, rating_percent, vip_score, odds, predicted_score
      FROM vip_picks
      WHERE match_date = ${todayISO}::date
      ORDER BY vip_score DESC NULLS LAST
      LIMIT 15
    `.catch(() => []),
    sql`
      SELECT id, title, preset_tier, scope, combined_odds, confidence, status, created_date, settled_date, matches
      FROM curated_multi_bet_history
      ORDER BY created_date DESC, created_at DESC
      LIMIT 12
    `.catch(() => []),
    sql`
      SELECT
        COUNT(*)::int AS total_graded,
        COUNT(*) FILTER (WHERE ft_result = 'W')::int AS total_wins,
        COUNT(*) FILTER (WHERE ft_result = 'L')::int AS total_losses
      FROM sandbox_archive
      WHERE ft_result IN ('W', 'L')
    `.catch(() => [{ total_graded: 0, total_wins: 0, total_losses: 0 }]),
  ]);

  // Deduplicate fixture pool for concise, high-density context
  const fixtureMap = new Map<string, any>();
  for (const row of [...matchedFixtures, ...todayFixtures, ...topUpcomingFixtures]) {
    const k = `${String(row.match_date || "").slice(0, 10)}|${row.match_label || `${row.home_team}-${row.away_team}`}`;
    if (!fixtureMap.has(k)) fixtureMap.set(k, row);
  }
  const allContextualFixtures = Array.from(fixtureMap.values()).slice(0, 50);

  // Build lightweight client-safe suggested fixtures (so Admin can 1-click Add to BetSlip)
  const suggestedFixtures = (matchedFixtures.length > 0 ? matchedFixtures : todayFixtures)
    .slice(0, 8)
    .map((m: any) => {
      const r = parseMarketStats(m.raw_data);
      return {
        ...r,
        date: String(m.match_date || "").slice(0, 10),
        time: m.match_time || r.time || "",
        country: m.country || r.country || "",
        league: [m.country, m.league].filter(Boolean).join(" - ") || m.league || "",
        match: m.match_label || `${m.home_team} - ${m.away_team}`,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        chance: Number(m.chance ?? r.chance) || 0,
        rating: Number(m.rating ?? r.rating) || 0,
        guide: m.guide || r.pick || "",
        ftScore: m.ft_score || r.ftScore || "",
      };
    });

  const sb = sandboxRows?.[0] || {};
  const sbTotal = Number(sb.total_graded) || 0;
  const sbWinRate = sbTotal > 0 ? `${Math.round((Number(sb.total_wins) / sbTotal) * 100)}%` : "—";

  const sections: string[] = [
    `## FUTUREBET LIVE DATABASE SNAPSHOT (Lagos Date: ${todayISO})
- Matches Cache: ${mOverview.total_matches || 0} total | ${mOverview.today_matches || 0} today | ${mOverview.upcoming_matches || 0} upcoming | ${mOverview.finished_matches || 0} with FT scores
- Stats Hub Coverage: ${lOverview.countries_count || 0} countries | ${lOverview.leagues_count || 0} leagues | ${lOverview.teams_count || 0} teams
- Sandbox ML Archive: ${sbTotal} graded picks (${sb.total_wins || 0}W / ${sb.total_losses || 0}L, ${sbWinRate} hit rate)`,
  ];

  if (matchedTeamRows.length > 0) {
    sections.push(
      `## MATCHED TEAMS & LEAGUE TABLE STATS (${matchedTeamRows.length})\n` +
        matchedTeamRows.map(formatTeamStatsRow).join("\n")
    );
  }

  if (leaderboardText) {
    sections.push(`## GLOBAL MARKET LEADERBOARDS (GP >= 4)\n${leaderboardText}`);
  }

  if (allContextualFixtures.length > 0) {
    sections.push(
      `## FIXTURES & MATCH INTELLIGENCE (${allContextualFixtures.length} matches)\n` +
        allContextualFixtures.map(formatMatchRow).join("\n")
    );
  }

  if (vipRows.length > 0) {
    sections.push(
      `## TODAY'S VIP PICKS (${vipRows.length})\n` +
        vipRows
          .map(
            (v: any) =>
              `• ${v.match} (${v.league || ""}) — ${v.market}: ${v.selection} @ ${numStr(v.odds)} | Chance ${v.chance_percent} | Rating ${v.rating_percent}% | VIP Score ${v.vip_score} | CS ${v.predicted_score || "—"}`
          )
          .join("\n")
    );
  }

  if (curatedSlips.length > 0) {
    sections.push(
      `## RECENT CURATED MULTI-BET SLIPS (${curatedSlips.length})\n` +
        curatedSlips
          .map((s: any) => {
            let legs: any[] = [];
            try {
              legs = Array.isArray(s.matches) ? s.matches : JSON.parse(s.matches || "[]");
            } catch {
              legs = [];
            }
            const legsStr = legs
              .slice(0, 6)
              .map(
                (l: any) =>
                  `${l.match} [${l.selectedMarket}:${l.selectedOption}@${numStr(l.odds)}${l.ftScore ? `,FT:${l.ftScore}` : ""},${l.status || "pending"}]`
              )
              .join(" | ");
            return `• [${s.created_date || ""}] ${s.title} (${s.scope}) — ${s.combined_odds}x odds, Conf ${s.confidence}%, Status: ${String(s.status || "pending").toUpperCase()} | Legs(${legs.length}): ${legsStr}`;
          })
          .join("\n")
    );
  }

  return {
    contextText: sections.join("\n\n"),
    statsSnapshot: {
      todayISO,
      totalCachedMatches: Number(mOverview.total_matches) || 0,
      todayMatchesCount: Number(mOverview.today_matches) || 0,
      leaguesTracked: Number(lOverview.leagues_count) || 0,
      teamsTracked: Number(lOverview.teams_count) || 0,
      matchedFixturesCount: allContextualFixtures.length,
      matchedTeamsCount: matchedTeamRows.length,
      vipPicksTodayCount: vipRows.length,
      recentSlipsCount: curatedSlips.length,
    },
    suggestedFixtures,
  };
}
