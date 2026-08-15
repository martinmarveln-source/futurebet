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
  let withOdds = 0;

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

    if (derived && derived.odds) {
      withOdds++;
      console.log(`✅ ${r.match} - Pick: ${derived.selection}, Odds: ${derived.odds}`);
    } else {
      console.log(`❌ ${r.match} - NO ODDS (derived = ${Boolean(derived)})`);
    }
  }

  console.log(`Total Passed: ${passed}, With Exact Odds: ${withOdds}`);
}
main().catch(console.error);
