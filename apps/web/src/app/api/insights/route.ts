// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

/* ---------------- CONFIG ---------------- */
const PREMIUM_DAILY_LIMIT = 10;
const AI_MODEL = "gpt-4o-mini";
const TZ = "Africa/Lagos"; // Nigerian time

/* ---------------- MAIN ---------------- */
export async function POST(request) {
  try {
    /* ---------- AUTH ---------- */
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const match = body?.match;

    if (!match) {
      return Response.json(
        { error: "Match data is required" },
        { status: 400 },
      );
    }

    /* ---------- USER TIER ---------- */
    const [userRecord] = await sql`
      SELECT user_role, subscription_status, subscription_expires_at
      FROM auth_users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const isAdmin = userRecord?.user_role === "admin";
    const isPremium =
      userRecord?.subscription_status === "premium" &&
      userRecord?.subscription_expires_at &&
      new Date(userRecord.subscription_expires_at) > new Date();

    if (!isAdmin && !isPremium) {
      return Response.json(
        { error: "Premium subscription required" },
        { status: 403 },
      );
    }

    /* ---------- 3AM WINDOW ---------- */
    const { windowStart, windowEnd } = await get3amWindow();

    /* ---------- CACHE ---------- */
    const cacheKey = buildCacheKey(match);

    const [cached] = await sql`
      SELECT insight
      FROM ai_insight_cache
      WHERE cache_key = ${cacheKey}
        AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `;

    // Policy: cache hits still count as a request
    if (cached?.insight) {
      const lim = await enforceLimitAndLog({
        userId,
        match,
        isAdmin,
        windowStart,
        windowEnd,
        insight_type: "positive",
        credits_used: 0,
        cache_hit: true,
      });

      if (!lim.allowed) {
        return Response.json(
          {
            error: "Daily AI insight limit reached.",
            remaining: 0,
            resetsAt: lim.resetsAt,
          },
          { status: 429 },
        );
      }

      return Response.json({
        insight: cached.insight,
        cached: true,
        remaining: lim.remaining,
        resetsAt: lim.resetsAt,
      });
    }

    /* ---------- FALLBACK VS AI ---------- */
    const chance = Number(match?.chance || 0);
    const rating = Number(match?.rating || 0);
    const shouldFallback = chance < 60 || rating < 55;

    // Enforce limit BEFORE OpenAI call (prevents token spend under concurrency)
    const lim = await enforceLimitAndLog({
      userId,
      match,
      isAdmin,
      windowStart,
      windowEnd,
      insight_type: shouldFallback ? "fallback" : "positive",
      credits_used: shouldFallback ? 0 : 1,
      cache_hit: false,
    });

    if (!lim.allowed) {
      return Response.json(
        {
          error: "Daily AI insight limit reached.",
          remaining: 0,
          resetsAt: lim.resetsAt,
        },
        { status: 429 },
      );
    }

    /* ---------- FALLBACK (0 tokens) ---------- */
    if (shouldFallback) {
      return Response.json({
        insight: generateFallbackInsight(match),
        fallback: true,
        remaining: lim.remaining,
        resetsAt: lim.resetsAt,
      });
    }

    /* ---------- AI ---------- */
    const depth = getInsightDepth(chance, rating);
    const aiInsight = await generateAIInsight(match, depth);

    /* ---------- SAVE CACHE ---------- */
    await sql`
      INSERT INTO ai_insight_cache (cache_key, insight)
      VALUES (${cacheKey}, ${aiInsight})
      ON CONFLICT (cache_key)
      DO UPDATE SET insight = EXCLUDED.insight, created_at = NOW()
    `;

    return Response.json({
      insight: aiInsight,
      remaining: lim.remaining,
      resetsAt: lim.resetsAt,
    });
  } catch (err) {
    console.error("AI Insight Error:", err);
    return Response.json(
      {
        error: "Failed to generate insight",
        debug: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}

/* ---------------- HELPERS ---------------- */

function buildCacheKey(match) {
  return [match?.match, match?.pick, match?.chance, match?.rating, match?.flag]
    .map((x) => String(x ?? "").trim())
    .join("|");
}

function getInsightDepth(chance, rating) {
  if (chance >= 80 && rating >= 70) return "deep";
  if (chance >= 65 && rating >= 60) return "standard";
  return "short";
}

function generateFallbackInsight(match) {
  const c = Math.round(Number(match?.chance || 0));
  const r = Math.round(Number(match?.rating || 0));
  const pick = String(match?.pick || "N/A");

  return `
**Match Overview**
This fixture sits in a moderate-to-uncertain range based on current model signals. Treat it as a support pick rather than a main ticket anchor.

**Prediction Focus**
Confidence is below the strong-pick band, so expect higher variance around the most likely outcome. This is better suited to conservative market choices.

**Risk Notes**
- Volatility is higher at this confidence level.
- Upset risk is elevated—avoid “must-win” assumptions.
- Goal variance can swing—be careful with high-goal lines.
- Avoid using this as a low-risk anchor selection.

**Final Insight**
Pick: ${pick}
Best Alternative: Double Chance
Risk Grade: C
Stake: Small

Chance: ${c}%
Rating: ${r}%
`.trim();
}

async function get3amWindow() {
  const [bounds] = await sql`
    SELECT
      (
        CASE
          WHEN (NOW() AT TIME ZONE ${TZ})::time >= time '03:00'
            THEN date_trunc('day', NOW() AT TIME ZONE ${TZ}) + time '03:00'
          ELSE (date_trunc('day', NOW() AT TIME ZONE ${TZ}) - interval '1 day') + time '03:00'
        END
      ) AT TIME ZONE ${TZ} AS start_utc,
      (
        (
          CASE
            WHEN (NOW() AT TIME ZONE ${TZ})::time >= time '03:00'
              THEN date_trunc('day', NOW() AT TIME ZONE ${TZ}) + time '03:00'
            ELSE (date_trunc('day', NOW() AT TIME ZONE ${TZ}) - interval '1 day') + time '03:00'
          END
        ) + interval '1 day'
      ) AT TIME ZONE ${TZ} AS end_utc
  `;

  const windowStart = bounds?.start_utc;
  const windowEnd = bounds?.end_utc;

  if (!windowStart || !windowEnd) throw new Error("Usage window bounds failed");
  return { windowStart, windowEnd };
}

/**
 * Forced limit + log (single statement; Neon-safe)
 * - counts within window
 * - inserts only if under limit
 */
async function enforceLimitAndLog({
  userId,
  match,
  isAdmin,
  windowStart,
  windowEnd,
  insight_type,
  credits_used,
  cache_hit,
}) {
  const limit = isAdmin ? 1_000_000 : PREMIUM_DAILY_LIMIT;

  const [row] = await sql`
    WITH usage_count AS (
      SELECT COUNT(*)::int AS used
      FROM ai_insight_usage
      WHERE user_id = ${userId}
        AND created_at >= ${windowStart}
        AND created_at < ${windowEnd}
    ),
    allowed AS (
      SELECT (used < ${limit}) AS ok, used
      FROM usage_count
    ),
    ins AS (
      INSERT INTO ai_insight_usage (
        user_id, match_data, insight_type, credits_used, cache_hit
      )
      SELECT
        ${userId},
        ${JSON.stringify(match)},
        ${insight_type},
        ${credits_used},
        ${cache_hit}
      FROM allowed
      WHERE ok = true
      RETURNING 1
    )
    SELECT
      (SELECT ok FROM allowed) AS allowed,
      (SELECT used FROM allowed) AS used_before,
      (SELECT COUNT(*)::int FROM ins) AS inserted
  `;

  const allowed = Boolean(row?.allowed) && Number(row?.inserted || 0) === 1;
  const usedBefore = Number(row?.used_before || 0);
  const usedAfter = allowed ? usedBefore + 1 : usedBefore;

  return {
    allowed,
    remaining: isAdmin ? null : Math.max(0, PREMIUM_DAILY_LIMIT - usedAfter),
    resetsAt: new Date(windowEnd).toISOString(),
  };
}

async function generateAIInsight(match, depth) {
  const [home, away] = String(match?.match || "")
    .split(" - ")
    .map((s) => s?.trim());

  const h = home || "Home";
  const a = away || "Away";

  const maxTokens = depth === "deep" ? 520 : depth === "standard" ? 420 : 320;

  // Build a minimal, clean data pack (and avoid “column label” output)
  const dataPack = buildDataPack(match);

  const prompt = `
You are writing for a PAID football predictions app. Output must look premium and natural.

HARD RULES
- Use ONLY the numbers/text inside "DATA PACK".
- Do NOT output internal abbreviations/codes (e.g., HPPG, APPG, HGS, HGC, AGS, AGC, GG, NG, OV2.5, UN2.5, CS2).
- Translate metrics into natural language (e.g., "home points per game", "away goals conceded per match").
- If a stat is not in DATA PACK, do NOT mention it.
- Do NOT say "data not provided" or "missing data".
- No emojis.
- Use markdown headings EXACTLY as written below.

FORMAT (EXACT ORDER)
**Match Overview**
(2–4 sentences. Must include at least 2 specific stats.)

**Prediction Focus**
(Explain the Guide Pick. Must include at least 3 specific stats. 5–8 lines max.)

**Correct Score Outlook**
(Use the scoreline items in DATA PACK. Max 5 lines.)

**Risk Notes**
(4–6 bullets. Each bullet must reference at least one number/probability/form/H2H.)

**Final Insight**
(2–4 sentences. End with:
Pick:
Best Alternative:
Risk Grade: A/B/C
Stake: Small/Medium)

MATCH: ${h} vs ${a}

DATA PACK
${dataPack}
`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content:
            "You write premium football betting analysis in natural English. Never show internal codes; always translate metrics into readable phrases. Use only DATA PACK facts.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OPENAI_ERROR_STATUS:", response.status);
    console.error("OPENAI_ERROR_BODY:", errText);
    throw new Error(`OpenAI API failed: ${response.status}`);
  }

  const data = await response.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "Unable to generate insight at this time."
  );
}

/* ---------------- DATA PACK BUILDERS ---------------- */

function addLine(lines, label, value) {
  const v = value === null || value === undefined ? "" : String(value).trim();
  if (!v) return;
  lines.push(`${label}: ${v}`);
}

function pct(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(String(v).replace("%", "").trim());
  return Number.isFinite(n) ? `${Math.round(n)}%` : "";
}

function num(v, dp = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return dp === 0 ? String(Math.round(n)) : n.toFixed(dp);
}

function buildDataPack(match) {
  const lines = [];

  // Identity
  addLine(lines, "League", match?.fullLeague || match?.league);
  addLine(lines, "Kickoff", `${match?.date || ""} ${match?.time || ""}`.trim());
  addLine(lines, "Table", match?.table);

  // Model headline
  addLine(lines, "Chance", pct(match?.chance));
  addLine(lines, "Rating", pct(match?.rating));
  addLine(lines, "Guide Pick", match?.pick);
  addLine(lines, "Tips (1X2)", match?.tips);
  addLine(lines, "Flag", match?.flag);

  // 1X2 projection
  addLine(lines, "Home win probability", pct(match?.homeWin));
  addLine(lines, "Draw probability", pct(match?.draw));
  addLine(lines, "Away win probability", pct(match?.awayWin));

  // Markets
  addLine(lines, "BTTS Yes probability", pct(match?.gg));
  addLine(lines, "BTTS No probability", pct(match?.ng));
  addLine(lines, "Over 2.5 probability", pct(match?.ov25));
  addLine(lines, "Under 2.5 probability", pct(match?.un25));

  // Performance (written as human labels)
  addLine(lines, "Home points per game", num(match?.hppg));
  addLine(lines, "Away points per game", num(match?.appg));
  addLine(lines, "Home goals scored per match", num(match?.hgs));
  addLine(lines, "Home goals conceded per match", num(match?.hgc));
  addLine(lines, "Away goals scored per match", num(match?.ags));
  addLine(lines, "Away goals conceded per match", num(match?.agc));

  // Form / recent (optional)
  addLine(lines, "Home form", match?.hForm);
  addLine(lines, "Away form", match?.aForm);
  addLine(lines, "Home recent results", match?.H_Recent || match?.hRecent);
  addLine(lines, "Away recent results", match?.A_Recent || match?.aRecent);
  addLine(lines, "H2H recent results", match?.H2H_Recent || match?.h2hRecent);

  // H2H (optional)
  addLine(lines, "Head-to-head home win %", pct(match?.h2hH ?? match?.H2H_H));
  addLine(lines, "Head-to-head draw %", pct(match?.h2hD ?? match?.H2H_D));
  addLine(lines, "Head-to-head away win %", pct(match?.h2hA ?? match?.H2H_A));
  addLine(lines, "Head-to-head over 2.5 %", pct(match?.h2hOV ?? match?.H2H_OV));
  addLine(
    lines,
    "Head-to-head under 2.5 %",
    pct(match?.h2hUN ?? match?.H2H_UN),
  );
  addLine(lines, "Head-to-head BTTS yes %", pct(match?.h2hGG ?? match?.H2H_GG));
  addLine(lines, "Head-to-head BTTS no %", pct(match?.h2hNG ?? match?.H2H_NG));
  addLine(lines, "Head-to-head games played", match?.h2hGP ?? match?.H2H_GP);

  // Correct score
  addLine(lines, "Model predicted scoreline", match?.cScore);
  addLine(lines, "Model scoreline probability", pct(match?.modelCSPercent));
  addLine(lines, "Most common (stats) scoreline", match?.likelyCS);
  addLine(
    lines,
    "Most common scoreline probability",
    pct(match?.scorelineCSPercent),
  );
  addLine(lines, "Second scoreline", match?.cs2);
  addLine(lines, "Second scoreline probability", pct(match?.cs2Percent));

  return lines.join("\n");
}
