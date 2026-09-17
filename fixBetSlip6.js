const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

// handleAiRecommend is called in JSX but function isn't defined yet — insert after handleAiAnalyze's finally block
const SEARCH_CRLF = '    }\r\n  };\r\n\r\n  useEffect(';
const SEARCH_LF = '    }\n  };\n\n  useEffect(';

const insertFn = `    }
  };

  const handleAiRecommend = async () => {
    setAiRecommending(true);
    setShowRecommendModal(false);
    try {
      const response = await fetch("/api/ai-recommend-slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recommendConfig),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Recommendation failed");
      if (data.matches && Array.isArray(data.matches)) {
        const store = useBetslipStore.getState();
        let added = 0;
        for (const m of data.matches) {
          try { store.addMatch?.(m); added++; } catch(e) {}
        }
        if (added > 0) {
          alert("✅ Added " + added + " AI-recommended match" + (added > 1 ? "es" : "") + " to your betslip!");
        }
      }
    } catch (err) {
      alert("AI Recommend Error: " + err.message);
    } finally {
      setAiRecommending(false);
    }
  };

  useEffect(`;

let idx = code.indexOf(SEARCH_CRLF);
if (idx !== -1) {
  code = code.substring(0, idx) + insertFn + code.substring(idx + SEARCH_CRLF.length);
  console.log('✅ handleAiRecommend inserted (CRLF)');
} else {
  idx = code.indexOf(SEARCH_LF);
  if (idx !== -1) {
    code = code.substring(0, idx) + insertFn + code.substring(idx + SEARCH_LF.length);
    console.log('✅ handleAiRecommend inserted (LF)');
  } else {
    console.error('❌ Could not find insertion point');
    // Show all useEffect occurrences
    let pos = 0;
    while ((pos = code.indexOf('useEffect(', pos)) !== -1) {
      console.log('useEffect at', pos, ':', JSON.stringify(code.substring(pos - 30, pos + 30)));
      pos += 10;
    }
  }
}

fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
console.log('✅ BetSlip.tsx saved');
