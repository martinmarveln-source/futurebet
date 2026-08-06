import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { computeDerivedPickFromStats } from "@/utils/vipAlgorithm";
export const dynamic = "force-dynamic";

/* =========================
   ENTERPRISE CACHE ENGINE
========================= */
let CACHE = null;
let CACHE_TIME = 0;
let INFLIGHT_REQUEST = null;

// Cache data for 15 minutes. Matches update, but not every second.
const CACHE_TTL = 1000 * 60 * 15;
// Serve stale data up to 24 hours if Google Sheets goes offline
const STALE_TTL = 1000 * 60 * 60 * 24;

function isCacheFresh() {
  return CACHE && Date.now() - CACHE_TIME < CACHE_TTL;
}
function hasStaleCache() {
  return CACHE && Date.now() - CACHE_TIME < STALE_TTL;
}

/* =========================
   CSV PARSER
========================= */
function parseCSV(text) {
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
      if (row.some((c) => String(c ?? "").trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }

  row.push(cell);
  if (row.some((c) => String(c ?? "").trim().length > 0)) rows.push(row);
  return rows.map((r) => r.map((c) => String(c ?? "").trim()));
}

/* =========================
   HELPERS
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

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function num(v) {
  const s = String(v ?? "")
    .replace(/[%$,]/g, "")
    .trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseSheetDateToThisYear(dateStr) {
  if (!dateStr) return null;
  const [dStr, monStr] = String(dateStr).trim().split("-");
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

function countRecentMatchesFromRecentCell(str) {
  const s = String(str ?? "").trim();
  if (!s) return 0;
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter(
      (x) => !x.includes("1899-12-30") && (x.includes(":") || x.includes(" : "))
    ).length;
}

function countFormLetters(str) {
  return String(str ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^WDL]/g, "").length;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}



function computeMarketSignal({ market, selection, vals }) {
  let home = 0;
  let away = 0;

  if (market === "BTTS" && selection === "Yes") {
    home = vals.hBtts;
    away = vals.aBtts;
  } else if (market === "BTTS" && selection === "No") {
    home = 100 - vals.hBtts;
    away = 100 - vals.aBtts;
  } else if (market === "O/U 2.5" && selection === "Over 2.5") {
    home = vals.hOv2;
    away = vals.aOv2;
  } else if (market === "O/U 2.5" && selection === "Under 2.5") {
    home = 100 - vals.hOv2;
    away = 100 - vals.aOv2;
  } else if (market === "1X2" && selection === "Home") {
    home = vals.hWin;
    away = vals.aLost;
  } else if (market === "1X2" && selection === "Draw") {
    home = vals.hDraw;
    away = vals.aDraw;
  } else if (market === "1X2" && selection === "Away") {
    home = vals.hLost;
    away = vals.aWin;
  }

  home = Math.max(0, Math.min(100, home));
  away = Math.max(0, Math.min(100, away));

  return {
    marketHomeForm: Math.round(home),
    marketAwayForm: Math.round(away),
    marketRating: Math.round((home + away) / 2),
  };
}

/* =========================
   CORE BUILD FUNCTION
========================= */
async function buildPicksData(minChance, minRating, minRecents) {
  const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Picks`;

  // Internal fetch still bypasses Next.js cache so the server gets fresh data,
  // but the user only hits our RAM cache.
  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch Google Sheet");

  const text = await res.text();
  const table = parseCSV(text);
  if (!table.length || table.length < 2)
    return { meta: { total: 0 }, picks: [] };

  const headerRow = table[0];
  const headerMap = {};
  headerRow.forEach((h, i) => {
    headerMap[normalizeHeader(h)] = i;
  });

  const col = {
    date: headerMap["DATE"],
    homeAway: headerMap["HOME/AWAY"],
    time: headerMap["TIME"],
    country: headerMap["COUNTRY"],
    league: headerMap["LEAGUE"],
    table: headerMap["TABLE"],
    chance: headerMap["CHANCE"],
    rating: headerMap["RATING"],
    hRecent: headerMap["H-RECENT"],
    aRecent: headerMap["A-RECENT"],
    hForm: headerMap["H-FORM"],
    aForm: headerMap["A-FORM"],
    hGrp: headerMap["H GRP"],
    aGrp: headerMap["A GRP"],
    hgs: headerMap["H GS"],
    hgc: headerMap["HG C"],
    ags: headerMap["A GS"],
    agc: headerMap["A GC"],
    ov25: headerMap["OV 2.5"],
    gg: headerMap["GG"],
    home: headerMap["HOME"],
    draw: headerMap["DRAW"],
    away: headerMap["AWAY"],
    hBtts: headerMap["H BTTS"],
    aBtts: headerMap["A BTTS"],
    hOv2: headerMap["H OV 2"],
    aOv2: headerMap["A OV 2"],
    hWin: headerMap["H.WIN"],
    hDraw: headerMap["H.DRAW"],
    hLost: headerMap["H.LOST"],
    aWin: headerMap["A.WIN"],
    aDraw: headerMap["A.DRAW"],
    aLost: headerMap["A.LOST"],
    hppg: headerMap["HPPG"],
    appg: headerMap["APPG"],
    hcs: headerMap["H-CS"],
    acs: headerMap["A-CS"],
    hfts: headerMap["HFTS"],
    afts: headerMap["AFTS"],
    hgsOver15: headerMap["HGS_OVER_1.5"],
    hgcOver15: headerMap["HGC_OVER_1.5"],
    agsOver15: headerMap["AGS_OVER_1.5"],
    agcOver15: headerMap["AGC_OVER_1.5"],
    h2hH: headerMap["H2H_H"],
    h2hD: headerMap["H2H_D"],
    h2hA: headerMap["H2H_A"],
    h2hOv: headerMap["H2H_OV"],
    h2hUn: headerMap["H2H_UN"],
    h2hGg: headerMap["H2H_GG"],
    h2hNg: headerMap["H2H_NG"],
    h2hGp: headerMap["H2H_GP"],
    h2hRecent: headerMap["H2H-RECENT"],
    flag: headerMap["FLAG"],
  };

  const val = (r, index) => (index === undefined ? "" : r[index] ?? "");
  const picks = [];

  for (let i = 1; i < table.length; i++) {
    const r = table[i];
    if (!r || r.length < 10) continue;

    const dateStr = val(r, col.date);
    const d = parseSheetDateToThisYear(dateStr);
    if (!isToday(d)) continue;

    const algChance = num(val(r, col.chance));
    const algRating = num(val(r, col.rating));

    if (algChance < minChance || algRating < minRating) continue;

    const hRecentCell = val(r, col.hRecent);
    const aRecentCell = val(r, col.aRecent);
    const hFormStr = val(r, col.hForm);
    const aFormStr = val(r, col.aForm);

    let hRecentCount =
      countRecentMatchesFromRecentCell(hRecentCell) ||
      countFormLetters(hFormStr);
    let aRecentCount =
      countRecentMatchesFromRecentCell(aRecentCell) ||
      countFormLetters(aFormStr);

    if (hRecentCount < minRecents || aRecentCount < minRecents) continue;

    const match = val(r, col.homeAway);
    const country = val(r, col.country);
    const league = val(r, col.league);
    const hgs = num(val(r, col.hgs));
    const hgc = num(val(r, col.hgc));
    const ags = num(val(r, col.ags));
    const agc = num(val(r, col.agc));

    const derived = computeDerivedPickFromStats({
      hgs,
      hgc,
      ags,
      agc,
      hFormStr,
      aFormStr,
      hcs: num(val(r, col.hcs)),
      acs: num(val(r, col.acs)),
      hfts: num(val(r, col.hfts)),
      afts: num(val(r, col.afts)),
      h2hGp: num(val(r, col.h2hGp)),
      h2hH: num(val(r, col.h2hH)),
      h2hA: num(val(r, col.h2hA)),
      h2hOv: num(val(r, col.h2hOv)),
      h2hGg: num(val(r, col.h2hGg)),
      ov25SheetPct: num(val(r, col.ov25)),
      ggSheetPct: num(val(r, col.gg)),
      homeSheetPct: num(val(r, col.home)),
      drawSheetPct: num(val(r, col.draw)),
      awaySheetPct: num(val(r, col.away)),
    });

    if (!derived) continue;

    const { market, selection, pickLabel, predictedScore, confidence } =
      derived;

    const marketSignalVals = {
      hBtts: num(val(r, col.hBtts)),
      aBtts: num(val(r, col.aBtts)),
      hOv2: num(val(r, col.hOv2)),
      aOv2: num(val(r, col.aOv2)),
      hWin: num(val(r, col.hWin)),
      hDraw: num(val(r, col.hDraw)),
      hLost: num(val(r, col.hLost)),
      aWin: num(val(r, col.aWin)),
      aDraw: num(val(r, col.aDraw)),
      aLost: num(val(r, col.aLost)),
    };

    const marketSignal = computeMarketSignal({
      market,
      selection,
      vals: marketSignalVals,
    });
    const vipScore = Math.round(0.55 * confidence + 0.45 * algRating);

    picks.push({
      id: `vip-${i}`,
      date: dateStr,
      time: val(r, col.time),
      match,
      fullLeague: `${country} • ${league}`.trim(),
      league: `${country} • ${league}`.trim(),
      table: val(r, col.table),
      market,
      selection,
      pickLabel,
      predictedScore,
      tips: "",
      confidence: Math.round(confidence),
      rating: Math.round(algRating),
      vipScore,
      recent: { homeCount: hRecentCount, awayCount: aRecentCount },
      form: {
        homeStr: hFormStr,
        awayStr: aFormStr,
        homeGrade: val(r, col.hGrp),
        awayGrade: val(r, col.aGrp),
      },
      marketSignal,
      hppg: num(val(r, col.hppg)),
      appg: num(val(r, col.appg)),
      hgs,
      hgc,
      ags,
      agc,
      hWin: marketSignalVals.hWin,
      hDraw: marketSignalVals.hDraw,
      hLost: marketSignalVals.hLost,
      aWin: marketSignalVals.aWin,
      aDraw: marketSignalVals.aDraw,
      aLost: marketSignalVals.aLost,
      hBtts: marketSignalVals.hBtts,
      aBtts: marketSignalVals.aBtts,
      hOv2: marketSignalVals.hOv2,
      aOv2: marketSignalVals.aOv2,
      hcs: num(val(r, col.hcs)),
      acs: num(val(r, col.acs)),
      hfts: num(val(r, col.hfts)),
      afts: num(val(r, col.afts)),
      hgsOver15: num(val(r, col.hgsOver15)),
      hgcOver15: num(val(r, col.hgcOver15)),
      agsOver15: num(val(r, col.agsOver15)),
      agcOver15: num(val(r, col.agcOver15)),
      H2H_H: num(val(r, col.h2hH)),
      H2H_D: num(val(r, col.h2hD)),
      H2H_A: num(val(r, col.h2hA)),
      H2H_OV: num(val(r, col.h2hOv)),
      H2H_UN: num(val(r, col.h2hUn)),
      H2H_GG: num(val(r, col.h2hGg)),
      H2H_NG: num(val(r, col.h2hNg)),
      H2H_GP: num(val(r, col.h2hGp)),
      H_Recent: hRecentCell,
      A_Recent: aRecentCell,
      "H2H-Recent": val(r, col.h2hRecent),
      hForm: hFormStr,
      aForm: aFormStr,
      flag: val(r, col.flag),
      pick: pickLabel,
      cScore: predictedScore,
    });
  }

  picks.sort((a, b) => (b.vipScore ?? 0) - (a.vipScore ?? 0));

  return {
    meta: {
      total: picks.length,
      minChance,
      minRating,
      minRecents,
      autoExpire: "midnight",
      source: "google-sheets",
      cacheStatus: "fresh",
    },
    picks,
  };
}

/* =========================
   API HANDLER
========================= */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Auth check: Allow if valid CRON_SECRET is provided OR user is admin/premium
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const session = await auth();
      if (!session?.user?.email) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const users = await sql`SELECT user_role, subscription_status, subscription_expires_at FROM auth_users WHERE email = ${session.user.email}`;
      const u = users[0];
      const role = u?.user_role || "free";
      const sub = u?.subscription_status || "free";
      const valid = !u?.subscription_expires_at || new Date(u.subscription_expires_at) > new Date();
      const isPremiumOrAdmin = role === "admin" || role === "premium" || (sub === "premium" && valid);

      if (!isPremiumOrAdmin) {
        return Response.json({ error: "Forbidden: Requires premium access" }, { status: 403 });
      }
    }

    const minChance = Number(url.searchParams.get("minChance") ?? 65);
    const minRating = Number(url.searchParams.get("minRating") ?? 55);
    const minRecents = Number(url.searchParams.get("minRecents") ?? 0);

    // 1. FAST PATH: Return Memory Cache instantly if valid
    if (isCacheFresh()) {
      return Response.json(CACHE, {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
        },
      });
    }

    // 2. STALE FALLBACK: If a fetch is currently happening, don't make users wait. Serve stale memory.
    if (INFLIGHT_REQUEST && hasStaleCache()) {
      return Response.json(
        { ...CACHE, meta: { ...CACHE.meta, cacheStatus: "stale" } },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=900, stale-while-revalidate=86400",
          },
        }
      );
    }

    // 3. CACHE MISS: Fetch data, block the first user, populate cache for everyone else
    if (!INFLIGHT_REQUEST) {
      INFLIGHT_REQUEST = buildPicksData(minChance, minRating, minRecents)
        .then((result) => {
          CACHE = result;
          CACHE_TIME = Date.now();
          INFLIGHT_REQUEST = null;
          return result;
        })
        .catch((err) => {
          INFLIGHT_REQUEST = null;
          throw err;
        });
    }

    const newData = await INFLIGHT_REQUEST;

    return Response.json(newData, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    // 4. DISASTER RECOVERY: If Google Sheets API crashes, serve stale memory cache
    if (hasStaleCache()) {
      return Response.json({
        ...CACHE,
        meta: { ...CACHE.meta, cacheStatus: "recovery", error: err.message },
      });
    }

    return Response.json(
      { error: "FAILED", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}