// @ts-nocheck
import { auth } from "@/auth";

const API_KEY = "0874b01058994be170db1708fe998983";
const BASE_URL = "https://api.the-odds-api.com/v4";

// Normalize team names for better matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /\b(fc|sc|afc|cf|united|city|town|athletic|rovers|wanderers)\b/g,
      "",
    )
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Calculate string similarity using Levenshtein distance
function stringSimilarity(a, b) {
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length < b.length ? a : b;

  if (longer.length === 0) return 1.0;

  const matrix = Array(shorter.length + 1)
    .fill(null)
    .map(() => Array(longer.length + 1).fill(null));

  for (let i = 0; i <= longer.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= shorter.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= shorter.length; j++) {
    for (let i = 1; i <= longer.length; i++) {
      const cost = shorter[j - 1] === longer[i - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost,
      );
    }
  }

  return 1 - matrix[shorter.length][longer.length] / longer.length;
}

// Detect sport key from league name
async function detectSportKey(leagueName) {
  try {
    const response = await fetch(`${BASE_URL}/sports?apiKey=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sports list: ${response.status}`);
    }

    const sports = await response.json();
    const normLeague = normalizeName(leagueName);

    let bestMatch = null;
    let bestScore = 0;

    sports.forEach((sport) => {
      const sportTitle = normalizeName(sport.title);
      const score = stringSimilarity(normLeague, sportTitle);

      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestMatch = sport.key;
      }
    });

    // Fallback to common soccer leagues if no good match
    if (!bestMatch || bestScore < 0.6) {
      const soccerKeys = [
        "soccer_epl",
        "soccer_spain_la_liga",
        "soccer_germany_bundesliga",
        "soccer_italy_serie_a",
        "soccer_france_ligue_one",
        "soccer_uefa_champs_league",
      ];
      return soccerKeys[0]; // Default to EPL
    }

    return bestMatch;
  } catch (error) {
    console.error("Error detecting sport key:", error);
    return "soccer_epl"; // Default fallback
  }
}

// Fetch odds for a specific match
async function fetchOddsForMatch(match) {
  try {
    const marketMap = {
      "Over 2.5": "totals",
      "Under 2.5": "totals",
      "Home Win": "h2h",
      "Away Win": "h2h",
      Draw: "h2h",
      BTTS: "btts",
      "BTTS Yes": "btts",
      "BTTS No": "btts",
    };

    const market =
      marketMap[match.selectedMarket] || marketMap[match.pick] || "h2h";
    const sportKey = await detectSportKey(
      match.league || match.fullLeague || "Premier League",
    );

    const url = `${BASE_URL}/sports/${sportKey}/odds`;
    const params = new URLSearchParams({
      regions: "eu,uk,us",
      markets: market,
      oddsFormat: "decimal",
      apiKey: API_KEY,
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return {
        status: "no_data",
        message: "No odds available for this league",
      };
    }

    // Extract team names from match string
    let homeTeam, awayTeam;
    if (match.match && match.match.includes(" vs ")) {
      [homeTeam, awayTeam] = match.match.split(" vs ").map((t) => t.trim());
    } else {
      homeTeam = match.homeTeam || match.home || "";
      awayTeam = match.awayTeam || match.away || "";
    }

    const normHome = normalizeName(homeTeam);
    const normAway = normalizeName(awayTeam);


    // Find matching event
    let bestMatch = null;
    let bestScore = 0;

    data.forEach((event) => {
      const eventNormHome = normalizeName(event.home_team);
      const eventNormAway = normalizeName(event.away_team);

      const homeSim = stringSimilarity(normHome, eventNormHome);
      const awaySim = stringSimilarity(normAway, eventNormAway);
      const avgSim = (homeSim + awaySim) / 2;


      if (avgSim > bestScore && homeSim >= 0.7 && awaySim >= 0.7) {
        bestScore = avgSim;
        bestMatch = event;
      }
    });

    if (!bestMatch) {
      return {
        status: "no_match",
        message: "No matching teams found",
        availableMatches: data
          .slice(0, 3)
          .map((e) => `${e.home_team} vs ${e.away_team}`),
      };
    }

    // Extract odds from bookmakers
    const odds = {};
    const targetMarket = match.selectedMarket || match.pick;

    bestMatch.bookmakers?.forEach((bookmaker) => {
      const bookmakerName = bookmaker.title;

      bookmaker.markets?.forEach((marketData) => {
        if (marketData.key === market) {
          marketData.outcomes?.forEach((outcome) => {
            // Map outcomes to readable format
            let outcomeName = outcome.name;
            if (market === "h2h") {
              if (outcome.name === bestMatch.home_team)
                outcomeName = "Home Win";
              else if (outcome.name === bestMatch.away_team)
                outcomeName = "Away Win";
              else if (outcome.name === "Draw") outcomeName = "Draw";
            } else if (market === "totals") {
              if (outcome.name === "Over")
                outcomeName = `Over ${outcome.point}`;
              else if (outcome.name === "Under")
                outcomeName = `Under ${outcome.point}`;
            } else if (market === "btts") {
              outcomeName = outcome.name === "Yes" ? "BTTS Yes" : "BTTS No";
            }

            // Check if this outcome matches what user picked
            const isTargetOutcome =
              outcomeName === targetMarket ||
              (targetMarket === "Over 2.5" &&
                outcomeName.includes("Over 2.5")) ||
              (targetMarket === "Under 2.5" &&
                outcomeName.includes("Under 2.5")) ||
              (targetMarket === "BTTS" && outcomeName === "BTTS Yes") ||
              (targetMarket === "Home Win" && outcomeName === "Home Win") ||
              (targetMarket === "Away Win" && outcomeName === "Away Win");

            if (isTargetOutcome) {
              odds[bookmakerName] = {
                price: outcome.price,
                outcome: outcomeName,
              };
            }
          });
        }
      });
    });

    return {
      status: "success",
      match: `${bestMatch.home_team} vs ${bestMatch.away_team}`,
      originalMatch: match.match,
      market: targetMarket,
      odds: odds,
      commenceTime: bestMatch.commence_time,
      similarity: bestScore.toFixed(2),
    };
  } catch (error) {
    console.error(`Error fetching odds for match:`, error);
    return {
      status: "error",
      message: error.message,
    };
  }
}

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { matches } = await request.json();

    if (!matches || !Array.isArray(matches)) {
      return Response.json({ error: "Invalid matches data" }, { status: 400 });
    }


    const results = {};

    // Process matches in parallel but with rate limiting
    const batchSize = 3;
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);

      const batchPromises = batch.map(async (match) => {
        const matchKey =
          match.match || `${match.homeTeam} vs ${match.awayTeam}`;
        try {
          const result = await fetchOddsForMatch(match);
          results[matchKey] = result;
        } catch (error) {
          console.error(`Error processing match ${matchKey}:`, error);
          results[matchKey] = {
            status: "error",
            message: error.message,
          };
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting - wait between batches
      if (i + batchSize < matches.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return Response.json({
      success: true,
      results: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in odds API:", error);
    return Response.json(
      {
        error: "Failed to fetch odds",
        message: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get available sports for testing
    const response = await fetch(`${BASE_URL}/sports?apiKey=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sports: ${response.status}`);
    }

    const sports = await response.json();

    return Response.json({
      success: true,
      sports: sports.slice(0, 10), // Return first 10 for testing
      apiStatus: "connected",
    });
  } catch (error) {
    console.error("Error testing odds API:", error);
    return Response.json(
      {
        error: "Failed to test API connection",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
