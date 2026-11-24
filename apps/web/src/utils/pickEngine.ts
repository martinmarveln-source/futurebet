import { marketProb } from "./matchUtils";

export function getRealOdds(match: any, market: string, option: string) {
  if (!match || !market || !option) return null;

  const mkt = String(market).trim();
  const opt = String(option).trim();

  let directOdds = null;
  if (mkt === "1X2") {
    if (opt === "Home") directOdds = match.homeOdds ?? match.home_odds;
    if (opt === "Draw") directOdds = match.drawOdds ?? match.draw_odds;
    if (opt === "Away") directOdds = match.awayOdds ?? match.away_odds;
  } else if (mkt === "Double Chance") {
    if (opt === "Home or Draw") directOdds = match.dc1X;
    if (opt === "Home or Away") directOdds = match.dc12;
    if (opt === "Draw or Away") directOdds = match.dcX2;
  } else if (mkt === "BTTS") {
    if (opt === "Yes") directOdds = match.bttsYesOdds ?? match.btts_yes_odds;
    if (opt === "No") directOdds = match.bttsNoOdds ?? match.btts_no_odds;
  } else if (mkt === "Over 2.5" || mkt === "O/U 2.5") {
    if (opt === "Yes" || opt === "Over 2.5") directOdds = match.o25Odds ?? match.o25_odds;
    if (opt === "No" || opt === "Under 2.5") directOdds = match.u25Odds ?? match.u25_odds;
  } else if (mkt === "Over 1.5") {
    if (opt === "Yes") directOdds = match.o15Odds ?? match.o15_odds;
    if (opt === "No") directOdds = match.u15Odds ?? match.u15_odds;
  } else if (mkt === "Over 3.5") {
    if (opt === "Yes") directOdds = match.o35Odds ?? match.o35_odds;
    if (opt === "No") directOdds = match.u35Odds ?? match.u35_odds;
  } else if (mkt === "Over 4.5") {
    if (opt === "Yes") directOdds = match.o45Odds ?? match.o45_odds;
    if (opt === "No") directOdds = match.u45Odds ?? match.u45_odds;
  }

  const dOdds = Number(directOdds);
  if (Number.isFinite(dOdds) && dOdds > 1) {
    return Number(dOdds.toFixed(2));
  }

  const rawOdds = Number(match?.odds);
  if (Number.isFinite(rawOdds) && rawOdds > 1) {
    return Number(rawOdds.toFixed(2));
  }

  // Fallback to recalculating or basic implied odds if not found
  if (mkt === "Double Chance") {
    const derived = getDoubleChanceOdds(match);
    if (opt === "Home or Draw" && derived.h1x) return Number(derived.h1x);
    if (opt === "Home or Away" && derived.h12) return Number(derived.h12);
    if (opt === "Draw or Away" && derived.hx2) return Number(derived.hx2);
  }

  return null;
}


const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

const toNum = (v: any) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
};

const pct = (v: any) => Math.round(toNum(v));

const avg = (...values: any[]) => {
  const flat = values.flat(Infinity).map(toNum).filter(Number.isFinite);
  return flat.length ? flat.reduce((a, b) => a + b, 0) / flat.length : 0;
};

export function getDoubleChanceOdds(match: any) {
  const raw = match?.raw_data || match?.rawData || {};
  const dc1X = match?.dc1X || raw.dc1X;
  const dc12 = match?.dc12 || raw.dc12;
  const dcX2 = match?.dcX2 || raw.dcX2;
  
  if (dc1X && dc12 && dcX2) {
    return {
      h1x: Number(dc1X).toFixed(2),
      h12: Number(dc12).toFixed(2),
      hx2: Number(dcX2).toFixed(2),
    };
  }

  const h = Number(match?.homeOdds || raw.homeOdds || raw.home_odds);
  const d = Number(match?.drawOdds || raw.drawOdds || raw.draw_odds);
  const a = Number(match?.awayOdds || raw.awayOdds || raw.away_odds);

  if (!h || !d || !a || h <= 1 || d <= 1 || a <= 1)
    return { h1x: null, h12: null, hx2: null };

  const implied1 = 1 / h;
  const impliedX = 1 / d;
  const implied2 = 1 / a;

  const margin = implied1 + impliedX + implied2;
  const true1 = implied1 / margin;
  const trueX = impliedX / margin;
  const true2 = implied2 / margin;

  const dcMargin = 1.05;

  return {
    h1x: (1 / ((true1 + trueX) * dcMargin)).toFixed(2),
    h12: (1 / ((true1 + true2) * dcMargin)).toFixed(2),
    hx2: (1 / ((trueX + true2) * dcMargin)).toFixed(2),
  };
}

export function parsePredictedScore(score: string | null | undefined) {
  const m = String(score || "").match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!m) return null;
  const home = Number(m[1]),
    away = Number(m[2]);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return { home, away, total: home + away };
}

export function normalizePickDescriptor(input = "") {
  const token = String(input)
    .toUpperCase()
    .replace(/[%\s._-]+/g, "")
    .trim();
  if (!token) return null;
  if (["1", "HOME"].includes(token) || token.includes("HOMEWIN"))
    return { market: "1X2", option: "Home", label: "1X2 — Home" };
  if (["X", "DRAW"].includes(token))
    return { market: "1X2", option: "Draw", label: "1X2 — Draw" };
  if (["2", "AWAY"].includes(token) || token.includes("AWAYWIN"))
    return { market: "1X2", option: "Away", label: "1X2 — Away" };
  if (["GG", "BTTSYES"].includes(token) || token.includes("BOTHTEAMSTOSCORE"))
    return { market: "BTTS", option: "Yes", label: "BTTS — Yes" };
  if (["NG", "BTTSNO"].includes(token) || token.includes("BOTHTEAMSNOTTOSCORE"))
    return { market: "BTTS", option: "No", label: "BTTS — No" };
  if (
    ["OV25", "O25", "OVER25"].includes(token) ||
    token.includes("OVER25") ||
    token.includes("OV25")
  )
    return { market: "Over 2.5", option: "Yes", label: "Over 2.5" };
  if (
    ["UN25", "U25", "UNDER25"].includes(token) ||
    token.includes("UNDER25") ||
    token.includes("UN25")
  )
    return { market: "Under 2.5", option: "Yes", label: "Under 2.5" };
  if (["OV15", "O15", "OVER15"].includes(token) || token.includes("OVER15"))
    return { market: "Over 1.5", option: "Yes", label: "Over 1.5" };
  if (["UN15", "U15", "UNDER15"].includes(token) || token.includes("UNDER15"))
    return { market: "Under 1.5", option: "Yes", label: "Under 1.5" };
  if (["OV35", "O35", "OVER35"].includes(token) || token.includes("OVER35"))
    return { market: "Over 3.5", option: "Yes", label: "Over 3.5" };
  if (["UN35", "U35", "UNDER35"].includes(token) || token.includes("UNDER35"))
    return { market: "Under 3.5", option: "Yes", label: "Under 3.5" };
  if (
    ["1X", "DC1X", "H1X"].includes(token) ||
    token.includes("HOMEORDRAW") ||
    token.includes("1X")
  )
    return { market: "Double Chance", option: "Home or Draw", label: "Double Chance — 1X" };
  if (
    ["X2", "DCX2", "HX2"].includes(token) ||
    token.includes("DRAWORAWAY") ||
    token.includes("X2")
  )
    return { market: "Double Chance", option: "Draw or Away", label: "Double Chance — X2" };
  if (
    ["12", "DC12", "H12"].includes(token) ||
    token.includes("HOMEORAWAY") ||
    token.includes("12")
  )
    return { market: "Double Chance", option: "Home or Away", label: "Double Chance — 12" };
  return null;
}

export function resolveOddsForSelection(match: any, market: string, option: string) {
  if (!market) return null;
  const raw = match?.raw_data || match?.rawData || {};
  
  if (market === "BTTS")
    return option === "Yes" ? (match?.bttsYesOdds || raw.bttsYesOdds) : (match?.bttsNoOdds || raw.bttsNoOdds);
  if (market === "Over 2.5")
    return option === "Yes" ? (match?.o25Odds || raw.o25Odds) : (match?.u25Odds || raw.u25Odds);
  if (market === "Under 2.5")
    return option === "Yes" ? (match?.u25Odds || raw.u25Odds) : (match?.o25Odds || raw.o25Odds);
  if (market === "Over 1.5")
    return option === "Yes" ? (match?.o15Odds || raw.o15Odds) : (match?.u15Odds || raw.u15Odds);
  if (market === "Under 1.5")
    return option === "Yes" ? (match?.u15Odds || raw.u15Odds) : (match?.o15Odds || raw.o15Odds);
  if (market === "Over 3.5")
    return option === "Yes" ? (match?.o35Odds || raw.o35Odds) : (match?.u35Odds || raw.u35Odds);
  if (market === "Under 3.5")
    return option === "Yes" ? (match?.u35Odds || raw.u35Odds) : (match?.o35Odds || raw.o35Odds);
  if (market === "1X2") {
    if (option === "Home") return (match?.homeOdds || raw.homeOdds || raw.home_odds);
    if (option === "Draw") return (match?.drawOdds || raw.drawOdds || raw.draw_odds);
    if (option === "Away") return (match?.awayOdds || raw.awayOdds || raw.away_odds);
  }
  if (market === "Double Chance") {
    const dcOdds = getDoubleChanceOdds(match);
    if (option === "Home or Draw") return dcOdds.h1x;
    if (option === "Home or Away") return dcOdds.h12;
    if (option === "Draw or Away") return dcOdds.hx2;
  }
  return null;
}

export function getOddsForRecommendation(match: any, recommended: any, pickText: string) {
  const selection =
    recommended?.market && recommended?.option
      ? recommended
      : normalizePickDescriptor(pickText);
  if (!selection) return null;
  return resolveOddsForSelection(match, selection.market, selection.option);
}

export function resolveProbabilityForSelection(match: any, market: string, option: string) {
  if (!market) return 0;
  if (market === "BTTS") return pct(option === "Yes" ? match?.gg : match?.ng);
  if (market === "Over 2.5")
    return pct(option === "Yes" ? match?.ov25 : match?.un25);
  if (market === "Under 2.5")
    return pct(option === "Yes" ? match?.un25 : match?.ov25);
  if (market === "Over 1.5")
    return marketProb(match, "Over 1.5", option);
  if (market === "Under 1.5")
    return marketProb(match, "Over 1.5", option === "Yes" ? "No" : "Yes");
  if (market === "Over 3.5")
    return pct(option === "Yes" ? match?.ov35 : match?.un35);
  if (market === "Under 3.5")
    return pct(option === "Yes" ? match?.un35 : match?.ov35);
  if (market === "1X2") {
    if (option === "Home") return pct(match?.homeWin);
    if (option === "Draw") return pct(match?.draw);
    if (option === "Away") return pct(match?.awayWin);
  }
  if (market === "Double Chance") {
    if (option === "Home or Draw")
      return pct(match?.homeWin) + pct(match?.draw);
    if (option === "Home or Away")
      return pct(match?.homeWin) + pct(match?.awayWin);
    if (option === "Draw or Away")
      return pct(match?.draw) + pct(match?.awayWin);
  }
  return 0;
}

export function calculateValueEdge(probability: number, odds: number) {
  if (!probability || !odds || Number(odds) <= 1) return null;
  const edge = (Number(probability) / 100 - 1 / Number(odds)) * 100;
  return Math.round(edge * 10) / 10;
}

export function parseFormPoints(formStr: any): number {
  if (!formStr || typeof formStr !== "string") return 0;
  const chars = formStr.toUpperCase().replace(/[^WDL]/g, "").slice(-5).split("");
  return chars.reduce((acc, c) => acc + (c === "W" ? 3 : c === "D" ? 1 : 0), 0);
}

export function parseTableDelta(tableStr: any): number {
  if (!tableStr || typeof tableStr !== "string") return 0;
  const parts = tableStr.split("|").map((x) => Number(x.trim()));
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && parts[0] > 0 && parts[1] > 0) {
    return parts[1] - parts[0]; // positive = home team is higher placed in standings
  }
  return 0;
}

export function createCandidate({
  market,
  option,
  label,
  prob,
  opposition = 0,
  support = 0,
  penalty = 0,
  match = null,
  reasonTag = "Safest Prob",
}: {
  market: string;
  option: string;
  label: string;
  prob: number;
  opposition?: number;
  support?: number;
  penalty?: number;
  match?: any;
  reasonTag?: string;
}) {
  const margin = prob - opposition;
  
  let edgeScore = 0;
  let realOdds: number | null = null;
  let valueEdge = 0;
  
  if (match) {
    realOdds = getRealOdds(match, market, option);
    if (realOdds && realOdds > 1) {
      const implied = (1 / realOdds) * 100;
      valueEdge = prob - implied;
      if (valueEdge > 5) edgeScore += 8;
      else if (valueEdge > 0) edgeScore += 4;
      else if (valueEdge < -12) penalty += 8;
    } else {
      // Soft penalty only — never disqualify high-probability selections (75%+) just because odds are loading
      penalty += 2;
    }
  }

  // Weight probability heavily (0.70) to favor selections that win consistently (75%+ hit rates)
  const score = prob * 0.70 + clamp(margin, -20, 35) * 0.35 + support - penalty + edgeScore;
  
  return {
    market,
    option,
    label,
    prob,
    score: Math.round(score * 10) / 10,
    margin: Math.round(margin),
    realOdds,
    valueEdge: Math.round(valueEdge * 10) / 10,
    reasonTag,
  };
}

export function getRecommendedMarket(match: any) {
  const gg = pct(match?.gg), ng = pct(match?.ng);
  const ov25 = pct(match?.ov25), un25 = pct(match?.un25);
  const home = pct(match?.homeWin), draw = pct(match?.draw), away = pct(match?.awayWin);
  
  const dc1X = home + draw;
  const dc12 = home + away;
  const dcX2 = draw + away;
  
  const o15 = marketProb(match, "Over 1.5", "Yes");
  const u15 = marketProb(match, "Over 1.5", "No");
  const o35 = marketProb(match, "Over 3.5", "Yes");
  const u35 = marketProb(match, "Over 3.5", "No");
  const o45 = marketProb(match, "Over 4.5", "Yes");
  const u45 = marketProb(match, "Over 4.5", "No");

  const hgs = toNum(match?.hgs), hgc = toNum(match?.hgc);
  const ags = toNum(match?.ags), agc = toNum(match?.agc);
  const hBtts = pct(match?.hBtts), aBtts = pct(match?.aBtts);
  const hOv2 = pct(match?.hOv2), aOv2 = pct(match?.aOv2);
  
  const hfts = pct(match?.hfts ?? match?.hFailedToScore), afts = pct(match?.afts ?? match?.aFailedToScore);
  const hcs = pct(match?.hcs), acs = pct(match?.acs);
  const failRate = avg(hfts, afts);
  const cleanSheetRate = avg(hcs, acs);
  const predicted = parsePredictedScore(match?.cScore || match?.predictedScore);
  const totalAvg = toNum(match?.avg) || (hgs || hgc || ags || agc ? (hgs + hgc + ags + agc) / 2 : 0);
  const bttsProfile = avg(hBtts, aBtts, gg), overProfile = avg(hOv2, aOv2, ov25);

  // === 1. FORM & MOMENTUM (Last 5 matches) ===
  const hFormPts = parseFormPoints(match?.hForm || match?.hRecent);
  const aFormPts = parseFormPoints(match?.aForm || match?.aRecent);
  const formDelta = hFormPts - aFormPts;

  // === 2. TABLE STANDINGS & TIER CLASS ===
  const tableDelta = parseTableDelta(match?.table);
  const isBothLowTier = (match?.hGrp === "D" || match?.hGrp === "E") && (match?.aGrp === "D" || match?.aGrp === "E");

  // === 3. OVER 1.5 GOAL DISTRIBUTION MATRIX ===
  const hgsO15 = pct(match?.hgsOver15), hgcO15 = pct(match?.hgcOver15);
  const agsO15 = pct(match?.agsOver15), agcO15 = pct(match?.agcOver15);
  const over15Profile = avg(hgsO15, hgcO15, agsO15, agcO15);

  // === 4. HEAD-TO-HEAD HISTORICAL TRENDS ===
  const h2hH = pct(match?.h2hH), h2hD = pct(match?.h2hD), h2hA = pct(match?.h2hA);
  const h2hOV = pct(match?.h2hOV), h2hUN = pct(match?.h2hUN);
  const h2hGG = pct(match?.h2hGG), h2hNG = pct(match?.h2hNG);

  // === 5. SCORELINE DISTRIBUTION MATRIX ===
  const s00 = toNum(match?.score00), s10 = toNum(match?.score10), s11 = toNum(match?.score11);
  const s01 = toNum(match?.score01), s20 = toNum(match?.score20), s21 = toNum(match?.score21);
  const s02 = toNum(match?.score02), s12 = toNum(match?.score12), s22 = toNum(match?.score22);
  const drawScoreSum = s00 + s11 + s22;
  const under25ScoreSum = s00 + s10 + s01 + s20 + s02 + s11;
  const ngScoreSum = s00 + s10 + s20 + s01 + s02;

  // Draw Trap Detection
  const isDrawRisk = draw >= 27 || drawScoreSum >= 24 || (predicted && predicted.home === predicted.away);

  // Comprehensive Home Support
  let homeDir =
    (toNum(match?.hppg) > toNum(match?.appg) + 0.3 ? 3 : 0) +
    (toNum(match?.hPts) > toNum(match?.aPts) + 2 ? 3 : 0) +
    (predicted && predicted.home > predicted.away ? 3 : 0) +
    (hgs > ags ? 2 : 0) +
    (agc > hgc ? 2 : 0) +
    (formDelta >= 4 ? 4 : formDelta <= -4 ? -5 : 0) +
    (tableDelta >= 7 ? 4 : tableDelta <= -7 ? -4 : 0) +
    (h2hH >= 55 ? 3 : h2hA >= 55 ? -3 : 0);

  // Comprehensive Away Support
  let awayDir =
    (toNum(match?.appg) > toNum(match?.hppg) + 0.3 ? 3 : 0) +
    (toNum(match?.aPts) > toNum(match?.hPts) + 2 ? 3 : 0) +
    (predicted && predicted.away > predicted.home ? 3 : 0) +
    (ags > hgs ? 2 : 0) +
    (hgc > agc ? 2 : 0) +
    (formDelta <= -4 ? 4 : formDelta >= 4 ? -5 : 0) +
    (tableDelta <= -7 ? 4 : tableDelta >= 7 ? -4 : 0) +
    (h2hA >= 55 ? 3 : h2hH >= 55 ? -3 : 0);

  // Dominant favorite super-boost (e.g. 70%+ win prob, top of table, in-form)
  const isDominantHome = home >= 70 && (tableDelta >= 6 || formDelta >= 3 || toNum(match?.hppg) >= 2.0);
  const isDominantAway = away >= 65 && (tableDelta <= -6 || formDelta <= -3 || toNum(match?.appg) >= 1.9);

  if (isDominantHome) {
    homeDir += 10;
  }
  if (isDominantAway) {
    awayDir += 10;
  }

  // Safe Acca Calibration: Straight 1X2 caution vs Double Chance coverage
  // In close games (Home 42-65%), straight Home has high variance. Double Chance (1X) is 75-85% hit-rate.
  const homeStraightPenalty = (isDrawRisk ? 14 : 0) + (!isDominantHome && home < 66 ? 8 : 0) + (isBothLowTier ? 8 : 0);
  const awayStraightPenalty = (isDrawRisk ? 14 : 0) + (!isDominantAway && away < 60 ? 8 : 0) + (isBothLowTier ? 8 : 0);

  const dc1XSupport = homeDir + (isDrawRisk ? 8 : 2) + (h2hD >= 30 ? 3 : 0) + (tableDelta >= 4 ? 4 : 0);
  const dcX2Support = awayDir + (isDrawRisk ? 8 : 2) + (h2hD >= 30 ? 3 : 0) + (tableDelta <= -4 ? 4 : 0);

  // Goal Support
  const over15Support = (overProfile >= 50 ? 3 : 0) + (over15Profile >= 55 ? 5 : 0) + (totalAvg >= 2.1 ? 4 : 0) + (hfts <= 18 && afts <= 18 ? 4 : 0);
  const under35Support = (failRate >= 32 ? 4 : 0) + (cleanSheetRate >= 28 ? 4 : 0) + (under25ScoreSum >= 50 ? 4 : 0) + (totalAvg <= 2.5 ? 4 : 0);
  const bttsNoSupport = (failRate >= 34 ? 5 : 0) + (cleanSheetRate >= 30 ? 5 : 0) + (ngScoreSum >= 45 ? 5 : 0) + (h2hNG >= 55 ? 3 : 0);
  const bttsYesSupport = (bttsProfile >= 56 ? 4 : 0) + (totalAvg >= 2.55 ? 4 : 0) + (h2hGG >= 55 ? 3 : 0) + (failRate <= 20 ? 3 : 0);

  const candidates = [
    // Straight 1X2 — only recommended for dominant favorites (66%+ win probability or huge tier/form mismatch)
    home > 0 ? createCandidate({ market: "1X2", option: "Home", label: "1X2 — Home", prob: home, opposition: Math.max(draw, away), support: homeDir, penalty: homeStraightPenalty, match, reasonTag: home >= 70 ? "Dominant Favorite" : "Form Backed" }) : null,
    draw > 0 ? createCandidate({ market: "1X2", option: "Draw", label: "1X2 — Draw", prob: draw, opposition: Math.max(home, away), support: (isDrawRisk ? 8 : 0) + (Math.abs(home - away) <= 5 ? 4 : 0), penalty: Math.max(home, away) >= 50 ? 8 : 0, match, reasonTag: "Draw Projected" }) : null,
    away > 0 ? createCandidate({ market: "1X2", option: "Away", label: "1X2 — Away", prob: away, opposition: Math.max(home, draw), support: awayDir, penalty: awayStraightPenalty, match, reasonTag: away >= 65 ? "Dominant Away" : "Form Backed" }) : null,
    
    // Double Chance — the bedrock for 75%-85% win rate in accumulators and cards
    dc1X > 0 ? createCandidate({ market: "Double Chance", option: "Home or Draw", label: "DC — 1X", prob: dc1X, opposition: away, support: dc1XSupport, penalty: home < 28 ? 8 : 0, match, reasonTag: isDrawRisk ? "Draw Shield (1X)" : "Safest Prob" }) : null,
    dc12 > 0 ? createCandidate({ market: "Double Chance", option: "Home or Away", label: "DC — 12", prob: dc12, opposition: draw, support: homeDir + awayDir, penalty: isDrawRisk ? 12 : draw >= 30 ? 8 : 0, match, reasonTag: "Attack Clash (12)" }) : null,
    dcX2 > 0 ? createCandidate({ market: "Double Chance", option: "Draw or Away", label: "DC — X2", prob: dcX2, opposition: home, support: dcX2Support, penalty: away < 28 ? 8 : 0, match, reasonTag: isDrawRisk ? "Draw Shield (X2)" : "Safest Prob" }) : null,

    // Both Teams to Score (BTTS)
    gg > 0 ? createCandidate({ market: "BTTS", option: "Yes", label: "BTTS — Yes", prob: gg, opposition: ng, support: bttsYesSupport, penalty: failRate >= 36 ? 8 : 0, match, reasonTag: "Goals Flowing" }) : null,
    ng > 0 ? createCandidate({ market: "BTTS", option: "No", label: "BTTS — No", prob: ng, opposition: gg, support: bttsNoSupport, penalty: (bttsProfile >= 60 && totalAvg >= 2.7) ? 8 : 0, match, reasonTag: "Clean Sheet Lock" }) : null,
    
    // Over / Under 2.5
    ov25 > 0 ? createCandidate({ market: "Over 2.5", option: "Yes", label: "Over 2.5", prob: ov25, opposition: un25, support: (overProfile >= 60 ? 4 : 0) + (totalAvg >= 2.7 ? 5 : 0) + (h2hOV >= 60 ? 3 : 0), penalty: (un25 >= 55 || failRate >= 35) ? 6 : 0, match, reasonTag: "High Value" }) : null,
    un25 > 0 ? createCandidate({ market: "Under 2.5", option: "Yes", label: "Under 2.5", prob: un25, opposition: ov25, support: (un25 >= 56 ? 4 : 0) + (totalAvg <= 2.2 ? 5 : 0) + (under25ScoreSum >= 55 ? 5 : 0) + (h2hUN >= 60 ? 3 : 0), penalty: (overProfile >= 60 || totalAvg >= 2.8) ? 8 : 0, match, reasonTag: "Defensive Lock" }) : null,
    
    // Over / Under 1.5 (Consistent 80%+ accumulator builder)
    o15 > 0 ? createCandidate({ market: "Over 1.5", option: "Yes", label: "Over 1.5", prob: o15, opposition: u15, support: over15Support + 5, penalty: (u15 >= 35 || totalAvg < 1.7) ? 6 : 0, match, reasonTag: "Safest Prob" }) : null,
    u15 > 0 ? createCandidate({ market: "Over 1.5", option: "No", label: "Under 1.5", prob: u15, opposition: o15, support: (un25 >= 68 ? 4 : 0) + (totalAvg <= 1.6 ? 5 : 0), penalty: overProfile >= 50 ? 8 : 0, match, reasonTag: "Ultra Defensive" }) : null,
    
    // Over / Under 3.5 (Safe cushion against 2-1 / 3-0 upsets)
    o35 > 0 ? createCandidate({ market: "Over 3.5", option: "Yes", label: "Over 3.5", prob: o35, opposition: u35, support: (overProfile >= 72 ? 5 : 0) + (totalAvg >= 3.4 ? 6 : 0), penalty: un25 >= 45 ? 8 : 0, match, reasonTag: "High Value" }) : null,
    u35 > 0 ? createCandidate({ market: "Over 3.5", option: "No", label: "Under 3.5", prob: u35, opposition: o35, support: under35Support + 4, penalty: overProfile >= 65 ? 8 : 0, match, reasonTag: "Safest Prob" }) : null,
    
    // Over / Under 4.5 (Extreme fallback)
    o45 > 0 ? createCandidate({ market: "Over 4.5", option: "Yes", label: "Over 4.5", prob: o45, opposition: u45, support: (overProfile >= 78 ? 5 : 0) + (totalAvg >= 3.6 ? 6 : 0), penalty: un25 >= 40 ? 12 : 6, match, reasonTag: "High Value" }) : null,
    u45 > 0 ? createCandidate({ market: "Over 4.5", option: "No", label: "Under 4.5", prob: u45, opposition: o45, support: (un25 >= 45 ? 3 : 0) + (totalAvg <= 3.2 ? 3 : 0), penalty: overProfile >= 68 ? 12 : 8, match, reasonTag: "Safest Prob" }) : null,
  ].filter(Boolean) as any[];

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  
  // Floor check: ensure recommendation has meaningful probability and confidence
  if (best.prob < 52 || best.score < 28) return null;
  
  return best;
}
