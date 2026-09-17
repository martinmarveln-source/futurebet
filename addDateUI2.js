const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

const target2 = `                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Max Odds</label>
                      <input type="number" min={1.0} max={20.0} step={0.1} value={recommendConfig.maxOdds}
                        onChange={e => setRecommendConfig(c => ({...c, maxOdds: Number(e.target.value)}))}
                        className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                      />
                    </div>
                  </div>`;

const newTarget2 = `                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Max Odds</label>
                      <input type="number" min={1.0} max={20.0} step={0.1} value={recommendConfig.maxOdds}
                        onChange={e => setRecommendConfig(c => ({...c, maxOdds: Number(e.target.value)}))}
                        className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                      />
                    </div>
                  </div>
                  <div className="mb-5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Match Date (Optional)</label>
                    <input type="date" value={recommendConfig.targetDate || ""}
                      onChange={e => setRecommendConfig(c => ({...c, targetDate: e.target.value}))}
                      className={cn("w-full rounded-xl px-3 py-2 text-sm font-bold border", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}
                    />
                  </div>`;

if (code.includes(target2)) {
  code = code.replace(target2, newTarget2);
  fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
  console.log("✅ Updated BetSlip modal with Date field");
} else {
  // try LF only
  const target2LF = target2.replace(/\r\n/g, '\n');
  if (code.includes(target2LF)) {
    code = code.replace(target2LF, newTarget2);
    fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
    console.log("✅ Updated BetSlip modal with Date field (LF)");
  } else {
    console.error("❌ Target not found in BetSlip (LF or CRLF)");
  }
}
