// @ts-nocheck
// src/utils/intelligenceEngine.js

/* =========================================================
   QUANTITATIVE ALGORITHM WEIGHTS & CONSTANTS
========================================================= */
const ALGO_WEIGHTS = {
  STRUCTURAL: {
    ATTACK: 0.3,
    PPG: 0.24,
    FORM: 0.16,
    CLEAN_SHEET: 0.1,
    RELIABILITY: 0.1,
    DEF_BUFFER: 0.1,
    DEF_PENALTY: 0.14,
  },
  STABILITY: {
    DISPERSION: 0.45,
    BTTS_CLARITY: 0.15,
    TOTALS_CLARITY: 0.2,
    SCORING_RELIABILITY: 0.1,
    DEFENSIVE_REPEATABILITY: 0.1,
  },
  KELLY_FRACTION: 0.25, // Fractional Kelly divisor (Conservative)
  MAX_STAKE_CAP: 0.05, // 5% max bankroll risk per trade
};

/* =========================================================
   UTILITY
========================================================= */

const safe = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));

const finite = (v) => Number.isFinite(Number(v));

const mean = (values, fallback = 0) => {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : fallback;
};

const pct = (v, d = 0) => clamp(safe(v, d), 0, 100);

const fmt = (v, decimals = 2) => safe(v).toFixed(decimals);

function normalizeGuide(value = "") {
  if (value && typeof value === "object") {
    const market = String(value.market || "")
      .toUpperCase()
      .trim();
    const option = String(value.option || value.selection || "")
      .toUpperCase()
      .trim();

    if (market === "1X2") {
      if (option === "HOME" || option === "1") return "HOME WIN";
      if (option === "DRAW" || option === "X") return "DRAW";
      if (option === "AWAY" || option === "2") return "AWAY WIN";
    }

    if (market === "BTTS") {
      if (option === "YES" || option === "GG") return "GG";
      if (option === "NO" || option === "NG") return "NG";
    }

    if (market === "OVER 2.5" || market === "OVER2.5") {
      if (option === "YES" || option === "OVER" || option === "OVER 2.5")
        return "OV.2.5";
    }

    if (market === "UNDER 2.5" || market === "UNDER2.5") {
      if (option === "YES" || option === "UNDER" || option === "UNDER 2.5")
        return "UN2.5";
    }

    if (value.label) return normalizeGuide(value.label);
  }

  const raw = String(value).toUpperCase().trim();
  const compact = raw.replace(/[^A-Z0-9]+/g, "");

  if (!compact) return "";

  if (
    compact === "1" ||
    compact === "HOME" ||
    compact === "1X2HOME" ||
    compact.includes("HOMEWIN")
  )
    return "HOME WIN";
  if (compact === "X" || compact === "DRAW" || compact === "1X2DRAW")
    return "DRAW";
  if (
    compact === "2" ||
    compact === "AWAY" ||
    compact === "1X2AWAY" ||
    compact.includes("AWAYWIN")
  )
    return "AWAY WIN";
  if (
    compact === "NG" ||
    compact === "BTTSNO" ||
    compact.includes("BOTHTEAMSNOTTOSCORE")
  )
    return "NG";
  if (
    compact === "GG" ||
    compact === "BTTSYES" ||
    compact === "BTTS" ||
    compact.includes("BOTHTEAMSTOSCORE")
  )
    return "GG";
  if (
    compact === "OV25" ||
    compact === "OVER25" ||
    compact === "O25" ||
    compact.includes("OV25") ||
    compact.includes("OVER25")
  )
    return "OV.2.5";
  if (
    compact === "UN25" ||
    compact === "UNDER25" ||
    compact === "U25" ||
    compact.includes("UN25") ||
    compact.includes("UNDER25")
  )
    return "UN2.5";

  return raw;
}

function getGuideMeta(match, guideInput = "") {
  const guide = normalizeGuide(guideInput || match.pick || match.GUIDE || "");

  switch (guide) {
    case "HOME WIN":
      return {
        market: "1X2",
        selection: "Home Win",
        marketLabel: "1X2",
        marketAngle: "Home side to win",
      };
    case "AWAY WIN":
      return {
        market: "1X2",
        selection: "Away Win",
        marketLabel: "1X2",
        marketAngle: "Away side to win",
      };
    case "DRAW":
      return {
        market: "1X2",
        selection: "Draw",
        marketLabel: "1X2",
        marketAngle: "Draw outcome",
      };
    case "GG":
      return {
        market: "BTTS",
        selection: "Both Teams To Score",
        marketLabel: "BTTS",
        marketAngle: "Both Teams To Score",
      };
    case "NG":
      return {
        market: "BTTS",
        selection: "Both Teams NOT To Score",
        marketLabel: "BTTS",
        marketAngle: "Both Teams Not To Score",
      };
    case "OV.2.5":
      return {
        market: "Goals",
        selection: "Over 2.5 Goals",
        marketLabel: "Totals",
        marketAngle: "Over 2.5 Goals",
      };
    case "UN2.5":
      return {
        market: "Goals",
        selection: "Under 2.5 Goals",
        marketLabel: "Totals",
        marketAngle: "Under 2.5 Goals",
      };
    default:
      return {
        market: "Unknown",
        selection: "Projected Outcome",
        marketLabel: "Primary Market",
        marketAngle: "Projected Outcome",
      };
  }
}

function firstValidOdds(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 1) return n;
  }
  return 0;
}

function resolveOddsForGuide(match, guideInput = "") {
  const guide = normalizeGuide(guideInput || match.pick || match.GUIDE || "");
  switch (guide) {
    case "HOME WIN":
      return firstValidOdds(
        match.homeOdds,
        match.oddsHome,
        match.homeWinOdds,
        match.odds
      );
    case "DRAW":
      return firstValidOdds(
        match.drawOdds,
        match.oddsDraw,
        match.drawWinOdds,
        match.odds
      );
    case "AWAY WIN":
      return firstValidOdds(
        match.awayOdds,
        match.oddsAway,
        match.awayWinOdds,
        match.odds
      );
    case "GG":
      return firstValidOdds(
        match.bttsYesOdds,
        match.ggOdds,
        match.oddsGG,
        match.odds
      );
    case "NG":
      return firstValidOdds(
        match.bttsNoOdds,
        match.ngOdds,
        match.oddsNG,
        match.odds
      );
    case "OV.2.5":
      return firstValidOdds(
        match.o25Odds,
        match.over25Odds,
        match.ov25Odds,
        match.odds
      );
    case "UN2.5":
      return firstValidOdds(
        match.u25Odds,
        match.under25Odds,
        match.un25Odds,
        match.odds
      );
    default:
      return firstValidOdds(match.odds);
  }
}

function resolveGuideProbability(match, guide, structural, totalAvg) {
  const normalized = normalizeGuide(guide);
  const directMap = {
    "HOME WIN": safe(match.homeWin ?? match.hw ?? match.H),
    DRAW: safe(match.draw ?? match.X),
    "AWAY WIN": safe(match.awayWin ?? match.aw ?? match.A),
    GG: safe(match.gg ?? match.bttsYes),
    NG: safe(match.ng ?? match.bttsNo),
    "OV.2.5": safe(match.ov25 ?? match.over25 ?? match.o25),
    "UN2.5": safe(match.un25 ?? match.under25 ?? match.u25),
  };

  const direct = directMap[normalized];
  if (direct > 0) return clamp(direct, 0, 100);

  const homePPG = safe(match.hppg ?? match.homePPG);
  const awayPPG = safe(match.appg ?? match.awayPPG);
  const formEdge = safe(match.hPts) - safe(match.aPts);
  const drawBase = mean(
    [match.draw, match.hDraw, match.aDraw, match.H2H_D],
    totalAvg < 2.35 ? 29 : 25
  );
  const bttsBase = mean([match.gg, match.hBtts, match.aBtts, match.H2H_GG], 50);
  const overBase = mean(
    [match.ov25, match.hOv2, match.aOv2, match.H2H_OV],
    totalAvg >= 2.6 ? 58 : 46
  );
  const underBase = mean([match.un25, match.H2H_UN], 100 - overBase);

  const homeEstimate = clamp(
    50 +
      structural.composite * 16 +
      (homePPG - awayPPG) * 10 +
      formEdge * 1.5 -
      drawBase * 0.25,
    10,
    85
  );
  const awayEstimate = clamp(
    50 -
      structural.composite * 16 +
      (awayPPG - homePPG) * 10 -
      formEdge * 1.5 -
      drawBase * 0.25,
    10,
    85
  );
  const drawEstimate = clamp(drawBase, 14, 42);
  const avgCleanSheets = mean([match.hcs, match.acs], 20);
  const ggEstimate = clamp(
    bttsBase + (totalAvg - 2.4) * 8 - avgCleanSheets * 0.08,
    10,
    90
  );
  const ngEstimate = clamp(100 - ggEstimate, 10, 90);
  const overEstimate = clamp(overBase + (totalAvg - 2.5) * 14, 10, 90);
  const underEstimate = clamp(mean([underBase, 100 - overEstimate]), 10, 90);

  switch (normalized) {
    case "HOME WIN":
      return Math.round(homeEstimate);
    case "DRAW":
      return Math.round(drawEstimate);
    case "AWAY WIN":
      return Math.round(awayEstimate);
    case "GG":
      return Math.round(ggEstimate);
    case "NG":
      return Math.round(ngEstimate);
    case "OV.2.5":
      return Math.round(overEstimate);
    case "UN2.5":
      return Math.round(underEstimate);
    default:
      return 0;
  }
}

/* =========================================================
   LAYER 1 — RAW METRICS
========================================================= */

function computeGoalEnvironment(totalAvg) {
  if (totalAvg >= 2.85) return "Elevated Scoring Environment";
  if (totalAvg <= 2.15) return "Suppressed Scoring Environment";
  return "Neutral Scoring Environment";
}

function computeStructuralMetrics(match) {
  const hgs = safe(match.hgs);
  const hgc = safe(match.hgc);
  const ags = safe(match.ags);
  const agc = safe(match.agc);
  const homePPG = safe(match.hppg ?? match.homePPG);
  const awayPPG = safe(match.appg ?? match.awayPPG);
  const hPts = safe(match.hPts);
  const aPts = safe(match.aPts);
  const hcs = pct(match.hcs);
  const acs = pct(match.acs);
  const hfts = pct(match.hfts ?? match.hFailedToScore);
  const afts = pct(match.afts ?? match.aFailedToScore);

  const attackEdge = hgs - agc;
  const defensiveEdge = ags - hgc;
  const ppgEdge = homePPG - awayPPG;
  const formEdge = (hPts - aPts) / 10;
  const cleanSheetEdge = (hcs - acs) / 100;
  const reliabilityEdge = (afts - hfts) / 100;
  const defensiveBuffer = agc - hgc;

  const w = ALGO_WEIGHTS.STRUCTURAL;
  const composite =
    attackEdge * w.ATTACK +
    ppgEdge * w.PPG +
    formEdge * w.FORM +
    cleanSheetEdge * w.CLEAN_SHEET +
    reliabilityEdge * w.RELIABILITY +
    defensiveBuffer * w.DEF_BUFFER -
    defensiveEdge * w.DEF_PENALTY;

  return {
    attackEdge,
    defensiveEdge,
    ppgEdge,
    composite,
    formEdge,
    cleanSheetEdge,
    reliabilityEdge,
  };
}

function computeStability(match) {
  const values = [
    safe(match.hgs),
    safe(match.hgc),
    safe(match.ags),
    safe(match.agc),
  ];
  const meanValue = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + Math.pow(b - meanValue, 2), 0) / values.length;

  const dispersionScore = 1 / (1 + variance);
  const bttsClarity = Math.abs(mean([match.hBtts, match.aBtts], 50) - 50) / 50;
  const totalsClarity =
    Math.abs(mean([match.ov25, match.hOv2, match.aOv2], 50) - 50) / 50;
  const scoringReliability =
    1 -
    mean(
      [match.hfts ?? match.hFailedToScore, match.afts ?? match.aFailedToScore],
      30
    ) /
      100;
  const defensiveRepeatability = mean([match.hcs, match.acs], 20) / 100;

  const w = ALGO_WEIGHTS.STABILITY;
  const stability =
    dispersionScore * w.DISPERSION +
    bttsClarity * w.BTTS_CLARITY +
    totalsClarity * w.TOTALS_CLARITY +
    scoringReliability * w.SCORING_RELIABILITY +
    defensiveRepeatability * w.DEFENSIVE_REPEATABILITY;

  return clamp(stability, 0, 1);
}

function computeSurplus(modelProb, marketOdds) {
  if (!marketOdds || marketOdds <= 1) {
    return {
      probability: Math.round(modelProb * 10) / 10,
      impliedProbability: 0,
      surplus: 0,
    };
  }
  const implied = 100 / marketOdds;
  const surplusRaw = modelProb - implied;
  return {
    probability: Math.round(modelProb * 10) / 10,
    impliedProbability: Math.round(implied * 10) / 10,
    surplus: Math.round(surplusRaw * 10) / 10,
  };
}

/* =========================================================
   MODEL TRUST ENGINE
========================================================= */

function computeModelTrust({
  probability,
  stability,
  structuralEdge,
  volatility,
  risk,
}) {
  let score = 46;
  score += clamp((probability - 50) * 0.9, -8, 18);
  score += clamp(structuralEdge * 28, -15, 18);
  score += stability * 18;

  if (volatility === "Stable Fixture") score += 5;
  else if (volatility === "Controlled Volatility") score += 1;
  else if (volatility === "High Variance Fixture") score -= 8;

  if (risk === "Low") score += 5;
  else if (risk === "Moderate") score += 0;
  else if (risk === "High") score -= 12;

  if (probability < 52 && structuralEdge < 0.15) score -= 6;
  return Math.round(clamp(score, 0, 100));
}

/* =========================================================
   LAYER 2 — CLASSIFICATION
========================================================= */

function classifyGoalEnvironment(totalAvg) {
  return computeGoalEnvironment(totalAvg);
}

function detectPrimaryEdge(match, totalAvg) {
  const homePPG = safe(match.hppg ?? match.homePPG);
  const awayPPG = safe(match.appg ?? match.awayPPG);
  const structural = computeStructuralMetrics(match);
  const overTrend = mean([match.ov25, match.hOv2, match.aOv2], 50);
  const bttsTrend = mean([match.hBtts, match.aBtts], 50);

  if (totalAvg >= 2.75 && overTrend >= 58 && bttsTrend >= 54)
    return "Goals Edge";
  if (structural.composite >= 0.28 && homePPG >= awayPPG + 0.2)
    return "Home Edge";
  if (structural.composite <= -0.28 && awayPPG >= homePPG + 0.2)
    return "Away Edge";
  return "Balanced";
}

function classifyConfidence(match, primaryEdge) {
  const rating = safe(match.rating);
  const formGap = Math.abs(safe(match.hPts) - safe(match.aPts));

  if (rating >= 78 && primaryEdge !== "Balanced") return "Elite";
  if (rating >= 62) return "High";
  if (rating >= 55 && primaryEdge !== "Balanced" && formGap >= 4) return "High";
  return "Medium";
}

function classifyRisk(match) {
  const hFailed =
    pct(match.hgsOver15 ?? 0) > 0
      ? pct(match.hFailedToScore ?? match.hfts)
      : pct(match.hFailedToScore ?? match.hfts);
  const aFailed = pct(match.aFailedToScore ?? match.afts);
  const hDraw = pct(match.hDraw);
  const aDraw = pct(match.aDraw);
  const h2hDraw = pct(match.H2H_D);
  const overTrend = mean([match.ov25, match.hOv2, match.aOv2], 50);

  if (
    hFailed <= 25 &&
    aFailed <= 25 &&
    hDraw < 28 &&
    aDraw < 28 &&
    overTrend >= 52
  )
    return "Low";
  if (
    hFailed >= 40 ||
    aFailed >= 40 ||
    h2hDraw >= 38 ||
    (hDraw >= 32 && aDraw >= 32)
  )
    return "High";
  return "Moderate";
}

function classifyVolatility(match) {
  const hgc = safe(match.hgc);
  const agc = safe(match.agc);
  const overTrend = mean([match.ov25, match.hOv2, match.aOv2], 50);
  const bttsTrend = mean([match.hBtts, match.aBtts], 50);
  const cleanSheets = mean([match.hcs, match.acs], 20);

  if ((hgc > 1.7 && agc > 1.7) || (overTrend >= 65 && bttsTrend >= 60))
    return "High Variance Fixture";
  if (hgc < 1.15 && agc < 1.15 && cleanSheets >= 30 && overTrend <= 48)
    return "Stable Fixture";
  return "Controlled Volatility";
}

/* ===== ELITE EDGE TIER SYSTEM ===== */

function classifyEdgeTier({ probability, stability, structuralEdge }) {
  if (probability >= 64 && stability >= 0.7 && structuralEdge > 0.38)
    return "ELITE";
  if (probability >= 56 && stability >= 0.6 && structuralEdge > 0.16)
    return "MEASURED";
  return "THIN";
}

/* =========================================================
   LAYER 3 — EXECUTIVE PREMIUM NARRATIVE
========================================================= */

const toneMap = {
  ELITE: {
    opener: "This fixture projects with clear structural superiority.",
    closer:
      "The quantified surplus and structural integrity support assertive but disciplined exposure.",
  },
  MEASURED: {
    opener: "This fixture presents a measurable structural lean.",
    closer:
      "The edge is visible but requires controlled positioning due to moderate variance exposure.",
  },
  THIN: {
    opener: "This fixture offers only a marginal structural advantage.",
    closer:
      "Market efficiency appears tight, and engagement should remain highly selective.",
  },
};

function buildNarratives(data) {
  const {
    probability,
    structural,
    stability,
    risk,
    volatility,
    goalEnvironment,
    edgeTier,
    tempoProfile,
    momentum,
    drawPressure,
    defensiveState,
    modelTrust,
    match,
    guide,
  } = data;
  const [rawHomeTeam, rawAwayTeam] = String(match.match || "").split(" - ");
  const homeTeam = rawHomeTeam || "Home side";
  const awayTeam = rawAwayTeam || "Away side";
  const homePPG = safe(match.hppg ?? match.homePPG);
  const awayPPG = safe(match.appg ?? match.awayPPG);
  const tone = toneMap[edgeTier] || toneMap.MEASURED;
  const guideMeta = getGuideMeta(match, guide);
  const surplus = computeSurplus(
    probability,
    resolveOddsForGuide(match, guide)
  );

  const overview = `
${tone.opener}

**${homeTeam}** possess an attacking metric of **${fmt(
    match.hgs
  )}** expected goals alongside a concession rate of **${fmt(
    match.hgc
  )}**, juxtaposed against **${awayTeam}**'s away metrics of **${fmt(
    match.ags
  )}** (GF) and **${fmt(match.agc)}** (GA).

Points-per-game distribution sits at **${fmt(homePPG)}** vs **${fmt(
    awayPPG
  )}**, supported by a short-term momentum distribution of **${safe(
    match.hPts
  )}** points to **${safe(match.aPts)}** over the trailing 5-match window.

The quantitative model values the primary outcome at **${probability}%**, anchored by a structural delta of **${fmt(
    structural.composite
  )}** and a stability index of **${fmt(
    stability
  )}**. Momentum flow is flagged as **${momentum.toLowerCase()}**, driving a centralized model trust rating of **${safe(
    modelTrust
  )}%**.
`;

  const tactical = `
Tactical separation relies on **${homeTeam}**'s attacking output (**${fmt(
    match.hgs
  )}**) intersecting with **${awayTeam}**'s defensive decay (**${fmt(
    match.agc
  )}**), generating a baseline structural edge of **${fmt(structural.attackEdge)}**.

Conversely, **${awayTeam}**'s offensive capacity (**${fmt(
    match.ags
  )}**) against **${homeTeam}**'s resistance (**${fmt(
    match.hgc
  )}**) establishes the fixture's counter-threat profile.

BTTS propensities track at **${pct(match.hBtts)}%** (${homeTeam}) and **${pct(
    match.aBtts
  )}%** (${awayTeam}), mapping directly to a **${tempoProfile.toLowerCase()}** game script.

Shutout potential (Clean Sheet %: **${pct(match.hcs)}** vs **${pct(
    match.acs
  )}**) combined with offensive zeroes (FTS %: **${pct(
    match.hfts ?? match.hFailedToScore
  )}** vs **${pct(
    match.afts ?? match.aFailedToScore
  )}**) categorizes this matchup strictly as a state of **${defensiveState.toLowerCase()}**.
`;

  const marketAlignment = `
Market alignment isolates on **${
    guideMeta.marketAngle
  }**, carrying a **${probability}%** true probability overlay against a system rating of **${safe(
    match.rating
  ).toFixed(0)}%**.

Trailing head-to-head parameters over **${safe(
    match.H2H_GP
  )}** iterations indicate BTTS at **${pct(match.H2H_GG)}%** and Over 2.5 at **${pct(
    match.H2H_OV
  )}%**.

Algorithmic scoreline distribution highlights **${match.cScore || "N/A"}** (**${pct(
    match.modelCSPercent
  )}%**) as the primary vector, trailed by **${match.cs2 || "N/A"}** (**${pct(
    match.cs2Percent
  )}%**).

Compared to market pricing, the implied probability rests at **${safe(
    surplus.impliedProbability
  )}%**, exposing a quantified mathematical surplus of **${safe(
    surplus.surplus
  )}** points. ${tone.closer}
`;

  const goalProjection = `
Expected total goals track to **${fmt(
    match.avg ||
      (safe(match.hgs) + safe(match.hgc) + safe(match.ags) + safe(match.agc)) /
        2
  )}**, distributed across Over 2.5 (**${pct(match.ov25)}%**) and Under 2.5 (**${pct(
    match.un25
  )}%**) boundaries.

Early goal floor (Over 1.5) registers at **${pct(match.hgsOver15)}%** vs **${pct(
    match.agsOver15
  )}%**, establishing a highly robust baseline for scoring expectation.

H2H totals historically clear Over 2.5 at a **${pct(
    match.H2H_OV
  )}%** clip across **${safe(match.H2H_GP)}** encounters.

This aggregate profile classifies the fixture explicitly within a **${goalEnvironment.toLowerCase()}**.
`;

  const riskReport = `
Systemic risk triggers at **${risk.toLowerCase()}**, paired with an overarching volatility flag of **${volatility.toLowerCase()}**.

Draw pressure calculates as **${drawPressure.toLowerCase()}** (historical H2H draws: **${pct(
    match.H2H_D
  )}%**), mapping a clear equilibrium threat if variance favors a stagnant script.

Upset channels are defined by **${awayTeam}**'s away win frequency (**${pct(
    match.aWin
  )}%**) and **${homeTeam}**'s home draw frequency (**${pct(match.hDraw)}%**).

Offensive suppression (FTS: **${pct(match.hfts ?? match.hFailedToScore)}%** / **${pct(
    match.afts ?? match.aFailedToScore
  )}%**) remains the primary friction point preventing steeper total goals exposure.
`;

  return { overview, tactical, marketAlignment, goalProjection, riskReport };
}

/* =========================================================
   MAIN ENTRY
========================================================= */

export function computeIntelligence(
  match,
  userRole = "free",
  selectionOverride = null
) {
  const hgs = safe(match.hgs);
  const hgc = safe(match.hgc);
  const ags = safe(match.ags);
  const agc = safe(match.agc);
  const totalAvg = (hgs + hgc + ags + agc) / 2;

  const structural = computeStructuralMetrics(match);
  const stability = computeStability(match);
  const goalEnvironment = classifyGoalEnvironment(totalAvg);
  const tempoProfile = computeTempoProfile(match);
  const momentum = computeMomentum(match);
  const drawPressure = detectDrawPressure(match);
  const defensiveState = defensiveFragility(match);

  const primaryEdge = detectPrimaryEdge(match, totalAvg);
  const confidence = classifyConfidence(match, primaryEdge);
  const risk = classifyRisk(match);
  const volatility = classifyVolatility(match);

  const guide = normalizeGuide(
    selectionOverride || match.pick || match.GUIDE || match.options || ""
  );
  const modelProb = resolveGuideProbability(match, guide, structural, totalAvg);
  const probability = Math.round(
    modelProb > 0 ? modelProb : safe(match.chance)
  );

  const edgeTier = classifyEdgeTier({
    probability,
    stability,
    structuralEdge: structural.composite,
  });
  const modelTrust = computeModelTrust({
    probability,
    stability,
    structuralEdge: structural.composite,
    volatility,
    risk,
  });

  const recommendation = computeBetRecommendation({
    probability,
    edgeTier,
    modelTrust,
    volatility,
    risk,
    match,
    guide,
  });

  let narratives;
  if (userRole === "admin" || userRole === "premium") {
    narratives = buildNarratives({
      probability,
      structural,
      stability,
      risk,
      volatility,
      goalEnvironment,
      edgeTier,
      tempoProfile,
      momentum,
      drawPressure,
      defensiveState,
      modelTrust,
      match,
      guide,
    });
  } else {
    narratives = {
      overview: "🔒 Upgrade to Premium to unlock full AI match intelligence.",
      tactical:
        "🔒 Tactical & statistical edge is available for Premium users.",
      marketAlignment: "🔒 Market positioning insights require Premium access.",
      goalProjection: "🔒 Goal environment projection is Premium-only.",
      riskReport: "🔒 Risk exposure analysis is restricted to Premium users.",
    };
  }

  return {
    primaryEdge,
    confidence,
    risk,
    volatility,
    goalEnvironment,
    stability,
    structural,
    probability,
    guide,
    edgeTier,
    modelTrust,
    recommendation,
    narratives,
  };
}

/* =========================================================
   EXTRA INTELLIGENCE ENGINES
========================================================= */

function computeTempoProfile(match) {
  const tempoIndex = mean([match.hgs, match.ags, match.hgc, match.agc], 1.25);
  const overTrend = mean([match.ov25, match.hOv2, match.aOv2], 50) / 100;
  const bttsTrend = mean([match.hBtts, match.aBtts], 50) / 100;
  const pulse = tempoIndex + overTrend * 0.8 + bttsTrend * 0.6;

  if (pulse >= 2.15) return "High-Velocity Tempo";
  if (pulse <= 1.75) return "Suppressed Tempo";
  return "Equilibrium Tempo";
}

function computeMomentum(match) {
  const homePts = safe(match.hPts);
  const awayPts = safe(match.aPts);
  const winRateEdge = pct(match.hWin) - pct(match.aWin);
  const momentumScore = homePts - awayPts + winRateEdge * 0.1;

  if (momentumScore >= 5) return "Positive Momentum Divergence";
  if (momentumScore <= -5) return "Negative Momentum Divergence";
  return "Momentum Equilibrium";
}

function detectDrawPressure(match) {
  const drawIndex = mean([match.hDraw, match.aDraw, match.H2H_D], 20);
  if (drawIndex >= 32) return "Elevated Draw Probability";
  if (drawIndex >= 26) return "Moderate Draw Risk";
  return "Suppressed Draw Pressure";
}

function defensiveFragility(match) {
  const concessions = mean([match.hgc, match.agc], 1.2);
  const cleanSheets = mean([match.hcs, match.acs], 20);

  if (concessions >= 1.75 && cleanSheets <= 22) return "Defensive Instability";
  if (concessions <= 1.1 && cleanSheets >= 30) return "Defensive Fortitude";
  return "Defensive Equilibrium";
}

/* =========================================================
   SMART BETTING RECOMMENDATION ENGINE (KELLY CRITERION)
========================================================= */

function computeBetRecommendation({
  probability,
  edgeTier,
  modelTrust,
  volatility,
  risk,
  match,
  guide,
}) {
  const guideMeta = getGuideMeta(match, guide);
  const odds = Number(resolveOddsForGuide(match, guide) || 0);
  const marketProbability =
    odds > 1 ? Math.round((100 / odds) * 10) / 10 : null;

  let expectedValue = 0;
  let kellyAllocation = 0; // % of bankroll to risk
  let stakeTier = "Low Exposure";

  if (odds > 1) {
    // 1. Expected Value (Edge)
    expectedValue = Math.round((probability - 100 / odds) * 10) / 10;

    // 2. Fractional Kelly Criterion Calculator
    const decimalOdds = odds;
    const b = decimalOdds - 1; // Net odds
    const p = probability / 100; // Win probability
    const q = 1 - p; // Loss probability

    const fullKelly = b > 0 ? (b * p - q) / b : 0;

    // Apply conservative fraction (e.g. 25% of Kelly) & cap at max bankroll %
    if (fullKelly > 0) {
      const fractionalKelly = fullKelly * ALGO_WEIGHTS.KELLY_FRACTION;
      kellyAllocation =
        Math.min(fractionalKelly, ALGO_WEIGHTS.MAX_STAKE_CAP) * 100; // Convert to %
    }
  }

  // 3. Exposure Tiering based on Kelly output + Trust metrics
  if (
    modelTrust >= 80 &&
    edgeTier === "ELITE" &&
    expectedValue >= 5 &&
    kellyAllocation >= 3 &&
    risk !== "High"
  ) {
    stakeTier = "High Exposure (Max Allocation)";
  } else if (
    modelTrust >= 65 &&
    expectedValue > 0 &&
    kellyAllocation >= 1 &&
    risk !== "High"
  ) {
    stakeTier = "Medium Exposure (Standard Allocation)";
  } else if (expectedValue < 0 || modelTrust < 55 || kellyAllocation <= 0) {
    stakeTier = "Low Exposure / Pass";
  }

  return {
    market: guideMeta.market,
    selection: guideMeta.selection,
    confidence: probability,
    marketProbability,
    expectedValue,
    stakeTier,
    suggestedBankrollPct: Math.round(kellyAllocation * 10) / 10, // Returns e.g. "3.5" for 3.5%
  };
}