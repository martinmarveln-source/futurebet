const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', 'utf8');

// Target specifically the pickOdds memo block — use indexOf to find exact location
const SEARCH = '    return match?.pickOdds || null;\r\n  }, [match?.pickOdds, activeMarket, marketViewPick]);';
const idx = code.indexOf(SEARCH);
if (idx === -1) {
  // Try LF-only
  const SEARCH_LF = '    return match?.pickOdds || null;\n  }, [match?.pickOdds, activeMarket, marketViewPick]);';
  const idx2 = code.indexOf(SEARCH_LF);
  if (idx2 === -1) {
    console.error('Cannot find pickOdds return. Dumping all occurrences of "match?.pickOdds":');
    let pos = 0;
    while ((pos = code.indexOf('match?.pickOdds', pos)) !== -1) {
      console.log(`  At ${pos}: "${code.substring(pos - 20, pos + 60)}"`);
      pos += 15;
    }
    process.exit(1);
  }
}

// Show what's around it
const foundIdx = code.indexOf(SEARCH) !== -1 ? code.indexOf(SEARCH) : code.indexOf(SEARCH.replace(/\r\n/g, '\n'));
console.log('Found at index:', foundIdx);
console.log('Context (300 chars before):', JSON.stringify(code.substring(foundIdx - 300, foundIdx + SEARCH.length + 20)));
