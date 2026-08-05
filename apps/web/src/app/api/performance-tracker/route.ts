// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

/* =========================
   CONFIG (sheet source)
========================= */
const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
const SHEET_NAME = "Picks";

// We need BZ (index 77), so range must include BZ in the sheet fetch.
// (Your picks route is updated too, but here we also fetch directly for syncing.)
const SHEET_RANGE = "A1:BZ";

/**
 * Auto-void cutoff:
 * If a match for DATE D is still missing ftScore at (D+1) 03:00, mark it VOID.
 * You can tweak these via env vars without new files.
 */
const RESULTS_VOID_CUTOFF_HOUR = Number(
  process.env.RESULTS_VOID_CUTOFF_HOUR ?? 12,
); // 2 or 5
const RESULTS_TZ = process.env.RESULTS_TZ || "Africa/Lagos"; // change if needed
const CRON_KEY = process.env.RESULTS_CRON_KEY || ""; // optional: protect cron calls
/* =========================
   NEW FT RESULT SOURCE
========================= */
const FT_SHEET_ID = "1FkwBHYn00egVeyKVgI7OBEU96wMmf30v-aLKosFdDok";
const FT_SHEET_NAME = "Stats"; // change if needed

// Column indexes (0-based)
const FT_MATCH_COL = 5; // Column F
const FT_RESULT_COL = 11; // Column L

/* =========================
   HELPERS
========================= */
const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};
function currentYearMonthInTZ(tz = RESULTS_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value); // 1-12
  return { y, m };
}

function parseDMYorDMToISO(input) {
  const s = String(input || "").trim();

  const m = s.match(/^(\d{1,2})\s*-\s*([A-Za-z]{3})(?:\s*-\s*(\d{4}))?$/);
  if (m) {
    const day = Number(m[1]);
    const mon = MONTHS[String(m[2]).toLowerCase()];
    let year = m[3] ? Number(m[3]) : null;

    if (!year) {
      const now = currentYearMonthInTZ(RESULTS_TZ);
      year = now.y;
      const monthNum = mon + 1;
      if (monthNum < now.m) year = now.y + 1; // rollover
    }

    const dt = new Date(year, mon, day);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function toISODateOnly(d) {
  return parseDMYorDMToISO(d);
}

function normalizeTicketCode(x) {
  return String(x || "").trim();
}

function isTicketRow(row) {
  // New schema: ticket_code exists
  if (row?.ticket_code) return true;
  // Backward compatibility: actual_result stored as "TICKET:CODE"
  return (
    typeof row?.actual_result === "string" &&
    row.actual_result.startsWith("TICKET:")
  );
}

function getTicketCodeFromRow(row) {
  if (row?.ticket_code) return String(row.ticket_code).trim();
  if (
    typeof row?.actual_result === "string" &&
    row.actual_result.startsWith("TICKET:")
  ) {
    return row.actual_result.replace("TICKET:", "").trim();
  }
  return "";
}

/** allow void */
function normalizeResult(r) {
  const v = String(r || "")
    .toLowerCase()
    .trim();
  if (v === "won" || v === "lost" || v === "pending" || v === "void") return v;
  return "pending";
}

/**
 * Ticket status logic:
 * - any LOST => ticket LOST
 * - else if all are WON or VOID => ticket WON
 * - else => PENDING
 */
function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v === "won" || v === "lost" || v === "void") return v;
  return "pending";
}

function computeTicketStatus(matches = []) {
  if (!matches.length) return "pending";

  const statuses = matches.map((m) => normalizeStatus(m.status));

  if (statuses.includes("lost")) return "lost";

  // If everything decided (won/void only)
  const allDecided = statuses.every((x) => x === "won" || x === "void");
  if (!allDecided) return "pending";

  // If all void => void; else won
  const anyWon = statuses.some((x) => x === "won");
  return anyWon ? "won" : "void";
}
function computeTicketOddsExcludingVoid(selections = []) {
  let product = 1;
  let used = 0;

  for (const s of selections) {
    const st = String(s?.status || "pending").toLowerCase();
    if (st === "void") continue; // ✅ exclude void

    const o = Number(s?.odds);
    if (Number.isFinite(o) && o > 0) {
      product *= o;
      used += 1;
    }
  }

  // if we had no odds data at all, return null so UI can fallback
  if (used === 0) return null;

  // round to 2dp (bookie style)
  return Math.round(product * 100) / 100;
}

function buildTicketDTO(ticketCode, rows) {
  const selections = rows.map((r) => ({
    match: r.match_name,
    league: r.league,
    prediction: r.prediction,
    status: r.status || "pending",
    matchDate: r.match_date || "",
    ftScore: r.actual_result || "",
    odds: r.selection_odds ?? null, // ✅ store per-selection odds
  }));

  const anyRow = rows[0] || {};
  const stake = anyRow.ticket_stake ?? null;
  const autoOdds = computeTicketOddsExcludingVoid(selections);

  const totalOdds =
    anyRow.ticket_total_odds ?? // manual override still allowed
    autoOdds ?? // ✅ auto-calc excluding VOID
    anyRow.total_odds ??
    anyRow.potential_payout ??
    null;

  const isShared = Boolean(anyRow.ticket_is_shared);

  const createdAt =
    rows
      .map((x) => x.created_at)
      .filter(Boolean)
      .sort()
      .slice(0, 1)[0] ||
    anyRow.created_at ||
    new Date().toISOString();

  const ticket = {
    ticket_id: ticketCode,
    created_at: createdAt,
    total_odds: totalOdds,
    total_matches: selections.length,
    is_shared: isShared,
    stake, // ✅ ADD THIS
    selections,
  };

  ticket.status = computeTicketStatus(ticket.selections);
  return ticket;
}

/* ---------------- Match normalization (to map sheet rows ↔ db rows) ---------------- */
function normMatchKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}

function parseFtScore(score) {
  const raw = String(score || "").trim();
  if (!raw) return null;

  // allow "2:1" or "2-1"
  const m = raw.match(/^(\d+)\s*[:\-]\s*(\d+)$/);
  if (!m) return { type: "non_numeric", raw };

  const hg = Number(m[1]);
  const ag = Number(m[2]);
  if (!Number.isFinite(hg) || !Number.isFinite(ag)) return null;
  return { type: "score", hg, ag, total: hg + ag, raw: `${hg}:${ag}` };
}

/* ---------------- Parse prediction "Market - Option" ---------------- */
function parsePrediction(pred) {
  const raw = String(pred || "").trim();
  if (!raw) return { market: "", option: "" };

  // Expected: "Over/Under 2.5 - Under 2.5"
  const parts = raw.split(" - ");
  if (parts.length >= 2) {
    return {
      market: parts[0].trim(),
      option: parts.slice(1).join(" - ").trim(),
    };
  }

  // fallback (sometimes stored as just "Under 2.5" etc.)
  return { market: raw.trim(), option: raw.trim() };
}

/* ---------------- Outcome evaluation ---------------- */
function isOverUnderMarket(market, option) {
  const s = `${market} ${option}`.toLowerCase();
  return s.includes("over") || s.includes("under") || s.includes("o/u");
}

function extractLine(optionOrMarket) {
  // returns number like 2.5, 1.5, 3.5
  const s = String(optionOrMarket || "");
  const m = s.match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function evalSelectionOutcome({ prediction, ftScore }) {
  const ft = parseFtScore(ftScore);
  if (!ft || ft.type === "non_numeric") return "pending"; // score not ready (or weird string)

  const { hg, ag, total } = ft;
  const { market, option } = parsePrediction(prediction);
  const mkt = String(market || "").toLowerCase();
  const opt = String(option || "").toLowerCase();

  // Correct Score
  if (mkt.includes("correct") || opt.includes(":") || opt.includes("-")) {
    const target = parseFtScore(option);
    if (target?.type === "score")
      return target.hg === hg && target.ag === ag ? "won" : "lost";
  }

  // BTTS
  if (mkt.includes("btts") || opt.includes("btts")) {
    const yes = hg > 0 && ag > 0;
    if (opt.includes("yes")) return yes ? "won" : "lost";
    if (opt.includes("no")) return !yes ? "won" : "lost";
    // if stored as just "BTTS" treat as Yes
    return yes ? "won" : "lost";
  }

  // 1X2
  if (
    mkt.includes("1x2") ||
    mkt.includes("full time result") ||
    mkt.includes("match result")
  ) {
    const homeWin = hg > ag;
    const draw = hg === ag;
    const awayWin = ag > hg;

    if (opt.includes("home")) return homeWin ? "won" : "lost";
    if (opt.includes("draw")) return draw ? "won" : "lost";
    if (opt.includes("away")) return awayWin ? "won" : "lost";
  }

  // Double chance
  if (
    mkt.includes("double") ||
    opt.includes("1x") ||
    opt.includes("x2") ||
    opt.includes("12")
  ) {
    const homeWin = hg > ag;
    const draw = hg === ag;
    const awayWin = ag > hg;

    if (opt.includes("1x") || (opt.includes("home") && opt.includes("draw")))
      return homeWin || draw ? "won" : "lost";
    if (opt.includes("x2") || (opt.includes("draw") && opt.includes("away")))
      return draw || awayWin ? "won" : "lost";
    if (opt.includes("12") || (opt.includes("home") && opt.includes("away")))
      return homeWin || awayWin ? "won" : "lost";
  }

  // Over/Under (any line) — supports Over/Under + Yes/No UI
  if (isOverUnderMarket(market, option)) {
    const line = extractLine(option) ?? extractLine(market);
    if (!Number.isFinite(line)) return "pending";

    // Decide what the user actually picked: "over" or "under"
    let want = null; // "over" | "under"

    // Normal cases
    if (opt.includes("over")) want = "over";
    if (opt.includes("under")) want = "under";

    // Yes/No cases (your UI: "Over 3.5 • No" means Under 3.5)
    if (!want) {
      const optYes = opt === "yes" || opt.includes("yes");
      const optNo = opt === "no" || opt.includes("no");

      if (optYes || optNo) {
        // If market explicitly says Over/Under
        if (mkt.includes("over")) want = optYes ? "over" : "under";
        else if (mkt.includes("under")) want = optYes ? "under" : "over";
        else if (mkt.includes("o/u") || mkt.includes("over/under")) {
          // For "O/U 2.5 • Yes/No" assume the question is "Over?"
          want = optYes ? "over" : "under";
        }
      }
    }

    if (!want) return "pending";

    const isOver = total > line;
    const isUnder = total < line || total === line; // safe (for integer lines)

    if (want === "over") return isOver ? "won" : "lost";
    if (want === "under") return isUnder ? "won" : "lost";
  }

  // If we can't interpret market/option safely, keep pending (don’t guess)
  return "pending";
}

/* ---------------- Fetch sheet rows (date, match, time, ftScore) ---------------- */
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

function combineKickoff(dateISO, timeStr) {
  const t = String(timeStr || "").trim();
  if (!dateISO || !t) return null;
  // store as "YYYY-MM-DDTHH:mm:00"
  const hhmm = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!hhmm) return null;
  const hh = String(hhmm[1]).padStart(2, "0");
  const mm = hhmm[2];
  return `${dateISO}T${hh}:${mm}:00`;
}

async function fetchSheetScoreMap() {
  // Fetch from the matches_cache table instead of Google Sheet
  const rows = await sql`
    SELECT match_label, home_team, ft_score
    FROM matches_cache
    WHERE match_date >= (CURRENT_DATE - INTERVAL '2 days')
      AND ft_score IS NOT NULL
      AND ft_score != ''
  `;

  /**
   * Map key:
   *   normalized-match
   * Value:
   *   { ftScore }
   */
  const map = new Map();

  for (const r of rows) {
    const ftScore = String(r.ft_score).trim();
    if (!ftScore) continue;

    if (r.match_label) map.set(normMatchKey(r.match_label), { ftScore });
    if (r.home_team) map.set(normMatchKey(r.home_team), { ftScore });
  }

  return map;
}

/* ---------------- Sync logic ---------------- */
async function syncTicketSelectionsFromSheet(userId) {
  // only pending or missing score, for recent dates (today & yesterday) to keep it light
  const rows = await sql`
    SELECT id, match_name, match_date, prediction, status, actual_result
    FROM user_performance_tracking
    WHERE user_id = ${userId}
      AND ticket_code IS NOT NULL
      AND (
        status IS NULL OR LOWER(status) = 'pending'
        OR actual_result IS NULL OR actual_result = ''
      )
      AND match_date >= (CURRENT_DATE - INTERVAL '2 days')
  `;

  if (!rows?.length) return { updated: 0 };

  const sheetMap = await fetchSheetScoreMap();
  if (!sheetMap.size) return { updated: 0 };

  let updated = 0;

  for (const r of rows) {
    const dateISO = toISODateOnly(r.match_date);
    const key = normMatchKey(r.match_name);
    const sheet = sheetMap.get(key);
    if (!sheet) continue;

    // If sheet has a score, store immediately (so it survives cleanup)
    const hasScore =
      sheet.ftScore && parseFtScore(sheet.ftScore)?.type === "score";
    if (!hasScore) continue;

    const newStatus = evalSelectionOutcome({
      prediction: r.prediction,
      ftScore: sheet.ftScore,
    });

    await sql`
      UPDATE user_performance_tracking
      SET
        actual_result = ${sheet.ftScore},
        status = ${newStatus},
        updated_at = NOW()
      WHERE id = ${r.id}
        AND user_id = ${userId}
    `;

    updated += 1;
  }

  return { updated };
}

async function voidOverdueSelections(userId) {
  // Mark as VOID if:
  // - still pending
  // - match_date is yesterday or earlier
  // - and current time in RESULTS_TZ is >= (match_date + 1 day at cutoff hour)
  //
  // We do this in SQL using timezone conversion.
  const cutoffHour = Math.max(0, Math.min(23, RESULTS_VOID_CUTOFF_HOUR));

  const res = await sql`
    WITH now_tz AS (
      SELECT (NOW() AT TIME ZONE ${RESULTS_TZ}) AS now_local
    ),
    cutoff AS (
      SELECT
        u.id,
        u.match_date,
        (u.match_date::timestamp + INTERVAL '1 day' + (${cutoffHour} || ' hours')::interval) AS cutoff_ts
      FROM user_performance_tracking u
      WHERE u.user_id = ${userId}
        AND u.ticket_code IS NOT NULL
        AND (u.status IS NULL OR LOWER(u.status) = 'pending')
        AND (u.actual_result IS NULL OR u.actual_result = '')
    )
    UPDATE user_performance_tracking u
    SET status = 'void', updated_at = NOW()
    FROM cutoff c, now_tz n
    WHERE u.id = c.id
      AND n.now_local >= c.cutoff_ts
    RETURNING u.id
  `;

  return { voided: Array.isArray(res) ? res.length : 0 };
}

/* =========================
   GET
========================= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = normalizeTicketCode(searchParams.get("ticketId"));

    // optional cron trigger (no new file): /api/performance-tracker?cron=1&key=...
    const isCron = searchParams.get("cron") === "1";
    const key = String(searchParams.get("key") || "");
    if (isCron) {
      if (CRON_KEY && key !== CRON_KEY) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      // cron sync for ALL users who have ticket selections in last 2 days
      const users = await sql`
        SELECT DISTINCT user_id
        FROM user_performance_tracking
        WHERE ticket_code IS NOT NULL
          AND match_date >= (CURRENT_DATE - INTERVAL '2 days')
      `;

      let totalUpdated = 0;
      let totalVoided = 0;

      for (const u of users) {
        const uid = u.user_id;
        const a = await syncTicketSelectionsFromSheet(uid);
        const b = await voidOverdueSelections(uid);
        totalUpdated += a.updated;
        totalVoided += b.voided;
      }

      return Response.json({
        ok: true,
        mode: "cron",
        users: users.length,
        updated: totalUpdated,
        voided: totalVoided,
        tz: RESULTS_TZ,
        cutoffHour: RESULTS_VOID_CUTOFF_HOUR,
        at: new Date().toISOString(),
      });
    }

    const session = await auth();
    const userId = session?.user?.id || null;

    // If no ticketId, require auth (normal dashboard)
    if (!ticketId && !userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Before serving normal dashboard, do a lightweight sync for this user
    if (userId) {
      await syncTicketSelectionsFromSheet(userId);
    }

    // If user is logged in: fetch user's rows
    // If user is not logged in but ticketId exists: fetch shared ticket only
    const rows = userId
      ? await sql`
          SELECT
            id,
            user_id,
            match_name,
            league,
            prediction,
            actual_result,
            bet_amount,
            potential_payout,
            actual_payout,
            status,
            match_date,
            created_at,
            updated_at,
            ticket_code,
            ticket_is_shared,
            ticket_total_odds,
            ticket_stake,
            selection_odds
          FROM user_performance_tracking
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT
            id,
            user_id,
            match_name,
            league,
            prediction,
            actual_result,
            bet_amount,
            potential_payout,
            actual_payout,
            status,
            match_date,
            created_at,
            updated_at,
            ticket_code,
            ticket_is_shared,
            ticket_total_odds,
            ticket_stake,
            selection_odds
          FROM user_performance_tracking
          WHERE ticket_code = ${ticketId}
            AND ticket_is_shared = true
          ORDER BY created_at DESC
        `;

    const ticketRows = rows.filter(isTicketRow);
    const betRows = rows.filter((r) => !isTicketRow(r));

    const ticketsMap = new Map();
    for (const r of ticketRows) {
      const code = getTicketCodeFromRow(r);
      if (!code) continue;
      if (!ticketsMap.has(code)) ticketsMap.set(code, []);
      ticketsMap.get(code).push(r);
    }

    const tickets = Array.from(ticketsMap.entries())
      .map(([code, tRows]) => buildTicketDTO(code, tRows))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Single ticket view
    if (ticketId) {
      if (userId) {
        const owned = tickets.find((t) => t.ticket_id === ticketId);
        if (owned) return Response.json(owned);

        const sharedRows = await sql`
          SELECT
            id,
            user_id,
            match_name,
            league,
            prediction,
            actual_result,
            bet_amount,
            potential_payout,
            actual_payout,
            status,
            match_date,
            created_at,
            updated_at,
            ticket_code,
            ticket_is_shared,
            ticket_total_odds,
            ticket_stake,
            selection_odds
          FROM user_performance_tracking
          WHERE ticket_code = ${ticketId}
            AND ticket_is_shared = true
          ORDER BY created_at DESC
        `;
        if (!sharedRows?.length) {
          return Response.json({ error: "Ticket not found" }, { status: 404 });
        }
        return Response.json(buildTicketDTO(ticketId, sharedRows));
      }

      if (!ticketRows.length) {
        return Response.json({ error: "Ticket not found" }, { status: 404 });
      }
      return Response.json(buildTicketDTO(ticketId, ticketRows));
    }

    // Calculate VIP outcomes for the last 7 days
    const vipRows = await sql`
      SELECT tips, guide, ft_score 
      FROM matches_cache
      WHERE match_date >= (CURRENT_DATE - INTERVAL '7 days')
        AND match_date <= CURRENT_DATE
        AND chance ~ '^[0-9]+$' AND CAST(chance AS numeric) >= 65
        AND rating ~ '^[0-9]+$' AND CAST(rating AS numeric) >= 55
        AND ft_score IS NOT NULL
        AND ft_score != ''
    `;
    
    let vipWon = 0;
    let vipLost = 0;
    for (const row of vipRows) {
      const pick = row.guide || row.tips;
      if (!pick) continue;
      const outcome = evalSelectionOutcome({ prediction: pick, ftScore: row.ft_score });
      if (outcome === 'won') vipWon++;
      else if (outcome === 'lost') vipLost++;
    }
    const vipTotal = vipWon + vipLost;
    const vipWinRate = vipTotal > 0 ? Math.round((vipWon / vipTotal) * 100) : 0;

    return Response.json({ bets: betRows, tickets, vipStats: { winRate: vipWinRate, total: vipTotal, won: vipWon } });
  } catch (err) {
    console.error("Performance Tracker GET error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================
   POST
========================= */
export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const actionFromQuery = String(searchParams.get("action") || "").trim();

    const body = await req.json().catch(() => ({}));
    const actionFromBody = String(body?.action || "").trim();

    if (actionFromQuery === "reset" || actionFromBody === "reset") {
      await sql`
        DELETE FROM user_performance_tracking
        WHERE user_id = ${session.user.id}
      `;

      return Response.json({
        success: true,
        reset: true,
      });
    }
    // ✅ CRON / DAILY RESULT SYNC (NO NEW FILE)
    if (body?.type === "sync_results") {
      const secret = String(body?.secret || "");
      if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      // --- helpers ---
      const tz = process.env.CRON_TZ || "Africa/Lagos";

      function dateISOInTZ(offsetDays = 0) {
        const now = new Date();
        const dt = new Date(now.getTime() + offsetDays * 86400000);
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(dt);

        const y = parts.find((p) => p.type === "year")?.value;
        const m = parts.find((p) => p.type === "month")?.value;
        const d = parts.find((p) => p.type === "day")?.value;
        return `${y}-${m}-${d}`;
      }

      function normMatchKey(s) {
        return String(s || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/[’']/g, "")
          .trim();
      }

      function parseFTScore(v) {
        const m = String(v || "")
          .trim()
          .match(/^(\d+)\s*[:\-]\s*(\d+)$/);
        if (!m) return null;
        const home = Number(m[1]);
        const away = Number(m[2]);
        if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
        return { home, away, total: home + away };
      }

      function parsePredictionToMarketOption(pred) {
        const raw = String(pred || "").trim();
        const parts = raw
          .split(" - ")
          .map((x) => x.trim())
          .filter(Boolean);
        if (parts.length >= 2)
          return { market: parts[0], option: parts.slice(1).join(" - ") };
        return { market: raw, option: "" };
      }

      function evalOutcome(prediction, ftScoreStr) {
        const score = parseFTScore(ftScoreStr);
        if (!score) return null;

        const { market, option } = parsePredictionToMarketOption(prediction);
        const m = String(market || "").toLowerCase();
        const o = String(option || "").toLowerCase();

        // ---- 1X2 ----
        if (m.includes("1x2")) {
          if (o.includes("home"))
            return score.home > score.away ? "won" : "lost";
          if (o.includes("draw"))
            return score.home === score.away ? "won" : "lost";
          if (o.includes("away"))
            return score.away > score.home ? "won" : "lost";
          return null;
        }

        // ---- Double Chance ----
        if (m.includes("double chance")) {
          const homeWin = score.home > score.away;
          const draw = score.home === score.away;
          const awayWin = score.away > score.home;

          if (o.includes("home") && o.includes("draw"))
            return homeWin || draw ? "won" : "lost";
          if (o.includes("away") && o.includes("draw"))
            return awayWin || draw ? "won" : "lost";
          if (o.includes("home") && o.includes("away"))
            return homeWin || awayWin ? "won" : "lost";
          return null;
        }

        // ---- BTTS ----
        if (m.includes("btts") || m.includes("gg")) {
          const btts = score.home > 0 && score.away > 0;
          if (o.includes("yes")) return btts ? "won" : "lost";
          if (o.includes("no")) return !btts ? "won" : "lost";
          return null;
        }

        // ---- Correct Score ----
        if (m.includes("correct") && m.includes("score")) {
          const pick = String(option || market || "").match(
            /(\d+)\s*[:\-]\s*(\d+)/,
          );
          if (!pick) return null;
          const ph = Number(pick[1]);
          const pa = Number(pick[2]);
          return score.home === ph && score.away === pa ? "won" : "lost";
        }

        // ---- Over/Under ----
        const num = String(market).match(/(\d+(?:\.\d+)?)/);
        if (
          num &&
          (m.includes("o/u") || m.includes("over") || m.includes("under"))
        ) {
          const line = Number(num[1]);
          if (!Number.isFinite(line)) return null;

          let want = null; // "over" | "under"
          if (o.includes("over")) want = "over";
          else if (o.includes("under")) want = "under";
          else if (o === "yes") {
            if (m.includes("over")) want = "over";
            if (m.includes("under")) want = "under";
          } else if (o === "no") {
            if (m.includes("over")) want = "under";
            if (m.includes("under")) want = "over";
          }

          if (!want) return null;

          const isOver = score.total > line;
          const isUnder = score.total < line || score.total === line; // treat equal as under for O/U
          if (want === "over") return isOver ? "won" : "lost";
          if (want === "under") return isUnder ? "won" : "lost";
        }

        return null;
      }

      // --- target date: yesterday (since job runs 2am next day) ---
      const targetDateISO = dateISOInTZ(-1);

      // 1) fetch DB instead of Google Sheet
      const dbScores = await sql`
        SELECT match_label, home_team, ft_score
        FROM matches_cache
        WHERE match_date::date = ${targetDateISO}::date
          AND ft_score IS NOT NULL
          AND ft_score != ''
      `;

      // 2) build map for target date
      const map = new Map(); // key -> ftScore
      for (const r of dbScores) {
        const ft = String(r.ft_score).trim();
        if (!ft) continue;

        if (r.match_label) map.set(normMatchKey(r.match_label), ft);
        if (r.home_team) map.set(normMatchKey(r.home_team), ft);
      }

      // 3) fetch DB rows to update
      const pendingRows = await sql`
    SELECT id, match_name, prediction
    FROM user_performance_tracking
    WHERE status = 'pending'
      AND match_date::date = ${targetDateISO}::date
  `;

      let updated = 0;
      let voided = 0;

      for (const row of pendingRows) {
        const key = normMatchKey(row.match_name);
        const ft = map.get(key) || "";

        if (ft) {
          const outcome = evalOutcome(row.prediction, ft);
          if (outcome === "won" || outcome === "lost") {
            await sql`
          UPDATE user_performance_tracking
          SET status = ${outcome},
              actual_result = ${ft},
              updated_at = NOW()
          WHERE id = ${row.id}
        `;
            updated++;
            continue;
          }
          // unknown market => void (safe)
          await sql`
        UPDATE user_performance_tracking
        SET status = 'void',
            actual_result = ${ft},
            updated_at = NOW()
        WHERE id = ${row.id}
      `;
          voided++;
        } else {
          // no score by cutoff => void
          await sql`
        UPDATE user_performance_tracking
        SET status = 'void',
            actual_result = NULL,
            updated_at = NOW()
        WHERE id = ${row.id}
      `;
          voided++;
        }
      }

      return Response.json({
        success: true,
        targetDate: targetDateISO,
        updated,
        voided,
        total: pendingRows.length,
      });
    }

    // ✅ Ticket from BetSlip
    if (body?.type === "ticket") {
      const matches = Array.isArray(body.matches) ? body.matches : [];
      const ticketCode = normalizeTicketCode(body.ticketCode);

      if (!ticketCode)
        return Response.json({ error: "Missing ticketCode" }, { status: 400 });
      if (!matches.length)
        return Response.json({ error: "No matches provided" }, { status: 400 });

      const share = Boolean(body.share);

      for (const m of matches) {
        const dateISO = toISODateOnly(m.date || m.match_date || m.matchDate);
        const timeStr = String(m.time || "").trim();
        const kickoff_at =
          m.kickoff_at ||
          (dateISO && timeStr ? `${dateISO}T${timeStr}:00` : null);

        const prediction =
          m.prediction ||
          (m.selectedMarket && m.selectedOption
            ? `${m.selectedMarket} - ${m.selectedOption}`
            : "");

        await sql`
   INSERT INTO user_performance_tracking (
    user_id,
    match_name,
    league,
    prediction,
    status,
    match_date,
    ticket_code,
    ticket_is_shared,
    ticket_total_odds,
    ticket_stake,          -- ✅ ADD THIS
    selection_odds
  )
  VALUES (
    ${session.user.id},
    ${m.match || m.matchName || m.match_name || ""},
    ${m.league || ""},
    ${prediction},
    'pending',
    ${dateISO},
    ${ticketCode},
    ${share},
    ${m.total_odds || m.ticket_total_odds || null},
    ${body.stake ?? null},   -- ✅ SAVE STAKE
    ${m.odds ?? m.selection_odds ?? null}
  )
`;
      }

      return Response.json({ success: true, ticketCode });
    }

    // ✅ Manual bet
    const {
      match_name,
      league,
      prediction,
      bet_amount,
      potential_payout,
      match_date,
    } = body || {};
    if (!match_name || !league || !prediction || !match_date) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const [newBet] = await sql`
      INSERT INTO user_performance_tracking (
        user_id,
        match_name,
        league,
        prediction,
        bet_amount,
        potential_payout,
        status,
        match_date
      )
      VALUES (
        ${session.user.id},
        ${match_name},
        ${league},
        ${prediction},
        ${bet_amount || 0},
        ${potential_payout || 0},
        'pending',
        ${toISODateOnly(match_date)}
      )
      RETURNING *
    `;

    return Response.json(newBet);
  } catch (err) {
    console.error("Performance Tracker POST error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================
   PUT (kept for compatibility)
   - odds
   - share
   - match_result (still allowed, now accepts void too)
========================= */
export async function PUT(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = normalizeTicketCode(searchParams.get("ticketId"));
    if (!ticketId)
      return Response.json({ error: "Missing ticketId" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    const isOdds = action === "setOdds" || action === "odds";
    const isStake = action === "setStake" || action === "stake";
    const isMatch = action === "setMatchResult" || action === "match_result";
    const isShare = action === "setShare" || action === "share";

    if (isOdds) {
      const odds = Number(
        body?.totalOdds ?? body?.ticket_total_odds ?? body?.ticketTotalOdds,
      );
      if (!Number.isFinite(odds) || odds <= 0) {
        return Response.json({ error: "Invalid totalOdds" }, { status: 400 });
      }

      await sql`
        UPDATE user_performance_tracking
        SET ticket_total_odds = ${odds}
        WHERE user_id = ${session.user.id}
          AND ticket_code = ${ticketId}
      `;
    } else if (isStake) {
      const stake = Number(
        body?.stake ?? body?.ticket_stake ?? body?.ticketStake,
      );
      if (!Number.isFinite(stake) || stake <= 0) {
        return Response.json({ error: "Invalid stake" }, { status: 400 });
      }

      await sql`
        UPDATE user_performance_tracking
        SET ticket_stake = ${stake}
        WHERE user_id = ${session.user.id}
          AND ticket_code = ${ticketId}
      `;
    } else if (isMatch) {
      // legacy/manual override (optional)
      const matchName = String(body?.matchName || "").trim();
      const result = normalizeResult(body?.result || body?.status);

      if (!matchName)
        return Response.json({ error: "Missing matchName" }, { status: 400 });

      await sql`
        UPDATE user_performance_tracking
        SET status = ${result}
        WHERE user_id = ${session.user.id}
          AND ticket_code = ${ticketId}
          AND match_name = ${matchName}
      `;
    } else if (isShare) {
      const share = Boolean(body?.share ?? body?.shared);
      await sql`
        UPDATE user_performance_tracking
        SET ticket_is_shared = ${share}
        WHERE user_id = ${session.user.id}
          AND ticket_code = ${ticketId}
      `;
    } else {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        id,
        match_name,
        league,
        prediction,
        actual_result,
        status,
        match_date,
        created_at,
        ticket_code,
        ticket_is_shared,
        ticket_total_odds,
        ticket_stake,
        potential_payout,
        selection_odds
      FROM user_performance_tracking
      WHERE user_id = ${session.user.id}
        AND ticket_code = ${ticketId}
      ORDER BY created_at DESC
    `;

    if (!rows?.length)
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    return Response.json(buildTicketDTO(ticketId, rows));
  } catch (err) {
    console.error("Performance Tracker PUT error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================
   DELETE
========================= */
export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = normalizeTicketCode(searchParams.get("ticketId"));
    if (!ticketId)
      return Response.json({ error: "Missing ticketId" }, { status: 400 });

    await sql`
      DELETE FROM user_performance_tracking
      WHERE user_id = ${session.user.id}
        AND ticket_code = ${ticketId}
    `;

    return Response.json({ success: true });
  } catch (err) {
    console.error("Performance Tracker DELETE error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
