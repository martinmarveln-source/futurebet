require('dotenv').config({path: '.env'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const FACT = [1, 1, 2, 6, 24, 120, 720];

function poissonP(lam, k) {
  return (Math.exp(-lam) * Math.pow(lam, k)) / FACT[k];
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function calculateFormMomentum(formStr) {
  let score = 0;
  const str = String(formStr || "").toUpperCase();
  for (const char of str) {
    if (char === "W") score += 3;
    else if (char === "D") score += 1;
  }
  return score;
}

function deriveLambdas({
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
}) {
  const safe = (x, fallback) =>
    Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : fallback;
  const HGS = safe(hgs, 1.2);
  const HGC = safe(hgc, 1.2);
  const AGS = safe(ags, 1.1);
  const AGC = safe(agc, 1.3);

  const hFormScore = calculateFormMomentum(hFormStr);
  const aFormScore = calculateFormMomentum(aFormStr);
  const formDiff = hFormScore - aFormScore;

  const lambdaHFormAdj = formDiff * 0.02;
  const lambdaAFormAdj = -formDiff * 0.02;

  let hGoalPenalty = 0;
  if (acs > 40) hGoalPenalty += 0.2;
  if (hfts > 40) hGoalPenalty += 0.2;

  let aGoalPenalty = 0;
  if (hcs > 40) aGoalPenalty += 0.2;
  if (afts > 40) aGoalPenalty += 0.2;

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

function computeMarketsFromLambdas(lambdaH, lambdaA) {
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

function computeDerivedPickFromStats({
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
}) {
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

  const blend = (pPoisson, pSheetPct, h2hBoost = 0) => {
    const sheet =
      Number.isFinite(pSheetPct) && pSheetPct > 0 ? pSheetPct / 100 : null;
    const final = sheet === null ? pPoisson : clamp01(pPoisson * 0.7 + sheet * 0.3);
    return clamp01(final + h2hBoost);
  };

  const pOver = blend(probs.over25, ov25SheetPct, h2hOverBoost);
  const pBtts = blend(probs.btts, ggSheetPct, h2hBttsBoost);
  const pHome = blend(probs.home, homeSheetPct, h2hHomeBoost);
  const pDraw = blend(probs.draw, drawSheetPct, 0); 
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

  if (!top || top.p < 0.60) return null;

  return {
    ...top,
    predictedScore,
    probability: Math.round(top.p * 100)
  };
}


function num(v) {
  const s = String(v ?? '').replace(/[%\$,]/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const rows = await sql(`SELECT raw_data FROM matches_cache WHERE match_date = '2026-08-15'`);
  
  let passed = 0;
  let skippedByOdds = 0;
  let finalVIP = 0;

  for (const row of rows) {
    const r = row.raw_data;
    const chance = num(r.chance);
    const rating = num(r.rating);

    if (chance < 65 || rating < 55) continue;
    passed++;

    const derived = computeDerivedPickFromStats({
      hgs: num(r.hgs),
      hgc: num(r.hgc),
      ags: num(r.ags),
      agc: num(r.agc),
      hFormStr: r.hForm,
      aFormStr: r.aForm,
      hcs: num(r.hcs),
      acs: num(r.acs),
      hfts: num(r.hfts),
      afts: num(r.afts),
      h2hGp: num(r.h2hGP),
      h2hH: num(r.h2hH),
      h2hA: num(r.h2hA),
      h2hOv: num(r.h2hOV),
      h2hGg: num(r.h2hGG),
      ov25SheetPct: num(r.ov25),
      ggSheetPct: num(r.gg),
      homeSheetPct: num(r.homeWin),
      drawSheetPct: num(r.draw),
      awaySheetPct: num(r.awayWin),
    });

    if (!derived) {
      continue;
    }

    const rawOdds = {
      home: num(r.homeOdds),
      draw: num(r.drawOdds),
      away: num(r.awayOdds),
      over25: num(r.o25Odds),
      under25: num(r.u25Odds),
      bttsYesOdds: 0, 
    };

    let exactOdds = null;
    if (derived.market === "1X2") {
      if (derived.selection === "Home") exactOdds = rawOdds.home;
      else if (derived.selection === "Draw") exactOdds = rawOdds.draw;
      else if (derived.selection === "Away") exactOdds = rawOdds.away;
    } else if (derived.market === "O/U 2.5") {
      if (derived.selection === "Over 2.5") exactOdds = rawOdds.over25;
      else if (derived.selection === "Under 2.5") exactOdds = rawOdds.under25;
    } else if (derived.market === "BTTS") {
      if (derived.selection === "Yes") exactOdds = rawOdds.bttsYesOdds;
      else exactOdds = null; 
    }

    if (!exactOdds || exactOdds < 1.01) {
      skippedByOdds++;
      console.log(`[SKIPPED] ${r.match} | Pick: ${derived.market} ${derived.selection} | DB Odds: ${exactOdds} (rawOdds: ${JSON.stringify(rawOdds)})`);
      continue;
    }

    finalVIP++;
    console.log(`[KEPT] ${r.match} | Pick: ${derived.selection} | Odds: ${exactOdds}`);
  }

  console.log(`\nStats: Passed Threshold=${passed}, Skipped by Missing Odds=${skippedByOdds}, Final VIP=${finalVIP}`);
}
main().catch(console.error);
