'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Target, TrendingUp, Trophy, XCircle } from 'lucide-react';

export default function PortfolioPage() {
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portfolio')
      .then(r => r.json())
      .then(d => { if (d.success) setPicks(d.picks); })
      .finally(() => setLoading(false));
  }, []);

  const settled = picks.filter(p => p.result === 'Won' || p.result === 'Lost');
  const wins = settled.filter(p => p.result === 'Won').length;
  const winRate = settled.length > 0 ? Math.round((wins / settled.length) * 100) : 0;

  const marketMap: Record<string, { total: number; wins: number; losses: number }> = {};
  for (const p of picks) {
    if (!marketMap[p.market]) marketMap[p.market] = { total: 0, wins: 0, losses: 0 };
    marketMap[p.market].total++;
    if (p.result === 'Won') marketMap[p.market].wins++;
    if (p.result === 'Lost') marketMap[p.market].losses++;
  }

  const resultBadge = (r: string) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold';
    if (r === 'Won') return <span className={`${base} bg-emerald-500/20 text-emerald-300`}>Won</span>;
    if (r === 'Lost') return <span className={`${base} bg-rose-500/20 text-rose-300`}>Lost</span>;
    if (r === 'Void') return <span className={`${base} bg-slate-500/20 text-slate-400`}>Void</span>;
    return <span className={`${base} bg-amber-500/20 text-amber-300`}>Pending</span>;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-amber-400" />
          My Prediction Portfolio
        </h1>

        {loading ? (
          <div className="text-slate-400 text-center py-20">Loading your picks...</div>
        ) : picks.length === 0 ? (
          <div className="text-center py-20">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">No picks logged yet.</p>
            <p className="text-slate-600 text-sm mt-2">Add matches to your betslip and submit tickets to start tracking.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Picks', value: picks.length, icon: Target, color: 'text-blue-400' },
                { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: winRate >= 60 ? 'text-emerald-400' : winRate >= 45 ? 'text-amber-400' : 'text-rose-400' },
                { label: 'Total Won', value: wins, icon: Trophy, color: 'text-emerald-400' },
                { label: 'Total Lost', value: settled.length - wins, icon: XCircle, color: 'text-rose-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <Icon className={`w-5 h-5 ${color} mb-2`} />
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
              <h2 className="text-lg font-black text-white mb-4">Performance by Market</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                      <th className="text-left pb-3">Market</th>
                      <th className="text-center pb-3">Picks</th>
                      <th className="text-center pb-3">Won</th>
                      <th className="text-center pb-3">Lost</th>
                      <th className="text-right pb-3">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(marketMap).sort((a,b) => b[1].total - a[1].total).map(([market, stats]) => {
                      const wr = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
                      return (
                        <tr key={market} className="border-b border-slate-800/50">
                          <td className="py-3 font-semibold text-white">{market}</td>
                          <td className="text-center text-slate-300">{stats.total}</td>
                          <td className="text-center text-emerald-400 font-bold">{stats.wins}</td>
                          <td className="text-center text-rose-400 font-bold">{stats.losses}</td>
                          <td className="text-right">
                            <span className={`font-black ${wr >= 60 ? 'text-emerald-400' : wr >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>{wr}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-lg font-black text-white mb-4">Pick History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                      <th className="text-left pb-3">Date</th>
                      <th className="text-left pb-3">Match</th>
                      <th className="text-left pb-3">Market</th>
                      <th className="text-left pb-3">Selection</th>
                      <th className="text-center pb-3">Odds</th>
                      <th className="text-right pb-3">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {picks.slice(0, 50).map((p: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 text-slate-400 whitespace-nowrap">{p.match_date || '?"'}</td>
                        <td className="py-3 text-white font-semibold max-w-[180px] truncate">{p.match_name}</td>
                        <td className="py-3 text-slate-300">{p.market}</td>
                        <td className="py-3 text-slate-300">{p.selection}</td>
                        <td className="text-center">{p.odds ? Number(p.odds).toFixed(2) : '?"'}</td>
                        <td className="text-right py-3">{resultBadge(p.result)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
