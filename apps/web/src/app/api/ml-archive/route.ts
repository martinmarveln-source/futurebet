// app/api/ml-archive/route.ts
import { NextResponse } from "next/server";
import Papa from "papaparse";
import { auth } from "@/lib/auth"; // You should use your actual better-auth instance

const SHEET_ID = "1JlcJ1qGZ0IOTnDamMHuhcJ2wAxozTRmfhYs96GbPoJQ";
const GID = "0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

// Helper to check premium access using better-auth session
async function checkPremiumAccess(request: Request) {
  // Using betterAuth backend method to get session from request headers
  const sessionData = await auth.api.getSession({
    headers: request.headers,
  });

  const session = sessionData?.session;
  const user = sessionData?.user as any; // Cast to access additional fields if needed

  // If user is admin or premium (assuming roles or similar setup)
  return user?.isAdmin || user?.isPremium;
}

function cleanRow(row: any) {
  const chance = Number(row["Model_Chance"]);
  const rating = Number(row["Model_Rating"]);
  const market = String(row["Algorithm_Pick"] || "").trim().toUpperCase();
  const resultRaw = String(row["FT_Result"] || "").trim().toUpperCase();

  if (!resultRaw) return null;
  if (Number.isNaN(chance) || Number.isNaN(rating)) return null;

  const isWin = ["W", "WON", "WIN"].includes(resultRaw);
  const isLoss = ["L", "LOST", "LOSS"].includes(resultRaw);
  if (!isWin && !isLoss) return null;

  return {
    chance,
    rating,
    market,
    result: isWin ? "W" : "L",
  };
}

export async function GET(request: Request) {
  const hasAccess = await checkPremiumAccess(request);

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Premium access required" },
      { status: 403 }
    );
  }

  let csvText;
  try {
    const res = await fetch(CSV_URL, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Upstream sheet fetch failed: ${res.status}`);
    csvText = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load archive data" },
      { status: 502 }
    );
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    if (!parsed.data?.length) {
      return NextResponse.json(
        { error: "Archive data could not be parsed" },
        { status: 502 }
      );
    }
  }

  const cleaned = parsed.data.map(cleanRow).filter(Boolean);

  return NextResponse.json(cleaned, {
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}