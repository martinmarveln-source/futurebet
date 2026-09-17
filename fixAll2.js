const fs = require('fs');

// ============================================================
// FIX 1: MatchCard.tsx — Fix pickOdds derivation (indented version)
// ============================================================
let matchCard = fs.readFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', 'utf8');

const oldPickOdds = `  const pickOdds = useMemo(() => {
      if (activeMarket && marketViewPick && marketViewPick.hasOdds) {
        return marketViewPick.odds;
      }
      return match?.pickOdds || null;
    }, [match?.pickOdds, activeMarket, marketViewPick]);`;

const newPickOdds = `  const pickOdds = useMemo(() => {
      if (activeMarket && marketViewPick && marketViewPick.hasOdds) {
        return marketViewPick.odds;
      }
      if (match?.pickOdds && Number(match.pickOdds) > 1) return match.pickOdds;
      // Derive odds from guide/pick + market odds as fallback
      const guide = (match?.guide || match?.pick || match?.recommendation || "").toLowerCase().trim();
      if (!guide) return null;
      if (guide === "home win" || guide === "home" || guide === "1") return (Number(match?.homeOdds) > 1 ? match.homeOdds : null);
      if (guide === "away win" || guide === "away" || guide === "2") return (Number(match?.awayOdds) > 1 ? match.awayOdds : null);
      if (guide === "draw" || guide === "x") return (Number(match?.drawOdds) > 1 ? match.drawOdds : null);
      if (guide.includes("over 2.5") || guide === "o2.5") return (Number(match?.o25Odds) > 1 ? match.o25Odds : null);
      if (guide.includes("over 1.5") || guide === "o1.5") return (Number(match?.o15Odds) > 1 ? match.o15Odds : null);
      if (guide.includes("over 3.5") || guide === "o3.5") return (Number(match?.o35Odds) > 1 ? match.o35Odds : null);
      if (guide.includes("over 4.5") || guide === "o4.5") return (Number(match?.o45Odds) > 1 ? match.o45Odds : null);
      if (guide.includes("btts") || guide === "gg") return (Number(match?.bttsYesOdds) > 1 ? match.bttsYesOdds : null);
      if (guide.includes("home or draw") || guide === "1x") return (Number(match?.dc1X) > 1 ? match.dc1X : null);
      if (guide.includes("home or away") || guide === "12") return (Number(match?.dc12) > 1 ? match.dc12 : null);
      if (guide.includes("draw or away") || guide === "x2") return (Number(match?.dcX2) > 1 ? match.dcX2 : null);
      return null;
    }, [match?.pickOdds, match?.homeOdds, match?.drawOdds, match?.awayOdds, match?.o25Odds, match?.o15Odds, match?.o35Odds, match?.o45Odds, match?.bttsYesOdds, match?.dc1X, match?.dc12, match?.dcX2, match?.guide, match?.pick, match?.recommendation, activeMarket, marketViewPick]);`;

if (matchCard.includes(oldPickOdds)) {
  matchCard = matchCard.replace(oldPickOdds, newPickOdds);
  console.log('✅ Fix 1: pickOdds memo enhanced');
} else {
  console.error('❌ Fix 1: Still cannot find pickOdds memo. Dumping around it:');
  const idx = matchCard.indexOf('return match?.pickOdds || null;');
  console.log('Raw chars around "return match?.pickOdds || null;":', JSON.stringify(matchCard.substring(idx - 200, idx + 80)));
}

fs.writeFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', matchCard);
console.log('MatchCard.tsx saved\n');

// ============================================================
// FIX 3: BetSlip.tsx — AI state, formatter, recommend button
// ============================================================
let betSlip = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

// Fix 3b: State (find what's actually there)
const oldAiState = `  // AI Slip Analysis State
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);`;

const newAiState = `  // AI Slip Analysis State
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);

    // AI Recommend Slip State
    const [showRecommendModal, setShowRecommendModal] = useState(false);
    const [aiRecommending, setAiRecommending] = useState(false);
    const [recommendConfig, setRecommendConfig] = useState({ minMatches: 3, maxMatches: 5, minOdds: 1.5, maxOdds: 4.0 });`;

if (betSlip.includes(oldAiState)) {
  betSlip = betSlip.replace(oldAiState, newAiState);
  console.log('✅ Fix 3b: AI Recommend state added');
} else {
  console.error('❌ Fix 3b: State block not found. Dumping:');
  const idx = betSlip.indexOf('AI Slip Analysis State');
  console.log(JSON.stringify(betSlip.substring(idx - 5, idx + 200)));
}

// Fix 3c: Find handleAiAnalyze's finally block
const oldAnalyzeEnd = `      setAiAnalyzing(false);
    }
  };`;

const newAnalyzeEnd = `      setAiAnalyzing(false);
    }
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
          alert(\`✅ Added \${added} AI-recommended match\${added > 1 ? "es" : ""} to your betslip!\`);
        }
      }
    } catch (err) {
      alert("AI Recommend Error: " + err.message);
    } finally {
      setAiRecommending(false);
    }
  };`;

const firstOccurrence = betSlip.indexOf(oldAnalyzeEnd);
if (firstOccurrence !== -1) {
  betSlip = betSlip.substring(0, firstOccurrence) + newAnalyzeEnd + betSlip.substring(firstOccurrence + oldAnalyzeEnd.length);
  console.log('✅ Fix 3c: handleAiRecommend function added');
} else {
  console.error('❌ Fix 3c: Could not find finally block end');
}

// Fix 3d: Rich AI feedback renderer
const oldFeedbackRender = `                  {aiFeedback}`;
const newFeedbackRender = `                  {aiFeedback.split('\\n').map((line, i) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={i} className={line.trim() === '' ? 'mt-2' : 'mb-1'}>
                        {parts.map((part, j) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                        )}
                      </p>
                    );
                  })}`;

if (betSlip.includes(oldFeedbackRender)) {
  betSlip = betSlip.replace(oldFeedbackRender, newFeedbackRender);
  console.log('✅ Fix 3d: AI feedback rich renderer added');
} else {
  console.warn('⚠️  Fix 3d: Could not find {aiFeedback} render tag');
  console.log('Searching for aiFeedback...');
  const idx = betSlip.indexOf('aiFeedback}');
  if (idx !== -1) console.log(JSON.stringify(betSlip.substring(idx - 50, idx + 50)));
}

// Fix 3e: AI Recommend button & modal - find actual text
const aiSectionMarker = `{/* ===== AI SLIP ANALYZER (ADMIN ONLY) ===== */}`;
const aiSectionIdx = betSlip.indexOf(aiSectionMarker);
if (aiSectionIdx !== -1) {
  const insertBefore = `          {/* ===== AI RECOMMEND SLIP (ADMIN ONLY) ===== */}
          {isAdmin && (
            <div className="w-full mb-3">
              <button
                onClick={() => setShowRecommendModal(true)}
                disabled={aiRecommending}
                className={cn(
                  "w-full py-3 rounded-2xl text-xs font-black transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg",
                  aiRecommending
                    ? "bg-emerald-900/50 text-emerald-200 cursor-wait"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
                )}
              >
                {aiRecommending ? (
                  <>
                    <div className="animate-spin h-3 w-3 border-2 border-white/20 border-t-white rounded-full" />
                    Building AI Slip...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> AI Recommend Slip
                  </>
                )}
              </button>
            </div>
          )}

          {/* ===== AI RECOMMEND MODAL ===== */}
          {showRecommendModal && (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4" style={{background: 'rgba(0,0,0,0.7)'}}>
              <div className={cn("w-full max-w-sm rounded-3xl p-6 shadow-2xl", darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest">
                    <Wand2 size={16} className="text-emerald-400" /> AI Slip Builder
                  </div>
                  <button onClick={() => setShowRecommendModal(false)} className="p-1.5 rounded-full hover:bg-black/10"><X size={14} /></button>
                </div>
                <p className={cn("text-xs mb-4 leading-relaxed", darkMode ? "text-gray-400" : "text-gray-500")}>
                  AI will analyze today's matches and build you an optimized betslip based on stats, form, and value.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Min Matches</label>
                    <input type="number" min={1} max={10} value={recommendConfig.minMatches}
                      onChange={e => setRecommendConfig(c => ({...c, minMatches: Number(e.target.value)}))}
                      className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Max Matches</label>
                    <input type="number" min={1} max={15} value={recommendConfig.maxMatches}
                      onChange={e => setRecommendConfig(c => ({...c, maxMatches: Number(e.target.value)}))}
                      className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Min Odds</label>
                    <input type="number" min={1.0} max={5.0} step={0.1} value={recommendConfig.minOdds}
                      onChange={e => setRecommendConfig(c => ({...c, minOdds: Number(e.target.value)}))}
                      className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Max Odds</label>
                    <input type="number" min={1.0} max={20.0} step={0.1} value={recommendConfig.maxOdds}
                      onChange={e => setRecommendConfig(c => ({...c, maxOdds: Number(e.target.value)}))}
                      className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAiRecommend}
                  className="w-full py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} /> Build My Slip
                </button>
              </div>
            </div>
          )}

          `;
  betSlip = betSlip.substring(0, aiSectionIdx) + insertBefore + betSlip.substring(aiSectionIdx);
  console.log('✅ Fix 3e: AI Recommend button & modal injected');
} else {
  console.error('❌ Fix 3e: Could not find AI SLIP ANALYZER marker');
}

fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', betSlip);
console.log('✅ BetSlip.tsx saved');
