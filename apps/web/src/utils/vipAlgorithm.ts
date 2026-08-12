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
  const probs = { home: 0, draw: 0, away: 0, over25: 0, btts: 0 };
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
      if (i > 0 && j > 0) probs.btts += pij;
    }
  }

  probs.home = clamp01(probs.home);
  probs.draw = clamp01(probs.draw);
  probs.away = clamp01(probs.away);
  probs.over25 = clamp01(probs.over25);
  probs.btts = clamp01(probs.btts);

  return { probs, predictedScore: `${best.i}-${best.j}` };
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
  ov25SheetPct,
  ggSheetPct,
  homeSheetPct,
  drawSheetPct,
  awaySheetPct,
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

  // 3. Head-to-Head Anchoring
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

  const blend = (pPoisson: number, pSheetPct: any, h2hBoost: number = 0) => {
    const sheet =
      Number.isFinite(pSheetPct) && pSheetPct > 0 ? pSheetPct / 100 : null;
    const final = sheet === null ? pPoisson : clamp01(pPoisson * 0.7 + sheet * 0.3);
    return clamp01(final + h2hBoost);
  };

  const pOver = blend(probs.over25, ov25SheetPct, h2hOverBoost);
  const pBtts = blend(probs.btts, ggSheetPct, h2hBttsBoost);
  const pHome = blend(probs.home, homeSheetPct, h2hHomeBoost);
  const pDraw = blend(probs.draw, drawSheetPct, 0); // No H2H boost for draws in this logic
  const pAway = blend(probs.away, awaySheetPct, h2hAwayBoost);

  const candidates = [];

  if (Number.isFinite(ov25SheetPct) && ov25SheetPct > 0) {
    candidates.push({ market: "O/U 2.5", selection: "Over 2.5", pickLabel: "Over 2.5", p: pOver });
    candidates.push({ market: "O/U 2.5", selection: "Under 2.5", pickLabel: "Under 2.5", p: 1 - pOver });
  }

  if (Number.isFinite(ggSheetPct) && ggSheetPct > 0) {
    candidates.push({ market: "BTTS", selection: "Yes", pickLabel: "BTTS — Yes", p: pBtts });
    candidates.push({ market: "BTTS", selection: "No", pickLabel: "BTTS — No", p: 1 - pBtts });
  }

  const has1X2 = (Number.isFinite(homeSheetPct) && homeSheetPct > 0) || 
                 (Number.isFinite(awaySheetPct) && awaySheetPct > 0) || 
                 (Number.isFinite(drawSheetPct) && drawSheetPct > 0);

  if (has1X2) {
    if (pHome >= pAway && pHome >= pDraw) {
      candidates.push({ market: "1X2", selection: "Home", pickLabel: "1X2 — Home", p: pHome });
    } else if (pAway >= pHome && pAway >= pDraw) {
      candidates.push({ market: "1X2", selection: "Away", pickLabel: "1X2 — Away", p: pAway });
    } else {
      candidates.push({ market: "1X2", selection: "Draw", pickLabel: "1X2 — Draw", p: pDraw });
    }
  }

  candidates.sort((a, b) => b.p - a.p);
  const top = candidates[0];

  // 4. Stricter VIP Threshold (0.60 instead of 0.56)
  if (!top || top.p < 0.60) return null;

  let exactOdds = null;
  if (top.market === "1X2") {
    if (top.selection === "Home" && homeSheetPct > 0) exactOdds = Number((100 / homeSheetPct).toFixed(2));
    if (top.selection === "Draw" && drawSheetPct > 0) exactOdds = Number((100 / drawSheetPct).toFixed(2));
    if (top.selection === "Away" && awaySheetPct > 0) exactOdds = Number((100 / awaySheetPct).toFixed(2));
  } else if (top.market === "BTTS") {
    if (top.selection === "Yes" && ggSheetPct > 0) exactOdds = Number((100 / ggSheetPct).toFixed(2));
    if (top.selection === "No" && ggSheetPct > 0) exactOdds = Number((100 / (100 - ggSheetPct)).toFixed(2));
  } else if (top.market === "O/U 2.5") {
    if (top.selection === "Over 2.5" && ov25SheetPct > 0) exactOdds = Number((100 / ov25SheetPct).toFixed(2));
    if (top.selection === "Under 2.5" && ov25SheetPct > 0) exactOdds = Number((100 / (100 - ov25SheetPct)).toFixed(2));
  }

  return {
    ...top,
    predictedScore,
    confidence: Math.round(top.p * 100),
    odds: exactOdds,
    model: {
      lambdaH,
      lambdaA,
      probs: {
        ...probs,
        over25: pOver,
        btts: pBtts,
        home: pHome,
        draw: pDraw,
        away: pAway,
      },
    },
  };
}
