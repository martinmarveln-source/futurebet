export function deriveDoubleChance(h: number, d: number, a: number) {
  if (!h || !d || !a || h <= 1 || d <= 1 || a <= 1) {
    return { dc1X: null, dc12: null, dcX2: null };
  }

  const implied1 = 1 / h;
  const impliedX = 1 / d;
  const implied2 = 1 / a;

  const margin = implied1 + impliedX + implied2;
  const true1 = implied1 / margin;
  const trueX = impliedX / margin;
  const true2 = implied2 / margin;

  const dcMargin = 1.05; // 5% margin as standard

  const p1X = true1 + trueX;
  const p12 = true1 + true2;
  const pX2 = trueX + true2;

  return {
    dc1X: Number(((1 / p1X) / dcMargin).toFixed(2)),
    dc12: Number(((1 / p12) / dcMargin).toFixed(2)),
    dcX2: Number(((1 / pX2) / dcMargin).toFixed(2))
  };
}

// Poisson helpers
function poissonPMF(k: number, lambda: number) {
  if (k < 0) return 0;
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

function poissonOverK(lambda: number, kInclusiveMax: number) {
  let s = 0;
  for (let i = 0; i <= kInclusiveMax; i++) s += poissonPMF(i, lambda);
  return 1 - s;
}

function inferLambdaFromOver25(pOver25: number) {
  const target = Math.max(0.001, Math.min(0.999, pOver25));
  let lo = 0.05, hi = 7.0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const p = poissonOverK(mid, 2);
    if (p < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function deriveOverUnder(o25Odds: number, u25Odds: number) {
  if (!o25Odds || !u25Odds || o25Odds <= 1 || u25Odds <= 1) {
    return {
      o15Odds: null, u15Odds: null,
      o35Odds: null, u35Odds: null,
      o45Odds: null, u45Odds: null,
    };
  }

  const impO = 1 / o25Odds;
  const impU = 1 / u25Odds;
  const margin = impO + impU;
  const trueO25 = impO / margin;

  const lambda = inferLambdaFromOver25(trueO25);

  const trueO15 = poissonOverK(lambda, 1);
  const trueO35 = poissonOverK(lambda, 3);
  const trueO45 = poissonOverK(lambda, 4);

  const targetMargin = 1.05; // 5% overround

  return {
    o15Odds: Number(((1 / trueO15) / targetMargin).toFixed(2)),
    u15Odds: Number(((1 / (1 - trueO15)) / targetMargin).toFixed(2)),
    o35Odds: Number(((1 / trueO35) / targetMargin).toFixed(2)),
    u35Odds: Number(((1 / (1 - trueO35)) / targetMargin).toFixed(2)),
    o45Odds: Number(((1 / trueO45) / targetMargin).toFixed(2)),
    u45Odds: Number(((1 / (1 - trueO45)) / targetMargin).toFixed(2)),
  };
}

export function getOddsForPick(rawData: any, pickStr: string): number {
  if (!rawData || !pickStr) return 0;
  const p = String(pickStr).toUpperCase().trim();
  let odds = 0;

  if (p === "HOME WIN" || p === "1" || p === "HOME") {
    odds = Number(rawData.homeOdds) || Number(rawData.home_odds) || Number(rawData.hWin) || 0;
  } else if (p === "AWAY WIN" || p === "2" || p === "AWAY") {
    odds = Number(rawData.awayOdds) || Number(rawData.away_odds) || Number(rawData.aWin) || 0;
  } else if (p === "DRAW" || p === "X") {
    odds = Number(rawData.drawOdds) || Number(rawData.draw_odds) || Number(rawData.hDraw) || 0;
  } else if (p.includes("1X") || p.includes("HOME OR DRAW") || p === "H1X") {
    odds = Number(rawData.dc1X) || 0;
  } else if (p.includes("12") || p.includes("HOME OR AWAY") || p === "H12") {
    odds = Number(rawData.dc12) || 0;
  } else if (p.includes("X2") || p.includes("DRAW OR AWAY") || p === "HX2") {
    odds = Number(rawData.dcX2) || 0;
  } else if (p === "OVER 1.5" || p === "OV1.5" || p === "OV 1.5") {
    odds = Number(rawData.o15Odds) || Number(rawData.o15_odds) || 0;
  } else if (p === "UNDER 1.5" || p === "UN1.5" || p === "UN 1.5") {
    odds = Number(rawData.u15Odds) || Number(rawData.u15_odds) || 0;
  } else if (p === "OVER 2.5" || p === "OV.2.5" || p === "OV2.5" || p === "OV 2.5") {
    odds = Number(rawData.o25Odds) || Number(rawData.o25_odds) || Number(rawData.ov25) || 0;
  } else if (p === "UNDER 2.5" || p === "UN2.5" || p === "UN 2.5") {
    odds = Number(rawData.u25Odds) || Number(rawData.u25_odds) || Number(rawData.un25) || 0;
  } else if (p === "OVER 3.5" || p === "OV3.5" || p === "OV 3.5") {
    odds = Number(rawData.o35Odds) || Number(rawData.o35_odds) || 0;
  } else if (p === "UNDER 3.5" || p === "UN3.5" || p === "UN 3.5") {
    odds = Number(rawData.u35Odds) || Number(rawData.u35_odds) || 0;
  } else if (p === "OVER 4.5" || p === "OV4.5" || p === "OV 4.5") {
    odds = Number(rawData.o45Odds) || Number(rawData.o45_odds) || 0;
  } else if (p === "UNDER 4.5" || p === "UN4.5" || p === "UN 4.5") {
    odds = Number(rawData.u45Odds) || Number(rawData.u45_odds) || 0;
  } else if (p === "GG" || p === "BTTS - YES" || p === "BTTS YES" || p.includes("YES") || p.includes("GG")) {
    odds = Number(rawData.bttsYesOdds) || Number(rawData.btts_yes_odds) || 0;
  } else if (p === "NG" || p === "BTTS - NO" || p === "BTTS NO" || p.includes("NO") || p.includes("NG")) {
    odds = Number(rawData.bttsNoOdds) || Number(rawData.btts_no_odds) || 0;
  }

  return Number.isFinite(odds) && odds > 1 ? Number(odds.toFixed(2)) : 0;
}
