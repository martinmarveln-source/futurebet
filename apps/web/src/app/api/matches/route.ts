// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { computeIntelligence } from "@/utils/intelligenceEngine";

/* -------------------------------------------------------------------------- */
/*                                  CACHE                                     */
/* -------------------------------------------------------------------------- */

let cachedPayload = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

/* -------------------------------------------------------------------------- */
/*                             GOOGLE SHEETS CONFIG                           */
/* -------------------------------------------------------------------------- */

const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
const SHEET_NAME = "Picks";

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const MONTH_MAP = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

const COLUMNS = {
  sn: 0,
  date: 1,
  country: 2,
  league: 3,
  match: 4,
  homeWin: 5,
  draw: 6,
  awayWin: 7,
  hppg: 8,
  appg: 9,
  hgs: 10,
  hgc: 11,
  ags: 12,
  agc: 13,
  gg: 14,
  ng: 15,
  time: 16,
  un25: 17,
  ov25: 18,
  table: 19,
  pick: 20,
  cScore: 21,
  modelCSPercent: 22,
  hcs: 23,
  acs: 24,
  hfts: 25,
  afts: 26,
  tips: 27,
  oneX2Rate: 28,
  avg: 29,
  hBtts: 30,
  aBtts: 31,
  hOv2: 32,
  aOv2: 33,
  hWin: 34,
  hDraw: 35,
  hLost: 36,
  aWin: 37,
  aDraw: 38,
  aLost: 39,
  hGrp: 40,
  aGrp: 41,
  hForm: 42,
  aForm: 43,
  hPts: 44,
  aPts: 45,
  chance: 46,
  rating: 47,
  predictionValidation: 48,
  score00: 49,
  score10: 50,
  score11: 51,
  score01: 52,
  score20: 53,
  score21: 54,
  score02: 55,
  score12: 56,
  hgsOver15: 57,
  hgcOver15: 58,
  agsOver15: 59,
  agcOver15: 60,
  likelyCS: 61,
  scorelineCSPercent: 62,
  flag: 63,
  cs2: 64,
  cs2Percent: 65,
  h2hH: 66,
  h2hD: 67,
  h2hA: 68,
  h2hOV: 69,
  h2hUN: 70,
  h2hGG: 71,
  h2hNG: 72,
  h2hGP: 73,
  hRecent: 74,
  aRecent: 75,
  h2hRecent: 76,
  ftScore: 77,
  homeOdds: 82,
  drawOdds: 83,
  awayOdds: 84,
  o05Odds: 85,
  u05Odds: 86,
  o15Odds: 87,
  u15Odds: 88,
  o25Odds: 89,
  u25Odds: 90,
  o35Odds: 91,
  u35Odds: 92,
  o45Odds: 93,
  u45Odds: 94,
};

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function getDateRange(matches) {
  if (!matches.length) return "";

  const dates = matches
    .map((m) => m.date)
    .filter(Boolean)
    .sort();

  return `${dates[0]} → ${dates[dates.length - 1]}`;
}
function cleanScoreline(score) {
  if (score === null || score === undefined || score === "") return "";

  const str = String(score).trim().replace(/[–-]/g, ":");
  const parts = str.split(":").map((p) => p.trim());

  if (parts.length !== 2) return str;

  const home = Number.parseInt(parts[0], 10);
  const away = Number.parseInt(parts[1], 10);

  if (Number.isNaN(home) || Number.isNaN(away)) return str;

  return `${home}:${away}`;
}
function csvScoreline(score) {
  const cleaned = cleanScoreline(score);
  return cleaned ? `="${cleaned}"` : "";
}
function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const cleaned = String(v).replace(/[%,$]/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function toDecimal(value) {
  const n = toNumber(value);
  const result = n > 1 ? n / 100 : n;
  return +result.toFixed(2); // force 0.54 format
}

function formatPct(value) {
  const n = toNumber(value);
  const pct = n > 1 ? n : n * 100;
  return `${Math.round(pct)}%`;
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function getMonthKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseDate(dateStr) {
  if (!dateStr) return null;

  const raw = String(dateStr).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parts = raw.split("-");
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const monthNum = MONTH_MAP[monthStr];

    if (!monthNum || Number.isNaN(day)) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let year = currentYear;
    if (monthNum < currentMonth) year = currentYear + 1;

    const parsedDate = new Date(year, monthNum - 1, day);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function kickoffTs(match) {
  const iso = String(match?.date || "").trim();
  const t = String(match?.time || "").trim();
  if (!iso) return 0;

  const time = t ? (t.length === 5 ? `${t}:00` : t) : "00:00:00";
  const d = new Date(`${iso}T${time}`);
  const ts = d.getTime();

  return Number.isFinite(ts) ? ts : 0;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field.trim());
        field = "";
      } else if (char === "\n") {
        row.push(field.trim());
        if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
        row = [];
        field = "";
      } else if (char !== "\r") {
        field += char;
      }
    }
  }

  row.push(field.trim());
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);

  return rows;
}

function normalizeGuide(match) {
  return String(match?.GUIDE || match?.pick || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function getMarketBiasFromGuide(match) {
  const guide = normalizeGuide(match);

  if (["HOME WIN", "DRAW", "AWAY WIN"].includes(guide)) return "1X2";
  if (guide === "GG" || guide === "NG") return "BTTS";
  if (guide === "OV.2.5" || guide === "UN2.5") return "O/U 2.5";

  return "Unknown";
}

function getBiasStrength(match) {
  const guide = normalizeGuide(match);

  if (["HOME WIN", "DRAW", "AWAY WIN"].includes(guide)) {
    const values = [
      toDecimal(match?.homeWin),
      toDecimal(match?.draw),
      toDecimal(match?.awayWin),
    ].sort((a, b) => b - a);

    if (values.length < 2 || values[0] === 0) return 0;
    return +(((values[0] - values[1]) / values[0]) * 100).toFixed(1);
  }

  if (guide === "GG" || guide === "NG") {
    const yes = toDecimal(match?.gg);
    const no = toDecimal(match?.ng);
    if (!yes && !no) return 0;

    const highest = Math.max(yes, no);
    const second = Math.min(yes, no);
    if (!highest) return 0;

    return +(((highest - second) / highest) * 100).toFixed(1);
  }

  if (guide === "OV.2.5" || guide === "UN2.5") {
    const over = toDecimal(match?.ov25);
    const under = toDecimal(match?.un25);
    if (!over && !under) return 0;

    const highest = Math.max(over, under);
    const second = Math.min(over, under);
    if (!highest) return 0;

    return +(((highest - second) / highest) * 100).toFixed(1);
  }

  return 0;
}

function getConfidenceTier(rating) {
  const r = toDecimal(rating);
  if (r >= 0.8) return "A+";
  if (r >= 0.7) return "A";
  if (r >= 0.6) return "B+";
  if (r >= 0.5) return "B";
  return "C";
}

function getConvictionTier(match) {
  const strength = getBiasStrength(match);

  if (strength >= 80) return "Ultra";
  if (strength >= 60) return "Strong";
  if (strength >= 40) return "Moderate";
  if (strength >= 20) return "Weak";
  return "Low";
}

function getRiskLevel(match) {
  const bias = getMarketBiasFromGuide(match);
  let max = 0;

  if (bias === "1X2") {
    max = Math.max(
      toDecimal(match?.homeWin),
      toDecimal(match?.draw),
      toDecimal(match?.awayWin),
    );
  } else if (bias === "BTTS") {
    max = Math.max(toDecimal(match?.gg), toDecimal(match?.ng));
  } else if (bias === "O/U 2.5") {
    max = Math.max(toDecimal(match?.ov25), toDecimal(match?.un25));
  }

  if (max >= 0.65) return "Low";
  if (max >= 0.55) return "Medium";
  return "High";
}

function getAlignmentScore(match) {
  const rating = toDecimal(match?.rating);
  const conviction = getBiasStrength(match) / 100;
  return +(rating * conviction).toFixed(2);
}

function getSelectedProbability(match) {
  const guide = normalizeGuide(match);

  if (guide === "HOME WIN") return toDecimal(match?.homeWin);
  if (guide === "DRAW") return toDecimal(match?.draw);
  if (guide === "AWAY WIN") return toDecimal(match?.awayWin);
  if (guide === "GG") return toDecimal(match?.gg);
  if (guide === "NG") return toDecimal(match?.ng);
  if (guide === "OV.2.5") return toDecimal(match?.ov25);
  if (guide === "UN2.5") return toDecimal(match?.un25);

  return 0;
}

function getSelectedMarketOdds(match) {
  const guide = normalizeGuide(match);

  if (guide === "HOME WIN") return toNumber(match?.homeOdds);
  if (guide === "DRAW") return toNumber(match?.drawOdds);
  if (guide === "AWAY WIN") return toNumber(match?.awayOdds);
  if (guide === "OV.2.5") return toNumber(match?.o25Odds);
  if (guide === "UN2.5") return toNumber(match?.u25Odds);

  return 0;
}

function getFairOdds(probability) {
  if (!probability || probability <= 0) return 0;
  return +(1 / probability).toFixed(2);
}

function getValueEdgePct(match) {
  const p = getSelectedProbability(match);
  const odds = getSelectedMarketOdds(match);
  if (!p || !odds) return 0;
  return +((p * odds - 1) * 100).toFixed(2);
}

function getFormMomentum(match) {
  return +(toNumber(match?.hPts) - toNumber(match?.aPts)).toFixed(1);
}

function getH2HLean(match) {
  const h = toDecimal(match?.H2H_H);
  const d = toDecimal(match?.H2H_D);
  const a = toDecimal(match?.H2H_A);

  const pairs = [
    { label: "Home", value: h },
    { label: "Draw", value: d },
    { label: "Away", value: a },
  ].sort((x, y) => y.value - x.value);

  return pairs[0]?.value
    ? `${pairs[0].label} (${(pairs[0].value * 100).toFixed(1)}%)`
    : "";
}

function pickTopScoreline(match) {
  const explicit = String(match?.cScore || match?.likelyCS || "").trim();
  if (explicit) return cleanScoreline(explicit);

  const scorelines = [
    ["0:0", match?.score00],
    ["1:0", match?.score10],
    ["1:1", match?.score11],
    ["0:1", match?.score01],
    ["2:0", match?.score20],
    ["2:1", match?.score21],
    ["0:2", match?.score02],
    ["1:2", match?.score12],
  ];

  scorelines.sort((a, b) => toNumber(b[1]) - toNumber(a[1]));
  return cleanScoreline(scorelines[0]?.[0] || "");
}

function pickSecondScoreline(match) {
  const explicit = String(match?.cs2 || "").trim();
  if (explicit) return cleanScoreline(explicit);

  const scorelines = [
    ["0:0", match?.score00],
    ["1:0", match?.score10],
    ["1:1", match?.score11],
    ["0:1", match?.score01],
    ["2:0", match?.score20],
    ["2:1", match?.score21],
    ["0:2", match?.score02],
    ["1:2", match?.score12],
  ];

  scorelines.sort((a, b) => toNumber(b[1]) - toNumber(a[1]));
  return cleanScoreline(scorelines[1]?.[0] || "");
}

function getPremiumScore(match) {
  const rating = toDecimal(match?.rating);
  const chance = toDecimal(match?.chance);
  const conviction = getBiasStrength(match) / 100;
  const scoreline = toDecimal(
    match?.modelCSPercent || match?.scorelineCSPercent || 0,
  );
  const positiveEdge = Math.max(getValueEdgePct(match), 0) / 100;

  const score =
    rating * 0.35 +
    chance * 0.25 +
    conviction * 0.2 +
    scoreline * 0.1 +
    Math.min(positiveEdge, 0.25) * 0.1;

  return +(score * 100).toFixed(1);
}

function sortMatchesByDateAsc(list) {
  return [...list].sort((a, b) => kickoffTs(a) - kickoffTs(b));
}

function mapSheetRowToMatch(row) {
  const parsedDate = parseDate(row[COLUMNS.date]);

  return {
    sn: row[COLUMNS.sn] || "",
    date: parsedDate
      ? parsedDate.toISOString().split("T")[0]
      : String(row[COLUMNS.date] || "").trim(),
    time: row[COLUMNS.time] || "",
    country: row[COLUMNS.country] || "",
    league: row[COLUMNS.league] || "",
    match: row[COLUMNS.match] || "",
    table: row[COLUMNS.table] || "",

    homeWin: toNumber(row[COLUMNS.homeWin]),
    draw: toNumber(row[COLUMNS.draw]),
    awayWin: toNumber(row[COLUMNS.awayWin]),

    hppg: toNumber(row[COLUMNS.hppg]),
    appg: toNumber(row[COLUMNS.appg]),
    hgs: toNumber(row[COLUMNS.hgs]),
    hgc: toNumber(row[COLUMNS.hgc]),
    ags: toNumber(row[COLUMNS.ags]),
    agc: toNumber(row[COLUMNS.agc]),

    gg: toNumber(row[COLUMNS.gg]),
    ng: toNumber(row[COLUMNS.ng]),
    un25: toNumber(row[COLUMNS.un25]),
    ov25: toNumber(row[COLUMNS.ov25]),
    avg: toNumber(row[COLUMNS.avg]),

    hcs: toNumber(row[COLUMNS.hcs]),
    acs: toNumber(row[COLUMNS.acs]),
    hfts: toNumber(row[COLUMNS.hfts]),
    afts: toNumber(row[COLUMNS.afts]),

    hWin: toNumber(row[COLUMNS.hWin]),
    hDraw: toNumber(row[COLUMNS.hDraw]),
    hLost: toNumber(row[COLUMNS.hLost]),
    aWin: toNumber(row[COLUMNS.aWin]),
    aDraw: toNumber(row[COLUMNS.aDraw]),
    aLost: toNumber(row[COLUMNS.aLost]),

    hGrp: row[COLUMNS.hGrp] || "",
    aGrp: row[COLUMNS.aGrp] || "",
    hForm: row[COLUMNS.hForm] || "",
    aForm: row[COLUMNS.aForm] || "",
    hPts: toNumber(row[COLUMNS.hPts]),
    aPts: toNumber(row[COLUMNS.aPts]),

    hBtts: toNumber(row[COLUMNS.hBtts]),
    aBtts: toNumber(row[COLUMNS.aBtts]),
    hOv2: toNumber(row[COLUMNS.hOv2]),
    aOv2: toNumber(row[COLUMNS.aOv2]),

    hgsOver15: toNumber(row[COLUMNS.hgsOver15]),
    hgcOver15: toNumber(row[COLUMNS.hgcOver15]),
    agsOver15: toNumber(row[COLUMNS.agsOver15]),
    agcOver15: toNumber(row[COLUMNS.agcOver15]),

    cScore: row[COLUMNS.cScore] || "",
    modelCSPercent: toNumber(row[COLUMNS.modelCSPercent]),
    likelyCS: row[COLUMNS.likelyCS] || "",
    scorelineCSPercent: toNumber(row[COLUMNS.scorelineCSPercent]),
    cs2: row[COLUMNS.cs2] || "",
    cs2Percent: toNumber(row[COLUMNS.cs2Percent]),

    score00: toNumber(row[COLUMNS.score00]),
    score10: toNumber(row[COLUMNS.score10]),
    score11: toNumber(row[COLUMNS.score11]),
    score01: toNumber(row[COLUMNS.score01]),
    score20: toNumber(row[COLUMNS.score20]),
    score21: toNumber(row[COLUMNS.score21]),
    score02: toNumber(row[COLUMNS.score02]),
    score12: toNumber(row[COLUMNS.score12]),

    H2H_H: toNumber(row[COLUMNS.h2hH]),
    H2H_D: toNumber(row[COLUMNS.h2hD]),
    H2H_A: toNumber(row[COLUMNS.h2hA]),
    H2H_OV: toNumber(row[COLUMNS.h2hOV]),
    H2H_UN: toNumber(row[COLUMNS.h2hUN]),
    H2H_GG: toNumber(row[COLUMNS.h2hGG]),
    H2H_NG: toNumber(row[COLUMNS.h2hNG]),
    H2H_GP: toNumber(row[COLUMNS.h2hGP]),

    H_Recent: row[COLUMNS.hRecent] || "",
    A_Recent: row[COLUMNS.aRecent] || "",
    H2H_Recent: row[COLUMNS.h2hRecent] || "",
    ftScore: String(row[COLUMNS.ftScore] || "").trim(),

    pick: row[COLUMNS.pick] || "",
    tips: row[COLUMNS.tips] || "",
    oneX2Rate: toNumber(row[COLUMNS.oneX2Rate]),
    chance: toNumber(row[COLUMNS.chance]),
    rating: toNumber(row[COLUMNS.rating]),
    flag: row[COLUMNS.flag] || "",
    predictionValidation: row[COLUMNS.predictionValidation] || "",

    homeOdds: toNumber(row[COLUMNS.homeOdds]),
    drawOdds: toNumber(row[COLUMNS.drawOdds]),
    awayOdds: toNumber(row[COLUMNS.awayOdds]),
    o05Odds: toNumber(row[COLUMNS.o05Odds]),
    u05Odds: toNumber(row[COLUMNS.u05Odds]),
    o15Odds: toNumber(row[COLUMNS.o15Odds]),
    u15Odds: toNumber(row[COLUMNS.u15Odds]),
    o25Odds: toNumber(row[COLUMNS.o25Odds]),
    u25Odds: toNumber(row[COLUMNS.u25Odds]),
    o35Odds: toNumber(row[COLUMNS.o35Odds]),
    u35Odds: toNumber(row[COLUMNS.u35Odds]),
    o45Odds: toNumber(row[COLUMNS.o45Odds]),
    u45Odds: toNumber(row[COLUMNS.u45Odds]),

    fullLeague: `${row[COLUMNS.country] || ""} - ${
      row[COLUMNS.league] || ""
    }`.trim(),
  };
}

/* -------------------------------------------------------------------------- */
/*                           ACCESS / EXPORT QUOTAS                           */
/* -------------------------------------------------------------------------- */

async function ensureExportUsageTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS export_usage (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      export_type TEXT NOT NULL,
      month_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, export_type, month_key)
    )
  `;
}

async function getUserRecord(userId) {
  if (!userId) return null;

  const rows = await sql`
    SELECT id, user_role, subscription_status, subscription_expires_at
    FROM auth_users
    WHERE id = ${userId}
    LIMIT 1
  `;

  return rows?.[0] || null;
}

function resolveTier(user) {
  const role = String(user?.user_role || "")
    .toLowerCase()
    .trim();
  const sub = String(user?.subscription_status || "")
    .toLowerCase()
    .trim();
  const expiresAt = user?.subscription_expires_at
    ? new Date(user.subscription_expires_at)
    : null;

  const subscriptionActive = !expiresAt || expiresAt > new Date();

  if (role === "admin") return "admin";
  if (role === "pro") return "pro";

  if (subscriptionActive && sub === "pro") return "pro";
  if (subscriptionActive && sub === "premium") return "premium";
  if (subscriptionActive && sub === "silver") return "silver";

  return "free";
}

async function getUsageMap(userId, monthKey) {
  await ensureExportUsageTable();

  const rows = await sql`
    SELECT export_type, count
    FROM export_usage
    WHERE user_id = ${userId}
      AND month_key = ${monthKey}
  `;

  const map = {};
  for (const row of rows || []) {
    map[String(row.export_type)] = toNumber(row.count);
  }

  return map;
}

function buildExportAccess(tier, usage = {}, monthKey = getMonthKey()) {
  const buildLimited = (allowed, limit, used = 0) => {
    if (!allowed) {
      return {
        allowed: false,
        unlimited: false,
        limit: 0,
        used: 0,
        remaining: 0,
      };
    }

    const remaining = Math.max(limit - used, 0);
    return {
      allowed: true,
      unlimited: false,
      limit,
      used,
      remaining,
    };
  };

  const buildUnlimited = (allowed) => ({
    allowed,
    unlimited: true,
    limit: null,
    used: usage?.basic || 0,
    remaining: null,
  });

  let basic;
  let pro;
  let compareAccess = false;

  if (tier === "admin" || tier === "pro") {
    basic = {
      allowed: true,
      unlimited: true,
      limit: null,
      used: usage?.basic || 0,
      remaining: null,
    };
    pro = {
      allowed: true,
      unlimited: true,
      limit: null,
      used: usage?.pro || 0,
      remaining: null,
    };
    compareAccess = true;
  } else if (tier === "premium") {
    basic = buildLimited(true, 30, usage?.basic || 0);
    pro = buildLimited(true, 30, usage?.pro || 0);
    compareAccess = true;
  } else if (tier === "silver") {
    basic = buildLimited(true, 30, usage?.basic || 0);
    pro = buildLimited(false, 0, 0);
    compareAccess = true;
  } else {
    basic = buildLimited(false, 0, 0);
    pro = buildLimited(false, 0, 0);
    compareAccess = false;
  }

  return {
    tier,
    monthKey,
    compareAccess,
    basic,
    pro,
  };
}

async function getExportAccessForUserId(userId) {
  if (!userId) {
    return buildExportAccess("free", {}, getMonthKey());
  }

  const user = await getUserRecord(userId);
  const tier = resolveTier(user);
  const monthKey = getMonthKey();
  const usage = await getUsageMap(userId, monthKey);

  return buildExportAccess(tier, usage, monthKey);
}

async function recordExportUsage(userId, exportType, monthKey) {
  await ensureExportUsageTable();

  const rows = await sql`
    INSERT INTO export_usage (user_id, export_type, month_key, count)
    VALUES (${String(userId)}, ${String(exportType)}, ${String(monthKey)}, 1)
    ON CONFLICT (user_id, export_type, month_key)
    DO UPDATE SET
      count = export_usage.count + 1,
      updated_at = NOW()
    RETURNING count
  `;

  return toNumber(rows?.[0]?.count);
}

function validateExportPermission(access, type) {
  const item = access?.[type];

  if (!item?.allowed) {
    return {
      ok: false,
      status: 403,
      message:
        type === "basic"
          ? "Your current plan does not include Basic CSV export."
          : "Your current plan does not include Premium Analytics CSV export.",
    };
  }

  if (!item.unlimited && (item.remaining ?? 0) <= 0) {
    return {
      ok: false,
      status: 429,
      message:
        type === "basic"
          ? "You have reached your 30 Basic CSV exports for this month."
          : "You have reached your 30 Premium Analytics CSV exports for this month.",
    };
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                              MATCHES FETCHING                              */
/* -------------------------------------------------------------------------- */

async function fetchMatchesFromDb(includeAll = false) {
  const today = new Date().toISOString().split("T")[0];

  let rows;
  if (includeAll) {
    rows = await sql`
      SELECT raw_data FROM matches_cache
      ORDER BY match_date ASC, match_time ASC
    `;
  } else {
    rows = await sql`
      SELECT raw_data FROM matches_cache
      WHERE match_date >= ${today}
      ORDER BY match_date ASC, match_time ASC
    `;
  }

  return rows.map((r) => r.raw_data);
}

async function fetchMatchesFromSheet(includeAll = false) {
  // Try database first
  try {
    const dbRows = await fetchMatchesFromDb(includeAll);
    if (dbRows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const COL_IDX = COLUMNS;
      const matches: any[] = [];

      for (const raw of dbRows) {
        if (!raw) continue;
        // Reconstruct the array correctly using the index mapping from COL_IDX (prevents JSONB key-sorting misalignment)
        const rowArr: string[] = [];
        Object.entries(COL_IDX).forEach(([key, index]) => {
          rowArr[index] = raw[key] !== undefined && raw[key] !== null ? String(raw[key]) : "";
        });
        const parsedDate = parseDate(rowArr[COL_IDX.date]);
        if (!includeAll && parsedDate && parsedDate < today) continue;
        matches.push(mapSheetRowToMatch(rowArr));
      }

      return {
        matches: sortMatchesByDateAsc(matches),
        summary: {
          total: dbRows.length,
          valid: matches.length,
          message: `Loaded ${matches.length} matches from database cache.`,
          source: "database",
        },
      };
    }
  } catch (dbErr) {
    console.warn("DB fetch failed, falling back to live sheet:", dbErr);
  }

  // Fallback: fetch live from Google Sheets
  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

  const response = await fetch(sheetsUrl, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Google Sheets data. Status: ${response.status}`,
    );
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);

  if (!rows.length) {
    return {
      matches: [],
      summary: {
        total: 0,
        valid: 0,
        message: "No data found in sheet",
      },
    };
  }

  const dataRows = rows.slice(1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const matches = [];

  for (const row of dataRows) {
    if (!row[COLUMNS.date] || !row[COLUMNS.match]) continue;

    const parsedDate = parseDate(row[COLUMNS.date]);

    if (!includeAll) {
      if (!parsedDate || parsedDate < today) continue;
    }

    matches.push(mapSheetRowToMatch(row));
  }

  const summary = {
    total: dataRows.length,
    valid: matches.length,
    message:
      matches.length > 0
        ? `Fetched ${dataRows.length} rows, ${matches.length} valid matches after parsing & filters.`
        : "⚠️ No upcoming matches found.",
    source: "live",
  };

  return {
    matches: sortMatchesByDateAsc(matches),
    summary,
  };
}


/* -------------------------------------------------------------------------- */
/*                                CSV BUILDERS                                */
/* -------------------------------------------------------------------------- */

function buildBasicCsv(matches) {
  const rows = sortMatchesByDateAsc(matches);

  const headers = [
    "S/N",
    "Date",
    "Time",
    "League",
    "Match",
    "Guide",
    "Home Win %",
    "Draw %",
    "Away Win %",
    "BTTS %",
    "Over 2.5 %",
    "Correct Score %",
    "Top Scoreline",
    "Alt Scoreline",
    "Chance %",
    "Rating %",
    "Confidence Tier",
    "Risk Level",
  ];

  const body = rows.map((m, index) =>
    [
      csvEscape(index + 1), // or csvEscape(m.sn || index + 1)
      csvEscape(m.date),
      csvEscape(m.time),
      csvEscape(m.fullLeague || m.league || ""),
      csvEscape(m.match || ""),
      csvEscape(normalizeGuide(m)),
      csvEscape(formatPct(m.homeWin)),
      csvEscape(formatPct(m.draw)),
      csvEscape(formatPct(m.awayWin)),
      csvEscape(formatPct(m.gg)),
      csvEscape(formatPct(m.ov25)),
      csvEscape(formatPct(m.modelCSPercent || m.scorelineCSPercent || 0)),
      csvEscape(csvScoreline(pickTopScoreline(m))),
      csvEscape(csvScoreline(pickSecondScoreline(m))),
      csvEscape(formatPct(m.chance)),
      csvEscape(formatPct(m.rating)),
      csvEscape(getConfidenceTier(m.rating)),
      csvEscape(getRiskLevel(m)),
    ].join(","),
  );

  return [headers.map(csvEscape).join(","), ...body].join("\n");
}

function buildPremiumCsv(matches, meta = {}) {
  const rows = sortMatchesByDateAsc(matches);

  const enriched = rows.map((m) => {
    const selectedProbability = getSelectedProbability(m);
    const fairOdds = getFairOdds(selectedProbability);
    const marketOdds = getSelectedMarketOdds(m);
    const valueEdgePct = getValueEdgePct(m);
    const premiumScore = getPremiumScore(m);

    return {
      ...m,
      selectedProbability,
      fairOdds,
      marketOdds,
      valueEdgePct,
      premiumScore,
      confidenceTier: getConfidenceTier(m.rating),
      riskLevel: getRiskLevel(m),
      convictionTier: getConvictionTier(m),
      biasStrength: getBiasStrength(m),
      marketBias: getMarketBiasFromGuide(m),
      alignmentScore: getAlignmentScore(m),
      topScoreline: pickTopScoreline(m),
      altScoreline: pickSecondScoreline(m),
      formMomentum: getFormMomentum(m),
      h2hLean: getH2HLean(m),
    };
  });

  const avg = (key) =>
    enriched.length
      ? enriched.reduce((sum, x) => sum + toNumber(x[key]), 0) / enriched.length
      : 0;

  const premiumShortlist = [...enriched]
    .sort((a, b) => b.premiumScore - a.premiumScore)
    .slice(0, 10);

  const aPlusCount = enriched.filter((m) => m.confidenceTier === "A+").length;
  const lowRiskCount = enriched.filter((m) => m.riskLevel === "Low").length;
  const strongConvictionCount = enriched.filter(
    (m) => m.convictionTier === "Ultra" || m.convictionTier === "Strong",
  ).length;
  const valuePlayCount = enriched.filter((m) => m.valueEdgePct > 0).length;
  const eliteScoreCount = enriched.filter((m) => m.premiumScore >= 75).length;

  const metadata = [
    ["section", "report_info"],
    ["report_name", "FutureBet Premium Analytics"],
    ["generated_at", new Date().toISOString()],
    ["selected_date", getDateRange(rows)],
    ["sort_mode", meta?.sortMode || "date"],
    ["user_tier", meta?.tier || ""],
    ["exported_matches", String(enriched.length)],
    [
      "notes",
      "Includes premium shortlist, value edge, fair odds, conviction, scoreline depth and market context",
    ],
    [],
  ];

  const summary = [
    ["section", "executive_summary"],
    ["avg_rating_score", avg("rating").toFixed(2)],
    ["avg_chance_score", avg("chance").toFixed(2)],
    ["avg_home_win_prob", avg("homeWin").toFixed(2)],
    ["avg_draw_prob", avg("draw").toFixed(2)],
    ["avg_away_win_prob", avg("awayWin").toFixed(2)],
    ["avg_btts_prob", avg("gg").toFixed(2)],
    ["avg_over25_prob", avg("ov25").toFixed(2)],
    ["avg_premium_score", avg("premiumScore").toFixed(2)],
    [
      "max_premium_score",
      Math.max(...enriched.map((m) => m.premiumScore), 0).toFixed(2),
    ],
    [
      "max_value_edge_pct",
      Math.max(...enriched.map((m) => m.valueEdgePct), 0).toFixed(2),
    ],
    ["a_plus_confidence_count", String(aPlusCount)],
    ["low_risk_count", String(lowRiskCount)],
    ["strong_or_ultra_conviction_count", String(strongConvictionCount)],
    ["positive_value_play_count", String(valuePlayCount)],
    ["elite_premium_score_count", String(eliteScoreCount)],
    [],
  ];

  const shortlistHeader = ["section", "premium_shortlist_top_10"];

  const shortlistColumns = [
    "rank",
    "date",
    "time",
    "league",
    "match",
    "guide",
    "premium_score",
    "confidence_tier",
    "risk_level",
    "conviction_tier",
    "selection_prob",
    "fair_odds",
    "market_odds",
    "value_edge_pct",
    "top_scoreline",
    "alt_scoreline",
    "form_momentum",
    "h2h_lean",
  ];

  const shortlistRows = premiumShortlist.map((m, index) => [
    String(index + 1), // rank
    m.date,
    m.time,
    m.fullLeague || m.league || "",
    m.match || "",
    normalizeGuide(m),
    m.premiumScore,
    m.confidenceTier,
    m.riskLevel,
    m.convictionTier,
    m.selectedProbability.toFixed(2),
    m.fairOdds ? m.fairOdds.toFixed(2) : "",
    m.marketOdds ? m.marketOdds.toFixed(2) : "",
    `${Math.round(m.valueEdgePct)}%`,
    csvScoreline(m.topScoreline),
    csvScoreline(m.altScoreline),
    m.formMomentum,
    m.h2hLean,
  ]);

  const detailColumns = [
    "sn",
    "date",
    "time",
    "league",
    "match",
    "guide",
    "market_bias",
    "selection_prob",
    "fair_odds",
    "market_odds",
    "value_edge_pct",
    "premium_score",
    "rating_score",
    "chance_score",
    "confidence_tier",
    "risk_level",
    "bias_strength_pct",
    "conviction_tier",
    "alignment_score",
    "top_scoreline",
    "top_score_prob",
    "alt_scoreline",
    "alt_score_prob",
    "home_win_prob",
    "draw_prob",
    "away_win_prob",
    "btts_prob",
    "no_btts_prob",
    "over25_prob",
    "under25_prob",
    "hppg",
    "appg",
    "hgs",
    "hgc",
    "ags",
    "agc",
    "avg_goals",
    "h_form",
    "a_form",
    "h_points",
    "a_points",
    "form_momentum",
    "h2h_home_win",
    "h2h_draw",
    "h2h_away_win",
    "h2h_over25",
    "h2h_btts",
    "h2h_games_played",
    "h2h_lean",
    "flag",
    "prediction_validation",
    "home_odds",
    "draw_odds",
    "away_odds",
    "o25_odds",
    "u25_odds",
    "ft_score",
  ];

  const detailRows = enriched.map((m, index) => [
    String(index + 1),
    m.date,
    m.time,
    m.fullLeague || m.league || "",
    m.match || "",
    normalizeGuide(m),
    m.marketBias,
    m.selectedProbability.toFixed(2),
    m.fairOdds ? m.fairOdds.toFixed(2) : "",
    m.marketOdds ? m.marketOdds.toFixed(2) : "",
    `${Math.round(m.valueEdgePct)}%`,
    m.premiumScore,
    toDecimal(m.rating).toFixed(2),
    toDecimal(m.chance).toFixed(2),
    m.confidenceTier,
    m.riskLevel,
    `${m.biasStrength}%`,
    m.convictionTier,
    m.alignmentScore,
    csvScoreline(m.topScoreline),
    toDecimal(m.modelCSPercent || m.scorelineCSPercent || 0).toFixed(2),
    csvScoreline(m.altScoreline),
    toDecimal(m.cs2Percent || 0).toFixed(2),
    toDecimal(m.homeWin).toFixed(2),
    formatPct(m.draw),
    formatPct(m.awayWin),
    formatPct(m.gg),
    formatPct(m.ng),
    formatPct(m.ov25),
    formatPct(m.un25),

    toNumber(m.hppg),
    toNumber(m.appg),
    toNumber(m.hgs),
    toNumber(m.hgc),
    toNumber(m.ags),
    toNumber(m.agc),
    toNumber(m.avg),

    m.hForm || "",
    m.aForm || "",

    toNumber(m.hPts),
    toNumber(m.aPts),

    m.formMomentum,

    toDecimal(m.H2H_H).toFixed(2),
    formatPct(m.H2H_D),
    formatPct(m.H2H_A),
    formatPct(m.H2H_OV),
    formatPct(m.H2H_GG),

    toNumber(m.H2H_GP),

    m.h2hLean,
    m.flag || "",
    m.predictionValidation || "",

    toNumber(m.homeOdds) ? toNumber(m.homeOdds).toFixed(2) : "",
    toNumber(m.drawOdds) ? toNumber(m.drawOdds).toFixed(2) : "",
    toNumber(m.awayOdds) ? toNumber(m.awayOdds).toFixed(2) : "",
    toNumber(m.o25Odds) ? toNumber(m.o25Odds).toFixed(2) : "",
    toNumber(m.u25Odds) ? toNumber(m.u25Odds).toFixed(2) : "",

    m.ftScore || "",
  ]);

  const lines = [];

  for (const row of metadata) {
    lines.push((row || []).map(csvEscape).join(","));
  }

  for (const row of summary) {
    lines.push((row || []).map(csvEscape).join(","));
  }

  lines.push(shortlistHeader.map(csvEscape).join(","));
  lines.push(shortlistColumns.map(csvEscape).join(","));
  for (const row of shortlistRows) {
    lines.push(row.map(csvEscape).join(","));
  }

  lines.push("");
  lines.push(csvEscape("section") + "," + csvEscape("detailed_dataset"));
  lines.push(detailColumns.map(csvEscape).join(","));
  for (const row of detailRows) {
    lines.push(row.map(csvEscape).join(","));
  }

  return lines.join("\n");
}

function buildCsvResponse({ csv, fileName, access, exportType, usedCount }) {
  const item = access?.[exportType];
  const isUnlimited = !!item?.unlimited;

  const headers = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
    "X-Export-Type": exportType,
    "X-Plan": access?.tier || "free",
    "X-Export-Used": String(usedCount ?? item?.used ?? 0),
    "X-Export-Limit": isUnlimited ? "unlimited" : String(item?.limit ?? 0),
    "X-Export-Remaining": isUnlimited
      ? "unlimited"
      : String(
          Math.max((item?.limit ?? 0) - (usedCount ?? item?.used ?? 0), 0),
        ),
  };

  return new Response(csv, {
    status: 200,
    headers,
  });
}

/* -------------------------------------------------------------------------- */
/*                                   GET                                      */
/* -------------------------------------------------------------------------- */

export async function GET(request) {
  try {
    const url = new URL(request.url);

    const forceRefresh = url.searchParams.get("refresh") === "true";
    const includeAll = url.searchParams.get("all") === "true";
    const wantsCsv =
      String(url.searchParams.get("format") || "").toLowerCase() === "csv";
    const exportType =
      String(url.searchParams.get("type") || "basic").toLowerCase() === "pro"
        ? "pro"
        : "basic";
    const isCompareRequest = url.searchParams.get("compare") === "true";

    const session = await auth();
    const exportAccess = await getExportAccessForUserId(session?.user?.id);

    if (isCompareRequest && !exportAccess?.compareAccess) {
      return Response.json(
        {
          error: "COMPARE_ACCESS_DENIED",
          message:
            "Team Compare is available on Silver, Premium, Pro and Admin plans only.",
        },
        { status: 403 },
      );
    }

    if (wantsCsv) {
      if (!session?.user?.id) {
        return Response.json(
          {
            error: "UNAUTHORIZED",
            message: "Please sign in to export CSV files.",
          },
          { status: 401 },
        );
      }

      const permission = validateExportPermission(exportAccess, exportType);
      if (!permission.ok) {
        return Response.json(
          {
            error: "EXPORT_DENIED",
            message: permission.message,
            exportAccess,
          },
          { status: permission.status },
        );
      }

      const { matches } = await fetchMatchesFromSheet(includeAll);
      const csv =
        exportType === "pro"
          ? buildPremiumCsv(matches, {
              selectedDate: "",
              sortMode: "date",
              tier: exportAccess?.tier || "free",
            })
          : buildBasicCsv(matches);

      const monthKey = exportAccess?.monthKey || getMonthKey();
      const usedCount = await recordExportUsage(
        session.user.id,
        exportType,
        monthKey,
      );

      return buildCsvResponse({
        csv,
        fileName:
          exportType === "pro"
            ? `futurebet-premium-analytics-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`
            : `futurebet-basic-${new Date().toISOString().slice(0, 10)}.csv`,
        access: exportAccess,
        exportType,
        usedCount,
      });
    }

    const now = Date.now();

    let payload = cachedPayload;

    if (
      !payload ||
      includeAll ||
      forceRefresh ||
      now - cacheTimestamp >= CACHE_DURATION
    ) {
      const base = await fetchMatchesFromSheet(includeAll);

      const enrichedMatches = base.matches.map((m) => ({
        ...m,
        intelligence: computeIntelligence(m, "admin"),
      }));

      payload = {
        matches: enrichedMatches,
        summary: base.summary,
      };

      if (!includeAll) {
        cachedPayload = payload;
        cacheTimestamp = now;
      }
    }

    return Response.json({
      ...payload,
      exportAccess,
    });
  } catch (error) {
    console.error("GET /api/matches error:", error);

    return Response.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message:
          error.message || "Something went wrong while fetching matches.",
      },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   POST                                     */
/* -------------------------------------------------------------------------- */

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        {
          error: "UNAUTHORIZED",
          message: "Please sign in to export CSV files.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const exportType =
      String(body?.type || "basic").toLowerCase() === "pro" ? "pro" : "basic";
    const selectedDate = body?.selectedDate
      ? String(body.selectedDate).split("T")[0]
      : "";
    const sortMode = String(body?.sortMode || "date");
    const matches = Array.isArray(body?.matches) ? body.matches : [];

    if (!matches.length) {
      return Response.json(
        {
          error: "NO_MATCHES",
          message: "No matches were provided for export.",
        },
        { status: 400 },
      );
    }

    const exportAccess = await getExportAccessForUserId(session.user.id);
    const permission = validateExportPermission(exportAccess, exportType);

    if (!permission.ok) {
      return Response.json(
        {
          error: "EXPORT_DENIED",
          message: permission.message,
          exportAccess,
        },
        { status: permission.status },
      );
    }

    const csv =
      exportType === "pro"
        ? buildPremiumCsv(matches, {
            selectedDate,
            sortMode,
            tier: exportAccess?.tier || "free",
          })
        : buildBasicCsv(matches);

    const monthKey = exportAccess?.monthKey || getMonthKey();
    const usedCount = await recordExportUsage(
      session.user.id,
      exportType,
      monthKey,
    );

    return buildCsvResponse({
      csv,
      fileName:
        exportType === "pro"
          ? `futurebet-premium-analytics-${
              selectedDate || new Date().toISOString().slice(0, 10)
            }.csv`
          : `futurebet-basic-${
              selectedDate || new Date().toISOString().slice(0, 10)
            }.csv`,
      access: exportAccess,
      exportType,
      usedCount,
    });
  } catch (error) {
    console.error("POST /api/matches export error:", error);

    return Response.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: error.message || "Something went wrong while exporting CSV.",
      },
      { status: 500 },
    );
  }
}
