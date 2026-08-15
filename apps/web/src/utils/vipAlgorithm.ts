export const FACT = [1, 1, 2, 6, 24, 120, 720];

export function poissonP(lam: number, k: number) {
  return (Math.exp(-lam) * Math.pow(lam, k)) / FACT[k];
}

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function calculateFormMomentum(formStr: string) {
  let score = 0;
  const str = String(formStr || "").toUpperCase();
  for (const char of str) {
    if (char === "W") score += 3;
    else if (char === "D") score += 1;
  }
  return score;
}

export function deriveLambdas({
  hgs,
  hgc,
  ags,
  agc,
  hFormStr,
  aFormStr,
  hcs,
  acs,
  hfts,
  afts,
}: any) {
  const safe = (x: any, fallback: number) =>
    Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : fallback;
  const HGS = safe(hgs, 1.2);
  const HGC = safe(hgc, 1.2);
  const AGS = safe(ags, 1.1);
  const AGC = safe(agc, 1.3);

  // 1. Form Momentum Integration
  const hFormScore = calculateFormMomentum(hFormStr);
  const aFormScore = calculateFormMomentum(aFormStr);
  const formDiff = hFormScore - aFormScore;

  // ML-inspired heuristic: Each point of form difference shifts expected goals by 0.02
  const lambdaHFormAdj = formDiff * 0.02;
  const lambdaAFormAdj = -formDiff * 0.02;

  // 2. Defensive/Offensive Extreme Penalties
  let hGoalPenalty = 0;
  if (acs > 40) hGoalPenalty += 0.2; // Away has strong defense
  if (hfts > 40) hGoalPenalty += 0.2; // Home struggles to score

  let aGoalPenalty = 0;
  if (hcs > 40) aGoalPenalty += 0.2; // Home has strong defense
  if (afts > 40) aGoalPenalty += 0.2; // Away struggles to score

  const lambdaH = Math.max(
    0.05,
    Math.min(4.5, (HGS + AGC) / 2 + lambdaHFormAdj - hGoalPenalty)
  );
  const lambdaA = Math.max(
    0.05,
    Math.min(4.5, (AGS + HGC) / 2 + lambdaAFormAdj - aGoalPenalty)
  );
  
  return { lambdaH, lambdaA };
}

export function computeMarketsFromLambdas(lambdaH: number, lambdaA: number) {
  const MAX = 6;
  const probs = { home: 0, draw: 0, away: 0, over25: 0, over15: 0, btts: 0 };
  let best = { i: 0, j: 0, prob: 0 };

  const homePoisson = Array.from({ length: MAX + 1 }, (_, i) =>
    poissonP(lambdaH, i)
  );
  const awayPoisson = Array.from({ length: MAX + 1 }, (_, j) =>
    poissonP(lambdaA, j)
  );

  for (let i = 0; i <= MAX; i++) {
    for (let j = 0; j <= MAX; j++) {
      const pij = homePoisson[i] * awayPoisson[j];

      if (pij > best.prob) best = { i, j, prob: pij };

      if (i > j) probs.home += pij;
      else if (i === j) probs.draw += pij;
      else probs.away += pij;

      if (i + j >= 3) probs.over25 += pij;
      if (i + j >= 2) probs.over15 += pij;
      if (i > 0 && j > 0) probs.btts += pij;
    }
  }

  probs.home = clamp01(probs.home);
  probs.draw = clamp01(probs.draw);
  probs.away = clamp01(probs.away);
  probs.over25 = clamp01(probs.over25);
  probs.over15 = clamp01(probs.over15);
  probs.btts = clamp01(probs.btts);

  return { probs, predictedScore: `${best.i}-${best.j}` };
}

export function getDoubleChanceOdds(rawOdds: any) {
  const h = Number(rawOdds?.home);
  const d = Number(rawOdds?.draw);
  const a = Number(rawOdds?.away);

  if (!h || !d || !a || h <= 1 || d <= 1 || a <= 1)
    return { h1x: 0, h12: 0, hx2: 0 };

  const implied1 = 1 / h;
  const impliedX = 1 / d;
  const implied2 = 1 / a;

  const margin = implied1 + impliedX + implied2;
  const true1 = implied1 / margin;
  const trueX = impliedX / margin;
  const true2 = implied2 / margin;

  const dcMargin = 1.05;

  return {
    h1x: Number((1 / ((true1 + trueX) * dcMargin)).toFixed(2)),
    h12: Number((1 / ((true1 + true2) * dcMargin)).toFixed(2)),
    hx2: Number((1 / ((trueX + true2) * dcMargin)).toFixed(2)),
  };
}

export function computeDerivedPickFromStats({
  hgs,
  hgc,
  ags,
  agc,
  hFormStr,
  aFormStr,
  hcs,
  acs,
  hfts,
  afts,
  h2hGp,
  h2hH,
  h2hA,
  h2hOv,
  h2hGg,
  rawOdds,
}: any) {
  const { lambdaH, lambdaA } = deriveLambdas({
    hgs,
    hgc,
    ags,
    agc,
    hFormStr,
    aFormStr,
    hcs,
    acs,
    hfts,
    afts,
  });

  const { probs, predictedScore } = computeMarketsFromLambdas(lambdaH, lambdaA);

  let h2hHomeBoost = 0;
  let h2hAwayBoost = 0;
  let h2hOverBoost = 0;
  let h2hBttsBoost = 0;

  if (Number(h2hGp) >= 3) {
    if (Number(h2hH) > 60) h2hHomeBoost = 0.1;
    if (Number(h2hA) > 60) h2hAwayBoost = 0.1;
    if (Number(h2hOv) > 60) h2hOverBoost = 0.1;
    if (Number(h2hGg) > 60) h2hBttsBoost = 0.1;
  }

  const pOver25 = clamp01(probs.over25 + h2hOverBoost);
  const pUnder25 = clamp01(1 - probs.over25);
  const pOver15 = clamp01(probs.over15 + (h2hOverBoost > 0 ? 0.05 : 0));
  const pUnder15 = clamp01(1 - probs.over15);
  const pBtts = clamp01(probs.btts + h2hBttsBoost);
  const pBttsNo = clamp01(1 - probs.btts);
  const pHome = clamp01(probs.home + h2hHomeBoost);
  const pDraw = clamp01(probs.draw); 
  const pAway = clamp01(probs.away + h2hAwayBoost);
  
  const p1X = clamp01(pHome + pDraw);
  const p12 = clamp01(pHome + pAway);
  const pX2 = clamp01(pDraw + pAway);

  const dcOdds = getDoubleChanceOdds(rawOdds);

  const getBestInGroup = (options: any[]) => {
    const valid = options.filter(o => o && Number.isFinite(o.odds) && o.odds >= 1.34);
    if (valid.length === 0) return null;
    valid.sort((a, b) => b.p - a.p);
    return valid[0];
  };

  // 1. 1X2 Market
  let top = getBestInGroup([
    { market: "1X2", selection: "Home", pickLabel: "1X2 - Home", p: pHome, odds: Number(rawOdds?.home) || 0 },
    { market: "1X2", selection: "Draw", pickLabel: "1X2 - Draw", p: pDraw, odds: Number(rawOdds?.draw) || 0 },
    { market: "1X2", selection: "Away", pickLabel: "1X2 - Away", p: pAway, odds: Number(rawOdds?.away) || 0 }
  ]);

  // 2. Double Chance
  if (!top) {
    top = getBestInGroup([
      { market: "Double Chance", selection: "1X", pickLabel: "Double Chance - 1X", p: p1X, odds: dcOdds.h1x },
      { market: "Double Chance", selection: "12", pickLabel: "Double Chance - 12", p: p12, odds: dcOdds.h12 },
      { market: "Double Chance", selection: "X2", pickLabel: "Double Chance - X2", p: pX2, odds: dcOdds.hx2 }
    ]);
  }

  // 3. Over/Under 2.5
  if (!top) {
    top = getBestInGroup([
      { market: "O/U 2.5", selection: "Over 2.5", pickLabel: "Over 2.5", p: pOver25, odds: Number(rawOdds?.over25) || 0 },
      { market: "O/U 2.5", selection: "Under 2.5", pickLabel: "Under 2.5", p: pUnder25, odds: Number(rawOdds?.under25) || 0 }
    ]);
  }

  // 4. Over/Under 1.5
  if (!top) {
    top = getBestInGroup([
      { market: "O/U 1.5", selection: "Over 1.5", pickLabel: "Over 1.5", p: pOver15, odds: Number(rawOdds?.over15) || 0 },
      { market: "O/U 1.5", selection: "Under 1.5", pickLabel: "Under 1.5", p: pUnder15, odds: Number(rawOdds?.under15) || 0 }
    ]);
  }

  // 5. BTTS
  if (!top) {
    top = getBestInGroup([
      { market: "BTTS", selection: "Yes", pickLabel: "BTTS - Yes", p: pBtts, odds: Number(rawOdds?.bttsYes) || 0 },
      { market: "BTTS", selection: "No", pickLabel: "BTTS - No", p: pBttsNo, odds: Number(rawOdds?.bttsNo) || 0 }
    ]);
  }

  if (!top || top.p < 0.60) return null;

  return {
    ...top,
    predictedScore,
    confidence: Math.round(top.p * 100),
    model: {
      lambdaH,
      lambdaA,
      probs: {
        ...probs,
        over25: pOver25,
        btts: pBtts,
        home: pHome,
        draw: pDraw,
        away: pAway,
      },
    },
  };
}

export function checkIfPickWon(ftScore: string | null | undefined, market: string, selection: string): boolean | null {
  if (!ftScore) return null;
  // Normalize ':' to '-' since some sources use '2:1' and others use '2-1'
  const normalizedScore = String(ftScore).replace(':', '-');
  if (!normalizedScore.includes("-")) return null;
  const [h, a] = normalizedScore.split("-").map(Number);
  if (isNaN(h) || isNaN(a)) return null;

  if (market === "1X2") {
    if (selection === "Home") return h > a;
    if (selection === "Away") return a > h;
    if (selection === "Draw") return h === a;
  }
  if (market === "O/U 2.5" || market === "Over/Under") {
    if (selection === "Over 2.5" || selection === "Over") return h + a > 2;
    if (selection === "Under 2.5" || selection === "Under") return h + a < 3;
  }
  if (market === "O/U 1.5") {
    if (selection === "Over 1.5") return h + a > 1;
    if (selection === "Under 1.5") return h + a < 2;
  }
  if (market === "BTTS") {
    if (selection === "Yes") return h > 0 && a > 0;
    if (selection === "No") return h === 0 || a === 0;
  }
  if (market === "Double Chance") {
    if (selection === "1X" || selection === "Home or Draw") return h >= a;
    if (selection === "12" || selection === "Home or Away") return h !== a;
    if (selection === "X2" || selection === "Draw or Away" || selection === "Away or Draw") return a >= h;
  }

  return null;
}

