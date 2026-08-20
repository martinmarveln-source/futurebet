"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ChevronLeft, Target, Shield, Home, AlertCircle, BarChart3, ArrowDown } from "lucide-react";

export default function InsightsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [minGames, setMinGames] = useState(4);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats/insights?minGames=${minGames}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [minGames]);

  const sections = [
    { key: "btts", title: "Best BTTS", icon: Target, color: "text-amber-400" },
    { key: "o15", title: "Best Over 1.5", icon: Trophy, color: "text-emerald-400" },
    { key: "o25", title: "Best Over 2.5", icon: Trophy, color: "text-emerald-400" },
    { key: "o35", title: "Best Over 3.5", icon: Trophy, color: "text-emerald-400" },
    { key: "u15", title: "Best Under 1.5", icon: ArrowDown, color: "text-red-400" },
    { key: "u25", title: "Best Under 2.5", icon: ArrowDown, color: "text-red-400" },
    { key: "u35", title: "Best Under 3.5", icon: ArrowDown, color: "text-red-400" },
    { key: "fts", title: "Highest Failed to Score", icon: AlertCircle, color: "text-orange-400" },
    { key: "homeWin", title: "Strongest Home Teams", icon: Home, color: "text-blue-400" },
    { key: "cleanSheet", title: "Best Clean Sheet", icon: Shield, color: "text-indigo-400" },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Top Navigation Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-800 pb-px">
          <Link href="/stats" className="px-4 py-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200 font-bold text-sm">
            Browse Leagues
          </Link>
          <Link href="/stats/insights" className="px-4 py-2 border-b-2 border-blue-500 text-blue-400 font-bold text-sm flex items-center gap-1.5 transition-colors">
            <Trophy className="w-4 h-4" />
            Premium Market Insights
          </Link>
        </div>

        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-white">
              <Trophy className="w-8 h-8 text-amber-500" />
              Premium Market Insights
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Top performing teams across all leagues globally for key betting markets.
            </p>
          </div>
          
          {/* Min Games Filter */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <label className="text-sm font-semibold text-slate-300">Min. Matches Played:</label>
            <select 
              value={minGames} 
              onChange={(e) => setMinGames(Number(e.target.value))}
              className="bg-[#030712] border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 font-bold"
            >
              {[1, 2, 3, 4, 5, 8, 10, 15, 20].map(num => (
                <option key={num} value={num}>{num} Matches</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map(sec => {
            const Icon = sec.icon;
            const items = data?.[sec.key] || [];
            return (
              <div key={sec.key} className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Icon className={`w-6 h-6 ${sec.color}`} />
                  <h2 className="text-xl font-bold text-white">{sec.title}</h2>
                </div>
                <div className="space-y-3">
                  {items.map((item: any, idx: number) => (
                    <Link href={`/stats/team/${encodeURIComponent(item.team)}?league=${encodeURIComponent(item.league)}`} key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-slate-500 w-4">{idx + 1}</span>
                        <div>
                          <div className="font-bold text-white text-sm hover:text-blue-400 transition-colors">{item.team}</div>
                          <div className="text-xs text-slate-400">{item.country} • {item.league}</div>
                        </div>
                      </div>
                      <div className={`font-black text-lg ${sec.color}`}>
                        {Math.round(item.value)}%
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
