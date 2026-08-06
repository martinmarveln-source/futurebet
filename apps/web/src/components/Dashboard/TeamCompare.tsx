// @ts-nocheck
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Lock,
  Sparkles,
  Shield,
  Target,
  BarChart3,
  AlertTriangle,
  BookOpen,
  Brain,
  Gauge,
  Activity,
  Swords,
  Percent,
  Flame,
  Plus,
} from "lucide-react";
import UpgradeButton from "./UpgradeButton";
const cn = (...classes) => classes.filter(Boolean).join(" ");

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const num = (value) => Number(value) || 0;

const displayWinRate = (value) => {
  const n = num(value);
  return n <= 1 ? n * 100 : n;
};

const normalizeTeamName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function parseTeamsFromMatch(matchStr) {
  const cleaned = String(matchStr || "").trim();
  if (!cleaned.includes("-")) return [];
  return cleaned
    .split("-")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseRecentMatch(matchStr, targetTeam) {
  const dateMatch = matchStr.match(/^\d{4}-\d{2}-\d{2}/);
  const date = dateMatch ? dateMatch[0] : "";
  const scoreMatch = matchStr.match(/(\d+)\s*:\s*(\d+)$/);
  const scoreText = scoreMatch ? scoreMatch[0] : "";
  const hScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  const aScore = scoreMatch ? parseInt(scoreMatch[2], 10) : 0;

  let teamsStr = matchStr;
  if (date) teamsStr = teamsStr.replace(date, "").trim();
  if (scoreText) teamsStr = teamsStr.replace(scoreText, "").trim();

  const teamsMatch = teamsStr.match(/(.+?)\s+-\s+(.+)/);
  const homeTeam = teamsMatch ? teamsMatch[1].trim() : "Home";
  const awayTeam = teamsMatch ? teamsMatch[2].trim() : "Away";

  let result = "D";
  if (hScore > aScore) {
    result = awayTeam.toLowerCase().includes((targetTeam || "").toLowerCase())
      ? "L"
      : "W";
  } else if (aScore > hScore) {
    result = homeTeam.toLowerCase().includes((targetTeam || "").toLowerCase())
      ? "L"
      : "W";
  }

  return { date, homeTeam, awayTeam, hScore, aScore, result, raw: matchStr };
}

function RecentMatchesFormatter({ matchesString, targetTeam, darkMode }) {
  if (!matchesString || matchesString === "—" || matchesString === "N/A") {
    return <span className="text-gray-500 opacity-60">—</span>;
  }

  const matches = matchesString
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const resultColors = {
    W: darkMode
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : "bg-emerald-100 text-emerald-700 border-emerald-200",
    D: darkMode
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-amber-100 text-amber-700 border-amber-200",
    L: darkMode
      ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
      : "bg-rose-100 text-rose-700 border-rose-200",
  };

  return (
    <div className="flex flex-col gap-2 w-full my-1">
      {matches.map((matchStr, idx) => {
        const m = parseRecentMatch(matchStr, targetTeam);
        const isTargetHome = m.homeTeam
          .toLowerCase()
          .includes((targetTeam || "").toLowerCase());
        const isTargetAway = m.awayTeam
          .toLowerCase()
          .includes((targetTeam || "").toLowerCase());

        return (
          <div
            key={idx}
            className={cn(
              "flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border transition-all text-left gap-2",
              darkMode
                ? "bg-black/20 border-white/5"
                : "bg-white border-gray-100 shadow-sm"
            )}
          >
            <div className="flex flex-col gap-1 min-w-0 flex-1 pr-3">
              <div
                className={cn(
                  "font-black tracking-widest text-[9px] uppercase",
                  darkMode ? "text-gray-500" : "text-gray-400"
                )}
              >
                {m.date}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
                <span
                  className={cn(
                    "truncate",
                    isTargetHome
                      ? darkMode
                        ? "text-blue-400 font-black"
                        : "text-blue-600 font-black"
                      : "font-medium opacity-70"
                  )}
                >
                  {m.homeTeam}
                </span>
                <span className="opacity-40">-</span>
                <span
                  className={cn(
                    "truncate",
                    isTargetAway
                      ? darkMode
                        ? "text-blue-400 font-black"
                        : "text-blue-600 font-black"
                      : "font-medium opacity-70"
                  )}
                >
                  {m.awayTeam}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <div className="font-black tabular-nums text-xs sm:text-sm">
                {m.hScore} : {m.aScore}
              </div>
              <div
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-md border font-black text-[10px]",
                  resultColors[m.result] || resultColors.D
                )}
              >
                {m.result}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getFormMetrics(formStr) {
  const form = String(formStr || "")
    .toUpperCase()
    .replace(/[^WDL]/g, "");

  const chars = form.split("").filter(Boolean);

  if (!chars.length) {
    return {
      clean: "N/A",
      points: 0,
      score: 50,
      wins: 0,
      draws: 0,
      losses: 0,
    };
  }

  let points = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  chars.forEach((char) => {
    if (char === "W") {
      points += 3;
      wins += 1;
    } else if (char === "D") {
      points += 1;
      draws += 1;
    } else if (char === "L") {
      losses += 1;
    }
  });

  const maxPoints = chars.length * 3;
  const score = maxPoints ? (points / maxPoints) * 100 : 50;

  return {
    clean: chars.join(""),
    points,
    score: Math.round(score),
    wins,
    draws,
    losses,
  };
}

function getLeaguePressureLabel(position, totalTeams) {
  const pos = num(position);
  const total = num(totalTeams);

  if (!pos || !total) return "League context unavailable";
  if (pos === 1) return "Title pace";
  if (pos <= 4) return "Top-table push";
  if (pos >= total - 2) return "Relegation pressure";
  if (pos <= Math.ceil(total / 2)) return "Upper-mid table control";
  return "Mid-table balance";
}

function getLeagueWindowRows(table, selectedTeam) {
  const safeTable = Array.isArray(table) ? table : [];
  if (!safeTable.length) return [];

  const teamNorm = normalizeTeamName(selectedTeam);
  let index = safeTable.findIndex(
    (row) => normalizeTeamName(row?.team) === teamNorm
  );

  if (index === -1) {
    index = safeTable.findIndex((row) =>
      normalizeTeamName(row?.team).includes(teamNorm)
    );
  }

  if (index === -1) return safeTable.slice(0, 5);

  const start = Math.max(0, index - 2);
  const end = Math.min(safeTable.length, index + 3);
  return safeTable.slice(start, end);
}
const avgOf = (values = []) =>
  values.length
    ? values.reduce((sum, value) => sum + num(value), 0) / values.length
    : 0;

const pctFromOdds = (odds) => {
  const n = num(odds);
  return n > 0 ? 100 / n : 0;
};

function getTeamSide(matchStr, teamName) {
  const teams = parseTeamsFromMatch(matchStr);
  const teamNorm = normalizeTeamName(teamName);

  if (!teams.length || !teamNorm) return null;

  const home = normalizeTeamName(teams[0]);
  const away = normalizeTeamName(teams[1]);

  if (home === teamNorm || home.includes(teamNorm)) return "home";
  if (away === teamNorm || away.includes(teamNorm)) return "away";

  return null;
}

function buildScopedMatches(matches, teamName) {
  return (Array.isArray(matches) ? matches : [])
    .map((match) => ({
      match,
      side: getTeamSide(match?.match, teamName),
    }))
    .filter((item) => item.side);
}

function getTeamNumber(match, side, homeKey, awayKey) {
  if (side === "home") return num(match?.[homeKey]);
  if (side === "away") return num(match?.[awayKey]);
  return 0;
}

function getTeamText(match, side, homeKey, awayKey) {
  if (side === "home") return String(match?.[homeKey] || "").trim();
  if (side === "away") return String(match?.[awayKey] || "").trim();
  return "";
}

function collectTopLabels(values, limit = 3) {
  const counts = {};

  (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .forEach((label) => {
      counts[label] = (counts[label] || 0) + 1;
    });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}

function collectIntelligenceStrings(value, bucket = []) {
  if (!value) return bucket;

  if (Array.isArray(value)) {
    value.forEach((item) => collectIntelligenceStrings(item, bucket));
    return bucket;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) =>
      collectIntelligenceStrings(item, bucket)
    );
    return bucket;
  }

  if (typeof value === "string") {
    const cleaned = value.trim();
    if (cleaned) bucket.push(cleaned);
  }

  return bucket;
}

function getIntelligenceHighlights(matches) {
  const raw = [];

  (Array.isArray(matches) ? matches : []).forEach((match) =>
    collectIntelligenceStrings(match?.intelligence, raw)
  );

  const filtered = raw.filter((item) => {
    const lower = item.toLowerCase();
    return (
      item.length >= 6 &&
      item.length <= 90 &&
      lower !== "yes" &&
      lower !== "no" &&
      lower !== "high" &&
      lower !== "low" &&
      lower !== "medium"
    );
  });

  return collectTopLabels(filtered, 3);
}

function pickWinnerLabel(teamA, teamB, valueA, valueB, threshold = 1) {
  const a = num(valueA);
  const b = num(valueB);

  if (Math.abs(a - b) < threshold) return "Balanced";
  return a > b ? teamA : teamB;
}
function buildStats(matchData, teamName, teamTable, fullTable) {
  if (!teamName || !matchData?.all?.length) return null;

  const scoped = buildScopedMatches(matchData.all, teamName);
  if (!scoped.length) return null;

  const formRaw =
    scoped
      .map(({ match, side }) => getTeamText(match, side, "hForm", "aForm"))
      .find(Boolean) ||
    scoped
      .map(({ match, side }) =>
        getTeamText(match, side, "H_Recent", "A_Recent")
      )
      .find(Boolean) ||
    "";

  const recentRaw =
    scoped
      .map(({ match, side }) =>
        getTeamText(match, side, "H_Recent", "A_Recent")
      )
      .find(Boolean) || "";

  const form = getFormMetrics(formRaw || recentRaw);

  const modelPPG = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hppg", "appg"))
  );
  const modelGoalsFor = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hgs", "ags"))
  );
  const modelGoalsAgainst = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hgc", "agc"))
  );
  const teamWinModel = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hWin", "aWin"))
  );
  const teamDrawModel = avgOf(
    scoped.map(({ match, side }) =>
      getTeamNumber(match, side, "hDraw", "aDraw")
    )
  );
  const teamLossModel = avgOf(
    scoped.map(({ match, side }) =>
      getTeamNumber(match, side, "hLost", "aLost")
    )
  );
  const teamBttsModel = avgOf(
    scoped.map(({ match, side }) =>
      getTeamNumber(match, side, "hBtts", "aBtts")
    )
  );
  const teamOver2Model = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hOv2", "aOv2"))
  );
  const teamOver15Scored = avgOf(
    scoped.map(({ match, side }) =>
      getTeamNumber(match, side, "hgsOver15", "agsOver15")
    )
  );
  const teamOver15Conceded = avgOf(
    scoped.map(({ match, side }) =>
      getTeamNumber(match, side, "hgcOver15", "agcOver15")
    )
  );
  const csPercent = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hcs", "acs"))
  );
  const ftsPercent = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hfts", "afts"))
  );
  const formPointsAvg = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hPts", "aPts"))
  );
  const groupPositionAvg = avgOf(
    scoped.map(({ match, side }) => getTeamNumber(match, side, "hGrp", "aGrp"))
  );

  const avgChance = avgOf(scoped.map(({ match }) => match?.chance));
  const avgRating = avgOf(scoped.map(({ match }) => match?.rating));
  const avgExpectedGoals = avgOf(scoped.map(({ match }) => match?.avg));
  const bttsPercent = avgOf(scoped.map(({ match }) => match?.gg));
  const ngPercent = avgOf(scoped.map(({ match }) => match?.ng));
  const over25Percent = avgOf(scoped.map(({ match }) => match?.ov25));
  const under25Percent = avgOf(scoped.map(({ match }) => match?.un25));
  const oneX2Rate = avgOf(scoped.map(({ match }) => match?.oneX2Rate));

  const teamWinMarketProb = avgOf(
    scoped.map(({ match, side }) =>
      side === "home" ? match?.homeWin : match?.awayWin
    )
  );
  const drawMarketProb = avgOf(scoped.map(({ match }) => match?.draw));
  const teamLoseMarketProb = avgOf(
    scoped.map(({ match, side }) =>
      side === "home" ? match?.awayWin : match?.homeWin
    )
  );

  const avgTeamOdds = avgOf(
    scoped.map(({ match, side }) =>
      side === "home" ? match?.homeOdds : match?.awayOdds
    )
  );
  const avgDrawOdds = avgOf(scoped.map(({ match }) => match?.drawOdds));

  const scorelineConfidence = avgOf(
    scoped.map(({ match }) =>
      Math.max(
        num(match?.modelCSPercent),
        num(match?.scorelineCSPercent),
        num(match?.cs2Percent)
      )
    )
  );

  const topGuides = collectTopLabels(
    scoped.map(({ match }) => match?.pick),
    2
  );
  const topTips = collectTopLabels(
    scoped.map(({ match }) => match?.tips),
    2
  );
  const topFlags = collectTopLabels(
    scoped.map(({ match }) => match?.flag),
    2
  );
  const topCorrectScores = collectTopLabels(
    scoped.flatMap(({ match }) => [match?.cScore, match?.likelyCS, match?.cs2]),
    3
  );
  const validationTags = collectTopLabels(
    scoped.map(({ match }) => match?.predictionValidation),
    2
  );
  const intelligenceHighlights = getIntelligenceHighlights(
    scoped.map(({ match }) => match)
  );

  const intelligenceCoverage =
    (scoped.filter(({ match }) => Boolean(match?.intelligence)).length /
      Math.max(scoped.length, 1)) *
    100;

  const gp = num(teamTable?.gp) || scoped.length;
  const ppg = num(teamTable?.ppg) || modelPPG;
  const gs = num(teamTable?.gs) || Math.round(modelGoalsFor * gp);
  const gc = num(teamTable?.gc) || Math.round(modelGoalsAgainst * gp);
  const gd = num(teamTable?.gd) || gs - gc;
  const pts = num(teamTable?.pts) || Math.round(ppg * gp);
  const win = num(teamTable?.win) || Math.round((teamWinModel / 100) * gp);
  const draw = num(teamTable?.draw) || Math.round((teamDrawModel / 100) * gp);
  const lost = num(teamTable?.lost) || Math.round((teamLossModel / 100) * gp);
  const winRate = displayWinRate(teamTable?.winRate || teamWinModel);

  const leaderPoints = num(fullTable?.[0]?.pts);
  const position =
    num(teamTable?.sn) ||
    (Array.isArray(fullTable) && teamTable?.team
      ? fullTable.findIndex(
          (row) =>
            normalizeTeamName(row?.team) === normalizeTeamName(teamTable?.team)
        ) + 1
      : 0) ||
    Math.round(groupPositionAvg) ||
    0;

  const gsPerGame = gp ? gs / gp : modelGoalsFor;
  const gcPerGame = gp ? gc / gp : modelGoalsAgainst;
  const gdPerGame = gp ? gd / gp : modelGoalsFor - modelGoalsAgainst;

  const ppgScore = clamp((ppg / 3) * 100);
  const winRateScore = clamp(winRate);

  const attackScore = Math.round(
    clamp(
      clamp((gsPerGame / 2.4) * 100) * 0.28 +
        clamp((modelGoalsFor / 2.4) * 100) * 0.16 +
        clamp(avgChance) * 0.12 +
        clamp(avgRating) * 0.12 +
        clamp(over25Percent) * 0.08 +
        clamp(teamOver2Model) * 0.08 +
        clamp((avgExpectedGoals / 4) * 100) * 0.08 +
        clamp(100 - ftsPercent) * 0.08 +
        clamp(teamWinMarketProb) * 0.08
    )
  );

  const defenseScore = Math.round(
    clamp(
      clamp(100 - (gcPerGame / 2.2) * 100) * 0.28 +
        clamp(100 - (modelGoalsAgainst / 2.2) * 100) * 0.16 +
        clamp(csPercent) * 0.16 +
        clamp(100 - bttsPercent) * 0.1 +
        clamp(100 - teamBttsModel) * 0.1 +
        clamp(100 - teamOver15Conceded) * 0.1 +
        clamp(teamWinModel) * 0.1
    )
  );

  const controlScore = Math.round(
    clamp(
      ppgScore * 0.32 +
        winRateScore * 0.2 +
        form.score * 0.22 +
        clamp((formPointsAvg / 15) * 100) * 0.12 +
        clamp(teamWinModel) * 0.14
    )
  );

  const momentumScore = Math.round(
    clamp(
      form.score * 0.45 +
        clamp((formPointsAvg / 15) * 100) * 0.2 +
        clamp(avgChance) * 0.15 +
        clamp(avgRating) * 0.1 +
        clamp(teamWinModel) * 0.1
    )
  );

  const marketTrustScore = Math.round(
    clamp(
      clamp(teamWinMarketProb) * 0.3 +
        clamp(avgChance) * 0.22 +
        clamp(avgRating) * 0.18 +
        clamp(oneX2Rate) * 0.15 +
        clamp(scorelineConfidence) * 0.15
    )
  );

  const stabilityScore = Math.round(
    clamp(
      defenseScore * 0.34 +
        controlScore * 0.22 +
        clamp(csPercent) * 0.14 +
        clamp(100 - ftsPercent) * 0.12 +
        clamp(100 - teamLossModel) * 0.1 +
        clamp(100 - bttsPercent) * 0.08
    )
  );

  const scorelineClarityScore = Math.round(
    clamp(
      clamp(scorelineConfidence) * 0.45 +
        clamp(avgRating) * 0.15 +
        clamp(avgChance) * 0.12 +
        clamp(oneX2Rate) * 0.08 +
        clamp(intelligenceCoverage) * 0.08 +
        (topCorrectScores.length ? 12 : 0)
    )
  );

  const overallScore = Math.round(
    clamp(
      attackScore * 0.19 +
        defenseScore * 0.19 +
        controlScore * 0.2 +
        momentumScore * 0.14 +
        marketTrustScore * 0.14 +
        stabilityScore * 0.14
    )
  );

  const impliedWinProb = pctFromOdds(avgTeamOdds);
  const marketEdge = teamWinMarketProb - impliedWinProb;

  const valueStatus =
    marketEdge >= 4
      ? "Value-positive"
      : marketEdge <= -4
      ? "Odds shorter than model"
      : "Fairly priced";

  return {
    gp,
    win,
    draw,
    lost,
    gs,
    gc,
    gd,
    pts,
    ppg,
    winRate,
    avgChance: Math.round(avgChance),
    avgRating: Math.round(avgRating),
    avgExpectedGoals,
    bttsPercent: Math.round(bttsPercent),
    ngPercent: Math.round(ngPercent),
    over25Percent: Math.round(over25Percent),
    under25Percent: Math.round(under25Percent),
    csPercent: Math.round(csPercent),
    ftsPercent: Math.round(ftsPercent),
    form: form.clean,
    recentRaw: recentRaw || "N/A",
    formPoints: form.points,
    formPointsAvg,
    formScore: form.score,
    position,
    leaderPoints,
    titleGap: leaderPoints && pts ? Math.max(leaderPoints - pts, 0) : 0,
    pressureLabel: getLeaguePressureLabel(
      position,
      Array.isArray(fullTable) ? fullTable.length : 0
    ),
    gsPerGame,
    gcPerGame,
    gdPerGame,
    modelPPG,
    modelGoalsFor,
    modelGoalsAgainst,
    teamWinModel,
    teamDrawModel,
    teamLossModel,
    teamBttsModel,
    teamOver2Model,
    teamOver15Scored,
    teamOver15Conceded,
    teamWinMarketProb,
    drawMarketProb,
    teamLoseMarketProb,
    avgTeamOdds,
    avgDrawOdds,
    impliedWinProb,
    marketEdge,
    valueStatus,
    oneX2Rate,
    scorelineConfidence,
    attackScore,
    defenseScore,
    controlScore,
    momentumScore,
    marketTrustScore,
    stabilityScore,
    scorelineClarityScore,
    topGuides,
    topTips,
    topFlags,
    topCorrectScores,
    validationTags,
    intelligenceHighlights,
    intelligenceCoverage: Math.round(intelligenceCoverage),
    matchesAnalyzed: scoped.length,
    homeSamples: scoped.filter(({ side }) => side === "home").length,
    awaySamples: scoped.filter(({ side }) => side === "away").length,
    topRecommendation: topGuides[0] || topTips[0] || "No dominant guide",
    overallScore,
  };
}

function buildMatchupInsight({
  statsA,
  statsB,
  teamA,
  teamB,
  countryA,
  leagueA,
  countryB,
  leagueB,
}) {
  if (!statsA || !statsB) return null;

  const overallDiff = statsA.overallScore - statsB.overallScore;
  const controlDiff = statsA.controlScore - statsB.controlScore;
  const attackDiff = statsA.attackScore - statsB.attackScore;
  const defenseDiff = statsA.defenseScore - statsB.defenseScore;
  const momentumDiff = statsA.momentumScore - statsB.momentumScore;
  const marketTrustDiff = statsA.marketTrustScore - statsB.marketTrustScore;
  const stabilityDiff = statsA.stabilityScore - statsB.stabilityScore;

  const avgOver25 = (statsA.over25Percent + statsB.over25Percent) / 2;
  const avgUnder25 = (statsA.under25Percent + statsB.under25Percent) / 2;
  const avgBTTS = (statsA.bttsPercent + statsB.bttsPercent) / 2;
  const avgExpectedGoals =
    (statsA.avgExpectedGoals + statsB.avgExpectedGoals) / 2;
  const avgScorelineClarity =
    (statsA.scorelineClarityScore + statsB.scorelineClarityScore) / 2;

  const strongerSide =
    Math.abs(overallDiff) < 3
      ? "Too close to call"
      : overallDiff > 0
      ? teamA
      : teamB;

  const strongerStats =
    strongerSide === teamA ? statsA : strongerSide === teamB ? statsB : null;
  const weakerStats =
    strongerSide === teamA ? statsB : strongerSide === teamB ? statsA : null;

  const confidence =
    strongerSide === "Too close to call"
      ? clamp(
          56 +
            Math.abs(overallDiff) * 2 +
            Math.abs(marketTrustDiff) * 0.2 +
            Math.abs(momentumDiff) * 0.16,
          55,
          68
        )
      : clamp(
          60 +
            Math.abs(overallDiff) * 1.7 +
            Math.abs(controlDiff) * 0.25 +
            Math.abs(momentumDiff) * 0.22 +
            Math.abs(stabilityDiff) * 0.18 +
            Math.abs(marketTrustDiff) * 0.14,
          61,
          94
        );

  const drawRiskScore = clamp(
    ((statsA.teamDrawModel + statsB.teamDrawModel) / 2) * 0.65 +
      (Math.abs(overallDiff) < 5 ? 18 : 0) +
      (avgUnder25 > 55 ? 6 : 0) +
      (avgScorelineClarity < 55 ? 4 : 0),
    8,
    84
  );

  const goalsLean =
    avgExpectedGoals >= 2.9 || avgOver25 >= 60
      ? "Over 2.5 Goals"
      : avgExpectedGoals <= 2.25 || avgUnder25 >= 56
      ? "Under 2.5 Goals"
      : "Over 1.5 Goals safer";

  const bttsLean =
    avgBTTS >= 56 && (statsA.csPercent + statsB.csPercent) / 2 < 55
      ? "BTTS: Yes"
      : avgBTTS <= 45 || (statsA.csPercent + statsB.csPercent) / 2 > 60
      ? "BTTS: No"
      : "BTTS: Borderline";

  const tempoLean =
    avgExpectedGoals >= 3
      ? "High-tempo scoring environment"
      : avgExpectedGoals <= 2.2
      ? "Controlled tempo / lower-event game"
      : "Balanced tempo";

  const volatility =
    confidence >= 78 && drawRiskScore < 22 && Math.abs(stabilityDiff) > 8
      ? "Controlled with clear edge"
      : avgOver25 >= 62 && avgBTTS >= 56
      ? "Open game state"
      : avgUnder25 >= 55 && avgBTTS <= 46
      ? "Low-event / compact"
      : "Balanced but swingy";

  const riskLevel =
    confidence >= 79 && drawRiskScore < 22
      ? "Low"
      : confidence >= 68 && drawRiskScore < 32
      ? "Moderate"
      : "High";

  const cleanSheetLean =
    strongerSide === "Too close to call"
      ? "No clean-sheet side stands out"
      : strongerSide === teamA
      ? statsA.defenseScore - statsB.attackScore >= 10 &&
        statsB.ftsPercent >= 28
        ? `${teamA} clean-sheet threat`
        : "Clean sheet not strong enough to force"
      : statsB.defenseScore - statsA.attackScore >= 10 &&
        statsA.ftsPercent >= 28
      ? `${teamB} clean-sheet threat`
      : "Clean sheet not strong enough to force";

  const scorelineLean =
    strongerSide === "Too close to call"
      ? goalsLean === "Under 2.5 Goals"
        ? "1-0 / 1-1 zone"
        : "1-1 / 2-1 zone"
      : strongerStats?.topCorrectScores?.[0] ||
        (goalsLean === "Under 2.5 Goals" ? "1-0 zone" : "2-1 zone");

  const saferAngle =
    strongerSide === "Too close to call"
      ? goalsLean === "Under 2.5 Goals"
        ? "Under 3.5 Goals"
        : bttsLean === "BTTS: Yes"
        ? "BTTS or Over 1.5 Goals"
        : "Avoid direct 1X2"
      : confidence >= 80
      ? `${strongerSide} Draw No Bet`
      : confidence >= 70
      ? `${strongerSide} or Draw`
      : goalsLean === "Under 2.5 Goals"
      ? "Under 3.5 Goals"
      : `${strongerSide} safer only with cover`;

  const aggressiveAngle =
    strongerSide === "Too close to call"
      ? goalsLean === "Over 2.5 Goals"
        ? "BTTS & Over 2.5 Goals"
        : "No aggressive edge"
      : cleanSheetLean.includes(strongerSide)
      ? `${strongerSide} Win to Nil lean`
      : goalsLean === "Over 2.5 Goals"
      ? `${strongerSide} Win & Over 1.5 Goals`
      : `${strongerSide} Win`;

  const edgeList = [
    {
      label: "Game control and consistency",
      value: Math.abs(controlDiff),
    },
    {
      label: "Attacking output and scoring pressure",
      value: Math.abs(attackDiff),
    },
    {
      label: "Defensive structure and suppression",
      value: Math.abs(defenseDiff),
    },
    {
      label: "Momentum and recent-form quality",
      value: Math.abs(momentumDiff),
    },
    {
      label: "Market trust and model alignment",
      value: Math.abs(marketTrustDiff),
    },
    {
      label: "Stability and error resistance",
      value: Math.abs(stabilityDiff),
    },
  ].sort((a, b) => b.value - a.value);

  const mainEdge = edgeList[0]?.label || "Composite team strength";

  const bestValueSignal =
    statsA.marketEdge > statsB.marketEdge + 1.5
      ? `${teamA} has the better model-vs-odds cushion.`
      : statsB.marketEdge > statsA.marketEdge + 1.5
      ? `${teamB} has the better model-vs-odds cushion.`
      : "Average odds are broadly aligned with the model.";

  const trustLeader = pickWinnerLabel(
    teamA,
    teamB,
    statsA.marketTrustScore,
    statsB.marketTrustScore,
    2
  );

  const sideLeanLabel =
    strongerSide === "Too close to call"
      ? "Balanced matchup"
      : `${strongerSide} holds the stronger premium-model edge`;

  const overview = `${sideLeanLabel}. ${
    strongerSide === "Too close to call"
      ? `${teamA} and ${teamB} sit very close on the composite model, so direct win markets deserve more caution than normal.`
      : `${strongerSide} grades better through a stronger blend of control, momentum, market trust, and structural team quality.`
  }`;

  const tactical = `${
    attackDiff > 6
      ? `${teamA} owns the stronger attacking profile.`
      : attackDiff < -6
      ? `${teamB} owns the stronger attacking profile.`
      : "Attacking separation is limited."
  } ${
    defenseDiff > 6
      ? `${teamA} also looks tighter defensively.`
      : defenseDiff < -6
      ? `${teamB} also looks tighter defensively.`
      : "Defensive separation is not wide enough to remove volatility."
  } ${
    momentumDiff > 6
      ? `${teamA} carries better momentum.`
      : momentumDiff < -6
      ? `${teamB} carries better momentum.`
      : "Momentum is relatively balanced."
  }`;

  const marketView = `The model points to ${goalsLean.toLowerCase()} with ${bttsLean.toLowerCase()}. Scoreline zone: ${scorelineLean}. Clean-sheet note: ${cleanSheetLean}. Safer angle: ${saferAngle}. Aggressive angle: ${aggressiveAngle}.`;

  const riskView = `Risk is ${riskLevel.toLowerCase()} because confidence sits at ${Math.round(
    confidence
  )}%, draw pressure is ${Math.round(
    drawRiskScore
  )}%, and the game projects as ${tempoLean.toLowerCase()}.`;

  const keyEdges = [
    `${teamA}: overall model ${statsA.overallScore}/100 vs ${teamB}: ${statsB.overallScore}/100.`,
    `${teamA} momentum ${statsA.momentumScore}/100 vs ${teamB} ${statsB.momentumScore}/100.`,
    `${teamA} market trust ${statsA.marketTrustScore}/100 vs ${teamB} ${statsB.marketTrustScore}/100.`,
    `${teamA} stability ${statsA.stabilityScore}/100 vs ${teamB} ${statsB.stabilityScore}/100.`,
    `${teamA} team-backed win support ${Math.round(
      statsA.teamWinMarketProb
    )}% vs ${teamB} ${Math.round(statsB.teamWinMarketProb)}%.`,
    `${teamA} avg xG environment ${statsA.avgExpectedGoals.toFixed(
      2
    )} vs ${teamB} ${statsB.avgExpectedGoals.toFixed(2)}.`,
  ];

  const leagueNarrative = `${teamA} competes in ${countryA} ${leagueA}, while ${teamB} comes from ${countryB} ${leagueB}. Cross-league comparison is normalized through table strength, market-backed win probability, scoring environment, scoreline clarity, and recent-form stability.`;

  const premiumAngles = [
    `${goalsLean} profile with ${Math.round(
      avgOver25
    )}% combined over support.`,
    `${bttsLean} with ${Math.round(avgBTTS)}% BTTS backdrop.`,
    `Scoreline zone sits around ${scorelineLean}.`,
    bestValueSignal,
  ];

  const bettingWarnings = [
    drawRiskScore >= 30 ? "Draw pressure is elevated." : "",
    Math.abs(overallDiff) < 4 ? "The composite edge is narrow." : "",
    avgScorelineClarity < 55
      ? "Correct-score clarity is not especially strong."
      : "",
  ].filter(Boolean);

  return {
    strongerSide,
    confidence: Math.round(confidence),
    goalsLean,
    bttsLean,
    volatility,
    riskLevel,
    saferAngle,
    aggressiveAngle,
    mainEdge,
    drawRiskScore: Math.round(drawRiskScore),
    scorelineLean,
    cleanSheetLean,
    tempoLean,
    bestValueSignal,
    trustLeader,
    overview,
    tactical,
    marketView,
    riskView,
    keyEdges,
    leagueNarrative,
    premiumAngles,
    bettingWarnings,
  };
}
const TEAM_COMPARE_GUIDE_CARDS = [
  {
    title: "Selection Panels",
    tone: "blue",
    description:
      "Country → league → team selectors for Team A and Team B with clear/reset support and a live selected-team preview.",
  },
  {
    title: "Attack Score",
    tone: "blue",
    description:
      "Blended from goals scored, model goals-for, prediction chance, rating, over-goals support, xG environment, failed-to-score resistance, and win support.",
  },
  {
    title: "Defense Score",
    tone: "emerald",
    description:
      "Measures concession control, clean-sheet strength, BTTS suppression, and how well a team limits open or unstable games.",
  },
  {
    title: "Control Score",
    tone: "amber",
    description:
      "Built from points per game, win rate, recent form, and form-points quality. Higher values suggest stronger match management.",
  },
  {
    title: "Momentum Score",
    tone: "purple",
    description:
      "Weighted recent-form quality score driven by current form, form-points average, chance, rating, and win support.",
  },
  {
    title: "Market Trust Score",
    tone: "blue",
    description:
      "Shows how strongly market-backed win support, chance, rating, 1X2 alignment, and scoreline confidence agree with the side.",
  },
  {
    title: "Stability Score",
    tone: "emerald",
    description:
      "Blend of defense, control, clean sheets, failed-to-score resistance, loss suppression, and BTTS control.",
  },
  {
    title: "Scoreline Clarity",
    tone: "purple",
    description:
      "Rates how clearly the data points toward a narrow correct-score corridor using scoreline confidence, rating, chance, 1X2 alignment, and AI coverage.",
  },
  {
    title: "Overall Model Score",
    tone: "purple",
    description:
      "Composite strength score built from attack, defense, control, momentum, market trust, and stability.",
  },
  {
    title: "AI Matchup Verdict",
    tone: "amber",
    description:
      "Summarizes stronger side, confidence, safer angle, goals lean, scoreline zone, clean-sheet note, and volatility.",
  },
  {
    title: "Market Intelligence",
    tone: "blue",
    description:
      "Translates the model into betting-market language: 1X2 side angle, goals market, BTTS read, clean-sheet read, and aggressive angle.",
  },
  {
    title: "Premium Edge Dashboard",
    tone: "emerald",
    description:
      "Highlights momentum leader, market-trust leader, stability leader, value pressure, tempo read, and draw pressure.",
  },
  {
    title: "League Context",
    tone: "amber",
    description:
      "Displays position, leader gap, goal difference, pressure label, and a mini league-table window around the selected team.",
  },
  {
    title: "Recommendation DNA",
    tone: "purple",
    description:
      "Summarizes the most repeated guides, tips, flags, validation tags, scorelines, and AI highlights across analyzed matches.",
  },
  {
    title: "Deep Comparison Matrix",
    tone: "rose",
    description:
      "Expanded side-by-side comparison covering table output, model rates, odds edge, goal trends, score bars, value status, and sample split.",
  },
  {
    title: "AI Match Summary",
    tone: "blue",
    description:
      "Final narrative overview and risk report that combine the verdict, market view, control edge, and defensive edge into a quick read.",
  },
];
// API
async function fetchMatches() {
  const res = await fetch("/api/matches?all=true&refresh=true&compare=true", {
    cache: "no-store",
  });

  if (res.status === 403) {
    throw new Error("COMPARE_ACCESS_DENIED");
  }
  if (!res.ok) throw new Error("Failed to fetch matches");

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.matches)) return data.matches;
  if (Array.isArray(data?.data)) return data.data;

  console.error("/api/matches returned unexpected shape:", data);
  return [];
}

async function fetchLeagueTable(country, league) {
  const params = new URLSearchParams({ compare: "true" });

  if (country && league) {
    params.append("country", country);
    params.append("league", league);
  } else {
    // If no specific league is requested, tell the backend to fetch all teams
    params.append("all", "true");
  }

  const res = await fetch(`/api/league-table?${params}`, {
    cache: "no-store",
  });

  if (res.status === 403) {
    throw new Error("COMPARE_ACCESS_DENIED");
  }
  if (!res.ok) return [];

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.table)) return data.table;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;

  console.error("/api/league-table returned unexpected shape:", data);
  return [];
}

function PremiumShell({ darkMode, children }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[30px] border p-3 sm:p-4 lg:p-5",
        darkMode
          ? "border-white/10 bg-slate-950/50 shadow-2xl shadow-black/30"
          : "border-gray-200/80 bg-gradient-to-br from-white via-white to-purple-50/70 shadow-2xl shadow-purple-100/50"
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={cn(
            "absolute -top-20 -left-16 h-64 w-64 rounded-full blur-3xl",
            darkMode ? "bg-purple-500/15" : "bg-purple-200/70"
          )}
        />
        <div
          className={cn(
            "absolute -top-10 right-0 h-56 w-56 rounded-full blur-3xl",
            darkMode ? "bg-amber-400/10" : "bg-amber-200/70"
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 left-1/3 h-52 w-52 rounded-full blur-3xl",
            darkMode ? "bg-blue-500/10" : "bg-blue-200/60"
          )}
        />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}

function HeaderStat({ darkMode, icon: Icon, label, value, tone = "purple" }) {
  const toneClass =
    tone === "amber"
      ? darkMode
        ? "text-amber-200"
        : "text-amber-700"
      : tone === "blue"
      ? darkMode
        ? "text-blue-200"
        : "text-blue-700"
      : tone === "emerald"
      ? darkMode
        ? "text-emerald-200"
        : "text-emerald-700"
      : darkMode
      ? "text-purple-200"
      : "text-purple-700";

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 backdrop-blur-sm",
        darkMode
          ? "border-white/10 bg-white/5"
          : "border-white/80 bg-white/80 shadow-sm"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            darkMode
              ? "border-white/10 bg-white/5"
              : "border-gray-200 bg-white",
            toneClass
          )}
        >
          <Icon size={16} />
        </div>

        <div className="min-w-0">
          <div
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.18em]",
              darkMode ? "text-gray-400" : "text-gray-500"
            )}
          >
            {label}
          </div>
          <div className="text-sm font-extrabold truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}

function CompareIndicator({ valueA, valueB, higherIsBetter = true }) {
  const numA = Number(valueA);
  const numB = Number(valueB);

  if (Number.isNaN(numA) || Number.isNaN(numB)) {
    return <Minus size={16} className="text-gray-400" />;
  }

  if (numA === numB) {
    return <Minus size={16} className="text-gray-400" />;
  }

  const aWins = higherIsBetter ? numA > numB : numA < numB;

  return aWins ? (
    <TrendingUp size={16} className="text-emerald-500" />
  ) : (
    <TrendingDown size={16} className="text-rose-500" />
  );
}

function ScoreBar({ darkMode, label, value, tone = "emerald" }) {
  const barTone =
    tone === "blue"
      ? "from-blue-500 to-cyan-400"
      : tone === "amber"
      ? "from-amber-500 to-yellow-400"
      : tone === "purple"
      ? "from-purple-500 to-fuchsia-400"
      : "from-emerald-500 to-teal-400";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
          {label}
        </span>
        <span className="font-bold">{Math.round(num(value))}/100</span>
      </div>
      <div
        className={cn(
          "h-2.5 overflow-hidden rounded-full",
          darkMode ? "bg-white/10" : "bg-gray-100"
        )}
      >
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", barTone)}
          style={{ width: `${clamp(value)}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  darkMode,
  icon: Icon,
  title,
  value,
  sub,
  accent = "emerald",
}) {
  const accentClass =
    accent === "amber"
      ? darkMode
        ? "text-amber-300"
        : "text-amber-600"
      : accent === "purple"
      ? darkMode
        ? "text-purple-300"
        : "text-purple-600"
      : accent === "blue"
      ? darkMode
        ? "text-blue-300"
        : "text-blue-600"
      : accent === "rose"
      ? darkMode
        ? "text-rose-300"
        : "text-rose-600"
      : darkMode
      ? "text-emerald-300"
      : "text-emerald-600";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        darkMode
          ? "border-white/10 bg-white/5"
          : "border-gray-200 bg-white shadow-sm"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              darkMode ? "text-gray-400" : "text-gray-500"
            )}
          >
            {title}
          </div>
          <div className="mt-1 text-sm font-extrabold sm:text-base">
            {value}
          </div>
          {sub ? (
            <div
              className={cn(
                "mt-1 text-xs",
                darkMode ? "text-gray-300" : "text-gray-600"
              )}
            >
              {sub}
            </div>
          ) : null}
        </div>
        <Icon size={18} className={accentClass} />
      </div>
    </div>
  );
}

function TonePill({ darkMode, tone = "blue", children }) {
  const toneClass =
    tone === "amber"
      ? darkMode
        ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
        : "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "emerald"
      ? darkMode
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "purple"
      ? darkMode
        ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
        : "border-purple-200 bg-purple-50 text-purple-700"
      : tone === "rose"
      ? darkMode
        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
        : "border-rose-200 bg-rose-50 text-rose-700"
      : darkMode
      ? "border-blue-400/20 bg-blue-500/10 text-blue-200"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold",
        toneClass
      )}
    >
      {children}
    </span>
  );
}

function TagRow({ darkMode, title, items = [], tone = "blue" }) {
  const safeItems = (Array.isArray(items) ? items : []).filter(Boolean);

  return (
    <div>
      <div
        className={cn(
          "mb-2 text-[11px] font-semibold uppercase tracking-wide",
          darkMode ? "text-gray-400" : "text-gray-500"
        )}
      >
        {title}
      </div>

      {safeItems.length ? (
        <div className="flex flex-wrap gap-2">
          {safeItems.map((item) => (
            <TonePill key={`${title}-${item}`} darkMode={darkMode} tone={tone}>
              {item}
            </TonePill>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "text-xs",
            darkMode ? "text-gray-500" : "text-gray-500"
          )}
        >
          No strong signal yet.
        </div>
      )}
    </div>
  );
}
function TeamProfileCard({
  darkMode,
  team,
  country,
  league,
  stats,
  color = "blue",
}) {
  const badgeClasses =
    color === "purple"
      ? darkMode
        ? "bg-purple-500/15 border-purple-400/30 text-purple-200"
        : "bg-purple-50 border-purple-200 text-purple-700"
      : darkMode
      ? "bg-blue-500/15 border-blue-400/30 text-blue-200"
      : "bg-blue-50 border-blue-200 text-blue-700";

  const miniStats = [
    { label: "Position", value: stats.position || "—" },
    { label: "Points", value: stats.pts },
    { label: "Model PPG", value: stats.modelPPG.toFixed(2) },
    {
      label: "Win Market",
      value: `${stats.teamWinMarketProb.toFixed(1)}%`,
    },
    {
      label: "xG Env",
      value: stats.avgExpectedGoals.toFixed(2),
    },
    { label: "Samples", value: stats.matchesAnalyzed },
  ];

  return (
    <div
      className={cn(
        "rounded-3xl border p-4 sm:p-5 h-full flex flex-col",
        darkMode
          ? "border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02]"
          : "border-gray-200 bg-white shadow-sm"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">{team}</div>
          <div
            className={cn(
              "mt-1 text-sm",
              darkMode ? "text-gray-300" : "text-gray-600"
            )}
          >
            {country} • {league}
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border px-3 py-2 text-xs shadow-sm",
            badgeClasses
          )}
        >
          <div className="font-bold">{stats.overallScore}/100</div>
          <div className="opacity-80">Overall Score</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {miniStats.map((item) => (
          <div
            key={item.label}
            className={cn(
              "rounded-2xl p-3",
              darkMode ? "bg-white/5" : "bg-gray-50"
            )}
          >
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              {item.label}
            </div>
            <div className="mt-1 text-lg font-bold">{item.value}</div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "mt-auto pt-4 rounded-2xl border p-3 text-sm mt-4",
          darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
        )}
      >
        <div className="mb-1 font-bold">Quick read</div>
        <p
          className={
            darkMode ? "text-xs text-gray-300" : "text-xs text-gray-600"
          }
        >
          {team} carries a {stats.pressureLabel.toLowerCase()} profile with{" "}
          {stats.form !== "N/A"
            ? `recent form ${stats.form}`
            : "limited recent-form data"}
          ,{` `}team-backed win support of {stats.teamWinMarketProb.toFixed(1)}
          %, xG environment {stats.avgExpectedGoals.toFixed(2)}, and a{" "}
          {stats.valueStatus.toLowerCase()} odds read.
        </p>
      </div>
    </div>
  );
}

function MatchupRadarChart({ statsA, statsB, teamA, teamB, darkMode }) {
  const metrics = [
    { label: "Attack", a: statsA.attackScore, b: statsB.attackScore },
    { label: "Momentum", a: statsA.momentumScore, b: statsB.momentumScore },
    { label: "Trust", a: statsA.marketTrustScore, b: statsB.marketTrustScore },
    { label: "Stability", a: statsA.stabilityScore, b: statsB.stabilityScore },
    { label: "Defense", a: statsA.defenseScore, b: statsB.defenseScore },
    { label: "Control", a: statsA.controlScore, b: statsB.controlScore },
  ];

  const size = 320;
  const center = size / 2;
  const maxRadius = 110;

  const getPoint = (value, index) => {
    const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
    const radius = (clamp(value) / 100) * maxRadius;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  };

  const pointsA = metrics
    .map((m, i) => `${getPoint(m.a, i).x},${getPoint(m.a, i).y}`)
    .join(" ");
  const pointsB = metrics
    .map((m, i) => `${getPoint(m.b, i).x},${getPoint(m.b, i).y}`)
    .join(" ");

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div
      className={cn(
        "rounded-3xl border flex flex-col items-center justify-center p-4 relative h-full overflow-hidden",
        darkMode
          ? "border-white/10 bg-white/[0.02]"
          : "border-gray-200 bg-white shadow-sm"
      )}
    >
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
          <span
            className={cn(
              "text-xs font-extrabold truncate max-w-[90px]",
              darkMode ? "text-gray-300" : "text-gray-700"
            )}
          >
            {teamA}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-extrabold truncate max-w-[90px] text-right",
              darkMode ? "text-gray-300" : "text-gray-700"
            )}
          >
            {teamB}
          </span>
          <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
        </div>
      </div>

      <svg width={size} height={size} className="overflow-visible mt-6">
        <defs>
          <filter id="glowA" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowB" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid Hexagons */}
        {gridLevels.map((level, i) => {
          const gridPoints = metrics
            .map((_, index) => {
              const angle =
                (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
              const r = (level / 100) * maxRadius;
              return `${center + r * Math.cos(angle)},${
                center + r * Math.sin(angle)
              }`;
            })
            .join(" ");

          return (
            <polygon
              key={level}
              points={gridPoints}
              fill="none"
              stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Lines */}
        {metrics.map((_, index) => {
          const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
          return (
            <line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={center + maxRadius * Math.cos(angle)}
              y2={center + maxRadius * Math.sin(angle)}
              stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
              strokeWidth="1"
            />
          );
        })}

        {/* Team B Polygon (Purple) */}
        <polygon
          points={pointsB}
          fill={
            darkMode ? "rgba(168, 85, 247, 0.25)" : "rgba(168, 85, 247, 0.15)"
          }
          stroke="#a855f7"
          strokeWidth="2.5"
          filter="url(#glowB)"
          className="transition-all duration-700 ease-out"
        />

        {/* Team A Polygon (Blue) */}
        <polygon
          points={pointsA}
          fill={
            darkMode ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.15)"
          }
          stroke="#3b82f6"
          strokeWidth="2.5"
          filter="url(#glowA)"
          className="transition-all duration-700 ease-out"
        />

        {/* Data Points for Team B */}
        {metrics.map((m, i) => (
          <circle
            key={`pt-b-${i}`}
            cx={getPoint(m.b, i).x}
            cy={getPoint(m.b, i).y}
            r="3.5"
            fill="#a855f7"
            className="transition-all duration-700 ease-out"
          />
        ))}

        {/* Data Points for Team A */}
        {metrics.map((m, i) => (
          <circle
            key={`pt-a-${i}`}
            cx={getPoint(m.a, i).x}
            cy={getPoint(m.a, i).y}
            r="3.5"
            fill="#3b82f6"
            className="transition-all duration-700 ease-out"
          />
        ))}

        {/* Labels on the outside */}
        {metrics.map((m, index) => {
          const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
          const labelRadius = maxRadius + 24; // Push labels slightly outside
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);

          let textAnchor = "middle";
          if (Math.abs(Math.cos(angle)) > 0.1) {
            textAnchor = Math.cos(angle) > 0 ? "start" : "end";
          }

          return (
            <text
              key={`label-${index}`}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className={cn(
                "text-[10px] font-extrabold tracking-widest uppercase",
                darkMode ? "fill-gray-400" : "fill-gray-500"
              )}
            >
              {m.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function TeamSearchSpotlight({
  darkMode,
  title,
  tone = "blue",
  selectedTeam,
  selectedCountry,
  selectedLeague,
  allTeams,
  onSelect,
  onClear,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    // Safety net 1: Ensure we always have a valid array
    if (!Array.isArray(allTeams)) return [];

    // Safety net 2: If nothing is typed, show the first 15 teams safely
    if (!query) return allTeams.slice(0, 15);

    // Safety net 3: Convert the user's search to lowercase safely
    const q = String(query).toLowerCase();

    return allTeams
      .filter((t) => {
        // Safety net 4: Force the team and league to be strings before checking
        const teamName = String(t?.team || "").toLowerCase();
        const leagueName = String(t?.league || "").toLowerCase();

        return teamName.includes(q) || leagueName.includes(q);
      })
      .slice(0, 30);
  }, [query, allTeams]);

  const tonePanel =
    tone === "purple"
      ? darkMode
        ? "from-purple-500/10 to-fuchsia-500/5 border-purple-400/20"
        : "from-purple-50 to-fuchsia-50/80 border-purple-200"
      : darkMode
      ? "from-blue-500/10 to-cyan-500/5 border-blue-400/20"
      : "from-blue-50 to-cyan-50/80 border-blue-200";

  const toneChip =
    tone === "purple"
      ? darkMode
        ? "bg-purple-500/15 text-purple-200 border-purple-400/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
        : "bg-purple-100 text-purple-700 border-purple-200"
      : darkMode
      ? "bg-blue-500/15 text-blue-200 border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
      : "bg-blue-100 text-blue-700 border-blue-200";

  return (
    <div
      className={cn(
        "rounded-[32px] border bg-gradient-to-br p-5 sm:p-6 transition-all",
        tonePanel,
        darkMode ? "bg-white/[0.02]" : "shadow-sm"
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]",
            toneChip
          )}
        >
          {title}
        </div>
      </div>

      {!selectedTeam ? (
        <div className="relative">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all",
              darkMode
                ? "bg-black/20 border-white/10 focus-within:border-white/30 focus-within:ring-4 focus-within:ring-white/5"
                : "bg-white border-gray-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10 shadow-inner"
            )}
          >
            <Search
              size={20}
              className={darkMode ? "text-gray-400" : "text-gray-400"}
            />
            <input
              aria-label="Search by team or league"
              placeholder="Search by team or league..."
              className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:font-semibold placeholder:text-gray-400 dark:text-white text-gray-900"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className={
                  darkMode
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-400 hover:text-gray-900"
                }
              >
                <X size={16} />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="mt-3 max-h-[220px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
              {filtered.length > 0 ? (
                filtered.map((t) => (
                  <button
                    key={`${t.team}-${t.league}`}
                    onClick={() => {
                      onSelect(t.team, t.country, t.league);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between group active:scale-[0.98]",
                      darkMode
                        ? "hover:bg-white/10 text-white"
                        : "hover:bg-gray-100 text-gray-900"
                    )}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-extrabold text-sm truncate">
                        {t.team}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider opacity-60 font-bold truncate">
                        {t.country} • {t.league}
                      </span>
                    </div>
                    <Plus
                      size={16}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-xs font-bold opacity-50">
                  No teams found matching "{query}"
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center justify-between rounded-2xl border p-4 shadow-sm",
            tone === "purple"
              ? darkMode
                ? "bg-purple-500/10 border-purple-400/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                : "bg-purple-50 border-purple-200"
              : darkMode
              ? "bg-blue-500/10 border-blue-400/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
              : "bg-blue-50 border-blue-200"
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={cn(
                "h-12 w-12 shrink-0 rounded-xl flex items-center justify-center text-xl font-black shadow-sm",
                tone === "purple"
                  ? darkMode
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-white text-purple-600"
                  : darkMode
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-white text-blue-600"
              )}
            >
              {selectedTeam.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3
                className={cn(
                  "font-black text-lg truncate",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {selectedTeam}
              </h3>
              <p
                className={cn(
                  "text-[10px] uppercase tracking-wider font-bold truncate mt-0.5",
                  tone === "purple"
                    ? darkMode
                      ? "text-purple-300/70"
                      : "text-purple-600/70"
                    : darkMode
                    ? "text-blue-300/70"
                    : "text-blue-600/70"
                )}
              >
                {selectedCountry} • {selectedLeague}
              </p>
            </div>
          </div>
          <button
            onClick={onClear}
            className={cn(
              "p-2.5 rounded-xl transition hover:scale-105 active:scale-95 shrink-0",
              tone === "purple"
                ? darkMode
                  ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                  : "bg-white text-purple-600 shadow-sm"
                : darkMode
                ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                : "bg-white text-blue-600 shadow-sm"
            )}
            title="Change Team"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function ProTipCarousel({ darkMode }) {
  const tips = [
    "If the stronger side is 'Too close to call', treat direct win markets carefully.",
    "The 'Safer angle' is meant for lower-risk bankroll building, not maximum payout.",
    "The 'Aggressive angle' carries higher variance and should be staked with caution.",
    "High draw risk means the matchup may stay balanced and tense longer than expected.",
    "High volatility means one early goal can completely flip the expected match script.",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tips.length);
    }, 4500); // Rotates every 4.5 seconds
    return () => clearInterval(timer);
  }, [tips.length]);

  return (
    <div
      className={cn(
        "relative rounded-3xl border p-5 overflow-hidden transition-all duration-500",
        darkMode
          ? "bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]"
          : "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-sm"
      )}
    >
      {/* Background Watermark Icon */}
      <div className="absolute -top-6 -right-6 opacity-[0.04] dark:opacity-[0.08] pointer-events-none">
        <Brain size={120} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={cn(
              "p-1.5 rounded-lg shadow-sm",
              darkMode
                ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
                : "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200"
            )}
          >
            <Brain size={14} />
          </div>
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em]",
              darkMode ? "text-indigo-300" : "text-indigo-700"
            )}
          >
            Pro Analyst Tip
          </span>
        </div>

        <div className="min-h-[60px] flex items-center">
          <p
            key={currentIndex}
            className={cn(
              "text-sm font-semibold leading-relaxed animate-in fade-in slide-in-from-right-4 duration-500",
              darkMode ? "text-indigo-100" : "text-indigo-950"
            )}
          >
            "{tips[currentIndex]}"
          </p>
        </div>

        {/* Animated Progress Dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {tips.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === currentIndex
                  ? darkMode
                    ? "w-6 bg-indigo-400"
                    : "w-6 bg-indigo-600"
                  : darkMode
                  ? "w-1.5 bg-white/20"
                  : "w-1.5 bg-indigo-200"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowStepper({ darkMode }) {
  const steps = [
    {
      title: "1. Search",
      desc: "Use the Spotlight Search to instantly lock in Team A and Team B.",
    },
    {
      title: "2. Shape",
      desc: "Check the Radar Chart to instantly see which team dominates the match profile.",
    },
    {
      title: "3. Verdict",
      desc: "Read the AI Matchup Verdict for the confidence level and risk profile.",
    },
    {
      title: "4. Validate",
      desc: "Use the Comparison Matrix and AI Summary to validate the math before staking.",
    },
  ];

  return (
    <div className="mt-4 space-y-0 relative">
      {/* Subtle connecting line */}
      <div
        className={cn(
          "absolute left-[15px] top-4 bottom-6 w-[2px]",
          darkMode ? "bg-white/10" : "bg-gray-200"
        )}
      />

      {steps.map((step, idx) => (
        <div key={idx} className="relative z-10 flex gap-4 items-start pb-4">
          <div
            className={cn(
              "h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black shadow-sm ring-4",
              darkMode
                ? "bg-gray-900 ring-[#0f172a] text-blue-400"
                : "bg-white ring-white text-blue-600 border border-gray-200"
            )}
          >
            {idx + 1}
          </div>
          <div className="pt-1.5">
            <div
              className={cn(
                "text-[11px] font-bold uppercase tracking-wider mb-0.5",
                darkMode ? "text-gray-300" : "text-gray-800"
              )}
            >
              {step.title}
            </div>
            <div
              className={cn(
                "text-xs leading-relaxed font-medium",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              {step.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeamCompare({ darkMode = false }) {
  const [countryA, setCountryA] = useState("");
  const [leagueA, setLeagueA] = useState("");
  const [teamA, setTeamA] = useState("");

  const [countryB, setCountryB] = useState("");
  const [leagueB, setLeagueB] = useState("");
  const [teamB, setTeamB] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const {
    data: matchesData = [],
    isLoading: matchesLoading,
    error: matchesError,
  } = useQuery({
    queryKey: ["compare-matches", "all"],
    queryFn: fetchMatches,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const safeMatchesData = Array.isArray(matchesData) ? matchesData : [];

  // 1. Fetch the master list of all teams from the table source
  const { data: allTableRows = [] } = useQuery({
    queryKey: ["compare-league-table", "all"],
    queryFn: () => fetchLeagueTable(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // 2. Build the Search List using Tables as the primary source
  const allTeamsList = useMemo(() => {
    const map = new Map();

    // Add all teams from the league tables
    const safeRows = Array.isArray(allTableRows) ? allTableRows : [];
    safeRows.forEach((r) => {
      const t = String(r?.team || "").trim();
      const c = String(r?.country || "").trim();
      const l = String(r?.league || "").trim();
      if (t && !map.has(t)) {
        map.set(t, { team: t, country: c, league: l });
      }
    });

    // Fallback: Add teams from today's picks just in case they are missing from the table
    safeMatchesData.forEach((m) => {
      const c = String(m?.country || "").trim();
      const l = String(m?.league || "").trim();
      const teams = parseTeamsFromMatch(m?.match);
      teams.forEach((t) => {
        if (t && !map.has(t)) {
          map.set(t, { team: t, country: c, league: l });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.team.localeCompare(b.team)
    );
  }, [allTableRows, safeMatchesData]);

  const { data: tableA = [], isLoading: tableLoadingA } = useQuery({
    queryKey: ["compare-league-table", countryA, leagueA],
    queryFn: () => fetchLeagueTable(countryA, leagueA),
    enabled: Boolean(countryA && leagueA),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: tableB = [], isLoading: tableLoadingB } = useQuery({
    queryKey: ["compare-league-table", countryB, leagueB],
    queryFn: () => fetchLeagueTable(countryB, leagueB),
    enabled: Boolean(countryB && leagueB),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const safeTableA = Array.isArray(tableA) ? tableA : [];
  const safeTableB = Array.isArray(tableB) ? tableB : [];

  const matchDataA = useMemo(() => {
    if (!teamA || !countryA || !leagueA) return null;

    const teamMatches = safeMatchesData.filter((m) => {
      const sameLeague =
        String(m?.country || "").trim() === countryA &&
        String(m?.league || "").trim() === leagueA;
      if (!sameLeague) return false;
      return parseTeamsFromMatch(m?.match).includes(teamA);
    });

    if (!teamMatches.length) return null;

    return {
      home: teamMatches.filter(
        (m) => parseTeamsFromMatch(m?.match)[0] === teamA
      ),
      away: teamMatches.filter(
        (m) => parseTeamsFromMatch(m?.match)[1] === teamA
      ),
      all: teamMatches,
    };
  }, [safeMatchesData, teamA, countryA, leagueA]);

  const matchDataB = useMemo(() => {
    if (!teamB || !countryB || !leagueB) return null;

    const teamMatches = safeMatchesData.filter((m) => {
      const sameLeague =
        String(m?.country || "").trim() === countryB &&
        String(m?.league || "").trim() === leagueB;
      if (!sameLeague) return false;
      return parseTeamsFromMatch(m?.match).includes(teamB);
    });

    if (!teamMatches.length) return null;

    return {
      home: teamMatches.filter(
        (m) => parseTeamsFromMatch(m?.match)[0] === teamB
      ),
      away: teamMatches.filter(
        (m) => parseTeamsFromMatch(m?.match)[1] === teamB
      ),
      all: teamMatches,
    };
  }, [safeMatchesData, teamB, countryB, leagueB]);

  const teamTableA = useMemo(() => {
    if (!teamA) return null;

    return (
      safeTableA.find(
        (row) => normalizeTeamName(row?.team) === normalizeTeamName(teamA)
      ) ||
      safeTableA.find((row) =>
        normalizeTeamName(row?.team).includes(normalizeTeamName(teamA))
      ) ||
      null
    );
  }, [safeTableA, teamA]);

  const teamTableB = useMemo(() => {
    if (!teamB) return null;

    return (
      safeTableB.find(
        (row) => normalizeTeamName(row?.team) === normalizeTeamName(teamB)
      ) ||
      safeTableB.find((row) =>
        normalizeTeamName(row?.team).includes(normalizeTeamName(teamB))
      ) ||
      null
    );
  }, [safeTableB, teamB]);

  const statsA = useMemo(
    () => buildStats(matchDataA, teamA, teamTableA, safeTableA),
    [matchDataA, teamA, teamTableA, safeTableA]
  );

  const statsB = useMemo(
    () => buildStats(matchDataB, teamB, teamTableB, safeTableB),
    [matchDataB, teamB, teamTableB, safeTableB]
  );

  const insight = useMemo(
    () =>
      buildMatchupInsight({
        statsA,
        statsB,
        teamA,
        teamB,
        countryA,
        leagueA,
        countryB,
        leagueB,
      }),
    [statsA, statsB, teamA, teamB, countryA, leagueA, countryB, leagueB]
  );

  const leagueWindowA = useMemo(
    () => getLeagueWindowRows(safeTableA, teamA),
    [safeTableA, teamA]
  );

  const leagueWindowB = useMemo(
    () => getLeagueWindowRows(safeTableB, teamB),
    [safeTableB, teamB]
  );

  const comparisonRows = useMemo(() => {
    if (!statsA || !statsB) return [];

    return [
      {
        label: "League Position",
        a: statsA.position || "—",
        b: statsB.position || "—",
        higherIsBetter: false,
      },
      { label: "Points", a: statsA.pts, b: statsB.pts, higherIsBetter: true },
      {
        label: "Points Per Game",
        a: statsA.ppg,
        b: statsB.ppg,
        higherIsBetter: true,
        decimals: 2,
      },
      {
        label: "Win Rate",
        a: statsA.winRate,
        b: statsB.winRate,
        higherIsBetter: true,
        suffix: "%",
        decimals: 1,
      },
      {
        label: "Model PPG",
        a: statsA.modelPPG,
        b: statsB.modelPPG,
        higherIsBetter: true,
        decimals: 2,
      },
      {
        label: "Goals Scored",
        a: statsA.gs,
        b: statsB.gs,
        higherIsBetter: true,
      },
      {
        label: "Goals Conceded",
        a: statsA.gc,
        b: statsB.gc,
        higherIsBetter: false,
      },
      {
        label: "Model Goals For",
        a: statsA.modelGoalsFor,
        b: statsB.modelGoalsFor,
        higherIsBetter: true,
        decimals: 2,
      },
      {
        label: "Model Goals Against",
        a: statsA.modelGoalsAgainst,
        b: statsB.modelGoalsAgainst,
        higherIsBetter: false,
        decimals: 2,
      },
      {
        label: "Avg xG Environment",
        a: statsA.avgExpectedGoals,
        b: statsB.avgExpectedGoals,
        higherIsBetter: true,
        decimals: 2,
      },
      {
        label: "Avg Prediction Confidence",
        a: statsA.avgChance,
        b: statsB.avgChance,
        higherIsBetter: true,
        suffix: "%",
      },
      {
        label: "Avg Rating",
        a: statsA.avgRating,
        b: statsB.avgRating,
        higherIsBetter: true,
        suffix: "%",
      },
      {
        label: "Team-backed Win %",
        a: statsA.teamWinMarketProb,
        b: statsB.teamWinMarketProb,
        higherIsBetter: true,
        suffix: "%",
        decimals: 1,
      },
      {
        label: "Model Draw %",
        a: statsA.teamDrawModel,
        b: statsB.teamDrawModel,
        higherIsBetter: false,
        suffix: "%",
        decimals: 1,
      },
      {
        label: "Model Loss %",
        a: statsA.teamLossModel,
        b: statsB.teamLossModel,
        higherIsBetter: false,
        suffix: "%",
        decimals: 1,
      },
      {
        label: "Avg Team Odds",
        a: statsA.avgTeamOdds,
        b: statsB.avgTeamOdds,
        higherIsBetter: false,
        decimals: 2,
      },
      {
        label: "Model vs Odds Edge",
        a: statsA.marketEdge,
        b: statsB.marketEdge,
        higherIsBetter: true,
        decimals: 1,
        signed: true,
        suffix: " pts",
      },
      {
        label: "BTTS %",
        a: statsA.bttsPercent,
        b: statsB.bttsPercent,
        higherIsBetter: true,
        suffix: "%",
      },
      {
        label: "Team BTTS Tendency",
        a: statsA.teamBttsModel,
        b: statsB.teamBttsModel,
        higherIsBetter: true,
        suffix: "%",
        decimals: 1,
      },
      {
        label: "Over 2.5 %",
        a: statsA.over25Percent,
        b: statsB.over25Percent,
        higherIsBetter: true,
        suffix: "%",
      },
      {
        label: "Under 2.5 %",
        a: statsA.under25Percent,
        b: statsB.under25Percent,
        higherIsBetter: true,
        suffix: "%",
      },
      {
        label: "Team Over 2 Tendency",
        a: statsA.teamOver2Model,
        b: statsB.teamOver2Model,
        higherIsBetter: true,
        suffix: "%",
        decimals: 1,
      },
      {
        label: "Clean Sheet %",
        a: statsA.csPercent,
        b: statsB.csPercent,
        higherIsBetter: true,
        suffix: "%",
      },
      {
        label: "Failed To Score %",
        a: statsA.ftsPercent,
        b: statsB.ftsPercent,
        higherIsBetter: false,
        suffix: "%",
      },
      {
        label: "Recent Form",
        a: statsA.form,
        b: statsB.form,
        textOnly: true,
      },
      {
        label: "Recent Pattern",
        a: statsA.recentRaw,
        b: statsB.recentRaw,
        isRecentMatches: true,
      },
      {
        label: "Form Points Avg",
        a: statsA.formPointsAvg,
        b: statsB.formPointsAvg,
        higherIsBetter: true,
        decimals: 1,
      },
      {
        label: "Attack Score",
        a: statsA.attackScore,
        b: statsB.attackScore,
        higherIsBetter: true,
        suffix: "/100",
      },
      {
        label: "Defense Score",
        a: statsA.defenseScore,
        b: statsB.defenseScore,
        higherIsBetter: true,
        suffix: "/100",
      },
      {
        label: "Control Score",
        a: statsA.controlScore,
        b: statsB.controlScore,
        higherIsBetter: true,
        suffix: "/100",
      },
      {
        label: "Momentum Score",
        a: statsA.momentumScore,
        b: statsB.momentumScore,
        higherIsBetter: true,
        suffix: "/100",
      },
      {
        label: "Market Trust Score",
        a: statsA.marketTrustScore,
        b: statsB.marketTrustScore,
        higherIsBetter: true,
        suffix: "/100",
      },
      {
        label: "Stability Score",
        a: statsA.stabilityScore,
        b: statsB.stabilityScore,
        higherIsBetter: true,
        suffix: "/100",
      },
      {
        label: "Scoreline Clarity",
        a: statsA.scorelineClarityScore,
        b: statsB.scorelineClarityScore,
        higherIsBetter: true,
        suffix: "/100",
      },
      {
        label: "Overall Model Score",
        a: statsA.overallScore,
        b: statsB.overallScore,
        higherIsBetter: true,
        suffix: "/100",
      },
      {
        label: "Top Guide",
        a: statsA.topGuides[0] || "—",
        b: statsB.topGuides[0] || "—",
        textOnly: true,
      },
      {
        label: "Top Tip",
        a: statsA.topTips[0] || "—",
        b: statsB.topTips[0] || "—",
        textOnly: true,
      },
      {
        label: "Top Scoreline",
        a: statsA.topCorrectScores[0] || "—",
        b: statsB.topCorrectScores[0] || "—",
        textOnly: true,
      },
      {
        label: "Primary AI Signal",
        a: statsA.intelligenceHighlights[0] || "—",
        b: statsB.intelligenceHighlights[0] || "—",
        textOnly: true,
      },
      {
        label: "Match Samples",
        a: `${statsA.homeSamples}H / ${statsA.awaySamples}A`,
        b: `${statsB.homeSamples}H / ${statsB.awaySamples}A`,
        textOnly: true,
      },
      {
        label: "Value Status",
        a: statsA.valueStatus,
        b: statsB.valueStatus,
        textOnly: true,
      },
    ];
  }, [statsA, statsB]);

  const handleCountryAChange = useCallback((val) => {
    setCountryA(val);
    setLeagueA("");
    setTeamA("");
  }, []);

  const handleLeagueAChange = useCallback((val) => {
    setLeagueA(val);
    setTeamA("");
  }, []);

  const handleCountryBChange = useCallback((val) => {
    setCountryB(val);
    setLeagueB("");
    setTeamB("");
  }, []);

  const handleLeagueBChange = useCallback((val) => {
    setLeagueB(val);
    setTeamB("");
  }, []);

  const compareAccessDenied =
    String(matchesError?.message || "") === "COMPARE_ACCESS_DENIED";

  const canCompare = Boolean(teamA && teamB && statsA && statsB && insight);

  if (matchesLoading) {
    return (
      <PremiumShell darkMode={darkMode}>
        <div className="space-y-4">
          <div
            className={cn(
              "rounded-3xl border p-6 sm:p-7",
              darkMode
                ? "border-white/10 bg-gradient-to-br from-white/10 via-white/[0.04] to-purple-500/[0.08]"
                : "border-white/80 bg-gradient-to-br from-white via-purple-50 to-amber-50/70"
            )}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em]",
                  darkMode
                    ? "bg-purple-500/20 text-purple-200"
                    : "bg-purple-100 text-purple-700"
                )}
              >
                <Sparkles size={12} />
                AI MATCHUP LAB
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em]",
                  darkMode
                    ? "bg-amber-400/20 text-amber-200"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                <Crown size={12} />
                PREMIUM LOADING
              </span>
            </div>

            <h2 className="text-2xl font-black sm:text-3xl">
              Loading Compare Workspace
            </h2>
            <p
              className={cn(
                "mt-3 max-w-2xl text-sm sm:text-base",
                darkMode ? "text-gray-300" : "text-gray-600"
              )}
            >
              Preparing premium comparison data, form signals, league context,
              and AI matchup intelligence...
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={cn(
                    "h-20 animate-pulse rounded-2xl border",
                    darkMode
                      ? "border-white/10 bg-white/5"
                      : "border-gray-200 bg-white/70"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </PremiumShell>
    );
  }

  if (compareAccessDenied) {
    return (
      <PremiumShell darkMode={darkMode}>
        <div className="space-y-4">
          <div
            className={cn(
              "rounded-3xl border p-6 sm:p-7",
              darkMode
                ? "border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-purple-500/10"
                : "border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-purple-50"
            )}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em]",
                  darkMode
                    ? "bg-amber-400/20 text-amber-200"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                <Lock size={12} />
                SILVER+ ACCESS
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em]",
                  darkMode
                    ? "bg-purple-400/20 text-purple-200"
                    : "bg-purple-100 text-purple-700"
                )}
              >
                <Sparkles size={12} />
                AI MATCHUP LAB
              </span>
            </div>

            <h2 className="text-2xl font-black sm:text-3xl">
              Team Compare is a premium intelligence feature
            </h2>

            <p
              className={cn(
                "mt-3 max-w-3xl text-sm sm:text-base",
                darkMode ? "text-gray-300" : "text-gray-600"
              )}
            >
              Unlock deep cross-league team analysis, AI verdicts, confidence
              scores, tactical explanations, market intelligence, and
              league-table context designed for sharper prediction decisions.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                "AI winner lean and confidence",
                "BTTS / Over-Under market intelligence",
                "League table context and pressure reading",
                "Advanced explainable matchup analysis",
              ].map((item) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-2xl border p-4 text-sm",
                    darkMode
                      ? "border-white/10 bg-white/5 text-gray-200"
                      : "border-white/80 bg-white/80 text-gray-700"
                  )}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <UpgradeButton
                plan="silver"
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm font-bold transition",
                  darkMode
                    ? "bg-slate-200 text-black hover:bg-white"
                    : "bg-slate-700 text-white hover:bg-slate-800"
                )}
              >
                Upgrade to Silver
              </UpgradeButton>
              <UpgradeButton
                plan="premium"
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm font-bold transition",
                  darkMode
                    ? "bg-amber-400 text-black hover:bg-amber-300"
                    : "bg-amber-500 text-white hover:bg-amber-600"
                )}
              >
                Upgrade to Premium
              </UpgradeButton>
            </div>
          </div>
        </div>
      </PremiumShell>
    );
  }

  if (matchesError && !compareAccessDenied) {
    return (
      <PremiumShell darkMode={darkMode}>
        <div
          className={cn(
            "rounded-3xl border p-5 sm:p-6",
            darkMode
              ? "border-rose-400/20 bg-rose-500/10"
              : "border-rose-200 bg-rose-50"
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-500" />
            <span className="font-bold">Unable to load Team Compare</span>
          </div>
          <p
            className={cn(
              "text-sm",
              darkMode ? "text-gray-300" : "text-gray-700"
            )}
          >
            Please refresh the page or try again shortly.
          </p>
        </div>
      </PremiumShell>
    );
  }

  return (
    <PremiumShell darkMode={darkMode}>
      <div className="space-y-4">
        {/* Hero */}
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border p-5 sm:p-6 lg:p-7",
            darkMode
              ? "border-white/10 bg-gradient-to-br from-white/10 via-white/[0.04] to-purple-500/[0.10]"
              : "border-white/80 bg-gradient-to-br from-white via-purple-50 to-amber-50/70 shadow-lg shadow-purple-100/40"
          )}
        >
          <div className="pointer-events-none absolute inset-0">
            <div
              className={cn(
                "absolute top-0 right-0 h-44 w-44 rounded-full blur-3xl",
                darkMode ? "bg-purple-500/10" : "bg-purple-200/70"
              )}
            />
            <div
              className={cn(
                "absolute bottom-0 left-0 h-36 w-36 rounded-full blur-3xl",
                darkMode ? "bg-amber-400/10" : "bg-amber-200/70"
              )}
            />
          </div>

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em]",
                    darkMode
                      ? "bg-purple-500/20 text-purple-200"
                      : "bg-purple-100 text-purple-700"
                  )}
                >
                  <Sparkles size={12} />
                  AI MATCHUP LAB
                </span>

                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em]",
                    darkMode
                      ? "bg-amber-400/20 text-amber-200"
                      : "bg-amber-100 text-amber-700"
                  )}
                >
                  <Crown size={12} />
                  SILVER+ ACCESS
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight sm:text-3xl xl:text-4xl">
                Compare Teams Like a Premium Analyst
              </h2>

              <p
                className={cn(
                  "mt-3 max-w-2xl text-sm leading-relaxed sm:text-base",
                  darkMode ? "text-gray-300" : "text-gray-600"
                )}
              >
                Run a polished cross-league comparison using table strength,
                form, scoring environment, model confidence, and explainable AI
                insight — all in one premium matchup workspace.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm",
                    darkMode
                      ? "border-white/10 bg-white/5 text-gray-200"
                      : "border-white/80 bg-white/80 text-gray-700"
                  )}
                >
                  <Shield size={14} className="text-emerald-500" />
                  {canCompare
                    ? "Comparison ready — premium verdicts unlocked below."
                    : "Pick Team A and Team B to unlock the premium verdict panel."}
                </div>

                <button
                  type="button"
                  onClick={() => setShowGuide((prev) => !prev)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm font-semibold transition",
                    darkMode
                      ? "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                      : "border-white/80 bg-white/80 text-gray-700 hover:bg-white"
                  )}
                >
                  <BookOpen size={14} />
                  {showGuide ? "Hide Guide" : "Open Guide"}
                </button>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:max-w-md">
              <HeaderStat
                darkMode={darkMode}
                icon={Crown}
                label="Access"
                value="Silver+ premium"
                tone="amber"
              />
              <HeaderStat
                darkMode={darkMode}
                icon={Target}
                label="Focus"
                value="Cross-league edge"
                tone="blue"
              />
              <HeaderStat
                darkMode={darkMode}
                icon={BarChart3}
                label="Coverage"
                value="Table • Form • Market • AI"
                tone="purple"
              />
              <HeaderStat
                darkMode={darkMode}
                icon={Shield}
                label="Status"
                value={canCompare ? "Ready to compare" : "Awaiting 2 teams"}
                tone="emerald"
              />
            </div>
          </div>
        </div>
        {showGuide && (
          <div
            className={cn(
              "rounded-3xl border p-4 sm:p-5",
              darkMode
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white shadow-sm"
            )}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em]",
                  darkMode
                    ? "bg-blue-500/15 text-blue-200"
                    : "bg-blue-100 text-blue-700"
                )}
              >
                <BookOpen size={12} />
                TEAM COMPARE GUIDE
              </span>

              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em]",
                  darkMode
                    ? "bg-amber-400/20 text-amber-200"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                <Crown size={12} />
                SILVER+ ACCESS
              </span>
            </div>

            <h3 className="text-base font-extrabold sm:text-lg">
              How to read the Team Compare workspace
            </h3>

            <p
              className={cn(
                "mt-2 max-w-3xl text-sm leading-relaxed",
                darkMode ? "text-gray-300" : "text-gray-600"
              )}
            >
              This workspace compares any two teams using normalized model
              logic. It is designed to help you judge structural strength,
              market safety, goal environment, and overall matchup risk before
              making a betting decision.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {TEAM_COMPARE_GUIDE_CARDS.map((item) => {
                const badgeClass =
                  item.tone === "amber"
                    ? darkMode
                      ? "bg-amber-500/15 border-amber-400/20 text-amber-200"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                    : item.tone === "emerald"
                    ? darkMode
                      ? "bg-emerald-500/15 border-emerald-400/20 text-emerald-200"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : item.tone === "purple"
                    ? darkMode
                      ? "bg-purple-500/15 border-purple-400/20 text-purple-200"
                      : "bg-purple-50 border-purple-200 text-purple-700"
                    : item.tone === "rose"
                    ? darkMode
                      ? "bg-rose-500/15 border-rose-400/20 text-rose-200"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                    : darkMode
                    ? "bg-blue-500/15 border-blue-400/20 text-blue-200"
                    : "bg-blue-50 border-blue-200 text-blue-700";

                return (
                  <div
                    key={item.title}
                    className={cn(
                      "rounded-2xl border p-4",
                      darkMode
                        ? "border-white/10 bg-white/5"
                        : "border-gray-200 bg-gray-50"
                    )}
                  >
                    <div
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.16em]",
                        badgeClass
                      )}
                    >
                      {item.title}
                    </div>

                    <p
                      className={cn(
                        "mt-3 text-xs leading-relaxed",
                        darkMode ? "text-gray-300" : "text-gray-600"
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div
                className={cn(
                  "rounded-2xl border p-4",
                  darkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-gray-50"
                )}
              >
                <div className="text-sm font-bold">Best workflow</div>
                <WorkflowStepper darkMode={darkMode} />
              </div>

              <ProTipCarousel darkMode={darkMode} />
            </div>
          </div>
        )}
        {/* Spotight Search Cards */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TeamSearchSpotlight
            darkMode={darkMode}
            title="Team A"
            tone="blue"
            selectedTeam={teamA}
            selectedCountry={countryA}
            selectedLeague={leagueA}
            allTeams={allTeamsList}
            onSelect={(t, c, l) => {
              setTeamA(t);
              setCountryA(c);
              setLeagueA(l);
            }}
            onClear={() => {
              setTeamA("");
              setCountryA("");
              setLeagueA("");
            }}
          />

          <TeamSearchSpotlight
            darkMode={darkMode}
            title="Team B"
            tone="purple"
            selectedTeam={teamB}
            selectedCountry={countryB}
            selectedLeague={leagueB}
            allTeams={allTeamsList}
            onSelect={(t, c, l) => {
              setTeamB(t);
              setCountryB(c);
              setLeagueB(l);
            }}
            onClear={() => {
              setTeamB("");
              setCountryB("");
              setLeagueB("");
            }}
          />
        </div>

        {canCompare ? (
          <>
            {/* Team strength & Radar Chart */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-4">
              <TeamProfileCard
                darkMode={darkMode}
                team={teamA}
                country={countryA}
                league={leagueA}
                stats={statsA}
                color="blue"
              />

              <MatchupRadarChart
                statsA={statsA}
                statsB={statsB}
                teamA={teamA}
                teamB={teamB}
                darkMode={darkMode}
              />

              <TeamProfileCard
                darkMode={darkMode}
                team={teamB}
                country={countryB}
                league={leagueB}
                stats={statsB}
                color="purple"
              />
            </div>

            {/* 🌟 BENTO BOX: AI VERDICT & PREMIUM EDGE 🌟 */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
              {/* 1. Primary Verdict Card (Spans 2 columns, 2 rows) */}
              <div
                className={cn(
                  "md:col-span-2 xl:col-span-2 row-span-2 rounded-[32px] border p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden",
                  darkMode
                    ? "bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]"
                    : "bg-gradient-to-br from-amber-50 via-purple-50/50 to-white border-amber-200 shadow-sm"
                )}
              >
                <div className="absolute -top-10 -right-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                  <Crown size={240} />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles size={16} className="text-amber-500" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500">
                      The Verdict
                    </span>
                  </div>

                  <div className="text-4xl sm:text-5xl font-black mb-3 tracking-tight">
                    {insight.strongerSide}
                  </div>

                  <div
                    className={cn(
                      "text-sm font-bold uppercase tracking-wider mb-6",
                      darkMode ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    {insight.mainEdge}
                  </div>
                </div>

                <div className="relative z-10 mt-8">
                  <p
                    className={cn(
                      "text-sm leading-relaxed mb-6 max-w-md font-medium",
                      darkMode ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    {insight.overview}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold",
                        darkMode
                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      )}
                    >
                      <Target size={14} />
                      Confidence: {insight.confidence}%
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold",
                        insight.riskLevel === "High"
                          ? darkMode
                            ? "bg-rose-500/20 text-rose-200 border border-rose-500/30"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                          : darkMode
                          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      )}
                    >
                      <Activity size={14} />
                      Risk: {insight.riskLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Value Edge Card (1 col, 1 row) */}
              <div
                className={cn(
                  "rounded-[32px] border p-6 flex flex-col justify-between transition-transform hover:-translate-y-1",
                  darkMode
                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                    : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                )}
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Percent size={14} className="text-emerald-500" />
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        darkMode ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      Value Signal
                    </span>
                  </div>
                  <div className="text-2xl font-black mb-1 text-emerald-500 tracking-tight">
                    {pickWinnerLabel(
                      teamA,
                      teamB,
                      statsA.marketEdge,
                      statsB.marketEdge,
                      1.5
                    )}
                  </div>
                </div>
                <p
                  className={cn(
                    "text-xs leading-relaxed mt-4 font-medium",
                    darkMode ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  {insight.bestValueSignal}
                </p>
              </div>

              {/* 3. Goals & Tempo (1 col, 1 row) */}
              <div
                className={cn(
                  "rounded-[32px] border p-6 flex flex-col justify-between transition-transform hover:-translate-y-1",
                  darkMode
                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                    : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                )}
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Flame size={14} className="text-blue-500" />
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        darkMode ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      Match Flow
                    </span>
                  </div>
                  <div className="text-xl font-black mb-1 tracking-tight">
                    {insight.goalsLean}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-bold",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}
                  >
                    {insight.bttsLean}
                  </div>
                </div>
                <div
                  className={cn(
                    "mt-4 pt-4 border-t",
                    darkMode ? "border-white/10" : "border-gray-100"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest block mb-1",
                      darkMode ? "text-gray-500" : "text-gray-400"
                    )}
                  >
                    Scoreline Zone
                  </span>
                  <span className="text-sm font-extrabold">
                    {insight.scorelineLean}
                  </span>
                </div>
              </div>

              {/* 4. Tactical Playbook (Spans 2 cols, 1 row) */}
              <div
                className={cn(
                  "md:col-span-2 xl:col-span-2 rounded-[32px] border p-6 transition-transform hover:-translate-y-1",
                  darkMode
                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                    : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Swords size={14} className="text-purple-500" />
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      darkMode ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    Tactical Edge
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm leading-relaxed mb-6 font-medium",
                    darkMode ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  {insight.tactical}
                </p>
                <div
                  className={cn(
                    "grid grid-cols-2 gap-4 mt-auto pt-4 border-t",
                    darkMode ? "border-white/10" : "border-gray-100"
                  )}
                >
                  <div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest block mb-1.5",
                        darkMode ? "text-gray-500" : "text-gray-400"
                      )}
                    >
                      Safer Angle
                    </span>
                    <span className="text-sm font-extrabold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                      {insight.saferAngle}
                    </span>
                  </div>
                  <div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest block mb-1.5",
                        darkMode ? "text-gray-500" : "text-gray-400"
                      )}
                    >
                      Aggressive Angle
                    </span>
                    <span className="text-sm font-extrabold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg">
                      {insight.aggressiveAngle}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Draw Risk & Volatility (1 col) */}
              <div
                className={cn(
                  "rounded-[32px] border p-6 flex flex-col justify-between transition-transform hover:-translate-y-1",
                  darkMode
                    ? "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15"
                    : "bg-rose-50 border-rose-200 shadow-sm hover:shadow-md"
                )}
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={14} className="text-rose-500" />
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        darkMode ? "text-rose-300" : "text-rose-700"
                      )}
                    >
                      Draw Risk
                    </span>
                  </div>
                  <div className="text-3xl font-black mb-1 text-rose-500 tracking-tight">
                    {insight.drawRiskScore}%
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-rose-500/20">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest block mb-1",
                      darkMode ? "text-rose-400/70" : "text-rose-700/70"
                    )}
                  >
                    Volatility
                  </span>
                  <span
                    className={cn(
                      "text-sm font-extrabold",
                      darkMode ? "text-rose-200" : "text-rose-900"
                    )}
                  >
                    {insight.volatility}
                  </span>
                </div>
              </div>

              {/* 6. Market & Form (1 col) */}
              <div
                className={cn(
                  "rounded-[32px] border p-6 flex flex-col justify-between transition-transform hover:-translate-y-1",
                  darkMode
                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                    : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                )}
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} className="text-blue-500" />
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        darkMode ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      Form Dynamics
                    </span>
                  </div>

                  <div className="space-y-4 mt-6">
                    <div>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest block mb-1",
                          darkMode ? "text-gray-500" : "text-gray-400"
                        )}
                      >
                        Trust Leader
                      </span>
                      <span className="text-sm font-extrabold">
                        {insight.trustLeader === "Balanced"
                          ? "Balanced"
                          : insight.trustLeader}
                      </span>
                    </div>
                    <div>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-widest block mb-1",
                          darkMode ? "text-gray-500" : "text-gray-400"
                        )}
                      >
                        Momentum
                      </span>
                      <span className="text-sm font-extrabold">
                        {pickWinnerLabel(
                          teamA,
                          teamB,
                          statsA.momentumScore,
                          statsB.momentumScore,
                          2
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. Market View Narrative (Spans 2 cols) */}
              <div
                className={cn(
                  "md:col-span-3 xl:col-span-2 rounded-[32px] border p-6 flex flex-col justify-center transition-transform hover:-translate-y-1",
                  darkMode
                    ? "bg-white/5 border-white/10"
                    : "bg-gray-50 border-gray-200 shadow-inner"
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={14} className="text-purple-500" />
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      darkMode ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    AI Market Translation
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm leading-relaxed font-medium italic",
                    darkMode ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  "{insight.marketView}"
                </p>
              </div>
            </div>
            {/* 🌟 END OF BENTO BOX 🌟 */}

            {/* League context */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div
                className={cn(
                  "rounded-3xl border p-4",
                  darkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white shadow-sm"
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold">
                      {teamA} league context
                    </h3>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        darkMode ? "text-gray-300" : "text-gray-600"
                      )}
                    >
                      {countryA} • {leagueA}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Pressure</div>
                    <div className="text-sm font-bold">
                      {statsA.pressureLabel}
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Position", value: statsA.position || "—" },
                    { label: "Leader gap", value: statsA.titleGap || 0 },
                    {
                      label: "Goal diff",
                      value: `${statsA.gd > 0 ? "+" : ""}${statsA.gd}`,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "rounded-2xl p-3",
                        darkMode ? "bg-white/5" : "bg-gray-50"
                      )}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        {item.label}
                      </div>
                      <div className="mt-1 text-lg font-bold">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr
                        className={cn(
                          "border-b",
                          darkMode ? "border-white/10" : "border-gray-200"
                        )}
                      >
                        <th className="py-2 text-left">#</th>
                        <th className="py-2 text-left">Team</th>
                        <th className="py-2 text-center">Pts</th>
                        <th className="py-2 text-center">GD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leagueWindowA.map((row) => {
                        const active =
                          normalizeTeamName(row?.team) ===
                            normalizeTeamName(teamA) ||
                          normalizeTeamName(row?.team).includes(
                            normalizeTeamName(teamA)
                          );

                        return (
                          <tr
                            key={`${row?.team}-${row?.sn}`}
                            className={cn(
                              "border-b",
                              darkMode ? "border-white/5" : "border-gray-100",
                              active &&
                                (darkMode ? "bg-blue-500/10" : "bg-blue-50")
                            )}
                          >
                            <td className="py-2">{row?.sn}</td>
                            <td className="py-2 font-medium">{row?.team}</td>
                            <td className="py-2 text-center">{row?.pts}</td>
                            <td className="py-2 text-center">
                              {num(row?.gd) > 0 ? "+" : ""}
                              {row?.gd}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {tableLoadingA && (
                  <p
                    className={cn(
                      "mt-2 text-xs",
                      darkMode ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    Loading league table context...
                  </p>
                )}
              </div>

              <div
                className={cn(
                  "rounded-3xl border p-4",
                  darkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white shadow-sm"
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold">
                      {teamB} league context
                    </h3>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        darkMode ? "text-gray-300" : "text-gray-600"
                      )}
                    >
                      {countryB} • {leagueB}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Pressure</div>
                    <div className="text-sm font-bold">
                      {statsB.pressureLabel}
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Position", value: statsB.position || "—" },
                    { label: "Leader gap", value: statsB.titleGap || 0 },
                    {
                      label: "Goal diff",
                      value: `${statsB.gd > 0 ? "+" : ""}${statsB.gd}`,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "rounded-2xl p-3",
                        darkMode ? "bg-white/5" : "bg-gray-50"
                      )}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        {item.label}
                      </div>
                      <div className="mt-1 text-lg font-bold">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr
                        className={cn(
                          "border-b",
                          darkMode ? "border-white/10" : "border-gray-200"
                        )}
                      >
                        <th className="py-2 text-left">#</th>
                        <th className="py-2 text-left">Team</th>
                        <th className="py-2 text-center">Pts</th>
                        <th className="py-2 text-center">GD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leagueWindowB.map((row) => {
                        const active =
                          normalizeTeamName(row?.team) ===
                            normalizeTeamName(teamB) ||
                          normalizeTeamName(row?.team).includes(
                            normalizeTeamName(teamB)
                          );

                        return (
                          <tr
                            key={`${row?.team}-${row?.sn}`}
                            className={cn(
                              "border-b",
                              darkMode ? "border-white/5" : "border-gray-100",
                              active &&
                                (darkMode ? "bg-purple-500/10" : "bg-purple-50")
                            )}
                          >
                            <td className="py-2">{row?.sn}</td>
                            <td className="py-2 font-medium">{row?.team}</td>
                            <td className="py-2 text-center">{row?.pts}</td>
                            <td className="py-2 text-center">
                              {num(row?.gd) > 0 ? "+" : ""}
                              {row?.gd}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {tableLoadingB && (
                  <p
                    className={cn(
                      "mt-2 text-xs",
                      darkMode ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    Loading league table context...
                  </p>
                )}
              </div>
            </div>
            {/* Recommendation DNA */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {[
                {
                  team: teamA,
                  country: countryA,
                  league: leagueA,
                  stats: statsA,
                  tone: "blue",
                },
                {
                  team: teamB,
                  country: countryB,
                  league: leagueB,
                  stats: statsB,
                  tone: "purple",
                },
              ].map((entry) => (
                <div
                  key={`${entry.team}-${entry.tone}`}
                  className={cn(
                    "rounded-3xl border p-4 sm:p-5",
                    darkMode
                      ? "border-white/10 bg-white/5"
                      : "border-gray-200 bg-white shadow-sm"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold sm:text-base">
                        {entry.team} recommendation DNA
                      </h3>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          darkMode ? "text-gray-300" : "text-gray-600"
                        )}
                      >
                        {entry.country} • {entry.league}
                      </p>
                    </div>

                    <TonePill darkMode={darkMode} tone={entry.tone}>
                      {entry.stats.topRecommendation}
                    </TonePill>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div
                      className={cn(
                        "rounded-2xl border p-3",
                        darkMode
                          ? "border-white/10 bg-white/5"
                          : "border-gray-200 bg-gray-50"
                      )}
                    >
                      <div className="space-y-3">
                        <TagRow
                          darkMode={darkMode}
                          title="Top guides"
                          items={entry.stats.topGuides}
                          tone={entry.tone}
                        />
                        <TagRow
                          darkMode={darkMode}
                          title="Top tips"
                          items={entry.stats.topTips}
                          tone="amber"
                        />
                        <TagRow
                          darkMode={darkMode}
                          title="Flags"
                          items={entry.stats.topFlags}
                          tone="rose"
                        />
                      </div>
                    </div>

                    <div
                      className={cn(
                        "rounded-2xl border p-3",
                        darkMode
                          ? "border-white/10 bg-white/5"
                          : "border-gray-200 bg-gray-50"
                      )}
                    >
                      <div className="space-y-3">
                        <TagRow
                          darkMode={darkMode}
                          title="Scorelines"
                          items={entry.stats.topCorrectScores}
                          tone="purple"
                        />
                        <TagRow
                          darkMode={darkMode}
                          title="Validation"
                          items={entry.stats.validationTags}
                          tone="emerald"
                        />
                        <TagRow
                          darkMode={darkMode}
                          title="AI highlights"
                          items={entry.stats.intelligenceHighlights}
                          tone="emerald"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        label: "Samples",
                        value: entry.stats.matchesAnalyzed,
                      },
                      {
                        label: "Home/Away",
                        value: `${entry.stats.homeSamples}/${entry.stats.awaySamples}`,
                      },
                      {
                        label: "Avg Odds",
                        value:
                          entry.stats.avgTeamOdds > 0
                            ? entry.stats.avgTeamOdds.toFixed(2)
                            : "—",
                      },
                      {
                        label: "AI Cover",
                        value: `${entry.stats.intelligenceCoverage}%`,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={cn(
                          "rounded-2xl p-3",
                          darkMode ? "bg-white/5" : "bg-gray-50"
                        )}
                      >
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          {item.label}
                        </div>
                        <div className="mt-1 text-lg font-bold">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Explainable AI */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div
                className={cn(
                  "rounded-3xl border p-4",
                  darkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white shadow-sm"
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <h3 className="text-sm font-extrabold">
                    Why the model leans this way
                  </h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
                    {insight.overview}
                  </p>
                  <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
                    {insight.tactical}
                  </p>
                  <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
                    {insight.leagueNarrative}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-3xl border p-4",
                  darkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white shadow-sm"
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 size={16} className="text-purple-500" />
                  <h3 className="text-sm font-extrabold">
                    Market alignment & key edges
                  </h3>
                </div>

                <div
                  className={cn(
                    "mb-3 rounded-2xl border p-3",
                    darkMode
                      ? "border-white/10 bg-white/5"
                      : "border-gray-200 bg-gray-50"
                  )}
                >
                  <p
                    className={
                      darkMode
                        ? "text-sm text-gray-300"
                        : "text-sm text-gray-700"
                    }
                  >
                    {insight.marketView}
                  </p>
                </div>

                <ul className="space-y-2 text-sm">
                  {insight.keyEdges.map((item) => (
                    <li
                      key={item}
                      className={cn(
                        "rounded-2xl border p-3",
                        darkMode
                          ? "border-white/10 bg-white/5 text-gray-300"
                          : "border-gray-200 bg-white text-gray-700"
                      )}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Deep Comparison Matrix */}
            <div
              className={cn(
                "rounded-3xl border p-4 sm:p-5",
                darkMode
                  ? "border-white/10 bg-gradient-to-br from-white/5 to-white/[0.03]"
                  : "border-gray-200 bg-white shadow-sm"
              )}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold sm:text-base">
                    Deep Comparison Matrix
                  </h3>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      darkMode ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    Premium side-by-side structure, efficiency, scoring, and
                    model-grade comparison.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 font-bold",
                      darkMode
                        ? "border-blue-400/20 bg-blue-500/10 text-blue-200"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    )}
                  >
                    {teamA}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 font-bold",
                      darkMode
                        ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                        : "border-purple-200 bg-purple-50 text-purple-700"
                    )}
                  >
                    {teamB}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-xs sm:text-sm">
                  <thead>
                    <tr
                      className={cn(
                        "border-b",
                        darkMode ? "border-white/10" : "border-gray-200"
                      )}
                    >
                      <th className="px-3 py-3 text-left font-semibold">
                        Metric
                      </th>
                      <th className="px-3 py-3 text-center font-semibold">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1",
                            darkMode
                              ? "bg-blue-500/10 text-blue-200"
                              : "bg-blue-50 text-blue-700"
                          )}
                        >
                          {teamA}
                        </span>
                      </th>
                      <th className="w-12 px-3 py-3 text-center font-semibold"></th>
                      <th className="px-3 py-3 text-center font-semibold">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1",
                            darkMode
                              ? "bg-purple-500/10 text-purple-200"
                              : "bg-purple-50 text-purple-700"
                          )}
                        >
                          {teamB}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, idx) => {
                      const toneClass =
                        row.tone === "good"
                          ? "text-emerald-500"
                          : row.tone === "warn"
                          ? "text-yellow-500"
                          : row.tone === "bad"
                          ? "text-rose-500"
                          : "";

                      const formatValue = (value) => {
                        if (row.textOnly) return value || "N/A";

                        const n = Number(value);
                        if (Number.isNaN(n)) return value || "—";

                        let formatted =
                          typeof row.decimals === "number"
                            ? n.toFixed(row.decimals)
                            : `${n}`;

                        if (row.signed) {
                          formatted = `${n > 0 ? "+" : ""}${formatted}`;
                        }

                        return `${formatted}${row.suffix || ""}`;
                      };

                      return (
                        <tr
                          key={row.label}
                          className={cn(
                            "border-b last:border-b-0",
                            darkMode ? "border-white/10" : "border-gray-100",
                            idx % 2 === 0 &&
                              (darkMode ? "bg-white/[0.02]" : "bg-gray-50/50")
                          )}
                        >
                          <td className="px-3 py-3">{row.label}</td>
                          <td
                            className={cn(
                              "px-3 py-3 text-center font-semibold",
                              toneClass
                            )}
                          >
                            {row.isRecentMatches ? (
                              <RecentMatchesFormatter
                                matchesString={row.a}
                                targetTeam={teamA}
                                darkMode={darkMode}
                              />
                            ) : (
                              formatValue(row.a)
                            )}
                          </td>
                          <td className="px-3 py-3 text-center align-middle">
                            {row.textOnly || row.isRecentMatches ? null : (
                              <CompareIndicator
                                valueA={row.a}
                                valueB={row.b}
                                higherIsBetter={row.higherIsBetter}
                              />
                            )}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-3 text-center font-semibold",
                              toneClass
                            )}
                          >
                            {row.isRecentMatches ? (
                              <RecentMatchesFormatter
                                matchesString={row.b}
                                targetTeam={teamB}
                                darkMode={darkMode}
                              />
                            ) : (
                              formatValue(row.b)
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Premium summary */}
            <div
              className={cn(
                "rounded-3xl border p-4 sm:p-5",
                darkMode
                  ? "border-white/10 bg-gradient-to-br from-white/5 to-white/[0.03]"
                  : "border-gray-200 bg-white shadow-sm"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <h3 className="text-sm font-extrabold">AI Match Summary</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div
                  className={cn(
                    "rounded-2xl border p-4",
                    darkMode
                      ? "border-white/10 bg-white/5"
                      : "border-gray-200 bg-gray-50"
                  )}
                >
                  <div className="mb-2 font-bold">Narrative overview</div>
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      darkMode ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    {teamA} from {countryA} {leagueA} is being compared with{" "}
                    {teamB} from {countryB} {leagueB}. The model currently leans
                    toward{" "}
                    <span className="font-bold">{insight.strongerSide}</span>{" "}
                    with{" "}
                    <span className="font-bold">
                      {insight.confidence}% confidence
                    </span>
                    . {insight.marketView}
                  </p>
                </div>

                <div
                  className={cn(
                    "rounded-2xl border p-4",
                    darkMode
                      ? "border-white/10 bg-white/5"
                      : "border-gray-200 bg-gray-50"
                  )}
                >
                  <div className="mb-2 font-bold">Risk report</div>
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      darkMode ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    {insight.riskView} The cleaner defensive profile belongs to{" "}
                    <span className="font-bold">
                      {statsA.defenseScore === statsB.defenseScore
                        ? "neither side clearly"
                        : statsA.defenseScore > statsB.defenseScore
                        ? teamA
                        : teamB}
                    </span>
                    , while the stronger control profile belongs to{" "}
                    <span className="font-bold">
                      {statsA.controlScore === statsB.controlScore
                        ? "neither side clearly"
                        : statsA.controlScore > statsB.controlScore
                        ? teamA
                        : teamB}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div
            className={cn(
              "rounded-3xl border p-8 text-center sm:p-10",
              darkMode
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white shadow-sm"
            )}
          >
            <div
              className={cn(
                "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              <Search
                size={28}
                className={cn(darkMode ? "text-gray-400" : "text-gray-400")}
              />
            </div>

            <h3 className="text-base font-extrabold sm:text-lg">
              Premium comparison is ready when both teams are selected
            </h3>

            <p
              className={cn(
                "mx-auto mt-2 max-w-xl text-sm",
                darkMode ? "text-gray-300" : "text-gray-600"
              )}
            >
              Select Team A and Team B to unlock AI verdicts, league context,
              advanced market reads, and the full deep comparison matrix.
            </p>

            <div className="mx-auto mt-5 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                "Cross-league strength read",
                "Explainable AI matchup verdict",
                "Premium side-by-side comparison table",
              ].map((item) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-2xl border p-3 text-sm",
                    darkMode
                      ? "border-white/10 bg-white/5 text-gray-200"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PremiumShell>
  );
}