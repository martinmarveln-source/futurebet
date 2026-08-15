require('dotenv').config();
const {neon} = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

// Exact copy of route.ts logic:
const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseSheetDateToThisYear(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const [dStr, monStr] = raw.split("-");
  const day = Number(dStr);
  const monKey = String(monStr || "").trim();
  if (!Number.isFinite(day) || !(monKey in monthMap)) return null;
  const year = new Date().getFullYear();
  const d = new Date(year, monthMap[monKey], day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isToday(d) {
  if (!d) return false;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d.getTime() === t.getTime();
}

function num(v) {
  const s = String(v ?? "").replace(/[%$,]/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function countRecentMatchesFromRecentCell(str) {
  const s = String(str ?? "").trim();
  if (!s) return 0;
  return s.split(",").map((x) => x.trim()).filter(Boolean).filter((x) => !x.includes("1899-12-30") && (x.includes(":") || x.includes(" : "))).length;
}

function countFormLetters(str) {
  return String(str ?? "").trim().toUpperCase().replace(/[^WDL]/g, "").length;
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// -- Vip algorithm copy --
const FACT = [1, 1, 2, 6, 24, 120, 720];
function poissonP(lam, k) { return (Math.exp(-lam) * Math.pow(lam, k)) / FACT[k]; }
function calculateFormMomentum(formStr) {
  let score = 0;
  const str = String(formStr || "").toUpperCase();
  for (const char of str) {
    if (char === "W") score += 3;
    else if (char === "D") score += 1;
  }
  return score;
}
function deriveLambdas({ hgs, hgc, ags, agc, hFormStr, aFormStr, hcs, acs, hfts, afts }) {
  const safe = (x, fallback) => Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : fallback;
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
  const lambdaH = Math.max(0.05, Math.min(4.5, (HGS + AGC) / 2 + lambdaHFormAdj - hGoalPenalty));
  const lambdaA = Math.max(0.05, Math.min(4.5, (AGS + HGC) / 2 + lambdaAFormAdj - aGoalPenalty));
  return { lambdaH, lambdaA };
}
function computeMarketsFromLambdas(lambdaH, lambdaA) {
  const MAX = 6;
  const probs = { home: 0, draw: 0, away: 0, over25: 0, btts: 0 };
  let best = { i: 0, j: 0, prob: 0 };
  const homePoisson = Array.from({ length: MAX + 1 }, (_, i) => poissonP(lambdaH, i));
  const awayPoisson = Array.from({ length: MAX + 1 }, (_, j) => poissonP(lambdaA, j));
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
function computeDerivedPickFromStats({ hgs, hgc, ags, agc, hFormStr, aFormStr, hcs, acs, hfts, afts, h2hGp, h2hH, h2hA, h2hOv, h2hGg, ov25SheetPct, ggSheetPct, homeSheetPct, drawSheetPct, awaySheetPct }) {
  const { lambdaH, lambdaA } = deriveLambdas({ hgs, hgc, ags, agc, hFormStr, aFormStr, hcs, acs, hfts, afts });
  const { probs, predictedScore } = computeMarketsFromLambdas(lambdaH, lambdaA);
  let h2hHomeBoost = 0; let h2hAwayBoost = 0; let h2hOverBoost = 0; let h2hBttsBoost = 0;
  if (Number(h2hGp) >= 3) {
    if (Number(h2hH) > 60) h2hHomeBoost = 0.1;
    if (Number(h2hA) > 60) h2hAwayBoost = 0.1;
    if (Number(h2hOv) > 60) h2hOverBoost = 0.1;
    if (Number(h2hGg) > 60) h2hBttsBoost = 0.1;
  }
  const blend = (pPoisson, pSheetPct, h2hBoost = 0) => {
    const sheet = Number.isFinite(pSheetPct) && pSheetPct > 0 ? pSheetPct / 100 : null;
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
    candidates.push({ market: "BTTS", selection: "Yes", pickLabel: "BTTS - Yes", p: pBtts });
    candidates.push({ market: "BTTS", selection: "No", pickLabel: "BTTS - No", p: 1 - pBtts });
  }
  const has1X2 = (Number.isFinite(homeSheetPct) && homeSheetPct > 0) || (Number.isFinite(awaySheetPct) && awaySheetPct > 0) || (Number.isFinite(drawSheetPct) && drawSheetPct > 0);
  if (has1X2) {
    if (pHome >= pAway && pHome >= pDraw) {
      candidates.push({ market: "1X2", selection: "Home", pickLabel: "1X2 - Home", p: pHome });
    } else if (pAway >= pHome && pAway >= pDraw) {
      candidates.push({ market: "1X2", selection: "Away", pickLabel: "1X2 - Away", p: pAway });
    } else {
      candidates.push({ market: "1X2", selection: "Draw", pickLabel: "1X2 - Draw", p: pDraw });
    }
  }
  candidates.sort((a, b) => b.p - a.p);
  const top = candidates[0];
  if (!top || top.p < 0.60) return null;
  return { ...top, predictedScore, confidence: top.p * 100 }; // Ensure confidence exists
}
// -- End Vip algorithm --

function computeMarketSignal({ market, selection, vals }) {
  let home = 0; let away = 0;
  if (market === "BTTS" && selection === "Yes") { home = vals.hBtts; away = vals.aBtts; }
  else if (market === "BTTS" && selection === "No") { home = 100 - vals.hBtts; away = 100 - vals.aBtts; }
  else if (market === "O/U 2.5" && selection === "Over 2.5") { home = vals.hOv2; away = vals.aOv2; }
  else if (market === "O/U 2.5" && selection === "Under 2.5") { home = 100 - vals.hOv2; away = 100 - vals.aOv2; }
  else if (market === "1X2" && selection === "Home") { home = vals.hWin; away = vals.aLost; }
  else if (market === "1X2" && selection === "Draw") { home = vals.hDraw; away = vals.aDraw; }
  else if (market === "1X2" && selection === "Away") { home = vals.hLost; away = vals.aWin; }
  home = Math.max(0, Math.min(100, home));
  away = Math.max(0, Math.min(100, away));
  return { marketHomeForm: Math.round(home), marketAwayForm: Math.round(away), marketRating: Math.round((home + away) / 2) };
}

async function buildPicksData(minChance, minRating, minRecents) {
  const dbRows = await sql(`SELECT raw_data FROM matches_cache`);
  const table = dbRows.map(r => r.raw_data);
  const col = {
    date: "date", homeAway: "match", time: "time", country: "country", league: "league", table: "table", chance: "chance", rating: "rating", hRecent: "hRecent", aRecent: "aRecent", hForm: "hForm", aForm: "aForm", hGrp: "hGrp", aGrp: "aGrp", hgs: "hgs", hgc: "hgc", ags: "ags", agc: "agc", ov25: "ov25", gg: "gg", home: "homeWin", draw: "draw", away: "awayWin", hBtts: "hBtts", aBtts: "aBtts", hOv2: "hOv2", aOv2: "aOv2", hWin: "hWin", hDraw: "hDraw", hLost: "hLost", aWin: "aWin", aDraw: "aDraw", aLost: "aLost", hppg: "hppg", appg: "appg", hcs: "hcs", acs: "acs", hfts: "hfts", afts: "afts", hgsOver15: "hgsOver15", hgcOver15: "hgcOver15", agsOver15: "agsOver15", agcOver15: "agcOver15", h2hH: "h2hH", h2hD: "h2hD", h2hA: "h2hA", h2hOv: "h2hOV", h2hUn: "h2hUN", h2hGg: "h2hGG", h2hNg: "h2hNG", h2hGp: "h2hGP", h2hRecent: "h2hRecent", flag: "flag", homeOdds: "homeOdds", drawOdds: "drawOdds", awayOdds: "awayOdds", o25Odds: "o25Odds", u25Odds: "u25Odds", bttsYesOdds: "bttsYesOdds"
  };
  const val = (r, key) => (key === undefined ? "" : r[key] ?? "");
  const picks = [];

  for (let i = 0; i < table.length; i++) {
    const r = table[i];
    if (!r) continue;

    const dateStr = val(r, col.date);
    const d = parseSheetDateToThisYear(dateStr);
    
    // TEMPORARY: allow matching 2026-08-15 for test
    const testDate = new Date('2026-08-15T00:00:00');
    if (!d || d.getTime() !== testDate.getTime()) continue;

    const algChance = num(val(r, col.chance));
    const algRating = num(val(r, col.rating));

    if (algChance < minChance || algRating < minRating) continue;

    const hRecentCell = val(r, col.hRecent);
    const aRecentCell = val(r, col.aRecent);
    const hFormStr = val(r, col.hForm);
    const aFormStr = val(r, col.aForm);

    let hRecentCount = countRecentMatchesFromRecentCell(hRecentCell) || countFormLetters(hFormStr);
    let aRecentCount = countRecentMatchesFromRecentCell(aRecentCell) || countFormLetters(aFormStr);

    if (hRecentCount < minRecents || aRecentCount < minRecents) continue;

    const match = val(r, col.homeAway);
    const country = val(r, col.country);
    const league = val(r, col.league);
    const hgs = num(val(r, col.hgs));
    const hgc = num(val(r, col.hgc));
    const ags = num(val(r, col.ags));
    const agc = num(val(r, col.agc));

    const derived = computeDerivedPickFromStats({
      hgs, hgc, ags, agc, hFormStr, aFormStr,
      hcs: num(val(r, col.hcs)), acs: num(val(r, col.acs)),
      hfts: num(val(r, col.hfts)), afts: num(val(r, col.afts)),
      h2hGp: num(val(r, col.h2hGp)), h2hH: num(val(r, col.h2hH)),
      h2hA: num(val(r, col.h2hA)), h2hOv: num(val(r, col.h2hOv)),
      h2hGg: num(val(r, col.h2hGg)), ov25SheetPct: num(val(r, col.ov25)),
      ggSheetPct: num(val(r, col.gg)), homeSheetPct: num(val(r, col.home)),
      drawSheetPct: num(val(r, col.draw)), awaySheetPct: num(val(r, col.away)),
    });

    if (!derived) continue;

    const { market, selection, pickLabel, predictedScore, confidence } = derived;

    const pick = {
      market, selection, pickLabel, predictedScore,
      odds: null,
      rawOdds: {
        home: num(val(r, col.homeOdds)), draw: num(val(r, col.drawOdds)),
        away: num(val(r, col.awayOdds)), over25: num(val(r, col.o25Odds)),
        under25: num(val(r, col.u25Odds)),
      },
    };

    if (pick.market === "1X2") {
      if (pick.selection === "Home") pick.odds = pick.rawOdds.home;
      else if (pick.selection === "Draw") pick.odds = pick.rawOdds.draw;
      else if (pick.selection === "Away") pick.odds = pick.rawOdds.away;
    } else if (pick.market === "O/U 2.5") {
      if (pick.selection === "Over 2.5") pick.odds = pick.rawOdds.over25;
      else if (pick.selection === "Under 2.5") pick.odds = pick.rawOdds.under25;
    } else if (pick.market === "BTTS") {
      if (pick.selection === "Yes") pick.odds = num(val(r, col.bttsYesOdds));
      else pick.odds = null; 
    }

    if (!pick.odds || pick.odds < 1.01) {
       console.log("SKIPPED (no odds)", match, "| Pick:", market, selection, "| Raw Odds:", pick.rawOdds, "bttsYesOdds:", num(val(r, col.bttsYesOdds)));
       continue;
    }

    picks.push(pick);
  }
  return picks;
}

buildPicksData(65, 55, 0).then(p => {
   console.log("Final valid picks length:", p.length);
}).catch(console.error);
