require('dotenv').config({path: '.env'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const { computeDerivedPickFromStats } = require('./src/utils/vipAlgorithm');

function num(v) {
  const s = String(v ?? '').replace(/[%\$,]/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const rows = await sql(`SELECT raw_data FROM matches_cache WHERE match_date = '2026-08-15'`);
  
  let passed = 0;
  let skippedByOdds = 0;
  let finalVIP = 0;

  for (const row of rows) {
    const r = row.raw_data;
    const chance = num(r.chance);
    const rating = num(r.rating);

    if (chance < 65 || rating < 55) continue;
    passed++;

    const derived = computeDerivedPickFromStats({
      hgs: num(r.hgs),
      hgc: num(r.hgc),
      ags: num(r.ags),
      agc: num(r.agc),
      hFormStr: r.hForm,
      aFormStr: r.aForm,
      hcs: num(r.hcs),
      acs: num(r.acs),
      hfts: num(r.hfts),
      afts: num(r.afts),
      h2hGp: num(r.h2hGP),
      h2hH: num(r.h2hH),
      h2hA: num(r.h2hA),
      h2hOv: num(r.h2hOV),
      h2hGg: num(r.h2hGG),
      ov25SheetPct: num(r.ov25),
      ggSheetPct: num(r.gg),
      homeSheetPct: num(r.homeWin),
      drawSheetPct: num(r.draw),
      awaySheetPct: num(r.awayWin),
    });

    if (!derived) {
      continue;
    }

    const rawOdds = {
      home: num(r.homeOdds),
      draw: num(r.drawOdds),
      away: num(r.awayOdds),
      over25: num(r.o25Odds),
      under25: num(r.u25Odds),
    };

    let exactOdds = null;
    if (derived.market === "1X2") {
      if (derived.selection === "Home") exactOdds = rawOdds.home;
      else if (derived.selection === "Draw") exactOdds = rawOdds.draw;
      else if (derived.selection === "Away") exactOdds = rawOdds.away;
    } else if (derived.market === "O/U 2.5") {
      if (derived.selection === "Over 2.5") exactOdds = rawOdds.over25;
      else if (derived.selection === "Under 2.5") exactOdds = rawOdds.under25;
    } else if (derived.market === "BTTS") {
      // BTTS has no raw odds in DB currently
      exactOdds = null;
    }

    if (!exactOdds || exactOdds < 1.01) {
      skippedByOdds++;
      console.log(`[SKIPPED] ${r.match} | Pick: ${derived.selection} | DB Odds: ${exactOdds} (rawOdds: ${JSON.stringify(rawOdds)})`);
      continue;
    }

    finalVIP++;
    console.log(`[KEPT] ${r.match} | Pick: ${derived.selection} | Odds: ${exactOdds}`);
  }

  console.log(`\nStats: Passed Threshold=${passed}, Skipped by Missing Odds=${skippedByOdds}, Final VIP=${finalVIP}`);
}
main().catch(console.error);
