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

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();

  // ISO format: YYYY-MM-DD (stored in matches_cache)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Legacy sheet format: DD-Mon (e.g. "15-Aug")
  const [dStr, monStr] = raw.split("-");
  const day = Number(dStr);
  const monKey = String(monStr || "").trim();
  if (!Number.isFinite(day) || !(monKey in monthMap)) return null;
  const year = new Date().getFullYear();
  const d = new Date(year, monthMap[monKey], day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Keep alias for backward compat
const parseSheetDateToThisYear = parseDateStr;

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
  // Query matches_cache for data synced by the cron job
  const dbRows = await sql`
    SELECT raw_data FROM matches_cache
  `;

  if (!dbRows || dbRows.length === 0) {
    return { meta: { total: 0 }, picks: [] };
  }

  const table = dbRows.map(r => r.raw_data);

  // Map to the keys used in sync-matches raw_data
  const col = {
    date: "date",
    homeAway: "match",
    time: "time",
    country: "country",
    league: "league",
    table: "table",
    chance: "chance",
    rating: "rating",
    hRecent: "hRecent",
    aRecent: "aRecent",
    hForm: "hForm",
    aForm: "aForm",
    hGrp: "hGrp",
    aGrp: "aGrp",
    hgs: "hgs",
    hgc: "hgc",
    ags: "ags",
    agc: "agc",
    ov25: "ov25",
    gg: "gg",
    home: "homeWin",
    draw: "draw",
    away: "awayWin",
    hBtts: "hBtts",
    aBtts: "aBtts",
    hOv2: "hOv2",
    aOv2: "aOv2",
    hWin: "hWin",
    hDraw: "hDraw",
    hLost: "hLost",
    aWin: "aWin",
    aDraw: "aDraw",
    aLost: "aLost",
    hppg: "hppg",
    appg: "appg",
    hcs: "hcs",
    acs: "acs",
    hfts: "hfts",
    afts: "afts",
    hgsOver15: "hgsOver15",
    hgcOver15: "hgcOver15",
    agsOver15: "agsOver15",
    agcOver15: "agcOver15",
    h2hH: "h2hH",
    h2hD: "h2hD",
    h2hA: "h2hA",
    h2hOv: "h2hOV",
    h2hUn: "h2hUN",
    h2hGg: "h2hGG",
    h2hNg: "h2hNG",
    h2hGp: "h2hGP",
    h2hRecent: "h2hRecent",
    flag: "flag",
    homeOdds: "homeOdds",
    drawOdds: "drawOdds",
    awayOdds: "awayOdds",
    o25Odds: "o25Odds",
    u25Odds: "u25Odds",
    bttsYesOdds: "bttsYesOdds", // Just in case, the standard is usually "ggOdds" or similar, but we'll use fallback logic below
    ftScore: "ftScore",
  };

  const val = (r, key) => (key === undefined ? "" : r[key] ?? "");
  const picks = [];

  for (let i = 0; i < table.length; i++) {
    const r = table[i];
    if (!r) continue;

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

    const rawOdds = {
      home: num(val(r, col.homeOdds)),
      draw: num(val(r, col.drawOdds)),
      away: num(val(r, col.awayOdds)),
      over25: num(val(r, col.o25Odds)),
      under25: num(val(r, col.u25Odds)),
      over15: num(val(r, "o15Odds")),
      under15: num(val(r, "u15Odds")),
      bttsYes: num(val(r, col.bttsYesOdds)) || num(val(r, "btts_yes_odds")),
      bttsNo: num(val(r, "bttsNoOdds")) || num(val(r, "btts_no_odds")),
    };

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
      rawOdds,
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
    const derivedOdds = derived.odds;

    // Strict odds requirement: must have odds and must be >= 1.34
    if (!derivedOdds || derivedOdds < 1.34) continue;

    const pick = {
      id: `vip-${i}`,
      date: dateStr,
      time: val(r, col.time),
      match,
      fullLeague: `${country} • ${league}`.trim(),
      league: `${country} • ${league}`.trim(),
      table: val(r, col.table),
      market: derived.market,
      selection: derived.selection,
      pickLabel: derived.pickLabel,
      predictedScore: derived.predictedScore,
      tips: "",
      chance: `${confidence}%`,
      confidence: Math.round(confidence),
      rating: Math.round(algRating),
      vipScore,
      odds: derivedOdds,
      rawOdds,
      marketSignal,
      recent: { homeCount: hRecentCount, awayCount: aRecentCount },
      form: {
        homeStr: hFormStr,
        awayStr: aFormStr,
        homeGrade: val(r, col.hGrp),
        awayGrade: val(r, col.aGrp),
      },
      meta: {
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
      },
      ftScore: val(r, col.ftScore),
    };

    picks.push(pick);
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
    const secretParam = url.searchParams.get("secret");
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    const isCron = cronSecret && (authHeader === `Bearer ${cronSecret}` || secretParam === cronSecret);

    // In production, enforce cron secret
    if (process.env.NODE_ENV === "production") {
      if (!isCron) {
         return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const minChance = 65;
    const minRating = 55;
    const minRecents = 0;

    if (isCron || process.env.NODE_ENV !== "production") {
      const { picks } = await buildPicksData(
        minChance,
        minRating,
        minRecents
      );

      // Persist to database
      console.log(`Persisting ${picks.length} VIP picks to DB...`);
      const promises = picks.map(p => {
        // Create a unique ID for the match so we overwrite the same match on the same date if it updates
        const matchIdKey = p.meta.flag ? `${p.date}-${p.meta.flag}` : p.id;
        return sql`
          INSERT INTO vip_picks (
            id, match_id, match_date, time, match, league, market, selection, odds, vip_score, predicted_score, chance_percent, rating_percent, payload, updated_at
          ) VALUES (
            ${matchIdKey}, ${p.meta.flag || ''}, ${p.date}, ${p.time}, ${p.match}, ${p.league}, ${p.market}, ${p.selection}, ${p.odds}, ${p.vipScore}, ${p.predictedScore}, ${p.chance}, ${p.rating}, ${JSON.stringify(p)}, CURRENT_TIMESTAMP
          )
          ON CONFLICT (id) DO UPDATE SET
            time = EXCLUDED.time,
            market = EXCLUDED.market,
            selection = EXCLUDED.selection,
            odds = EXCLUDED.odds,
            vip_score = EXCLUDED.vip_score,
            predicted_score = EXCLUDED.predicted_score,
            chance_percent = EXCLUDED.chance_percent,
            rating_percent = EXCLUDED.rating_percent,
            payload = EXCLUDED.payload,
            updated_at = CURRENT_TIMESTAMP;
        `;
      });

      await Promise.all(promises);

      return Response.json({ success: true, count: picks.length });
    }

    return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch (err) {
    console.error("Cron VIP Generator Error:", err);
    return Response.json(
      { error: "Internal server error", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}