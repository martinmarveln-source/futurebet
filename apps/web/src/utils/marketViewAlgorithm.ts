// @ts-nocheck
/**
 * marketViewAlgorithm.ts
 * Deterministic algorithm: given a match object + market key,
 * computes the best side using GP, stats, H2H, and form.
 */

export const MARKET_OPTIONS = [
  { key: "",               label: "All Markets" },
  { key: "1X2",            label: "1X2" },
  { key: "BTTS",           label: "BTTS" },
  { key: "O/U 1.5",        label: "Over/Under 1.5" },
  { key: "O/U 2.5",        label: "Over/Under 2.5" },
  { key: "O/U 3.5",        label: "Over/Under 3.5" },
  { key: "O/U 4.5",        label: "Over/Under 4.5" },
  { key: "Double Chance",  label: "Double Chance" },
];

function toNum(v) {
  const n = Number(String(v || "").replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}
function toPct(v) { const n = toNum(v); return n > 1 ? n : n * 100; }
function formScore(s) {
  let sc = 0;
  for (const c of String(s || "").toUpperCase()) {
    if (c === "W") sc += 3; else if (c === "D") sc += 1;
  }
  return sc;
}
function best(opts) { return opts.slice().sort((a, b) => b.score - a.score)[0]; }

function poissonP(lam, k) {
  const FACT = [1, 1, 2, 6, 24, 120, 720];
  return (Math.exp(-lam) * Math.pow(lam, k)) / (FACT[k] ?? 720);
}
function inferLambda(ov25P) {
  let lo = 0.01, hi = 8.0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const p = 1 - poissonP(mid,0) - poissonP(mid,1) - poissonP(mid,2);
    if (p < ov25P) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function compute1X2(m) {
  const homeProb = toPct(m?.homeWin ?? m?.hWin);
  const drawProb = toPct(m?.draw   ?? m?.hDraw);
  const awayProb = toPct(m?.awayWin ?? m?.aWin);
  const h2hGP = toNum(m?.H2H_GP ?? m?.h2hGP);
  const h2hH  = toPct(m?.H2H_H  ?? m?.h2hH);
  const h2hA  = toPct(m?.H2H_A  ?? m?.h2hA);
  const hForm = formScore(m?.hForm ?? m?.form?.homeStr);
  const aForm = formScore(m?.aForm ?? m?.form?.awayStr);
  const hppg  = toNum(m?.hppg);
  const appg  = toNum(m?.appg);
  
  const hWin = toPct(m?.hWin); const aLost = toPct(m?.aLost);
  const hDraw = toPct(m?.hDraw); const aDraw = toPct(m?.aDraw);
  const hLost = toPct(m?.hLost); const aWin = toPct(m?.aWin);

  const opts = [
    { option: "Home", label: "Home Win", prob: homeProb, odds: toNum(m?.homeOdds) || null,
      score: 0.50*homeProb + 0.30*(h2hGP>=3&&h2hH>60?8:0) + 0.20*(hForm>aForm?8:0) + hppg*2,
      rating: (hWin + aLost) / 2 },
    { option: "Draw", label: "Draw",     prob: drawProb, odds: toNum(m?.drawOdds) || null,
      score: 0.50*drawProb,
      rating: (hDraw + aDraw) / 2 },
    { option: "Away", label: "Away Win", prob: awayProb, odds: toNum(m?.awayOdds) || null,
      score: 0.50*awayProb + 0.30*(h2hGP>=3&&h2hA>60?8:0) + 0.20*(aForm>hForm?8:0) + appg*2,
      rating: (hLost + aWin) / 2 },
  ];
  const w = best(opts);
  return { market:"1X2", option:w.option, label:w.label, prob:Math.round(w.prob),
           odds:w.odds>1?w.odds:null, hasOdds:w.odds>1, rating: Math.round(w.rating) };
}

function computeBTTS(m) {
  const gg  = toPct(m?.gg);
  const ng  = toPct(m?.ng ?? (100-gg));
  const hB  = toPct(m?.hBtts);
  const aB  = toPct(m?.aBtts);
  const avg = (hB + aB) / 2;
  const h2hGP = toNum(m?.H2H_GP ?? m?.h2hGP);
  const h2hGG = toPct(m?.H2H_GG ?? m?.h2hGG);

  const hcs = toPct(m?.hcs);
  const acs = toPct(m?.acs);
  const hfts = toPct(m?.hfts);
  const afts = toPct(m?.afts);
  const bttsPotential = ( (100 - hfts) + (100 - acs) + (100 - afts) + (100 - hcs) ) / 4;

  const h2hScore = h2hGP >= 3 ? h2hGG : 50;
  const bY = 0.40*gg + 0.20*avg + 0.20*bttsPotential + 0.20*h2hScore;
  const bN = 0.40*ng + 0.20*(100-avg) + 0.20*(100-bttsPotential) + 0.20*(100-h2hScore);
  const yes = bY >= bN;
  const odds = yes ? (toNum(m?.bttsYesOdds)>1?toNum(m?.bttsYesOdds):null) : (toNum(m?.bttsNoOdds)>1?toNum(m?.bttsNoOdds):null);
  const pureYes = avg;
  const pureNo = (100 - hB + 100 - aB) / 2;
  const finalYesRating = (pureYes + bttsPotential) / 2;
  const finalNoRating = (pureNo + (100 - bttsPotential)) / 2;
  const rating = yes ? finalYesRating : finalNoRating;
  return { market:"BTTS", option:yes?"Yes":"No", label:yes?"BTTS Yes":"BTTS No",
           prob:Math.round(yes?gg:ng), odds, hasOdds:!!odds, rating: Math.round(rating) };
}

function computeOU(m, line) {
  const ov25P = toPct(m?.ov25) / 100;
  const lam = ov25P > 0 ? inferLambda(ov25P) : 1.8;
  
  const getPOver = (lambda, l) => {
    let pU = poissonP(lambda,0)+poissonP(lambda,1);
    if (l===2.5) pU += poissonP(lambda,2);
    if (l===3.5) pU += poissonP(lambda,2)+poissonP(lambda,3);
    if (l===4.5) pU += poissonP(lambda,2)+poissonP(lambda,3)+poissonP(lambda,4);
    return Math.max(0, Math.min(1, 1-pU));
  };

  const pO = getPOver(lam, line);
  const pUn = 1-pO;
  
  const hOv2 = toPct(m?.hOv2), aOv2 = toPct(m?.aOv2);
  const lamH = hOv2 > 0 ? inferLambda(hOv2 / 100) : 1.8;
  const lamA = aOv2 > 0 ? inferLambda(aOv2 / 100) : 1.8;
  
  const hStatO = getPOver(lamH, line) * 100;
  const aStatO = getPOver(lamA, line) * 100;
  const pureAvgO = (hStatO + aStatO) / 2;
  const pureAvgU = ((100 - hStatO) + (100 - aStatO)) / 2;
  
  const hcs_temp = toPct(m?.hcs);
  const acs_temp = toPct(m?.acs);
  const hfts_temp = toPct(m?.hfts);
  const afts_temp = toPct(m?.afts);
  
  const ftsNotRate = ((100 - hfts_temp) + (100 - afts_temp)) / 2;
  const csRate = (hcs_temp + acs_temp) / 2;
  
  const avgO = (pureAvgO + ftsNotRate) / 2;
  const avgU = (pureAvgU + csRate) / 2;

  const h2hGP = toNum(m?.H2H_GP??m?.h2hGP), h2hOV = toPct(m?.H2H_OV??m?.h2hOV);
  const h2hScore = h2hGP >= 3 ? h2hOV : 50;

  const hgsO15 = toPct(m?.hgsOver15);
  const hgcO15 = toPct(m?.hgcOver15);
  const agsO15 = toPct(m?.agsOver15);
  const agcO15 = toPct(m?.agcOver15);
  const goalsPotential = (hgsO15 + agcO15 + agsO15 + hgcO15) / 4;

  const hcs = toPct(m?.hcs);
  const acs = toPct(m?.acs);
  const hfts = toPct(m?.hfts);
  const afts = toPct(m?.afts);
  const csFtsUnder = (hcs + acs + hfts + afts) / 4;
  const csFtsOver = 100 - csFtsUnder;

  const sO = 0.40*(pO*100) + 0.20*((hOv2+aOv2)/2) + 0.10*goalsPotential + 0.10*csFtsOver + 0.20*h2hScore;
  const sU = 0.40*(pUn*100) + 0.20*(100 - (hOv2+aOv2)/2) + 0.10*(100 - goalsPotential) + 0.10*csFtsUnder + 0.20*(100 - h2hScore);
  const over = sO >= sU;
  
  const mk = `O/U ${line}`;
  const oMap = { 1.5:[m?.o15Odds,m?.u15Odds], 2.5:[m?.o25Odds,m?.u25Odds], 3.5:[m?.o35Odds,m?.u35Odds], 4.5:[m?.o45Odds,m?.u45Odds] };
  const [oOdds, uOdds] = oMap[line] || [];
  const odds = over ? (toNum(oOdds)>1?toNum(oOdds):null) : (toNum(uOdds)>1?toNum(uOdds):null);
  const lbl = over ? `Over ${line}` : `Under ${line}`;
  return { market:mk, option:lbl, label:lbl, prob:Math.round(over?pO*100:pUn*100), odds, hasOdds:!!odds, rating: Math.round(over ? avgO : avgU) };
}

function computeDC(m) {
  const hp = toPct(m?.homeWin??m?.hWin), dp = toPct(m?.draw??m?.hDraw), ap = toPct(m?.awayWin??m?.aWin);
  const h = toNum(m?.homeOdds), d = toNum(m?.drawOdds), a = toNum(m?.awayOdds);
  const hWin = toPct(m?.hWin), aLost = toPct(m?.aLost), hDraw = toPct(m?.hDraw), aDraw = toPct(m?.aDraw), hLost = toPct(m?.hLost), aWin = toPct(m?.aWin);
  
  let dcOdds = { h1x:null, h12:null, hx2:null };
  if (h>1&&d>1&&a>1) {
    const mg = 1/h+1/d+1/a, t1=(1/h)/mg, tX=(1/d)/mg, t2=(1/a)/mg, M=1.05;
    dcOdds = { h1x:1/((t1+tX)*M), h12:1/((t1+t2)*M), hx2:1/((tX+t2)*M) };
  }
  const opts = [
    { option:"1X", label:"Home or Draw", prob:Math.min(100,hp+dp), score:Math.min(100,hp+dp), odds:dcOdds.h1x, rating: ((hWin+hDraw)+(aLost+aDraw))/2 },
    { option:"12", label:"Home or Away", prob:Math.min(100,hp+ap), score:Math.min(100,hp+ap), odds:dcOdds.h12, rating: ((hWin+hLost)+(aWin+aLost))/2 },
    { option:"X2", label:"Draw or Away", prob:Math.min(100,dp+ap), score:Math.min(100,dp+ap), odds:dcOdds.hx2, rating: ((hLost+hDraw)+(aWin+aDraw))/2 },
  ];
  const w = best(opts);
  const finalOdds = w.odds&&w.odds>1?w.odds:null;
  return { market:"Double Chance", option:w.option, label:w.label, prob:Math.round(w.prob), odds:finalOdds, hasOdds:!!finalOdds, rating: Math.round(w.rating) };
}

export function computeMarketViewPick(match, market) {
  if (!market || !match) return null;
  if (market === "1X2")           return compute1X2(match);
  if (market === "BTTS")          return computeBTTS(match);
  if (market === "O/U 1.5")       return computeOU(match, 1.5);
  if (market === "O/U 2.5")       return computeOU(match, 2.5);
  if (market === "O/U 3.5")       return computeOU(match, 3.5);
  if (market === "O/U 4.5")       return computeOU(match, 4.5);
  if (market === "Double Chance")  return computeDC(match);
  return null;
}
