const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/stats/insights/page.tsx', 'utf8');

// Inject TH
const thTarget = `<th className="py-2 px-2 font-semibold text-center">Trend</th>`;
const thReplace = `<th className="py-2 px-2 font-semibold text-center">Trend</th>\n                            <th className="py-2 px-2 font-semibold text-center w-8"></th>`;

if (code.includes(thTarget) && !code.includes('<th className="py-2 px-2 font-semibold text-center w-8"></th>')) {
  code = code.replace(thTarget, thReplace);
}

// Inject TD
const tdTarget = `</ResponsiveContainer>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>`;

const tdReplace = `</ResponsiveContainer>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                  {hasNextMatch && item.odds !== null && Number(item.odds) > 0 && (
                                    <button
                                      onClick={() => handleAddToBetslip(item, sec.key)}
                                      className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors border border-slate-700"
                                      title="Add to Betslip"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  )}
                                </td>`;

if (code.includes(tdTarget) && !code.includes('onClick={() => handleAddToBetslip(item, sec.key)}')) {
  code = code.replace(tdTarget, tdReplace);
}

fs.writeFileSync('apps/web/src/app/stats/insights/page.tsx', code);
console.log("✅ Injected Button");
