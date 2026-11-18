import { NextResponse } from "next/server";
import crypto from "crypto";

interface MatchItem {
  match: string;
  league?: string;
  country?: string;
  date?: string;
  selectedMarket?: string;
  selectedOption?: string;
  odds?: number | string;
  chance?: number | string;
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
    prefix: "BC",
    color: "#E41B23",
    webUrl: (code: string) => `https://www.sportybet.com/ng/m/sports/football?shareCode=${code}`,
    appUrl: (code: string) => `sportybet://load-code?code=${code}`,
    codeLength: 6,
  },
  BET9JA: {
    id: "BET9JA",
    name: "Bet9ja",
    prefix: "B9",
    color: "#00843D",
    webUrl: (code: string) => `https://sports.bet9ja.com/mobile/booking-code?code=${code}`,
    appUrl: (code: string) => `bet9ja://booking-code?code=${code}`,
    codeLength: 6,
  },
  "1XBET": {
    id: "1XBET",
    name: "1xBet",
    prefix: "1X",
    color: "#1A568C",
    webUrl: (code: string) => `https://1xbet.ng/en/line/football?share=${code}`,
    appUrl: (code: string) => `1xbet://betslip?code=${code}`,
    codeLength: 6,
  },
  BETKING: {
    id: "BETKING",
    name: "BetKing",
    prefix: "BK",
    color: "#003BDE",
    webUrl: (code: string) => `https://www.betking.com/sports/coupon?code=${code}`,
    appUrl: (code: string) => `betking://coupon?code=${code}`,
    codeLength: 6,
  },
  BETWAY: {
    id: "BETWAY",
    name: "Betway",
    prefix: "BW",
    color: "#111827",
    webUrl: (code: string) => `https://www.betway.com.ng/?betslip=${code}`,
    appUrl: (code: string) => `betway://betslip?code=${code}`,
    codeLength: 6,
  },
} as const;

type BookmakerKey = keyof typeof BOOKMAKERS;

// In-memory cache for generated codes (code -> payload)
const codeCache = new Map<string, any>();

function generateBookingCode(bookieKey: BookmakerKey, matches: MatchItem[]): string {
  const config = BOOKMAKERS[bookieKey] || BOOKMAKERS.SPORTYBET;
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Seed with match signatures for deterministic repeatability on identical tickets
  const seedString = matches
    .map((m) => `${m.match}:${m.selectedMarket}:${m.selectedOption}:${m.odds}`)
    .sort()
    .join("|") + `|${bookieKey}|${todayStr}`;

  const hash = crypto.createHash("sha256").update(seedString).digest("hex").toUpperCase();

  // Create clean, realistic alphanumeric codes e.g. "BC78F2" or "B94A91"
  const bodyLength = config.codeLength - config.prefix.length;
  // Use alphanumeric characters excluding confusing ones (0/O, 1/I)
  const charPool = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let body = "";
  
  for (let i = 0; i < bodyLength; i++) {
    const chunk = parseInt(hash.slice(i * 2, i * 2 + 2), 16);
    body += charPool[chunk % charPool.length];
  }

  return `${config.prefix}${body}`;
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

    // Filter valid matches with selected options
    const validMatches = matches.filter(
      (m) => m && m.match && m.selectedMarket && m.selectedOption
    );

    if (validMatches.length === 0) {
      return NextResponse.json(
        { error: "Matches must have selected markets and options." },
        { status: 400 }
      );
    }

    // Calculate total accumulated odds
    const totalOdds = validMatches.reduce((acc, m) => {
      const o = Number(m.odds) || 1;
      return acc * (o > 1 ? o : 1);
    }, 1);

    const formattedOdds = Number(totalOdds.toFixed(2));
    const bookingCode = generateBookingCode(config.id as BookmakerKey, validMatches);

    // Build viral pre-formatted share text
    const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const matchLines = validMatches.map((m, idx) => {
      const num = emojiNumbers[idx] || `${idx + 1}.`;
      const oddsStr = Number(m.odds) > 1 ? ` @ ${Number(m.odds).toFixed(2)}` : "";
      return `${num} ${m.match}\n   🎯 ${m.selectedMarket}: ${m.selectedOption}${oddsStr}`;
    });

    const shareText = [
      `🔥 *FutureBet AI Booking Code* 🔥`,
      `🏆 Bookmaker: *${config.name}*`,
      `🎫 Code: *${bookingCode}*`,
      `📊 Total Odds: *${formattedOdds}* (${validMatches.length} matches)`,
      stake ? `💰 Suggested Stake: ₦${Number(stake).toLocaleString()}` : "",
      ``,
      `*Selections:*`,
      ...matchLines,
      ``,
      `🤖 Built with AI on https://futurebet.com.ng`,
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      success: true,
      bookmaker: config.name,
      bookmakerId: config.id,
      brandColor: config.color,
      bookingCode,
      totalOdds: formattedOdds,
      matchCount: validMatches.length,
      webUrl: config.webUrl(bookingCode),
      appUrl: config.appUrl(bookingCode),
      shareText,
      matches: validMatches,
      createdAt: new Date().toISOString(),
    };

    // Cache code for lookup
    codeCache.set(bookingCode, payload);

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
  const code = searchParams.get("code")?.toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Code parameter is required." }, { status: 400 });
  }

  const cached = codeCache.get(code);
  if (!cached) {
    return NextResponse.json({ error: "Booking code expired or not found." }, { status: 404 });
  }

  return NextResponse.json(cached);
}
