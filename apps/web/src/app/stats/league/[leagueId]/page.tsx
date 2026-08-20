"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy, ChevronLeft, Activity, Shield, Flame } from "lucide-react";
import { cn } from "@/utils/matchUtils";

export default function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const [leagueId, setLeagueId] = useState<string>("");
  const searchParams = useSearchParams();
  const country = searchParams.get("country") || "";

  const [overview, setOverview] = useState<any>(null);
  const [table, setTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setLeagueId(decodeURIComponent(p.leagueId));
    });
  }, [params]);

  useEffect(() => {
    if (!leagueId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, tableRes] = await Promise.all([
          fetch(`/api/stats/league/${encodeURIComponent(leagueId)}`),
          fetch(`/api/league-table?country=${encodeURIComponent(country)}&league=${encodeURIComponent(leagueId)}`)
        ]);

        const overviewJson = await overviewRes.json();
        const tableJson = await tableRes.json();

        if (overviewJson.success) setOverview(overviewJson.overview);
        if (tableJson.success) setTable(tableJson.table);
      } catch (err) {
        console.error("Failed to fetch league data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leagueId, country]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Back navigation */}
        <Link 
          href="/stats"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Stats Hub
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <span className="font-medium">{country}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">2026/27</span>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
              <Trophy className="w-8 h-8 text-yellow-500" />
              {leagueId}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Analytics Overview Cards */}
            {overview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800">
                  <div className="text-slate-400 text-sm mb-1">Goals Per Game</div>
                  <div className="text-2xl font-bold text-white">{overview.goals_per_game}</div>
                </div>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800">
                  <div className="text-slate-400 text-sm mb-1">BTTS %</div>
                  <div className="text-2xl font-bold text-blue-400">{overview.btts_percent}%</div>
                </div>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800">
                  <div className="text-slate-400 text-sm mb-1">Over 2.5 %</div>
                  <div className="text-2xl font-bold text-emerald-400">{overview.over_25_percent}%</div>
                </div>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800">
                  <div className="text-slate-400 text-sm mb-1">Clean Sheet %</div>
                  <div className="text-2xl font-bold text-purple-400">{overview.clean_sheet_percent}%</div>
                </div>
              </div>
            )}

            {/* League Table */}
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                  <List className="w-5 h-5 text-indigo-400" />
                  League Table & Team Analytics
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider">
                      <th className="p-4 font-medium">#</th>
                      <th className="p-4 font-medium">Team</th>
                      <th className="p-4 font-medium text-center">PL</th>
                      <th className="p-4 font-medium text-center">W</th>
                      <th className="p-4 font-medium text-center">D</th>
                      <th className="p-4 font-medium text-center">L</th>
                      <th className="p-4 font-medium text-center hidden md:table-cell">GD</th>
                      <th className="p-4 font-medium text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {table.map((row, idx) => (
                      <tr 
                        key={row.id} 
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="p-4 text-slate-400">{idx + 1}</td>
                        <td className="p-4 font-medium">
                          <Link 
                            href={`/stats/team/${encodeURIComponent(row.team)}?league=${encodeURIComponent(leagueId)}`}
                            className="text-white hover:text-blue-400 flex items-center gap-2 transition-colors"
                          >
                            {row.team}
                          </Link>
                        </td>
                        <td className="p-4 text-center">{row.gp || 0}</td>
                        <td className="p-4 text-center text-emerald-400">{row.win || 0}</td>
                        <td className="p-4 text-center text-slate-400">{row.draw || 0}</td>
                        <td className="p-4 text-center text-red-400">{row.lost || 0}</td>
                        <td className="p-4 text-center text-slate-300 hidden md:table-cell">{row.gd || 0}</td>
                        <td className="p-4 text-center font-bold text-white">{row.pts || 0}</td>
                      </tr>
                    ))}
                    {table.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          No table data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}

function List({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
  );
}
