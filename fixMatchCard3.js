const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', 'utf8');

// Step 1: Fix broken pickStrength memo (it swallowed the closing brace)
const brokenStr = '    });\n    }\n    return match?.valueEdge || null;\n  }, [match?.valueEdge, activeMarket, marketViewPick]);';
const fixedStr = '    });\n  }, [canSeeAdvancedData, chance, ratingPercentage, match?.flag]);';

if (code.includes(brokenStr)) {
  code = code.replace(brokenStr, fixedStr);
  console.log('✅ Step 1: Fixed broken pickStrength memo');
} else {
  console.warn('⚠️  Step 1: brokenStr not found, checking state...');
  const idxPStr = code.indexOf('pickStrength');
  console.log('pickStrength context:', code.substring(idxPStr, idxPStr + 300));
}

// Step 2: Insert recommended, pickOdds, valueEdge before isSystemMatch
if (!code.includes('const pickOdds = useMemo')) {
  const insertBefore = '  const isSystemMatch = useMemo';
  const idx = code.indexOf(insertBefore);
  if (idx === -1) { console.error('Cannot find isSystemMatch'); process.exit(1); }

  const toInsert = `
  const recommended = match?.recommended || null;
  const activeSelection = recommended;

  const pickOdds = useMemo(() => {
    if (activeMarket && marketViewPick && marketViewPick.hasOdds) {
      return marketViewPick.odds;
    }
    if (match?.pickOdds && Number(match.pickOdds) > 1) return match.pickOdds;
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
  }, [match?.pickOdds, match?.homeOdds, match?.drawOdds, match?.awayOdds, match?.o25Odds, match?.o15Odds, match?.o35Odds, match?.o45Odds, match?.bttsYesOdds, match?.dc1X, match?.dc12, match?.dcX2, match?.guide, match?.pick, match?.recommendation, activeMarket, marketViewPick]);

  const valueEdge = useMemo(() => {
    if (activeMarket && marketViewPick && marketViewPick.hasOdds) {
      const implied = 100 / marketViewPick.odds;
      return Number((marketViewPick.prob - implied).toFixed(1));
    }
    return match?.valueEdge || null;
  }, [match?.valueEdge, activeMarket, marketViewPick]);

`;

  code = code.substring(0, idx) + toInsert + code.substring(idx);
  console.log('✅ Step 2: Re-inserted recommended, pickOdds, valueEdge memos');
} else {
  console.log('ℹ️  pickOdds already exists');
}

fs.writeFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', code);
console.log('Done!');
