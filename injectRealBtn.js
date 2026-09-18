const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/stats/insights/page.tsx', 'utf8');

// TH
code = code.replace(/<th className="py-2 px-2 font-semibold text-center">Trend<\/th>/g, 
  '<th className="py-2 px-2 font-semibold text-center">Trend</th><th className="py-2 px-2 font-semibold text-center w-8"></th>');

// TD
code = code.replace(/<\/LineChart>\s*<\/ResponsiveContainer>\s*<\/div>\s*\) : \(\s*<span className="text-slate-600 text-\[11px\]">-<\/span>\s*\)\}\s*<\/td>/g, 
  `</LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                  {hasNextMatch && item.odds !== null && Number(item.odds) > 0 && (
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleAddToBetslip(item, sec.key); }}
                                      className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors border border-slate-700"
                                      title="Add to Betslip"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  )}
                                </td>`);

fs.writeFileSync('apps/web/src/app/stats/insights/page.tsx', code);
console.log("Injected using proper regex!");
