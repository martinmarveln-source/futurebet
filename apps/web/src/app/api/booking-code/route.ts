import { NextResponse } from "next/server";
import crypto from "crypto";
import sql from "@/app/api/utils/sql";
import { normalizePickDescriptor } from "@/utils/pickEngine";

interface MatchItem {
  match: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  country?: string;
  date?: string;
  time?: string;
  selectedMarket?: string;
  selectedOption?: string;
  odds?: number | string;
  chance?: number | string;
  bookieSearchUrl?: string;
}

interface BookingRequest {
  action?: "generate" | "attach_code" | "get";
  slipId?: string;
  ticketId?: string;
  code?: string;
  matches?: MatchItem[];
  bookmaker?: "SPORTYBET" | "BET9JA" | "1XBET" | "BETKING" | "BETWAY";
  stake?: number;
  nativeCode?: string; // For admin attaching a verified code
}

const BOT_BASE_URL =
  process.env.NEXT_PUBLIC_CONVERT_BET_BOT_URL ||
  process.env.CONVERT_BET_BOT_URL ||
  (process.env.CONVERT_BET_BOT_REF
    ? `https://t.me/ConvertBetBot?start=${process.env.CONVERT_BET_BOT_REF}`
    : "https://t.me/ConvertBetBot");

export const BOOKMAKERS = {
  SPORTYBET: {
    id: "SPORTYBET",
    slug: "sportybet",
    name: "SportyBet",
    prefix: "SB",
    color: "#E41B23",
    webUrl: "https://www.sportybet.com/ng/m/sports/football",
    searchUrl: (term: string) =>
      `https://www.sportybet.com/ng/m/sports/search?keyword=${encodeURIComponent(term)}`,
    appUrl: "sportybet://sports/football",
    telegramBot: BOT_BASE_URL,
    codeLength: 6,
    codePlaceholder: "e.g. BC79KA",
  },
  BET9JA: {
    id: "BET9JA",
    slug: "bet9ja",
    name: "Bet9ja",
    prefix: "B9",
    color: "#00843D",
    webUrl: "https://sports.bet9ja.com",
    searchUrl: (term: string) =>
      `https://sports.bet9ja.com/search?keyword=${encodeURIComponent(term)}`,
    appUrl: "bet9ja://sports",
    telegramBot: BOT_BASE_URL,
    codeLength: 6,
    codePlaceholder: "e.g. 3KX7Q2M",
  },
  "1XBET": {
    id: "1XBET",
    slug: "1xbet",
    name: "1xBet",
    prefix: "1X",
    color: "#1A568C",
    webUrl: "https://1xbet.ng/en/line/football",
    searchUrl: (term: string) =>
      `https://1xbet.ng/en/line/football?q=${encodeURIComponent(term)}`,
    appUrl: "1xbet://betslip",
    telegramBot: BOT_BASE_URL,
    codeLength: 6,
    codePlaceholder: "e.g. G89K1",
  },
  BETKING: {
    id: "BETKING",
    slug: "betking",
    name: "BetKing",
    prefix: "BK",
    color: "#003BDE",
    webUrl: "https://www.betking.com/sports/football",
    searchUrl: (term: string) =>
      `https://www.betking.com/sports/search?keyword=${encodeURIComponent(term)}`,
    appUrl: "betking://sports",
    telegramBot: BOT_BASE_URL,
    codeLength: 6,
    codePlaceholder: "e.g. BK8910",
  },
  BETWAY: {
    id: "BETWAY",
    slug: "betway",
    name: "Betway",
    prefix: "BW",
    color: "#111827",
    webUrl: "https://www.betway.com.ng/sport/soccer",
    searchUrl: (term: string) =>
      `https://www.betway.com.ng/sport/soccer?search=${encodeURIComponent(term)}`,
    appUrl: "betway://sports",
    telegramBot: BOT_BASE_URL,
    codeLength: 6,
    codePlaceholder: "e.g. BW1245",
  },
} as const;

type BookmakerKey = keyof typeof BOOKMAKERS;

// In-memory cache for fast lookup
const codeCache = new Map<string, any>();

async function ensureBookingTables() {
  if (!process.env.DATABASE_URL) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS futurebet_booking_codes (
        code TEXT PRIMARY KEY,
        slip_id TEXT,
        bookmaker TEXT,
        total_odds NUMERIC,
        match_count INT,
        is_verified_native BOOLEAN DEFAULT false,
        native_codes JSONB DEFAULT '{}'::jsonb,
        payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await sql`ALTER TABLE futurebet_booking_codes ADD COLUMN IF NOT EXISTS is_verified_native BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE futurebet_booking_codes ADD COLUMN IF NOT EXISTS native_codes JSONB DEFAULT '{}'::jsonb;`;
    await sql`ALTER TABLE futurebet_booking_codes ADD COLUMN IF NOT EXISTS payload JSONB;`;
    await sql`ALTER TABLE futurebet_booking_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`;
  } catch (err) {
    console.warn("Booking tables ensure warning:", err);
  }

  try {
    await sql`
      ALTER TABLE curated_multi_bet_history 
      ADD COLUMN IF NOT EXISTS booking_codes JSONB DEFAULT '{}'::jsonb;
    `;
  } catch (err) {
    console.warn("curated_multi_bet_history ensure warning:", err);
  }
}

/**
 * Split a match name "Team A - Team B" or "Team A vs Team B" into home and away
 */
function parseTeams(matchStr: string): { home: string; away: string } {
  let home = "";
  let away = "";
  if (matchStr.includes(" - ")) {
    const parts = matchStr.split(" - ");
    home = parts[0]?.trim() || "";
    away = parts[1]?.trim() || "";
  } else if (matchStr.includes(" vs ")) {
    const parts = matchStr.split(" vs ");
    home = parts[0]?.trim() || "";
    away = parts[1]?.trim() || "";
  } else if (matchStr.includes(" v ")) {
    const parts = matchStr.split(" v ");
    home = parts[0]?.trim() || "";
    away = parts[1]?.trim() || "";
  } else {
    home = matchStr.trim();
  }
  return { home, away };
}

/**
 * Auto-heal and normalize match selections for API resolution
 */
function autoHealMatch(m: any, idx: number, searchUrlFn: (t: string) => string): MatchItem {
  let selectedMarket = m?.selectedMarket || m?.market || m?.targetMarket;
  let selectedOption = m?.selectedOption || m?.option || m?.selection || m?.targetOption;

  if (!selectedMarket || !selectedOption) {
    const rawPick = m?.pick || m?.tips || m?.pickLabel || m?.recommendation || "";
    const norm = normalizePickDescriptor(rawPick);
    if (norm) {
      selectedMarket = norm.market;
      selectedOption = norm.option;
    } else {
      const lower = String(rawPick).toLowerCase();
      if (lower.includes("home") || lower === "1") {
        selectedMarket = "1X2";
        selectedOption = "Home";
      } else if (lower.includes("away") || lower === "2") {
        selectedMarket = "1X2";
        selectedOption = "Away";
      } else if (lower.includes("draw") || lower === "x") {
        selectedMarket = "1X2";
        selectedOption = "Draw";
      } else if (lower.includes("under 3.5")) {
        selectedMarket = "Under 3.5";
        selectedOption = "Yes";
      } else if (lower.includes("under 2.5") || lower.includes("un2.5")) {
        selectedMarket = "Under 2.5";
        selectedOption = "Yes";
      } else if (lower.includes("over 1.5")) {
        selectedMarket = "Over 1.5";
        selectedOption = "Yes";
      } else if (lower.includes("over 2.5") || lower.includes("ov2.5")) {
        selectedMarket = "Over 2.5";
        selectedOption = "Yes";
      } else if (lower.includes("gg") || lower.includes("btts")) {
        selectedMarket = "BTTS";
        selectedOption = "Yes";
      } else if (lower.includes("ng")) {
        selectedMarket = "BTTS";
        selectedOption = "No";
      } else if (lower.includes("1x")) {
        selectedMarket = "Double Chance";
        selectedOption = "Home or Draw";
      } else if (lower.includes("x2")) {
        selectedMarket = "Double Chance";
        selectedOption = "Draw or Away";
      } else if (lower.includes("12")) {
        selectedMarket = "Double Chance";
        selectedOption = "Home or Away";
      } else {
        selectedMarket = "1X2";
        selectedOption = "Home";
      }
    }
  }

  const oddsNum = Number(m?.odds || m?.pickOdds || m?.bookmakerOdds || m?.fairOdds);
  const odds = Number.isFinite(oddsNum) && oddsNum > 1 ? Number(oddsNum.toFixed(2)) : 1.50;
  const matchName = String(m?.match || `Match #${idx + 1}`).trim();
  const { home, away } = parseTeams(matchName);

  return {
    ...m,
    match: matchName,
    homeTeam: m?.homeTeam || m?.home || home,
    awayTeam: m?.awayTeam || m?.away || away,
    league: m?.league || m?.fullLeague || "",
    country: m?.country || "",
    date: m?.date || m?.dateISO || "",
    time: m?.time || "",
    selectedMarket,
    selectedOption,
    odds,
    bookieSearchUrl: searchUrlFn(matchName),
  };
}

/**
 * Generate a deterministic internal FutureBet reference ticket
 */
function generateTicketReference(bookieKey: BookmakerKey, matches: MatchItem[]): string {
  const config = BOOKMAKERS[bookieKey] || BOOKMAKERS.SPORTYBET;
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const seedString = matches
    .map((m) => `${m.match}:${m.selectedMarket}:${m.selectedOption}:${m.odds}`)
    .sort()
    .join("|") + `|${bookieKey}|${todayStr}`;

  const hash = crypto.createHash("sha256").update(seedString).digest("hex").toUpperCase();
  const charPool = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let body = "";
  
  for (let i = 0; i < 4; i++) {
    const chunk = parseInt(hash.slice(i * 2, i * 2 + 2), 16);
    body += charPool[chunk % charPool.length];
  }

  return `TICKET-${body}`;
}

/**
 * Attempt automated code minting via ManageBetCodes API
 */
async function tryMintRealBookingCode(
  bookmakerSlug: string,
  matches: MatchItem[]
): Promise<string | null> {
  const apiKey = process.env.MANAGEBETCODES_API_KEY || process.env.MBC_API_KEY;
  if (!apiKey) return null;

  try {
    // 1. Prepare picks payload
    const picks = matches.map((m) => {
      let market = "1X2";
      let outcome = "1";
      let line: string | undefined;

      const mkt = (m.selectedMarket || "").toLowerCase();
      const opt = (m.selectedOption || "").toLowerCase();

      if (mkt.includes("over") || mkt.includes("under")) {
        market = "Over/Under";
        outcome = mkt.includes("under") ? "Under" : "Over";
        if (mkt.includes("1.5")) line = "1.5";
        else if (mkt.includes("3.5")) line = "3.5";
        else line = "2.5";
      } else if (mkt.includes("double chance")) {
        market = "Double Chance";
        if (opt.includes("home or draw") || opt === "1x") outcome = "1X";
        else if (opt.includes("draw or away") || opt === "x2") outcome = "X2";
        else outcome = "12";
      } else if (mkt.includes("btts") || mkt.includes("gg")) {
        market = "Both Teams To Score";
        outcome = opt.includes("yes") || opt.includes("gg") ? "Yes" : "No";
      } else {
        market = "1X2";
        if (opt.includes("home") || opt === "1") outcome = "1";
        else if (opt.includes("away") || opt === "2") outcome = "2";
        else outcome = "X";
      }

      return {
        home_team: m.homeTeam || parseTeams(m.match).home,
        away_team: m.awayTeam || parseTeams(m.match).away,
        league: m.league,
        market,
        outcome,
        line,
        odds: String(m.odds || "1.50"),
      };
    });

    // 2. Resolve picks to plan_id
    const resolveRes = await fetch("https://api.managebetcodes.app/v1/resolve", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookmaker: bookmakerSlug,
        picks,
        strict: false,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!resolveRes.ok) {
      console.warn("ManageBetCodes resolve failed with status:", resolveRes.status);
      return null;
    }

    const resolveData = await resolveRes.json();
    const planId = resolveData.plan_id;
    if (!planId) return null;

    // 3. Book the plan on the target bookmaker
    const bookRes = await fetch("https://api.managebetcodes.app/v1/book", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        targets: [bookmakerSlug],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!bookRes.ok) return null;
    const bookData = await bookRes.json();
    const mintedCode = bookData?.codes?.[bookmakerSlug] || bookData?.code;
    return mintedCode || null;
  } catch (err) {
    console.warn("tryMintRealBookingCode error:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    await ensureBookingTables();
    const body = (await req.json()) as BookingRequest;
    const { matches = [], stake, slipId, action, nativeCode } = body;
    const bookmakerKey = (String(body.bookmaker || "SPORTYBET").toUpperCase()) as BookmakerKey;
    const config = BOOKMAKERS[bookmakerKey] || BOOKMAKERS.SPORTYBET;

    // ------------------------------------------------------------------------
    // ACTION: Admin attaching/updating a verified native bookmaker code
    // ------------------------------------------------------------------------
    if (action === "attach_code") {
      const targetSlipId = slipId || body.ticketId;
      const cleanCode = (nativeCode || body.code || "").trim().toUpperCase();

      if (!targetSlipId || !cleanCode) {
        return NextResponse.json(
          { error: "Slip ID and native code are required to attach code." },
          { status: 400 }
        );
      }

      const bookieLower = config.slug;

      // 1. Retrieve existing cached/stored payload if any exists
      let existingPayload = codeCache.get(targetSlipId) || codeCache.get(cleanCode) || null;

      if (!existingPayload && process.env.DATABASE_URL) {
        try {
          const rows = await sql`
            SELECT payload, native_codes FROM futurebet_booking_codes 
            WHERE code = ${targetSlipId} OR code = ${cleanCode} OR slip_id = ${targetSlipId}
            LIMIT 1;
          `;
          if (rows && rows.length > 0 && rows[0]?.payload) {
            existingPayload = rows[0].payload;
          }
        } catch (e) {
          console.warn("DB lookup during attach_code warning:", e);
        }
      }

      const updatedNativeCodes = {
        ...(existingPayload?.nativeCodes || {}),
        [bookieLower]: cleanCode,
      };

      const updatedPayload = {
        ...(existingPayload || {}),
        bookingCode: cleanCode,
        ticketId: targetSlipId,
        bookmaker: config.name,
        bookmakerId: config.id,
        bookmakerSlug: config.slug,
        isVerifiedNative: true,
        nativeCodes: updatedNativeCodes,
        botConverterText: `${config.name} ${cleanCode}`,
        updatedAt: new Date().toISOString(),
      };

      // Update in-memory cache immediately so all concurrent users see it instantly
      codeCache.set(targetSlipId, updatedPayload);
      codeCache.set(cleanCode, updatedPayload);

      // Persist to Neon Postgres DB if available
      if (process.env.DATABASE_URL) {
        try {
          // A. Upsert into futurebet_booking_codes under targetSlipId
          await sql`
            INSERT INTO futurebet_booking_codes (
              code, slip_id, bookmaker, is_verified_native, native_codes, payload, updated_at
            )
            VALUES (
              ${targetSlipId},
              ${targetSlipId},
              ${config.name},
              true,
              ${JSON.stringify(updatedNativeCodes)}::jsonb,
              ${JSON.stringify(updatedPayload)}::jsonb,
              NOW()
            )
            ON CONFLICT (code) DO UPDATE SET
              is_verified_native = true,
              native_codes = EXCLUDED.native_codes,
              payload = EXCLUDED.payload,
              updated_at = NOW();
          `;

          // B. Also upsert under cleanCode so looking up by the real bookmaker code works directly
          if (cleanCode !== targetSlipId) {
            await sql`
              INSERT INTO futurebet_booking_codes (
                code, slip_id, bookmaker, is_verified_native, native_codes, payload, updated_at
              )
              VALUES (
                ${cleanCode},
                ${targetSlipId},
                ${config.name},
                true,
                ${JSON.stringify(updatedNativeCodes)}::jsonb,
                ${JSON.stringify(updatedPayload)}::jsonb,
                NOW()
              )
              ON CONFLICT (code) DO UPDATE SET
                is_verified_native = true,
                native_codes = EXCLUDED.native_codes,
                payload = EXCLUDED.payload,
                updated_at = NOW();
            `;
          }

          // C. If targetSlipId is a curated slip in curated_multi_bet_history, update it too
          try {
            await sql`
              UPDATE curated_multi_bet_history
              SET booking_codes = COALESCE(booking_codes, '{}'::jsonb) || ${JSON.stringify({ [bookieLower]: cleanCode })}::jsonb,
                  updated_at = NOW()
              WHERE id = ${targetSlipId};
            `;
          } catch (curatedErr) {
            console.warn("curated_multi_bet_history update skipped:", curatedErr);
          }
        } catch (dbErr) {
          console.error("Database persist warning:", dbErr);
          // Non-fatal: in-memory cache holds the verified state
        }
      }

      return NextResponse.json({
        success: true,
        message: `Verified ${config.name} booking code "${cleanCode}" saved successfully!`,
        slipId: targetSlipId,
        bookmaker: config.name,
        code: cleanCode,
        payload: updatedPayload,
      });
    }

    // ------------------------------------------------------------------------
    // DEFAULT ACTION: Generate or Fetch Booking Code Payload
    // ------------------------------------------------------------------------
    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json(
        { error: "At least one match is required to generate a booking code." },
        { status: 400 }
      );
    }

    // Auto-heal all matches so generation NEVER fails on missing attributes
    const validMatches = matches.map((m, idx) =>
      autoHealMatch(m, idx, config.searchUrl)
    );

    // Calculate total accumulated odds
    const totalOdds = validMatches.reduce((acc, m) => {
      const o = Number(m.odds) || 1;
      return acc * (o > 1 ? o : 1);
    }, 1);
    const formattedOdds = Number(totalOdds.toFixed(2));

    // Internal fallback reference
    const internalReference = generateTicketReference(bookmakerKey, validMatches);

    // Check if we have pre-existing native codes stored in memory or DB for this slip
    let verifiedNativeCode: string | null = null;
    let storedNativeCodes: Record<string, string> = {};

    // 1. Check in-memory cache first
    const cachedRef = codeCache.get(internalReference) || (slipId ? codeCache.get(slipId) : null);
    if (cachedRef?.nativeCodes) {
      storedNativeCodes = { ...cachedRef.nativeCodes };
      if (storedNativeCodes[config.slug]) {
        verifiedNativeCode = storedNativeCodes[config.slug];
      }
    }

    // 2. Check futurebet_booking_codes in DB
    if (!verifiedNativeCode && process.env.DATABASE_URL) {
      try {
        const rows = await sql`
          SELECT native_codes, is_verified_native FROM futurebet_booking_codes 
          WHERE code = ${internalReference} OR code = ${slipId || ""} OR slip_id = ${slipId || ""}
          LIMIT 1;
        `;
        if (rows && rows.length > 0 && rows[0]?.native_codes) {
          storedNativeCodes = { ...storedNativeCodes, ...rows[0].native_codes };
          if (storedNativeCodes[config.slug]) {
            verifiedNativeCode = storedNativeCodes[config.slug];
          }
        }
      } catch (e) {
        console.warn("Could not check futurebet_booking_codes:", e);
      }
    }

    // 3. Check curated_multi_bet_history if slipId is set
    if (!verifiedNativeCode && process.env.DATABASE_URL && slipId) {
      try {
        const rows = await sql`
          SELECT booking_codes FROM curated_multi_bet_history WHERE id = ${slipId} LIMIT 1;
        `;
        if (rows && rows.length > 0 && rows[0]?.booking_codes) {
          storedNativeCodes = { ...storedNativeCodes, ...rows[0].booking_codes };
          if (storedNativeCodes[config.slug]) {
            verifiedNativeCode = storedNativeCodes[config.slug];
          }
        }
      } catch (e) {
        console.warn("Could not check curated booking_codes:", e);
      }
    }

    // If no manual code attached, try automated minting via API
    if (!verifiedNativeCode) {
      verifiedNativeCode = await tryMintRealBookingCode(config.slug, validMatches);
      if (verifiedNativeCode && slipId && process.env.DATABASE_URL) {
        try {
          await sql`
            UPDATE curated_multi_bet_history
            SET booking_codes = COALESCE(booking_codes, '{}'::jsonb) || ${JSON.stringify({ [config.slug]: verifiedNativeCode })}::jsonb,
                updated_at = NOW()
            WHERE id = ${slipId};
          `;
          storedNativeCodes[config.slug] = verifiedNativeCode;
        } catch (e) {}
      }
    }

    // Primary code displayed to user
    const displayCode = verifiedNativeCode || internalReference;
    const isVerifiedNative = Boolean(verifiedNativeCode);

    // Build Fast-Bet slip lines
    const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const matchLines = validMatches.map((m, idx) => {
      const num = emojiNumbers[idx] || `${idx + 1}.`;
      const oddsStr = Number(m.odds) > 1 ? ` @ ${Number(m.odds).toFixed(2)}` : "";
      const leagueStr = m.league ? ` (${m.league})` : "";
      return `${num} ${m.match}${leagueStr}\n   🎯 Market: ${m.selectedMarket} (${m.selectedOption})${oddsStr}`;
    });

    const shareText = [
      `🔥 *FutureBet AI Fast-Bet Slip* 🔥`,
      `🏆 Target Bookmaker: *${config.name}*`,
      isVerifiedNative
        ? `✅ *VERIFIED ${config.name.toUpperCase()} CODE:* \`${displayCode}\``
        : `🎫 Ticket ID: *${displayCode}*`,
      `📊 Total Odds: *${formattedOdds}x* (${validMatches.length} matches)`,
      stake ? `💰 Suggested Stake: ₦${Number(stake).toLocaleString()}` : "",
      ``,
      `*Selections:*`,
      ...matchLines,
      ``,
      isVerifiedNative
        ? `⚡ Load code "${displayCode}" inside the ${config.name} app to bet immediately.`
        : `💡 Convert this slip into a native code via @ConvertBetBot on Telegram, or click the match links to bet on ${config.name}.`,
      `🤖 Built with AI on https://futurebet.com.ng`,
    ]
      .filter(Boolean)
      .join("\n");

    const fastSlipText = [
      `FutureBet Slip (${config.name}) - Ticket #${displayCode}`,
      `Total Odds: ${formattedOdds}x | Matches: ${validMatches.length}`,
      ...validMatches.map(
        (m, i) => `${i + 1}. ${m.match} -> ${m.selectedMarket}: ${m.selectedOption} (@${m.odds})`
      ),
    ].join("\n");

    // Strict clean format for Telegram Bet Converter Bots (NO headers, NO emojis, NO URLs)
    const botConverterText = isVerifiedNative
      ? `${config.name} ${displayCode}`
      : validMatches
          .map((m) => {
            // Strip league/country parentheticals like "(England - Championship)" so bot fuzzy match succeeds
            const matchName = (m.match || "")
              .replace(/\s*\([^)]*\)/g, "")
              .replace(/\s+-\s+/, " vs ")
              .replace(/\s+v\s+/i, " vs ")
              .trim();

            const mkt = (m.selectedMarket || "").toLowerCase();
            const opt = (m.selectedOption || "").toLowerCase();

            let pick = "home win";
            if (mkt.includes("double chance")) {
              if (opt.includes("home or draw") || opt.includes("1x") || opt === "1") pick = "home win or draw";
              else if (opt.includes("draw or away") || opt.includes("x2") || opt === "2") pick = "away win or draw";
              else pick = "home win or away win";
            } else if (mkt.includes("over") || mkt.includes("under")) {
              if (mkt.includes("1.5")) pick = mkt.includes("under") ? "under 1.5" : "over 1.5";
              else if (mkt.includes("3.5")) pick = mkt.includes("under") ? "under 3.5" : "over 3.5";
              else pick = mkt.includes("under") ? "under 2.5" : "over 2.5";
            } else if (mkt.includes("btts") || mkt.includes("gg")) {
              pick = opt.includes("no") || opt.includes("ng") ? "no goal" : "both teams to score";
            } else {
              if (opt.includes("home") || opt === "1") pick = "home win";
              else if (opt.includes("away") || opt === "2") pick = "away win";
              else pick = "draw";
            }

            return `${matchName} - ${pick}`;
          })
          .join("\n");

    const payload = {
      success: true,
      slipId: slipId || null,
      bookmaker: config.name,
      bookmakerId: config.id,
      bookmakerSlug: config.slug,
      brandColor: config.color,
      bookingCode: displayCode,
      ticketId: displayCode,
      internalReference,
      isVerifiedNative,
      nativeCodes: storedNativeCodes,
      codePlaceholder: config.codePlaceholder,
      totalOdds: formattedOdds,
      matchCount: validMatches.length,
      webUrl: config.webUrl,
      appUrl: config.appUrl,
      telegramBot: config.telegramBot,
      shareText,
      fastSlipText,
      botConverterText,
      matches: validMatches,
      createdAt: new Date().toISOString(),
    };

    // Cache code for fast lookup
    codeCache.set(displayCode, payload);
    if (internalReference !== displayCode) {
      codeCache.set(internalReference, payload);
    }

    // Persist to Neon Postgres DB if available
    if (process.env.DATABASE_URL) {
      try {
        await sql`
          INSERT INTO futurebet_booking_codes (
            code, slip_id, bookmaker, total_odds, match_count, is_verified_native, native_codes, payload
          )
          VALUES (
            ${displayCode},
            ${slipId || null},
            ${config.name},
            ${formattedOdds},
            ${validMatches.length},
            ${isVerifiedNative},
            ${JSON.stringify(storedNativeCodes)},
            ${JSON.stringify(payload)}
          )
          ON CONFLICT (code) DO UPDATE SET
            payload = EXCLUDED.payload,
            is_verified_native = EXCLUDED.is_verified_native,
            native_codes = EXCLUDED.native_codes,
            updated_at = NOW();
        `;
      } catch (dbErr) {
        console.warn("DB booking code persist warning:", dbErr);
      }
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Booking Code Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate booking code. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim().toUpperCase();
  const slipId = (searchParams.get("slipId") || "").trim();

  if (!code && !slipId) {
    return NextResponse.json({ error: "Code or slipId parameter is required." }, { status: 400 });
  }

  // 1. Check in-memory cache
  if (code && codeCache.has(code)) {
    return NextResponse.json(codeCache.get(code));
  }

  // 2. Query Neon Postgres DB
  if (process.env.DATABASE_URL) {
    try {
      if (slipId) {
        const rows = await sql`
          SELECT booking_codes, matches, combined_odds, title
          FROM curated_multi_bet_history
          WHERE id = ${slipId}
          LIMIT 1;
        `;
        if (rows && rows.length > 0) {
          const row = rows[0];
          return NextResponse.json({
            success: true,
            slipId,
            title: row.title,
            nativeCodes: row.booking_codes || {},
            combinedOdds: row.combined_odds,
          });
        }
      }

      if (code) {
        const rows = await sql`
          SELECT payload, is_verified_native, native_codes
          FROM futurebet_booking_codes
          WHERE UPPER(code) = ${code}
          LIMIT 1;
        `;
        if (rows && rows.length > 0 && rows[0]?.payload) {
          const resPayload = rows[0].payload;
          codeCache.set(code, resPayload);
          return NextResponse.json(resPayload);
        }
      }
    } catch (dbErr) {
      console.warn("DB query booking code warning:", dbErr);
    }
  }

  return NextResponse.json({ error: "Booking code not found or expired." }, { status: 404 });
}
