import { NextResponse } from "next/server";
import crypto from "crypto";
import sql from "@/app/api/utils/sql";
import { normalizePickDescriptor } from "@/utils/pickEngine";

interface MatchItem {
  match: string;
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
  matches: MatchItem[];
  bookmaker?: "SPORTYBET" | "BET9JA" | "1XBET" | "BETKING" | "BETWAY";
  stake?: number;
}

const BOOKMAKERS = {
  SPORTYBET: {
    id: "SPORTYBET",
    name: "SportyBet",
    prefix: "SB",
    color: "#E41B23",
    webUrl: "https://www.sportybet.com/ng/m/sports/football",
    searchUrl: (term: string) =>
      `https://www.sportybet.com/ng/m/sports/search?keyword=${encodeURIComponent(term)}`,
    appUrl: "sportybet://sports/football",
    telegramBot: "https://t.me/ConvertBetBot",
    codeLength: 6,
  },
  BET9JA: {
    id: "BET9JA",
    name: "Bet9ja",
    prefix: "B9",
    color: "#00843D",
    webUrl: "https://sports.bet9ja.com",
    searchUrl: (term: string) =>
      `https://sports.bet9ja.com/search?keyword=${encodeURIComponent(term)}`,
    appUrl: "bet9ja://sports",
    telegramBot: "https://t.me/ConvertBetBot",
    codeLength: 6,
  },
  "1XBET": {
    id: "1XBET",
    name: "1xBet",
    prefix: "1X",
    color: "#1A568C",
    webUrl: "https://1xbet.ng/en/line/football",
    searchUrl: (term: string) => "https://1xbet.ng/en/line/football",
    appUrl: "1xbet://betslip",
    telegramBot: "https://t.me/ConvertBetBot",
    codeLength: 6,
  },
  BETKING: {
    id: "BETKING",
    name: "BetKing",
    prefix: "BK",
    color: "#003BDE",
    webUrl: "https://www.betking.com/sports/football",
    searchUrl: (term: string) =>
      `https://www.betking.com/sports/search?keyword=${encodeURIComponent(term)}`,
    appUrl: "betking://sports",
    telegramBot: "https://t.me/ConvertBetBot",
    codeLength: 6,
  },
  BETWAY: {
    id: "BETWAY",
    name: "Betway",
    prefix: "BW",
    color: "#111827",
    webUrl: "https://www.betway.com.ng/sport/soccer",
    searchUrl: (term: string) => "https://www.betway.com.ng/sport/soccer",
    appUrl: "betway://sports",
    telegramBot: "https://t.me/ConvertBetBot",
    codeLength: 6,
  },
} as const;

type BookmakerKey = keyof typeof BOOKMAKERS;

// In-memory cache for generated codes (code -> payload)
const codeCache = new Map<string, any>();

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
      } else if (lower.includes("under 2.5") || lower.includes("un2.5")) {
        selectedMarket = "Under 2.5";
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

  return {
    ...m,
    match: matchName,
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

  return `FB-${config.prefix}${body}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BookingRequest;
    const { matches, stake } = body;
    const bookmakerKey = (String(body.bookmaker || "SPORTYBET").toUpperCase()) as BookmakerKey;
    const config = BOOKMAKERS[bookmakerKey] || BOOKMAKERS.SPORTYBET;

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
    const requestedCode = (body.code || (body as any).ticketId || (body as any).ticketRef || "")
      .trim()
      .toUpperCase();
    const bookingCode = requestedCode || generateTicketReference(config.id as BookmakerKey, validMatches);

    // Build clean Fast-Bet slip lines
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
      `🎫 Ticket ID: *${bookingCode}*`,
      `📊 Total Odds: *${formattedOdds}x* (${validMatches.length} matches)`,
      stake ? `💰 Suggested Stake: ₦${Number(stake).toLocaleString()}` : "",
      ``,
      `*Selections:*`,
      ...matchLines,
      ``,
      `💡 Bookmaker booking codes are issued directly inside the ${config.name} platform. Use the match selections above to place your bet, or convert via @ConvertBetBot on Telegram.`,
      `🤖 Built with AI on https://futurebet.com.ng`,
    ]
      .filter(Boolean)
      .join("\n");

    const fastSlipText = [
      `FutureBet Slip (${config.name}) - Ticket #${bookingCode}`,
      `Total Odds: ${formattedOdds}x | Matches: ${validMatches.length}`,
      ...validMatches.map(
        (m, i) => `${i + 1}. ${m.match} -> ${m.selectedMarket}: ${m.selectedOption} (@${m.odds})`
      ),
    ].join("\n");

    const payload = {
      success: true,
      bookmaker: config.name,
      bookmakerId: config.id,
      brandColor: config.color,
      bookingCode,
      ticketId: bookingCode,
      totalOdds: formattedOdds,
      matchCount: validMatches.length,
      webUrl: config.webUrl,
      appUrl: config.appUrl,
      telegramBot: config.telegramBot,
      shareText,
      fastSlipText,
      matches: validMatches,
      createdAt: new Date().toISOString(),
    };

    // Cache code for in-memory lookup
    codeCache.set(bookingCode, payload);

    // Persist to Neon Postgres DB if available
    if (process.env.DATABASE_URL) {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS futurebet_booking_codes (
            code TEXT PRIMARY KEY,
            bookmaker TEXT,
            total_odds NUMERIC,
            match_count INT,
            payload JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        await sql`
          INSERT INTO futurebet_booking_codes (code, bookmaker, total_odds, match_count, payload)
          VALUES (${bookingCode}, ${config.name}, ${formattedOdds}, ${validMatches.length}, ${JSON.stringify(payload)})
          ON CONFLICT (code) DO UPDATE SET payload = EXCLUDED.payload;
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

  if (!code) {
    return NextResponse.json({ error: "Code parameter is required." }, { status: 400 });
  }

  // 1. Check in-memory cache
  let cached = codeCache.get(code);

  // 2. Fallback to DB if not found in cache
  if (!cached && process.env.DATABASE_URL) {
    try {
      const rows = await sql`
        SELECT payload FROM futurebet_booking_codes WHERE UPPER(code) = ${code} LIMIT 1
      `;
      if (rows && rows.length > 0 && rows[0]?.payload) {
        cached = rows[0].payload;
        codeCache.set(code, cached);
      }
    } catch (dbErr) {
      console.warn("DB query booking code warning:", dbErr);
    }
  }

  if (!cached) {
    return NextResponse.json({ error: "Booking code expired or not found." }, { status: 404 });
  }

  return NextResponse.json(cached);
}
