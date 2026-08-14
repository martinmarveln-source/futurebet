import { NextResponse } from "next/server";
import sql from "../../utils/sql";
import Papa from "papaparse";
import { deriveDoubleChance, deriveOverUnder } from "../../utils/oddsMath";

const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
const SHEET_NAME = "Picks";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

// Column index map (0-based)
const COL = {
  sn: 0, date: 1, country: 2, league: 3, match: 4,
  homeWin: 5, draw: 6, awayWin: 7, hppg: 8, appg: 9,
  hgs: 10, hgc: 11, ags: 12, agc: 13, gg: 14, ng: 15,
  time: 16, un25: 17, ov25: 18, table: 19, pick: 20,
  cScore: 21, modelCSPercent: 22, hcs: 23, acs: 24,
  hfts: 25, afts: 26, tips: 27, oneX2Rate: 28, avg: 29,
  hBtts: 30, aBtts: 31, hOv2: 32, aOv2: 33,
  hWin: 34, hDraw: 35, hLost: 36, aWin: 37, aDraw: 38, aLost: 39,
  hGrp: 40, aGrp: 41, hForm: 42, aForm: 43, hPts: 44, aPts: 45,
  chance: 46, rating: 47, predictionValidation: 48,
  score00: 49, score10: 50, score11: 51, score01: 52,
  score20: 53, score21: 54, score02: 55, score12: 56,
  hgsOver15: 57, hgcOver15: 58, agsOver15: 59, agcOver15: 60,
  likelyCS: 61, scorelineCSPercent: 62, flag: 63, cs2: 64, cs2Percent: 65,
  h2hH: 66, h2hD: 67, h2hA: 68, h2hOV: 69, h2hUN: 70, h2hGG: 71, h2hNG: 72, h2hGP: 73,
  hRecent: 74, aRecent: 75, h2hRecent: 76, ftScore: 77,
  homeOdds: 82, drawOdds: 83, awayOdds: 84,
  o05Odds: 85, u05Odds: 86, o15Odds: 87, u15Odds: 88,
  o25Odds: 89, u25Odds: 90, o35Odds: 91, u35Odds: 92,
  o45Odds: 93, u45Odds: 94,
};

function toNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[%,$]/g, "").trim());
  return isFinite(n) ? n : 0;
}

function parseMatchDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (!raw) return null;

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // "1-Aug" format
  const MONTHS: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  const parts = raw.split("-");
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10);
    const monthNum = MONTHS[parts[1]];
    if (monthNum && !isNaN(day)) {
      const now = new Date();
      const year = monthNum < (now.getMonth() + 1) ? now.getFullYear() + 1 : now.getFullYear();
      return `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch (_) {}
  return null;
}

export async function GET(request: Request) {
  // Secure with CRON_SECRET
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") || request.headers.get("Authorization");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS matches_cache (
        id BIGSERIAL PRIMARY KEY,
        match_date DATE,
        match_time TEXT,
        country TEXT,
        league TEXT,
        home_team TEXT,
        away_team TEXT,
        match_label TEXT,
        guide TEXT,
        tips TEXT,
        chance NUMERIC,
        rating NUMERIC,
        prediction_validation TEXT,
        home_win NUMERIC,
        draw_prob NUMERIC,
        away_win NUMERIC,
        gg NUMERIC,
        ng NUMERIC,
        ov25 NUMERIC,
        un25 NUMERIC,
        ft_score TEXT,
        flag TEXT,
        raw_data JSONB,
        synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(match_date, home_team, away_team)
      )
    `;

    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);

    const text = await res.text();
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    const rows: string[][] = parsed.data as string[][];

    if (!rows.length) throw new Error("No data in sheet");

    // Skip header row
    const dataRows = rows.slice(1);

    let inserted = 0;
    let skipped = 0;

    // Helper to chunk arrays
    const chunkArray = (arr: any[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const chunks = chunkArray(dataRows, 50);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (row: any[]) => {
          const dateStr = row[COL.date] || "";
          const matchLabel = row[COL.match] || "";
          if (!dateStr || !matchLabel) { skipped++; return; }

          const matchDate = parseMatchDate(dateStr);
          const matchTime = row[COL.time] || null;
          const country = row[COL.country] || "";
          const league = row[COL.league] || "";

          // Parse home/away from "Home - Away" format
          const parts = matchLabel.split(" - ");
          const homeTeam = parts[0]?.trim() || matchLabel;
          const awayTeam = parts[1]?.trim() || "";

          const guide = row[COL.pick] || "";
          const tips = row[COL.tips] || "";
          const chance = toNum(row[COL.chance]);
          const rating = toNum(row[COL.rating]);
          const predictionValidation = row[COL.predictionValidation] || "";
          const homeWin = toNum(row[COL.homeWin]);
          const drawProb = toNum(row[COL.draw]);
          const awayWin = toNum(row[COL.awayWin]);
          const gg = toNum(row[COL.gg]);
          const ng = toNum(row[COL.ng]);
          const ov25 = toNum(row[COL.ov25]);
          const un25 = toNum(row[COL.un25]);
          const ftScore = row[COL.ftScore] || null;
          const flag = row[COL.flag] || "";

          const rawData: Record<string, string> = {};
          Object.entries(COL).forEach(([k, i]) => { rawData[k] = row[i] || ""; });

          // Derive Double Chance
          const hOdds = Number(rawData.homeOdds) || Number(rawData.hWin) || 0;
          const dOdds = Number(rawData.drawOdds) || Number(rawData.hDraw) || 0;
          const aOdds = Number(rawData.awayOdds) || Number(rawData.aWin) || 0;
          const dc = deriveDoubleChance(hOdds, dOdds, aOdds);
          if (dc.dc1X) rawData.dc1X = String(dc.dc1X);
          if (dc.dc12) rawData.dc12 = String(dc.dc12);
          if (dc.dcX2) rawData.dcX2 = String(dc.dcX2);

          // Derive Over/Under where missing
          const o25Odds = Number(rawData.o25Odds) || 0;
          const u25Odds = Number(rawData.u25Odds) || 0;
          const ou = deriveOverUnder(o25Odds, u25Odds);
          
          if (!rawData.o15Odds && ou.o15Odds) rawData.o15Odds = String(ou.o15Odds);
          if (!rawData.u15Odds && ou.u15Odds) rawData.u15Odds = String(ou.u15Odds);
          if (!rawData.o35Odds && ou.o35Odds) rawData.o35Odds = String(ou.o35Odds);
          if (!rawData.u35Odds && ou.u35Odds) rawData.u35Odds = String(ou.u35Odds);
          if (!rawData.o45Odds && ou.o45Odds) rawData.o45Odds = String(ou.o45Odds);
          if (!rawData.u45Odds && ou.u45Odds) rawData.u45Odds = String(ou.u45Odds);

          try {
            await sql`
              INSERT INTO matches_cache (
                match_date, match_time, country, league,
                home_team, away_team, match_label,
                guide, tips, chance, rating, prediction_validation,
                home_win, draw_prob, away_win, gg, ng, ov25, un25,
                ft_score, flag, raw_data
              ) VALUES (
                ${matchDate}, ${matchTime}, ${country}, ${league},
                ${homeTeam}, ${awayTeam}, ${matchLabel},
                ${guide}, ${tips}, ${chance}, ${rating}, ${predictionValidation},
                ${homeWin}, ${drawProb}, ${awayWin}, ${gg}, ${ng}, ${ov25}, ${un25},
                ${ftScore}, ${flag}, ${JSON.stringify(rawData)}
              )
              ON CONFLICT (match_date, home_team, away_team)
              DO UPDATE SET
                match_time = EXCLUDED.match_time,
                guide = EXCLUDED.guide,
                tips = EXCLUDED.tips,
                chance = EXCLUDED.chance,
                rating = EXCLUDED.rating,
                prediction_validation = EXCLUDED.prediction_validation,
                home_win = EXCLUDED.home_win,
                draw_prob = EXCLUDED.draw_prob,
                away_win = EXCLUDED.away_win,
                gg = EXCLUDED.gg,
                ng = EXCLUDED.ng,
                ov25 = EXCLUDED.ov25,
                un25 = EXCLUDED.un25,
                ft_score = EXCLUDED.ft_score,
                flag = EXCLUDED.flag,
                raw_data = EXCLUDED.raw_data,
                synced_at = NOW()
            `;
            inserted++;
          } catch (err: any) {
            console.error("Row insert error:", err.message);
            skipped++;
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      message: `Synced ${inserted} matches.`,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
