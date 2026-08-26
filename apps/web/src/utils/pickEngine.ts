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

export function createCandidate({
  market,
  option,
  label,
  prob,
  opposition = 0,
  support = 0,
  penalty = 0,
  match = null,
}: {
  market: string;
  option: string;
  label: string;
  prob: number;
  opposition?: number;
  support?: number;
  penalty?: number;
  match?: any;
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
      if (valueEdge > 5) edgeScore += 10;
      else if (valueEdge > 0) edgeScore += 5;
      else if (valueEdge < -10) penalty += 15;
    } else {
      penalty += 25; 
    }
  }

  const score = prob * 0.62 + clamp(margin, -20, 35) * 0.45 + support - penalty + edgeScore;
  
  return {
    market,
    option,
    label,
    prob,
    score: Math.round(score * 10) / 10,
    margin: Math.round(margin),
    realOdds,
    valueEdge: Math.round(valueEdge * 10) / 10,
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

  const hgs = toNum(match?.hgs), hgc = toNum(match?.hgc);
  const ags = toNum(match?.ags), agc = toNum(match?.agc);
  const hBtts = pct(match?.hBtts), aBtts = pct(match?.aBtts);
  const hOv2 = pct(match?.hOv2), aOv2 = pct(match?.aOv2);
  
  const failRate = avg(pct(match?.hfts ?? match?.hFailedToScore), pct(match?.afts ?? match?.aFailedToScore));
  const cleanSheetRate = avg(pct(match?.hcs), pct(match?.acs));
  const predicted = parsePredictedScore(match?.cScore || match?.predictedScore);
  const totalAvg = toNum(match?.avg) || (hgs || hgc || ags || agc ? (hgs + hgc + ags + agc) / 2 : 0);
  const bttsProfile = avg(hBtts, aBtts, gg), overProfile = avg(hOv2, aOv2, ov25);

  const homeDir =
    (toNum(match?.hppg) > toNum(match?.appg) + 0.3 ? 4 : 0) +
    (toNum(match?.hPts) > toNum(match?.aPts) + 2 ? 3 : 0) +
    (predicted && predicted.home > predicted.away ? 3 : 0) +
    (hgs > ags ? 2 : 0) +
    (agc > hgc ? 2 : 0);
    
  const awayDir =
    (toNum(match?.appg) > toNum(match?.hppg) + 0.3 ? 4 : 0) +
    (toNum(match?.aPts) > toNum(match?.hPts) + 2 ? 3 : 0) +
    (predicted && predicted.away > predicted.home ? 3 : 0) +
    (ags > hgs ? 2 : 0) +
    (hgc > agc ? 2 : 0);

  const candidates = [
    home > 0 ? createCandidate({ market: "1X2", option: "Home", label: "1X2 — Home", prob: home, opposition: Math.max(draw, away), support: homeDir, penalty: draw >= 30 && Math.abs(home - draw) <= 5 ? 4 : 0, match }) : null,
    draw > 0 ? createCandidate({ market: "1X2", option: "Draw", label: "1X2 — Draw", prob: draw, opposition: Math.max(home, away), support: (draw >= 30 ? 4 : 0) + (Math.abs(home - away) <= 6 ? 3 : 0), penalty: Math.max(home, away) >= 50 ? 4 : 0, match }) : null,
    away > 0 ? createCandidate({ market: "1X2", option: "Away", label: "1X2 — Away", prob: away, opposition: Math.max(home, draw), support: awayDir, penalty: draw >= 30 && Math.abs(away - draw) <= 5 ? 4 : 0, match }) : null,
    
    dc1X > 0 ? createCandidate({ market: "Double Chance", option: "Home or Draw", label: "DC — 1X", prob: dc1X, opposition: away, support: homeDir + (draw >= 28 ? 2 : 0), penalty: home < 30 ? 5 : 0, match }) : null,
    dc12 > 0 ? createCandidate({ market: "Double Chance", option: "Home or Away", label: "DC — 12", prob: dc12, opposition: draw, support: homeDir + awayDir, penalty: draw >= 33 ? 8 : 0, match }) : null,
    dcX2 > 0 ? createCandidate({ market: "Double Chance", option: "Draw or Away", label: "DC — X2", prob: dcX2, opposition: home, support: awayDir + (draw >= 28 ? 2 : 0), penalty: away < 30 ? 5 : 0, match }) : null,

    gg > 0 ? createCandidate({ market: "BTTS", option: "Yes", label: "BTTS — Yes", prob: gg, opposition: ng, support: (bttsProfile >= 56 ? 4 : 0) + (totalAvg >= 2.55 ? 4 : 0), penalty: failRate >= 40 ? 4 : 0, match }) : null,
    ng > 0 ? createCandidate({ market: "BTTS", option: "No", label: "BTTS — No", prob: ng, opposition: gg, support: (failRate >= 34 ? 4 : 0) + (cleanSheetRate >= 28 ? 4 : 0), penalty: bttsProfile >= 60 && totalAvg >= 2.7 ? 4 : 0, match }) : null,
    
    ov25 > 0 ? createCandidate({ market: "Over 2.5", option: "Yes", label: "Over 2.5", prob: ov25, opposition: un25, support: (overProfile >= 58 ? 4 : 0) + (totalAvg >= 2.65 ? 5 : 0), penalty: un25 >= 58 ? 4 : 0, match }) : null,
    un25 > 0 ? createCandidate({ market: "Under 2.5", option: "Yes", label: "Under 2.5", prob: un25, opposition: ov25, support: (un25 >= 56 ? 4 : 0) + (totalAvg <= 2.2 ? 5 : 0), penalty: overProfile >= 60 ? 4 : 0, match }) : null,
    
    o15 > 0 ? createCandidate({ market: "Over 1.5", option: "Yes", label: "Over 1.5", prob: o15, opposition: u15, support: (overProfile >= 50 ? 2 : 0) + (totalAvg >= 2.0 ? 3 : 0), penalty: u15 >= 35 ? 4 : 0, match }) : null,
    u15 > 0 ? createCandidate({ market: "Over 1.5", option: "No", label: "Under 1.5", prob: u15, opposition: o15, support: (un25 >= 65 ? 3 : 0) + (totalAvg <= 1.8 ? 4 : 0), penalty: overProfile >= 50 ? 5 : 0, match }) : null,
    
    o35 > 0 ? createCandidate({ market: "Over 3.5", option: "Yes", label: "Over 3.5", prob: o35, opposition: u35, support: (overProfile >= 70 ? 4 : 0) + (totalAvg >= 3.2 ? 5 : 0), penalty: un25 >= 45 ? 6 : 0, match }) : null,
    u35 > 0 ? createCandidate({ market: "Over 3.5", option: "No", label: "Under 3.5", prob: u35, opposition: o35, support: (un25 >= 50 ? 3 : 0) + (totalAvg <= 2.8 ? 3 : 0), penalty: overProfile >= 60 ? 4 : 0, match }) : null,
  ].filter(Boolean) as any[];

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];
  
  if (best.prob < 50 || best.score < 25) return null;
  
  return best;
}
