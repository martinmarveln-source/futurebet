const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

// The state initialisation
const stateSearch = /const \[recommendConfig, setRecommendConfig\] = useState\(\{ minMatches: 3, maxMatches: 5, minOdds: 1.5, maxOdds: 4.0 \}\);/;
const getTodayStr = `const getTodayStr = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().split('T')[0]; };`;
const stateReplacement = getTodayStr + `\n  const [recommendConfig, setRecommendConfig] = useState({ minMatches: 3, maxMatches: 5, minOdds: 1.5, maxOdds: 4.0, targetDate: getTodayStr() });`;

code = code.replace(stateSearch, stateReplacement);

// The UI insertion
const uiSearch = /<\/div>\s*<\/div>\s*<button\s*onClick=\{handleAiRecommend\}/;

const uiReplacement = `</div>
                  </div>
                  <div className="mb-5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Match Date (Optional)</label>
                    <input type="date" value={recommendConfig.targetDate || ""}
                      onChange={e => setRecommendConfig(c => ({...c, targetDate: e.target.value}))}
                      className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                    />
                  </div>
                  <button
                    onClick={handleAiRecommend}`;

code = code.replace(uiSearch, uiReplacement);

fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
console.log("✅ Updated BetSlip UI with Regex");
