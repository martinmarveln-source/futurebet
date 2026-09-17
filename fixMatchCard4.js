const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', 'utf8');

// Fix 1: pickOdds — use CRLF-aware search
const OLD_PICK = '    return match?.pickOdds || null;\r\n  }, [match?.pickOdds, activeMarket, marketViewPick]);';
const NEW_PICK = `    if (match?.pickOdds && Number(match.pickOdds) > 1) return match.pickOdds;
    // Derive odds from guide/pick + market odds as fallback
    const guide = (match?.guide || match?.pick || match?.recommendation || '').toLowerCase().trim();
    if (!guide) return null;
    if (guide === 'home win' || guide === 'home' || guide === '1') return (Number(match?.homeOdds) > 1 ? match.homeOdds : null);
    if (guide === 'away win' || guide === 'away' || guide === '2') return (Number(match?.awayOdds) > 1 ? match.awayOdds : null);
    if (guide === 'draw' || guide === 'x') return (Number(match?.drawOdds) > 1 ? match.drawOdds : null);
    if (guide.includes('over 2.5') || guide === 'o2.5') return (Number(match?.o25Odds) > 1 ? match.o25Odds : null);
    if (guide.includes('over 1.5') || guide === 'o1.5') return (Number(match?.o15Odds) > 1 ? match.o15Odds : null);
    if (guide.includes('over 3.5') || guide === 'o3.5') return (Number(match?.o35Odds) > 1 ? match.o35Odds : null);
    if (guide.includes('over 4.5') || guide === 'o4.5') return (Number(match?.o45Odds) > 1 ? match.o45Odds : null);
    if (guide.includes('btts') || guide === 'gg') return (Number(match?.bttsYesOdds) > 1 ? match.bttsYesOdds : null);
    if (guide.includes('home or draw') || guide === '1x') return (Number(match?.dc1X) > 1 ? match.dc1X : null);
    if (guide.includes('home or away') || guide === '12') return (Number(match?.dc12) > 1 ? match.dc12 : null);
    if (guide.includes('draw or away') || guide === 'x2') return (Number(match?.dcX2) > 1 ? match.dcX2 : null);
    return null;
  }, [match?.pickOdds, match?.homeOdds, match?.drawOdds, match?.awayOdds, match?.o25Odds, match?.o15Odds, match?.o35Odds, match?.o45Odds, match?.bttsYesOdds, match?.dc1X, match?.dc12, match?.dcX2, match?.guide, match?.pick, match?.recommendation, activeMarket, marketViewPick]);`;

const idx = code.indexOf(OLD_PICK);
if (idx === -1) { console.error('OLD_PICK not found'); process.exit(1); }
code = code.substring(0, idx) + NEW_PICK + code.substring(idx + OLD_PICK.length);
console.log('✅ Fix 1: pickOdds enhanced with guide derivation');

// Fix 2: handleShare -> handleShareClick
const OLD_SHARE = 'onClick={handleShare}';
const NEW_SHARE = 'onClick={handleShareClick}';
if (code.includes(OLD_SHARE)) {
  code = code.replaceAll(OLD_SHARE, NEW_SHARE);
  console.log('✅ Fix 2: handleShare -> handleShareClick');
} else {
  console.warn('⚠️  Fix 2: handleShare not found');
}

fs.writeFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', code);
console.log('✅ MatchCard.tsx saved');
