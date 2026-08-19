"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shield, ChevronLeft, BarChart3, TrendingUp, Target, Activity } from "lucide-react";

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const [teamId, setTeamId] = useState<string>("");
  const searchParams = useSearchParams();
  const league = searchParams.get("league") || "";

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setTeamId(decodeURIComponent(p.teamId));
    });
  }, [params]);

  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats/team/${encodeURIComponent(teamId)}?league=${encodeURIComponent(league)}`);
        const json = await res.json();

        if (json.success) {
          setStats(json);
        }
      } catch (err) {
        console.error("Failed to fetch team data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId, league]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Back navigation */}
        <Link 
          href={`/stats/league/${encodeURIComponent(league)}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {league}
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <span className="font-medium">{league}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">2026/27</span>
            </div>
            <h1 className="text-4xl font-bold flex items-center gap-3 text-white">
              <Shield className="w-10 h-10 text-indigo-500" />
              {teamId}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            
            {/* Top Row: General & Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* General Stats */}
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 shadow-lg">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white mb-4">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Season Overview
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-800/50">
                    <div className="text-slate-400 text-xs mb-1">Matches</div>
                    <div className="text-xl font-bold text-white">{stats.general.gp}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-800/50">
                    <div className="text-slate-400 text-xs mb-1">Points</div>
                    <div className="text-xl font-bold text-white">{stats.general.points}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-800/50">
                    <div className="text-slate-400 text-xs mb-1">PPG</div>
                    <div className="text-xl font-bold text-blue-400">{stats.general.ppg}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-800/50">
                    <div className="text-slate-400 text-xs mb-1">Wins</div>
                    <div className="text-xl font-bold text-emerald-400">{stats.general.wins}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-800/50">
                    <div className="text-slate-400 text-xs mb-1">Draws</div>
                    <div className="text-xl font-bold text-slate-400">{stats.general.draws}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-800/50">
                    <div className="text-slate-400 text-xs mb-1">Losses</div>
                    <div className="text-xl font-bold text-red-400">{stats.general.losses}</div>
                  </div>
                </div>
              </div>

              {/* Form Guide */}
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 shadow-lg">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Recent Form (Last 5)
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-slate-400 text-sm">Overall</span>
                    <div className="flex gap-1">
                      {stats.form.overall.split('').map((r: string, i: number) => (
                        <FormBadge key={i} result={r} />
                      ))}
                      {!stats.form.overall && <span className="text-slate-600 text-sm">No data</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-slate-400 text-sm">Home</span>
                    <div className="flex gap-1">
                      {stats.form.home.split('').map((r: string, i: number) => (
                        <FormBadge key={i} result={r} />
                      ))}
                      {!stats.form.home && <span className="text-slate-600 text-sm">No data</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-slate-400 text-sm">Away</span>
                    <div className="flex gap-1">
                      {stats.form.away.split('').map((r: string, i: number) => (
                        <FormBadge key={i} result={r} />
                      ))}
                      {!stats.form.away && <span className="text-slate-600 text-sm">No data</span>}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Row: Goals & Betting Markets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Goals Analysis */}
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 shadow-lg">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white mb-4">
                  <Target className="w-5 h-5 text-rose-400" />
                  Goals Analysis
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
                    <div className="text-slate-400 text-sm mb-1">Scored per match</div>
                    <div className="text-2xl font-bold text-emerald-400">{stats.goals.gf_per_game}</div>
                    <div className="text-slate-500 text-xs mt-1">Total: {stats.goals.scored}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
                    <div className="text-slate-400 text-sm mb-1">Conceded per match</div>
                    <div className="text-2xl font-bold text-red-400">{stats.goals.ga_per_game}</div>
                    <div className="text-slate-500 text-xs mt-1">Total: {stats.goals.conceded}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-lg">
                    <span className="text-slate-400 text-sm">Home Scoring (Avg)</span>
                    <span className="font-semibold text-white">{stats.home_away.home.gf_per_game}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-lg">
                    <span className="text-slate-400 text-sm">Away Scoring (Avg)</span>
                    <span className="font-semibold text-white">{stats.home_away.away.gf_per_game}</span>
                  </div>
                </div>
              </div>

              {/* Betting Markets */}
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 shadow-lg">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white mb-4">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  Market Trends
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Over 1.5 Goals</span>
                      <span className="font-bold text-white">{stats.betting.over_15}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.betting.over_15}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Over 2.5 Goals</span>
                      <span className="font-bold text-white">{stats.betting.over_25}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${stats.betting.over_25}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Both Teams to Score (BTTS)</span>
                      <span className="font-bold text-white">{stats.betting.btts_yes}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${stats.betting.btts_yes}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">Clean Sheets</span>
                      <span className="font-bold text-white">{stats.betting.clean_sheet}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${stats.betting.clean_sheet}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            Team data not found.
          </div>
        )}
      </div>
    </div>
  );
}

function FormBadge({ result }: { result: string }) {
  if (result === 'W') {
    return <span className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">W</span>;
  }
  if (result === 'D') {
    return <span className="flex items-center justify-center w-6 h-6 rounded bg-slate-500/20 text-slate-400 text-xs font-bold border border-slate-500/30">D</span>;
  }
  if (result === 'L') {
    return <span className="flex items-center justify-center w-6 h-6 rounded bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">L</span>;
  }
  return null;
}
