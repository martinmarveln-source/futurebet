const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

// ---------- Fix 3b: Add AI Recommend state ----------
const OLD_STATE = '  // AI Slip Analysis State\r\n  const [aiAnalyzing, setAiAnalyzing] = useState(false);\r\n  const [aiFeedback, setAiFeedback] = useState(null);';
const NEW_STATE = `  // AI Slip Analysis State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);

  // AI Recommend Slip State
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [aiRecommending, setAiRecommending] = useState(false);
  const [recommendConfig, setRecommendConfig] = useState({ minMatches: 3, maxMatches: 5, minOdds: 1.5, maxOdds: 4.0 });`;

const idx3b = code.indexOf(OLD_STATE);
if (idx3b !== -1) {
  code = code.substring(0, idx3b) + NEW_STATE + code.substring(idx3b + OLD_STATE.length);
  console.log('✅ Fix 3b: AI Recommend state added');
} else {
  // Try LF-only
  const OLD_STATE_LF = '  // AI Slip Analysis State\n  const [aiAnalyzing, setAiAnalyzing] = useState(false);\n  const [aiFeedback, setAiFeedback] = useState(null);';
  const idx3b2 = code.indexOf(OLD_STATE_LF);
  if (idx3b2 !== -1) {
    code = code.substring(0, idx3b2) + NEW_STATE + code.substring(idx3b2 + OLD_STATE_LF.length);
    console.log('✅ Fix 3b (LF): AI Recommend state added');
  } else {
    console.error('❌ Fix 3b: State block not found');
    const pos = code.indexOf('aiAnalyzing');
    console.log('Context:', JSON.stringify(code.substring(pos - 80, pos + 100)));
  }
}

// ---------- Fix 3c: Add handleAiRecommend after handleAiAnalyze ----------
const OLD_ANALYZE_END = `      setAiAnalyzing(false);
    }
  };`;
const NEW_ANALYZE_END = `      setAiAnalyzing(false);
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
          alert("✅ Added " + added + " AI-recommended match" + (added > 1 ? "es" : "") + " to your betslip!");
        }
      }
    } catch (err) {
      alert("AI Recommend Error: " + err.message);
    } finally {
      setAiRecommending(false);
    }
  };`;

const firstOcc = code.indexOf(OLD_ANALYZE_END);
if (firstOcc !== -1) {
  code = code.substring(0, firstOcc) + NEW_ANALYZE_END + code.substring(firstOcc + OLD_ANALYZE_END.length);
  console.log('✅ Fix 3c: handleAiRecommend added');
} else {
  console.error('❌ Fix 3c: Could not find handleAiAnalyze end');
  const pos = code.indexOf('setAiAnalyzing(false)');
  console.log('Context:', JSON.stringify(code.substring(pos - 20, pos + 80)));
}

// ---------- Fix 3d: Rich renderer already applied, check ----------
if (code.includes('{aiFeedback.split')) {
  console.log('ℹ️  Fix 3d: Rich renderer already applied');
} else if (code.includes('{aiFeedback}')) {
  // Apply it
  code = code.replace('{aiFeedback}', `{aiFeedback.split('\\n').map((line, i) => {
                    const parts = line.split(/(\\*\\*[^*]+\\*\\*)/g);
                    return (
                      <p key={i} className={line.trim() === '' ? 'mt-2' : 'mb-1'}>
                        {parts.map((part, j) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                        )}
                      </p>
                    );
                  })}`);
  console.log('✅ Fix 3d: Rich renderer applied');
} else {
  console.warn('⚠️  Fix 3d: aiFeedback render not found');
}

// ---------- Fix 3e: AI Recommend button — check if already applied ----------
if (code.includes('AI RECOMMEND SLIP')) {
  console.log('ℹ️  Fix 3e: Recommend button already present');
} else {
  const ANCHOR = '{/* ===== AI SLIP ANALYZER (ADMIN ONLY) ===== */}';
  const anchorIdx = code.indexOf(ANCHOR);
  if (anchorIdx !== -1) {
    const insertBlock = `{/* ===== AI RECOMMEND SLIP (ADMIN ONLY) ===== */}
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
    code = code.substring(0, anchorIdx) + insertBlock + code.substring(anchorIdx);
    console.log('✅ Fix 3e: Recommend button & modal inserted');
  } else {
    console.error('❌ Fix 3e: AI SLIP ANALYZER anchor not found');
  }
}

fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
console.log('✅ BetSlip.tsx saved');
