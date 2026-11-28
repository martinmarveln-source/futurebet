/**
 * Unified, date-safe match score parsing, fixture matching, CSV parsing,
 * and market outcome settlement utilities shared across API routes.
 */

export interface ParsedFtScore {
  type: "score";
  hg: number;
  ag: number;
  total: number;
  raw: string;
}

export interface ScoreMatchRecord {
  date: string;
  home: string;
  away: string;
  label: string;
  score: string;
}

export interface ScoreLookupIndex {
  directMap: Map<string, { score: string; date: string }>;
  records: ScoreMatchRecord[];
}

export const MISSED_RESULTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1FkwBHYn00egVeyKVgI7OBEU96wMmf30v-aLKosFdDok/gviz/tq?tqx=out:csv&sheet=missed_Results";

const TEAM_STOP_WORDS =
  /\b(fc|cf|sc|ac|afc|united|utd|city|town|club|athletic|wanderers|rovers|the|de|la|del|da|do|pr)\b/g;

/** Normalize a date value into YYYY-MM-DD (handles ISO, MM/DD/YYYY, Date, and strings). */
export function toSafeDateISO(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? "" : val.toISOString().slice(0, 10);
  }
  const trimmed = String(val).trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, day, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  try {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {
    // ignore invalid dates
  }
  return trimmed.slice(0, 10);
}

/** Check if two YYYY-MM-DD date strings are within `maxDays` days (returns true if either is blank). */
export function datesWithinDays(dateA: string, dateB: string, maxDays = 1): boolean {
  if (!dateA || !dateB) return true;
  const a = toSafeDateISO(dateA);
  const b = toSafeDateISO(dateB);
  if (!a || !b || a.length < 10 || b.length < 10) return true;
  const tA = Date.parse(`${a}T12:00:00Z`);
  const tB = Date.parse(`${b}T12:00:00Z`);
  if (!Number.isFinite(tA) || !Number.isFinite(tB)) return true;
  return Math.abs(tA - tB) <= maxDays * 86400000;
}

/** Strip diacritics and standardize fixture separators ("Home - Away"). */
export function normMatchName(s: unknown): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+(?:vs\.?|v\.?)\s+/g, " - ")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}

/** Split "Home - Away" or "Home vs Away" cleanly without slicing inside club names. */
export function splitTeams(matchName: string): { home: string; away: string } {
  const parts = String(matchName || "").split(/\s+(?:-|–|—|vs\.?|v\.?)\s+/i);
  return {
    home: (parts[0] || "").trim().toLowerCase(),
    away: (parts[1] || "").trim().toLowerCase(),
  };
}

/** Normalize an individual club name for safe comparison. */
export function normalizeTeam(str: string): string {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(TEAM_STOP_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Conservative team comparison requiring exact, >=5-char substring, or full significant-word match. */
export function teamsMatch(teamA: string, teamB: string): boolean {
  const a = normalizeTeam(teamA);
  const b = normalizeTeam(teamB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a))) return true;

  const wordsA = a.split(" ").filter((w) => w.length >= 3);
  const wordsB = b.split(" ").filter((w) => w.length >= 3);
  if (wordsA.length > 0 && wordsB.length > 0) {
    const common = wordsA.filter((w) => wordsB.includes(w));
    if (common.length > 0 && common.length >= Math.min(wordsA.length, wordsB.length)) {
      return true;
    }
  }

  return false;
}

/** Parse "2:1" or "2-1" full-time scores; returns null for non-numeric or missing values. */
export function parseFtScore(score: unknown): ParsedFtScore | null {
  if (!score) return null;
  const m = String(score).trim().match(/^(\d+)\s*[:\-]\s*(\d+)$/);
  if (!m) return null;
  const hg = parseInt(m[1], 10);
  const ag = parseInt(m[2], 10);
  if (!Number.isFinite(hg) || !Number.isFinite(ag)) return null;
  return { type: "score", hg, ag, total: hg + ag, raw: `${hg}:${ag}` };
}

/** Quote-aware RFC-4180 CSV parser returning lowercase-trimmed header maps per row. */
export function parseQuotedCSV(csvText: string): Array<Record<string, string>> {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) return [];

  const splitLine = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length === 0) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

export function createScoreLookupIndex(): ScoreLookupIndex {
  return { directMap: new Map(), records: [] };
}

export function addScoreRecord(
  index: ScoreLookupIndex,
  params: { date?: unknown; home?: string; away?: string; label?: string; score?: unknown }
) {
  const parsed = parseFtScore(params.score);
  if (!parsed) return;
  const score = String(params.score).trim();
  const d = toSafeDateISO(params.date);
  const h = String(params.home || "").trim();
  const a = String(params.away || "").trim();
  const label = String(params.label || "").trim();

  if (h && a) {
    const pairNorm = `${normMatchName(h)} - ${normMatchName(a)}`;
    if (d && !index.directMap.has(`${d}|${pairNorm}`)) {
      index.directMap.set(`${d}|${pairNorm}`, { score, date: d });
    }
    if (!index.directMap.has(pairNorm)) {
      index.directMap.set(pairNorm, { score, date: d });
    }
    index.records.push({ date: d, home: h, away: a, label: label || `${h} - ${a}`, score });
  } else if (label) {
    const split = splitTeams(label);
    if (split.home && split.away) {
      index.records.push({ date: d, home: split.home, away: split.away, label, score });
    }
  }

  if (label) {
    const labelNorm = normMatchName(label);
    if (d && !index.directMap.has(`${d}|${labelNorm}`)) {
      index.directMap.set(`${d}|${labelNorm}`, { score, date: d });
    }
    if (!index.directMap.has(labelNorm)) {
      index.directMap.set(labelNorm, { score, date: d });
    }
  }
}

/**
 * Look up verified FT score enforcing date compatibility and ordered home->home / away->away match.
 * Never reverses home/away or matches across unrelated dates.
 */
export function findScoreInIndex(
  index: ScoreLookupIndex,
  matchString: string,
  legDate = "",
  maxDays = 1
): string | null {
  if (!matchString) return null;
  const norm = normMatchName(matchString);
  const safeLegDate = toSafeDateISO(legDate);

  if (safeLegDate) {
    const dated = index.directMap.get(`${safeLegDate}|${norm}`);
    if (dated) return dated.score;
  }

  const exact = index.directMap.get(norm);
  if (exact && datesWithinDays(exact.date, safeLegDate, maxDays)) {
    return exact.score;
  }

  const { home, away } = splitTeams(matchString);
  if (!home || !away) return null;

  for (const rec of index.records) {
    if (!datesWithinDays(rec.date, safeLegDate, maxDays)) continue;
    if (rec.home && rec.away && teamsMatch(rec.home, home) && teamsMatch(rec.away, away)) {
      return rec.score;
    }
    if (rec.label) {
      const recSplit = splitTeams(rec.label);
      if (recSplit.home && recSplit.away && teamsMatch(recSplit.home, home) && teamsMatch(recSplit.away, away)) {
        return rec.score;
      }
    }
  }

  return null;
}

/**
 * Shared settlement evaluator across Multi-Bet Archive, Performance Tracker, and Portfolio.
 * Handles Combo bets, Double Chance, BTTS (GG/NG), Over/Under (including Yes/No phrasing),
 * 1X2 / Full Time Result, and exact Correct Score.
 */
export function evaluateMarketOutcome(
  market: string,
  option: string,
  ftScore: string
): "won" | "lost" | "pending" {
  const parsed = parseFtScore(ftScore);
  if (!parsed) return "pending";
  const { hg, ag, total } = parsed;

  const mkt = String(market || "").toLowerCase().trim();
  const opt = String(option || "").toLowerCase().trim();
  const combined = `${mkt} ${opt}`;

  // 0. Combo Bet Markets (e.g. "Home and Over 1.5", "GG and Over 2.5", "1X & Over 1.5")
  const isCombo = mkt.includes("combo") || /\band\b|&|\+/.test(opt) || /\band\b|&|\+/.test(mkt);
  if (isCombo) {
    const lineMatch = combined.match(/(\d+(\.\d+)?)/);
    const line = lineMatch ? parseFloat(lineMatch[1]) : 1.5;
    const isUnder = combined.includes("under");
    const goalPass = isUnder ? total < line : total > line;
    const isGg = hg > 0 && ag > 0;

    if (combined.includes("gg") || combined.includes("gh") || combined.includes("btts") || combined.includes("both")) {
      const bttsPass = combined.includes("ng") || /\bno\b/.test(combined) ? !isGg : isGg;
      return bttsPass && goalPass ? "won" : "lost";
    }
    if (combined.includes("1x") || combined.includes("home or draw") || combined.includes("home win or draw")) {
      return hg >= ag && goalPass ? "won" : "lost";
    }
    if (
      combined.includes("x2") ||
      combined.includes("draw or away") ||
      combined.includes("away or draw") ||
      combined.includes("away win or draw")
    ) {
      return ag >= hg && goalPass ? "won" : "lost";
    }
    if (combined.includes("12") || combined.includes("home or away")) {
      return hg !== ag && goalPass ? "won" : "lost";
    }
    if (combined.includes("away") || /\b2\b/.test(opt)) {
      return ag > hg && goalPass ? "won" : "lost";
    }
    if (combined.includes("draw") || /\bx\b/.test(opt)) {
      return hg === ag && goalPass ? "won" : "lost";
    }
    if (combined.includes("home") || /\b1\b/.test(opt)) {
      return hg > ag && goalPass ? "won" : "lost";
    }
    return "pending";
  }

  // 1. Correct Score (explicit "Correct Score" market or exact "1:0" option when not a combo)
  if (mkt.includes("correct") || (!isCombo && /^\d+\s*[:\-]\s*\d+$/.test(opt))) {
    const target = parseFtScore(opt);
    if (target) {
      return target.hg === hg && target.ag === ag ? "won" : "lost";
    }
  }

  // 2. Double Chance
  const isDoubleChanceMkt = mkt.includes("double");
  const isDoubleChanceOpt =
    opt.includes("1x") ||
    opt.includes("x2") ||
    opt.includes("12") ||
    opt.includes("home or draw") ||
    opt.includes("home win or draw") ||
    opt.includes("draw or away") ||
    opt.includes("away win or draw") ||
    opt.includes("draw or away win") ||
    opt.includes("away or draw") ||
    opt.includes("home or away") ||
    opt.includes("home win or away") ||
    opt.includes("home or away win");

  if (isDoubleChanceMkt || isDoubleChanceOpt) {
    if (opt.includes("1x") || opt.includes("home or draw") || opt.includes("home win or draw")) {
      return hg >= ag ? "won" : "lost";
    }
    if (
      opt.includes("x2") ||
      opt.includes("draw or away") ||
      opt.includes("away win or draw") ||
      opt.includes("draw or away win") ||
      opt.includes("away or draw")
    ) {
      return ag >= hg ? "won" : "lost";
    }
    if (
      opt.includes("12") ||
      opt.includes("home or away") ||
      opt.includes("home win or away") ||
      opt.includes("home or away win")
    ) {
      return hg !== ag ? "won" : "lost";
    }
    return "pending";
  }

  // 3. Both Teams To Score (BTTS / GG / NG)
  if (
    mkt.includes("both") ||
    mkt.includes("btts") ||
    opt.includes("btts") ||
    opt === "gg" ||
    opt === "ng" ||
    mkt === "gg" ||
    mkt === "ng"
  ) {
    const isGg = hg > 0 && ag > 0;
    if (opt.includes("no") || opt === "ng" || opt.includes("btts no")) return !isGg ? "won" : "lost";
    if (opt.includes("yes") || opt === "gg" || opt.includes("btts yes")) return isGg ? "won" : "lost";
    return isGg ? "won" : "lost";
  }

  // 4. Goals Over / Under (handles "Over 2.5", "O/U 2.5 - Under", and UI phrasing like "Over 3.5 • No")
  if (
    mkt.includes("goal") ||
    mkt.includes("over") ||
    mkt.includes("under") ||
    mkt.includes("o/u") ||
    opt.includes("over") ||
    opt.includes("under")
  ) {
    const lineMatch = (opt + " " + mkt).match(/(\d+(\.\d+)?)/);
    const line = lineMatch ? parseFloat(lineMatch[1]) : 2.5;

    let want: "over" | "under" | null = null;
    if (opt.includes("over")) want = "over";
    else if (opt.includes("under")) want = "under";
    else if (opt.includes("yes")) {
      if (mkt.includes("under")) want = "under";
      else want = "over";
    } else if (opt.includes("no")) {
      if (mkt.includes("under")) want = "over";
      else want = "under";
    } else if (mkt.includes("over")) {
      want = "over";
    } else if (mkt.includes("under")) {
      want = "under";
    }

    if (want === "over") return total > line ? "won" : "lost";
    if (want === "under") return total <= line && Number.isInteger(line) ? "won" : total < line ? "won" : "lost";
  }

  // 5. Full Time Result (1X2)
  if (
    mkt.includes("result") ||
    mkt.includes("1x2") ||
    mkt.includes("match") ||
    mkt === "1x2" ||
    mkt === "fulltime" ||
    mkt === "full time result" ||
    opt === "home win" ||
    opt === "away win" ||
    opt === "draw" ||
    opt === "1" ||
    opt === "2" ||
    opt === "x"
  ) {
    if (opt.includes("home") || opt === "1" || opt === "home win") return hg > ag ? "won" : "lost";
    if (opt.includes("away") || opt === "2" || opt === "away win") return ag > hg ? "won" : "lost";
    if (opt.includes("draw") || opt === "x") return hg === ag ? "won" : "lost";
  }

  return "pending";
}
