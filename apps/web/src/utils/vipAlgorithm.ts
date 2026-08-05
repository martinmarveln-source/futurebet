export const FACT = [1, 1, 2, 6, 24, 120, 720];

export function poissonP(lam: number, k: number) {
  return (Math.exp(-lam) * Math.pow(lam, k)) / FACT[k];
}

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function deriveLambdas({ hgs, hgc, ags, agc }: any) {
  const safe = (x: any, fallback: number) =>
    Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : fallback;
  const HGS = safe(hgs, 1.2);
  const HGC = safe(hgc, 1.2);
  const AGS = safe(ags, 1.1);
  const AGC = safe(agc, 1.3);

  const lambdaH = Math.max(0.05, Math.min(4.5, (HGS + AGC) / 2));
  const lambdaA = Math.max(0.05, Math.min(4.5, (AGS + HGC) / 2));
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
  ov25SheetPct,
  ggSheetPct,
  homeSheetPct,
  drawSheetPct,
  awaySheetPct,
}: any) {
  const { lambdaH, lambdaA } = deriveLambdas({ hgs, hgc, ags, agc });
  const { probs, predictedScore } = computeMarketsFromLambdas(lambdaH, lambdaA);

  const blend = (pPoisson: number, pSheetPct: any) => {
    const sheet =
      Number.isFinite(pSheetPct) && pSheetPct > 0 ? pSheetPct / 100 : null;
    return sheet === null ? pPoisson : clamp01(pPoisson * 0.7 + sheet * 0.3);
  };

  const pOver = blend(probs.over25, ov25SheetPct);
  const pBtts = blend(probs.btts, ggSheetPct);
  const pHome = blend(probs.home, homeSheetPct);
  const pDraw = blend(probs.draw, drawSheetPct);
  const pAway = blend(probs.away, awaySheetPct);

  const candidates = [
    {
      market: "O/U 2.5",
      selection: "Over 2.5",
      pickLabel: "Over 2.5",
      p: pOver,
    },
    {
      market: "O/U 2.5",
      selection: "Under 2.5",
      pickLabel: "Under 2.5",
      p: 1 - pOver,
    },
    { market: "BTTS", selection: "Yes", pickLabel: "BTTS — Yes", p: pBtts },
    { market: "BTTS", selection: "No", pickLabel: "BTTS — No", p: 1 - pBtts },
  ];

  if (pHome >= pAway && pHome >= pDraw) {
    candidates.push({
      market: "1X2",
      selection: "Home",
      pickLabel: "1X2 — Home",
      p: pHome,
    });
  } else if (pAway >= pHome && pAway >= pDraw) {
    candidates.push({
      market: "1X2",
      selection: "Away",
      pickLabel: "1X2 — Away",
      p: pAway,
    });
  } else {
    candidates.push({
      market: "1X2",
      selection: "Draw",
      pickLabel: "1X2 — Draw",
      p: pDraw,
    });
  }

  candidates.sort((a, b) => b.p - a.p);
  const top = candidates[0];

  if (!top || top.p < 0.56) return null;

  return {
    ...top,
    predictedScore,
    confidence: Math.round(top.p * 100),
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
