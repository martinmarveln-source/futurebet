// @ts-nocheck
export const revalidate = 28800; // 8 hours
export const dynamic = "force-dynamic";

/* =========================
   MEMORY CACHE & LOCK
========================= */
let CACHE = null;
let CACHE_TIME = 0;
let INFLIGHT = null;

const CACHE_TTL = 1000 * 60 * 60 * 8; // 8 hours
const STALE_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours stale fallback
const FETCH_TIMEOUT = 7000;
const FETCH_RETRIES = 2;
const MAX_OUTPUT_PICKS = 14;

/* =========================
   🔥 UPGRADE: BOOKIE ROUTER ENGINE
========================= */
function generateBookieRoutes(matchName, market) {
  if (!matchName || !market) return null;
  const cleanMatch = encodeURIComponent(
    String(matchName).replace(/\s+/g, "-").toLowerCase()
  );
  const cleanMarket = encodeURIComponent(
    String(market).replace(/\s+/g, "").toLowerCase()
  );
  const payload = `${cleanMatch}_${cleanMarket}`;

  return {
    xBet: `https://1xbet.ng/en/line/football?betslip=${payload}`,
    sportyBet: `https://www.sportybet.com/ng/m/sports/football?loadslip=${payload}`,
    betway: `https://www.betway.com.ng/sport/soccer?bets=${payload}`,
  };
}

/* =========================
   CSV PARSER
========================= */
function parseCSV(text) {
  text = String(text ?? "");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      cell = "";

      if (row.some((c) => String(c ?? "").trim())) rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (row.some((c) => String(c ?? "").trim())) rows.push(row);

  return rows.map((r) => r.map((c) => String(c ?? "").trim()));
}

/* =========================
   HELPERS & DATE ENGINE
========================= */
const monthMap = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function num(v) {
  const s = String(v ?? "")
    .replace(/[%$,]/g, "")
    .trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizeHeader(h) {
  return String(h ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheAge() {
  return CACHE_TIME ? Date.now() - CACHE_TIME : Number.POSITIVE_INFINITY;
}

function hasFreshCache() {
  return !!CACHE && cacheAge() < CACHE_TTL;
}

function hasStaleCache() {
  return !!CACHE && cacheAge() < STALE_CACHE_TTL;
}

function cacheHeaders() {
  return {
    "Cache-Control": "public, s-maxage=28800, stale-while-revalidate=86400",
  };
}

function shapeResult(
  result,
  { compact = false, premium = false, limit = MAX_OUTPUT_PICKS } = {}
) {
  const safeLimit = clamp(num(limit) || MAX_OUTPUT_PICKS, 1, MAX_OUTPUT_PICKS);
  const rawPicks = result.picks || [];
  const picks = compact
    ? rawPicks.slice(0, safeLimit).map((p) => ({
        id: p.id,
        match: p.match,
        date: p.date,
        time: p.time,
        league: p.league,
        market: p.market,
        selection: p.selection,
        pickLabel: p.pickLabel,
        predictedScore: p.predictedScore,
        confidence: p.confidence,
        vipScore: p.vipScore,
        routeLinks: p.routeLinks, // 🔥 Routed links available in compact mode
      }))
    : rawPicks.slice(0, safeLimit);

  return {
    meta: {
      ...(result.meta || {}),
      total: picks.length,
      compact,
      premium,
      cacheAgeSeconds: CACHE_TIME ? Math.floor(cacheAge() / 1000) : null,
    },
    picks,
  };
}

function topKey(obj) {
  let bestKey = null;
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(obj || {})) {
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  return bestKey;
}

function probabilitySignal(v) {
  const n = num(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return clamp(n / 100, 0, 1);
}

function normalize1X2(home, draw, away) {
  const h = Math.max(0, num(home));
  const d = Math.max(0, num(draw));
  const a = Math.max(0, num(away));
  const total = h + d + a;
  if (!total) return { available: false, home: null, draw: null, away: null };
  return { available: true, home: h / total, draw: d / total, away: a / total };
}

function blendProbability(model, signal) {
  if (signal === null || signal === undefined) return model;
  const diff = Math.abs(model - signal);
  const weight = diff <= 0.08 ? 0.38 : diff <= 0.16 ? 0.28 : 0.18;
  return model * (1 - weight) + signal * weight;
}

function todayWAT() {
  const now = new Date();
  const watNow = new Date(now.getTime() + 3600000);
  return new Date(
    Date.UTC(watNow.getUTCFullYear(), watNow.getUTCMonth(), watNow.getUTCDate())
  );
}

function parseSheetDate(str) {
  if (!str) return null;
  const clean = String(str).replace(/\s+/g, "").trim();
  const m = clean.match(/^(\d{1,2})-([A-Za-z]{3})$/);
  if (!m) return null;

  const day = Number(m[1]);
  const monKey = m[2][0].toUpperCase() + m[2].slice(1).toLowerCase();

  if (!(monKey in monthMap) || !Number.isFinite(day) || day < 1 || day > 31)
    return null;

  const today = todayWAT();
  const month = monthMap[monKey];
  const year = today.getUTCFullYear();
  const finalYear = month < today.getUTCMonth() ? year + 1 : year;

  return new Date(Date.UTC(finalYear, month, day));
}

function sameDay(a, b) {
  return !!a && !!b && a.getTime() === b.getTime();
}

/* =========================
   FORM MULTIPLIER
========================= */
function formMultiplier(formStr) {
  if (!formStr) return 1;
  const clean = String(formStr).toUpperCase();
  const wins = (clean.match(/W/g) || []).length;
  const draws = (clean.match(/D/g) || []).length;
  const losses = (clean.match(/L/g) || []).length;
  const played = wins + draws + losses;

  if (!played) return 1;

  let factor = 1 + wins * 0.035 + draws * 0.005 - losses * 0.03;
  if (played <= 2) factor = 1 + (factor - 1) * 0.5;
  if (played === 3) factor = 1 + (factor - 1) * 0.75;

  return clamp(factor, 0.82, 1.18);
}

function leagueAdjustment(league) {
  if (!league) return 1;
  const s = String(league).toLowerCase();
  const highGoal = [
    "netherlands",
    "germany",
    "belgium",
    "norway",
    "sweden",
    "denmark",
  ];
  const lowGoal = ["france", "italy", "greece", "algeria"];

  if (highGoal.some((l) => s.includes(l))) return 1.07;
  if (lowGoal.some((l) => s.includes(l))) return 0.93;
  return 1;
}

/* =========================
   POISSON ENGINE
========================= */
const FACT = [1, 1, 2, 6, 24, 120, 720, 5040];

function poisson(lam, k) {
  return (Math.exp(-lam) * Math.pow(lam, k)) / FACT[k];
}

function deriveLambdas({ hgs = 1.2, hgc = 1.2, ags = 1.1, agc = 1.3 }) {
  const HOME_ADV = 1.12;
  const lambdaH = clamp(((hgs + agc) / 2) * HOME_ADV, 0.08, 4.5);
  const lambdaA = clamp((ags + hgc) / 2, 0.08, 4.5);
  return { lambdaH, lambdaA };
}

function computeMarkets(lambdaH, lambdaA) {
  const MAX = 7;
  const probs = { home: 0, draw: 0, away: 0, over25: 0, btts: 0 };
  let best = { i: 0, j: 0, p: 0 };

  const homePoisson = Array.from({ length: MAX + 1 }, (_, i) =>
    poisson(lambdaH, i)
  );
  const awayPoisson = Array.from({ length: MAX + 1 }, (_, j) =>
    poisson(lambdaA, j)
  );

  for (let i = 0; i <= MAX; i++) {
    for (let j = 0; j <= MAX; j++) {
      const p = homePoisson[i] * awayPoisson[j];

      if (p > best.p) best = { i, j, p };

      if (i > j) probs.home += p;
      else if (i === j) probs.draw += p;
      else probs.away += p;

      if (i + j >= 3) probs.over25 += p;
      if (i > 0 && j > 0) probs.btts += p;
    }
  }
  return { probs, predicted: `${best.i}-${best.j}` };
}

/* =========================
   PICK ENGINE
========================= */
function derivePick({
  hgs,
  hgc,
  ags,
  agc,
  homeForm,
  awayForm,
  league,
  ov25,
  gg,
  home,
  draw,
  away,
}) {
  const { lambdaH: baseH, lambdaA: baseA } = deriveLambdas({
    hgs,
    hgc,
    ags,
    agc,
  });
  const formH = formMultiplier(homeForm);
  const formA = formMultiplier(awayForm);
  const leagueFactor = leagueAdjustment(league);

  const lambdaH = clamp(baseH * formH * leagueFactor, 0.08, 4.8);
  const lambdaA = clamp(baseA * formA * leagueFactor, 0.08, 4.8);

  const { probs, predicted } = computeMarkets(lambdaH, lambdaA);

  const sheetOU = probabilitySignal(ov25);
  const sheetBTTS = probabilitySignal(gg);
  const sheet1X2 = normalize1X2(home, draw, away);

  const pOver = blendProbability(probs.over25, sheetOU);
  const pUnder = 1 - pOver;
  const pBttsYes = blendProbability(probs.btts, sheetBTTS);
  const pBttsNo = 1 - pBttsYes;

  const pHome = sheet1X2.available
    ? blendProbability(probs.home, sheet1X2.home)
    : probs.home;
  const pDraw = sheet1X2.available
    ? blendProbability(probs.draw, sheet1X2.draw)
    : probs.draw;
  const pAway = sheet1X2.available
    ? blendProbability(probs.away, sheet1X2.away)
    : probs.away;

  const markets = [
    { m: "O/U 2.5", s: "Over 2.5", l: "Over 2.5", p: pOver },
    { m: "O/U 2.5", s: "Under 2.5", l: "Under 2.5", p: pUnder },
    { m: "BTTS", s: "Yes", l: "BTTS — Yes", p: pBttsYes },
    { m: "BTTS", s: "No", l: "BTTS — No", p: pBttsNo },
    { m: "1X2", s: "Home", l: "1X2 — Home", p: pHome },
    { m: "1X2", s: "Draw", l: "1X2 — Draw", p: pDraw },
    { m: "1X2", s: "Away", l: "1X2 — Away", p: pAway },
  ].sort((a, b) => b.p - a.p);

  const top = markets[0];
  const second = markets[1];
  const edge = second ? top.p - second.p : top.p;

  if (!top) return null;

  const model1X2Top = topKey({
    Home: probs.home,
    Draw: probs.draw,
    Away: probs.away,
  });
  const sheet1X2Top = sheet1X2.available
    ? topKey({ Home: sheet1X2.home, Draw: sheet1X2.draw, Away: sheet1X2.away })
    : null;

  const modelOUTop = probs.over25 >= 0.5 ? "Over 2.5" : "Under 2.5";
  const sheetOUTop =
    sheetOU === null ? null : sheetOU >= 0.5 ? "Over 2.5" : "Under 2.5";

  const modelBTTSTop = probs.btts >= 0.5 ? "Yes" : "No";
  const sheetBTTSTop =
    sheetBTTS === null ? null : sheetBTTS >= 0.5 ? "Yes" : "No";

  let agreement = 0;
  let possibleAgreement = 1;

  if (top.m === "1X2") {
    if (top.s === model1X2Top) agreement++;
    if (sheet1X2Top) {
      possibleAgreement++;
      if (top.s === sheet1X2Top) agreement++;
    }
  } else if (top.m === "O/U 2.5") {
    if (top.s === modelOUTop) agreement++;
    if (sheetOUTop) {
      possibleAgreement++;
      if (top.s === sheetOUTop) agreement++;
    }
  } else if (top.m === "BTTS") {
    if (top.s === modelBTTSTop) agreement++;
    if (sheetBTTSTop) {
      possibleAgreement++;
      if (top.s === sheetBTTSTop) agreement++;
    }
  }

  const totalLambda = lambdaH + lambdaA;
  let minProb = 0.6;
  let minEdge = top.m === "1X2" ? 0.05 : 0.04;

  if (agreement === possibleAgreement) minProb = 0.57;
  else if (agreement === 0 && possibleAgreement > 1) minProb = 0.64;

  if (top.m === "1X2") minProb += 0.02;
  if (top.s === "Draw") {
    minProb += 0.03;
    minEdge = 0.07;
  }

  if (
    (top.s === "Over 2.5" && totalLambda < 2.35) ||
    (top.s === "Under 2.5" && totalLambda > 2.95) ||
    (top.m === "BTTS" && top.s === "Yes" && totalLambda < 2.25) ||
    (top.m === "BTTS" && top.s === "No" && totalLambda > 3.05)
  ) {
    minProb += 0.03;
  }

  if (top.p < minProb || edge < minEdge) return null;

  const confidence = Math.round(
    clamp(top.p * 100 + edge * 12 + (agreement / possibleAgreement) * 4, 0, 97)
  );

  return {
    market: top.m,
    selection: top.s,
    pickLabel: top.l,
    predictedScore: predicted,
    confidence,
  };
}

/* =========================
   NETWORK CONTROLLER
========================= */
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSheetCSV(url) {
  let lastError = null;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          // 🔥 UPGRADE: Force 'no-store' so your custom memory cache dictates the data flow.
          cache: "no-store",
          headers: { accept: "text/csv,text/plain,*/*" },
        },
        FETCH_TIMEOUT + attempt * 1500
      );

      if (!res.ok) throw new Error(`SHEET_HTTP_${res.status}`);

      const text = await res.text();
      if (!text || !String(text).trim())
        throw new Error("EMPTY_SHEET_RESPONSE");

      return text;
    } catch (err) {
      lastError = err;
      if (attempt < FETCH_RETRIES) await sleep(250 * (attempt + 1));
    }
  }
  throw lastError || new Error("SHEET_FETCH_FAILED");
}

function validateHeaders(headers) {
  const required = [
    "DATE",
    "HOME/AWAY",
    "TIME",
    "COUNTRY",
    "LEAGUE",
    "CHANCE",
    "RATING",
  ];
  const missing = required.filter((h) => headers[h] === undefined);
  if (missing.length) throw new Error(`MISSING_HEADERS: ${missing.join(", ")}`);
}

async function buildPicksData() {
  const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Picks`;

  const text = await fetchSheetCSV(CSV_URL);
  const table = parseCSV(text);

  if (!Array.isArray(table) || table.length < 2 || !Array.isArray(table[0])) {
    throw new Error("INVALID_CSV_TABLE");
  }

  const headers = {};
  table[0].forEach((h, i) => {
    headers[normalizeHeader(h)] = i;
  });

  validateHeaders(headers);

  const col = {
    date: headers["DATE"],
    homeAway: headers["HOME/AWAY"],
    time: headers["TIME"],
    country: headers["COUNTRY"],
    league: headers["LEAGUE"],
    chance: headers["CHANCE"],
    rating: headers["RATING"],
    hgs: headers["H GS"],
    hgc: headers["HG C"],
    ags: headers["A GS"],
    agc: headers["A GC"],
    hForm: headers["H-FORM"],
    aForm: headers["A-FORM"],
    ov25: headers["OV 2.5"],
    gg: headers["GG"],
    home: headers["HOME"],
    draw: headers["DRAW"],
    away: headers["AWAY"],
  };

  const today = todayWAT();
  const picks = [];

  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    if (!row || !row.length) continue;

    const d = parseSheetDate(row[col.date]);
    if (!sameDay(d, today)) continue;

    const chance = num(row[col.chance]);
    const rating = num(row[col.rating]);
    const baseScore = chance * 0.55 + rating * 0.45;

    if (chance < 64 || rating < 58 || baseScore < 64) continue;

    const derived = derivePick({
      hgs: num(row[col.hgs]),
      hgc: num(row[col.hgc]),
      ags: num(row[col.ags]),
      agc: num(row[col.agc]),
      homeForm: row[col.hForm],
      awayForm: row[col.aForm],
      league: `${row[col.country]} ${row[col.league]}`,
      ov25: num(row[col.ov25]),
      gg: num(row[col.gg]),
      home: num(row[col.home]),
      draw: num(row[col.draw]),
      away: num(row[col.away]),
    });

    if (!derived) continue;

    const vipScore = Math.round(
      derived.confidence * 0.52 + rating * 0.28 + chance * 0.2
    );

    // 🔥 UPGRADE: Inject the Bookmaker Routes directly into the data payload
    const routeLinks = generateBookieRoutes(row[col.homeAway], derived.market);

    picks.push({
      id: `vip-${i}`,
      match: row[col.homeAway],
      date: row[col.date],
      time: row[col.time],
      league: `${row[col.country]} • ${row[col.league]}`,
      ...derived,
      confidence: derived.confidence,
      rating,
      vipScore,
      routeLinks, // <--- Routed links available to frontend BetSlip
    });
  }

  picks.sort((a, b) => {
    if (b.vipScore !== a.vipScore) return b.vipScore - a.vipScore;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.rating - a.rating;
  });

  return {
    meta: {
      total: Math.min(picks.length, MAX_OUTPUT_PICKS),
      source: "google-sheets",
      autoExpire: "midnight",
      stale: false,
      generatedAt: new Date().toISOString(),
    },
    picks: picks.slice(0, MAX_OUTPUT_PICKS),
  };
}

async function getOrBuildData() {
  if (hasFreshCache()) return CACHE;
  if (INFLIGHT) return INFLIGHT;

  INFLIGHT = (async () => {
    try {
      const result = await buildPicksData();
      CACHE = result;
      CACHE_TIME = Date.now();
      return result;
    } finally {
      INFLIGHT = null;
    }
  })();

  return INFLIGHT;
}

/* =========================
   API ROUTER
========================= */
export async function GET(req) {
  const url = new URL(req.url);
  const premium = url.searchParams.get("premium") === "1";
  const compact =
    url.searchParams.get("lite") === "1" ||
    url.searchParams.get("compact") === "1";
  const limit = clamp(
    num(url.searchParams.get("limit")) || MAX_OUTPUT_PICKS,
    1,
    MAX_OUTPUT_PICKS
  );

  try {
    if (hasFreshCache()) {
      return Response.json(shapeResult(CACHE, { compact, premium, limit }), {
        headers: cacheHeaders(),
      });
    }

    if (premium && hasStaleCache()) {
      return Response.json(
        shapeResult(
          {
            ...CACHE,
            meta: {
              ...(CACHE.meta || {}),
              stale: true,
              source: "memory-cache",
              fallback: "stale-fast-path",
            },
          },
          { compact, premium, limit }
        ),
        { headers: cacheHeaders() }
      );
    }

    const result = await getOrBuildData();

    return Response.json(shapeResult(result, { compact, premium, limit }), {
      headers: cacheHeaders(),
    });
  } catch (err) {
    if (hasStaleCache()) {
      return Response.json(
        shapeResult(
          {
            ...CACHE,
            meta: {
              ...(CACHE.meta || {}),
              stale: true,
              source: "memory-cache",
              fallback: "fetch-failed",
              warning: String(err),
            },
          },
          { compact, premium, limit }
        ),
        { headers: cacheHeaders() }
      );
    }

    return Response.json(
      { error: "FAILED", message: String(err) },
      { status: 500, headers: cacheHeaders() }
    );
  }
}