const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

// 1. Add targetDate to initial state
const STATE_OLD = `const [recommendConfig, setRecommendConfig] = useState({ minMatches: 3, maxMatches: 5, minOdds: 1.5, maxOdds: 4.0 });`;
// Get today's date in local YYYY-MM-DD
const STATE_NEW = `
  const getTodayStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
  const [recommendConfig, setRecommendConfig] = useState({ minMatches: 3, maxMatches: 5, minOdds: 1.5, maxOdds: 4.0, targetDate: getTodayStr() });`;

if (code.includes(STATE_OLD)) {
  code = code.replace(STATE_OLD, STATE_NEW);
}

// 2. Add date input field to the modal grid
const INPUT_TARGET = `                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Max Odds</label>
                      <input type="number" min={1.0} max={20.0} step={0.1} value={recommendConfig.maxOdds}
                        onChange={e => setRecommendConfig(c => ({...c, maxOdds: Number(e.target.value)}))}
                        className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                      />
                    </div>`;

const INPUT_NEW = `                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Max Odds</label>
                      <input type="number" min={1.0} max={20.0} step={0.1} value={recommendConfig.maxOdds}
                        onChange={e => setRecommendConfig(c => ({...c, maxOdds: Number(e.target.value)}))}
                        className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                      />
                    </div>
                  </div>
                  <div className="mb-5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Match Date</label>
                    <input type="date" value={recommendConfig.targetDate}
                      onChange={e => setRecommendConfig(c => ({...c, targetDate: e.target.value}))}
                      className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                    />`;

if (code.includes(INPUT_TARGET)) {
  code = code.replace(INPUT_TARGET, INPUT_NEW);
  fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
  console.log("✅ Updated BetSlip modal with Date field");
} else {
  console.error("❌ Target not found in BetSlip");
}
