require('dotenv').config();
const {neon} = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const { computeDerivedPickFromStats } = require('./src/utils/vipAlgorithm');

// I will paste the exact logic of daily-generate route here to see if it yields anything
const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const [dStr, monStr] = raw.split("-");
  const day = Number(dStr);
  const monKey = String(monStr || "").trim();
  if (!Number.isFinite(day) || !(monKey in monthMap)) return null;
  const year = new Date().getFullYear();
  const d = new Date(year, monthMap[monKey], day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function isToday(d) {
  if (!d) return false;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d.getTime() === t.getTime();
}
function countRecentMatchesFromRecentCell(str) {
  const s = String(str ?? "").trim();
  if (!s) return 0;
  return s.split(",").map((x) => x.trim()).filter(Boolean).filter((x) => !x.includes("1899-12-30") && (x.includes(":") || x.includes(" : "))).length;
}
function countFormLetters(str) {
  return String(str ?? "").trim().toUpperCase().replace(/[^WDL]/g, "").length;
}
function num(v) {
  const s = String(v ?? "").replace(/[%$,]/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
const col = {
    date: "date", homeAway: "match", time: "time", country: "country", league: "league", table: "table", chance: "chance", rating: "rating", hRecent: "hRecent", aRecent: "aRecent", hForm: "hForm", aForm: "aForm", hGrp: "hGrp", aGrp: "aGrp", hgs: "hgs", hgc: "hgc", ags: "ags", agc: "agc", ov25: "ov25", gg: "gg", home: "homeWin", draw: "draw", away: "awayWin", hBtts: "hBtts", aBtts: "aBtts", hOv2: "hOv2", aOv2: "aOv2", hWin: "hWin", hDraw: "hDraw", hLost: "hLost", aWin: "aWin", aDraw: "aDraw", aLost: "aLost", hppg: "hppg", appg: "appg", hcs: "hcs", acs: "acs", hfts: "hfts", afts: "afts", hgsOver15: "hgsOver15", hgcOver15: "hgcOver15", agsOver15: "agsOver15", agcOver15: "agcOver15", h2hH: "h2hH", h2hD: "h2hD", h2hA: "h2hA", h2hOv: "h2hOV", h2hUn: "h2hUN", h2hGg: "h2hGG", h2hNg: "h2hNG", h2hGp: "h2hGP", h2hRecent: "h2hRecent", flag: "flag", homeOdds: "homeOdds", drawOdds: "drawOdds", awayOdds: "awayOdds", o25Odds: "o25Odds", u25Odds: "u25Odds", bttsYesOdds: "bttsYesOdds",
};

async function buildPicksData(minChance, minRating, minRecents) {
  const dbRows = await sql(`SELECT raw_data FROM matches_cache`);
  const table = dbRows.map(r => r.raw_data);
  const val = (r, key) => (key === undefined ? "" : r[key] ?? "");
  const picks = [];

  for (let i = 0; i < table.length; i++) {
    const r = table[i];
    if (!r) continue;
    const dateStr = val(r, col.date);
    const d = parseDateStr(dateStr);
    
    // Add logging
    if (d && isToday(d)) {
       // console.log("Today match found:", r.match);
    }

    if (!isToday(d)) continue;

    const algChance = num(val(r, col.chance));
    const algRating = num(val(r, col.rating));

    if (algChance < minChance || algRating < minRating) continue;
    const hRecentCell = val(r, col.hRecent);
    const aRecentCell = val(r, col.aRecent);
    const hFormStr = val(r, col.hForm);
    const aFormStr = val(r, col.aForm);
    let hRecentCount = countRecentMatchesFromRecentCell(hRecentCell) || countFormLetters(hFormStr);
    let aRecentCount = countRecentMatchesFromRecentCell(aRecentCell) || countFormLetters(aFormStr);
    if (hRecentCount < minRecents || aRecentCount < minRecents) continue;

    const hgs = num(val(r, col.hgs));
    const hgc = num(val(r, col.hgc));
    const ags = num(val(r, col.ags));
    const agc = num(val(r, col.agc));
    const derived = computeDerivedPickFromStats({
      hgs, hgc, ags, agc, hFormStr, aFormStr, hcs: num(val(r, col.hcs)), acs: num(val(r, col.acs)), hfts: num(val(r, col.hfts)), afts: num(val(r, col.afts)), h2hGp: num(val(r, col.h2hGp)), h2hH: num(val(r, col.h2hH)), h2hA: num(val(r, col.h2hA)), h2hOv: num(val(r, col.h2hOv)), h2hGg: num(val(r, col.h2hGg)), ov25SheetPct: num(val(r, col.ov25)), ggSheetPct: num(val(r, col.gg)), homeSheetPct: num(val(r, col.home)), drawSheetPct: num(val(r, col.draw)), awaySheetPct: num(val(r, col.away)),
    });
    if (!derived) continue;

    const pick = {
      market: derived.market,
      selection: derived.selection,
      rawOdds: { home: num(val(r, col.homeOdds)), draw: num(val(r, col.drawOdds)), away: num(val(r, col.awayOdds)), over25: num(val(r, col.o25Odds)), under25: num(val(r, col.u25Odds)) },
      odds: null
    };

    if (pick.market === "1X2") {
      if (pick.selection === "Home") pick.odds = pick.rawOdds.home;
      else if (pick.selection === "Draw") pick.odds = pick.rawOdds.draw;
      else if (pick.selection === "Away") pick.odds = pick.rawOdds.away;
    } else if (pick.market === "O/U 2.5") {
      if (pick.selection === "Over 2.5") pick.odds = pick.rawOdds.over25;
      else if (pick.selection === "Under 2.5") pick.odds = pick.rawOdds.under25;
    } else if (pick.market === "BTTS") {
      if (pick.selection === "Yes") pick.odds = num(val(r, col.bttsYesOdds));
      else pick.odds = null; 
    }
    if (!pick.odds || pick.odds < 1.01) {
       console.log("Skipping pick because odds missing", r.match, pick.market, pick.selection, pick.odds);
       continue;
    }
    picks.push(pick);
  }
  return picks;
}

buildPicksData(65, 55, 0).then(res => console.log("Final picks:", res.length)).catch(console.error);
