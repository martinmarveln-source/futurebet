const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/stats/insights/page.tsx', 'utf8');

// 1. Add Plus icon to lucide-react import if not there
if (code.includes('import { Trophy')) {
  if (!code.includes('Plus')) {
    code = code.replace('import { Trophy', 'import { Trophy, Plus');
  }
}

// 2. Add useBetslipStore import
if (!code.includes('useBetslipStore')) {
  const importTarget = `import PremiumOverlay from "../../../components/Stats/PremiumOverlay";`;
  const importReplacement = `import PremiumOverlay from "../../../components/Stats/PremiumOverlay";\nimport { useBetslipStore } from "../../../store/betslipStore";`;
  code = code.replace(importTarget, importReplacement);
}

// 3. Add handleAddToBetslip inside InsightsPage
const handleTarget = `export default function InsightsPage() {`;
const handleReplacement = `export default function InsightsPage() {
  const handleAddToBetslip = (item: any, secKey: string) => {
    let market = "";
    let option = "";
    
    switch(secKey) {
       case "btts": market = "BTTS"; option = "Yes"; break;
       case "nbtts": market = "BTTS"; option = "No"; break;
       case "o15": market = "O/U 1.5"; option = "Over"; break;
       case "u15": market = "O/U 1.5"; option = "Under"; break;
       case "o25": market = "O/U 2.5"; option = "Over"; break;
       case "u25": market = "O/U 2.5"; option = "Under"; break;
       case "o35": market = "O/U 3.5"; option = "Over"; break;
       case "u35": market = "O/U 3.5"; option = "Under"; break;
       case "o45": market = "O/U 4.5"; option = "Over"; break;
       case "u45": market = "O/U 4.5"; option = "Under"; break;
       case "bestHome": market = "1X2"; option = "Home Win"; break;
       case "bestAway": market = "1X2"; option = "Away Win"; break;
       case "homeDraw": market = "1X2"; option = "Draw"; break;
       case "awayDraw": market = "1X2"; option = "Draw"; break;
       case "worstHome": market = "1X2"; option = "Away Win"; break;
       case "worstAway": market = "1X2"; option = "Home Win"; break;
       default: return; // Not supported
    }
    
    const matchName = item.isHome ? \`\${item.team} vs \${item.nextOpponent}\` : \`\${item.nextOpponent} vs \${item.team}\`;
    
    const m = {
      match: matchName,
      league: item.league,
      country: item.country,
      date: item.nextDate,
      selectedMarket: market,
      selectedOption: option,
      odds: Number(item.odds),
      chance: item.prediction,
      rating: item.confidence
    };
    
    useBetslipStore.getState().addMatch(m);
    alert(\`Added \${matchName} to BetSlip!\`);
  };`;
if (!code.includes('handleAddToBetslip')) {
  code = code.replace(handleTarget, handleReplacement);
}

// 4. Add TH column
const thTarget = `<th className="py-2 px-2 font-semibold text-center">Trend</th>
                            </>`;
const thReplacement = `<th className="py-2 px-2 font-semibold text-center">Trend</th>
                              <th className="py-2 px-2 font-semibold text-center">Add</th>
                            </>`;
if (!code.includes('<th className="py-2 px-2 font-semibold text-center">Add</th>')) {
  code = code.replace(thTarget, thReplacement);
}

// 5. Add TD cell
const tdTarget = `<td className="py-2.5 px-2 text-center">
                                    <div className="flex items-center justify-center gap-[2px]">
                                      {item.trend && item.trend.length > 0 ? (
                                        item.trend.map((val: number, i: number) => (
                                          <div 
                                            key={i}
                                            className={\`w-1.5 h-3 rounded-sm \${val === 1 ? 'bg-emerald-500' : val === 0.5 ? 'bg-amber-500' : 'bg-rose-500'}\`}
                                          />
                                        ))
                                      ) : (
                                        <span className="text-slate-600 text-[10px]">-</span>
                                      )}
                                    </div>
                                  </td>
                                </>
                              )}`;
const tdReplacement = `<td className="py-2.5 px-2 text-center">
                                    <div className="flex items-center justify-center gap-[2px]">
                                      {item.trend && item.trend.length > 0 ? (
                                        item.trend.map((val: number, i: number) => (
                                          <div 
                                            key={i}
                                            className={\`w-1.5 h-3 rounded-sm \${val === 1 ? 'bg-emerald-500' : val === 0.5 ? 'bg-amber-500' : 'bg-rose-500'}\`}
                                          />
                                        ))
                                      ) : (
                                        <span className="text-slate-600 text-[10px]">-</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    {hasNextMatch && item.odds !== null && Number(item.odds) > 0 && (
                                      <button 
                                        onClick={() => handleAddToBetslip(item, sec.key)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white p-1 rounded transition-colors"
                                        title="Add to BetSlip"
                                      >
                                        <Plus size={14} strokeWidth={3} />
                                      </button>
                                    )}
                                  </td>
                                </>
                              )}`;

if (code.includes(tdTarget)) {
  code = code.replace(tdTarget, tdReplacement);
} else {
  // LF
  const tdTargetLF = tdTarget.replace(/\r\n/g, '\n');
  if (code.includes(tdTargetLF)) {
    code = code.replace(tdTargetLF, tdReplacement);
  }
}

fs.writeFileSync('apps/web/src/app/stats/insights/page.tsx', code);
console.log("✅ Updates applied to InsightsPage");
