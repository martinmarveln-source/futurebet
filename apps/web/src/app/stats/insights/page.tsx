"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

import { Trophy, ChevronLeft, Target, Shield, Home, AlertCircle, BarChart3, ArrowDown, ArrowUp, Activity, Globe } from "lucide-react";
import PremiumOverlay from "../../../components/Stats/PremiumOverlay";

export default function InsightsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [minGames, setMinGames] = useState(4);
  const [split, setSplit] = useState("overall"); // overall, home, away
  const [viewType, setViewType] = useState("team"); // team, league
  const [isLocked, setIsLocked] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setLoading(true);
    setIsLocked(false);
    
    const params = new URLSearchParams({
      minGames: minGames.toString(),
      split
    });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    fetch(`/api/stats/insights?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else if (json.error === "premium_required") {
          setIsLocked(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [minGames, split, startDate, endDate]);

  const sections = [
    { key: "btts", title: "Best BTTS", icon: Target, color: "text-amber-400" },
    { key: "nbtts", title: "Best N-BTTS", icon: Shield, color: "text-amber-600" },
    { key: "o15", title: "Best Over 1.5", icon: ArrowUp, color: "text-emerald-400" },
    { key: "u15", title: "Best Under 1.5", icon: ArrowDown, color: "text-red-400" },
    { key: "o25", title: "Best Over 2.5", icon: ArrowUp, color: "text-emerald-500" },
    { key: "u25", title: "Best Under 2.5", icon: ArrowDown, color: "text-red-500" },
    { key: "o35", title: "Best Over 3.5", icon: ArrowUp, color: "text-emerald-600" },
    { key: "u35", title: "Best Under 3.5", icon: ArrowDown, color: "text-red-600" },
    { key: "o45", title: "Best Over 4.5", icon: ArrowUp, color: "text-emerald-700" },
    { key: "u45", title: "Best Under 4.5", icon: ArrowDown, color: "text-red-700" },
    { key: "hgsO15", title: "Home Scored Over 1.5", icon: Target, color: "text-indigo-400" },
    { key: "hgcO15", title: "Home Conceded Over 1.5", icon: AlertCircle, color: "text-rose-400" },
    { key: "agsO15", title: "Away Scored Over 1.5", icon: Target, color: "text-purple-400" },
    { key: "agcO15", title: "Away Conceded Over 1.5", icon: AlertCircle, color: "text-orange-400" },
    { key: "nfts", title: "Highest Not Failed to Score", icon: Target, color: "text-blue-400" },
    { key: "fts", title: "Highest Failed to Score", icon: AlertCircle, color: "text-orange-400" },
    { key: "cleanSheet", title: "Best Clean Sheet", icon: Shield, color: "text-indigo-400" },
    { key: "bestHome", title: "Strongest Home", icon: Home, color: "text-green-400" },
    { key: "worstHome", title: "Worst Home", icon: Home, color: "text-rose-500" },
  ];

  const currentData = viewType === 'team' ? data?.team : data?.league;

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

        <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-white">
              <Activity className="w-8 h-8 text-blue-500" />
              Global Stats Hub
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              The top 1% market insights globally. Filter by minimum games played, split, and entity type.
            </p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Type Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setViewType('team')}
                className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewType === 'team' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Team Performance
              </button>
              <button 
                onClick={() => setViewType('league')}
                className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewType === 'league' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                League Performance
              </button>
            </div>

            {/* Split Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button onClick={() => setSplit('overall')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${split === 'overall' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Overall</button>
              <button onClick={() => setSplit('home')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${split === 'home' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Home</button>
              <button onClick={() => setSplit('away')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${split === 'away' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Away</button>
            </div>

            {/* Min Games Filter */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <select 
                value={minGames} 
                onChange={(e) => setMinGames(Number(e.target.value))}
                className="bg-transparent text-white text-sm focus:outline-none font-bold appearance-none cursor-pointer"
              >
                {[4, 5, 8, 10, 15, 20].map(num => (
                  <option key={num} value={num} className="bg-slate-900">Min {num} Matches</option>
                ))}
              </select>
            </div>

            {/* Next Match Date Filter */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
              <span className="text-xs font-bold text-slate-400">Next Match:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-800 border-none text-xs text-white rounded p-1 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-slate-800 border-none text-xs text-white rounded p-1 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <div className="relative min-h-[400px]">
          {isLocked && <PremiumOverlay message="Premium Insights Locked" />}
          
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isLocked ? 'opacity-20 pointer-events-none filter blur-[2px]' : ''}`}>
            {sections.map(sec => {
              const Icon = sec.icon;
              // If locked, render some dummy data to make the background blur look realistic
              const items = isLocked ? Array(5).fill({ team: 'Locked Team', league: 'Locked League', country: 'Locked', value: 100 }) : currentData?.[sec.key];
              if (!items || items.length === 0) return null;
            
            return (
              <div key={sec.key} className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-5 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`p-2 rounded-lg bg-slate-900/80 border border-slate-800`}>
                    <Icon className={`w-5 h-5 ${sec.color}`} />
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight">{sec.title}</h2>
                </div>
                <div className="space-y-2 flex-grow">
                  {items.map((item: any, idx: number) => {
                    const content = (
                      <>
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-xs font-bold text-slate-500 w-4 flex-shrink-0">{idx + 1}</span>
                          <div className="truncate">
                            <div className="font-bold text-white text-sm truncate hover:text-blue-400 transition-colors">
                              {viewType === 'team' ? item.team : item.league}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                              {item.country} {viewType === 'team' ? `• ${item.league}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className={`font-black text-[13px] flex-shrink-0 text-right ${sec.color}`}>
                          {item.gp ? `${Math.round((item.value / 100) * item.gp)}/${item.gp} (${Math.round(item.value)}%)` : `${Math.round(item.value)}%`}
                        </div>
                      </>
                    );

                    return viewType === 'team' ? (
                      <Link href={`/stats/team/${encodeURIComponent(item.team)}?league=${encodeURIComponent(item.league)}&country=${encodeURIComponent(item.country)}`} key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                        {content}
                      </Link>
                    ) : (
                      <Link href={`/stats/league/${encodeURIComponent(item.league)}?country=${encodeURIComponent(item.country)}`} key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                        {content}
                      </Link>
                    )
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
