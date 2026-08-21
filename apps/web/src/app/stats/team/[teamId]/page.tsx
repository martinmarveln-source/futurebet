// @ts-nocheck
"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Shield, ChevronLeft, BarChart3, TrendingUp, Target,
  Activity, Trophy, Brain, Flame, ChevronRight,
} from "lucide-react";
import NextMatchBanner from "@/components/Stats/NextMatchBanner";
import MarketSplitGrid from "@/components/Stats/MarketSplitGrid";
import PPGSplitCard from "@/components/Stats/PPGSplitCard";
import GoalsSplitCard from "@/components/Stats/GoalsSplitCard";
import WinRateCard from "@/components/Stats/WinRateCard";
import TeamStatCard from "@/components/Stats/TeamStatCard";
import BettingVerdictCard from "@/components/Stats/BettingVerdictCard";
import GoalThreatCard from "@/components/Stats/GoalThreatCard";
import XGIntelligencePanel from "@/components/Stats/XGIntelligencePanel";
import DerivedStatsCard from "@/components/Stats/DerivedStatsCard";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "goals", label: "Goals", icon: Target },
  { id: "markets", label: "Markets", icon: BarChart3 },
  { id: "winloss", label: "Win / Loss", icon: Trophy },
  { id: "advanced", label: "Advanced", icon: Brain },
] as const;

type TabId = typeof TABS[number]["id"];

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function FormBadge({ result }: { result: string }) {
  const styles: Record<string, string> = {
    W: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    D: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    L: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={cn("flex items-center justify-center w-7 h-7 rounded-md border text-xs font-black", styles[result] || styles.D)}>
      {result}
    </span>
  );
}

function StatPill({ label, value, color = "slate" }: { label: string; value: any; color?: string }) {
  const colors: Record<string, string> = {
    green: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    slate: "text-slate-200",
    white: "text-white",
  };
  return (
    <div className="flex flex-col items-center">
      <span className={cn("text-xl font-black tabular-nums", colors[color] ?? colors.slate)}>{value}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

function PPGPill({ ppg }: { ppg: number }) {
  const color = ppg >= 2 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : ppg >= 1.5 ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";
  return (
    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", color)}>
      {ppg.toFixed(2)} PPG
    </span>
  );
}

function parse(v: any): number {
  const n = parseFloat(String(v || 0).replace(/%/, ""));
  return isNaN(n) ? 0 : n;
}

function AdvancedStatRow({ label, all, home, away }: { label: string; all?: any; home?: any; away?: any }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex gap-4 text-sm font-semibold">
        <span className="text-slate-300 w-12 text-right">{all ?? "—"}</span>
        <span className="text-indigo-400 w-12 text-right">{home ?? "—"}</span>
        <span className="text-purple-400 w-12 text-right">{away ?? "—"}</span>
      </div>
    </div>
  );
}

function TeamPageInner({ params }: { params: Promise<{ teamId: string }> }) {
  const [teamId, setTeamId] = useState<string>("");
  const searchParams = useSearchParams();
  const league = searchParams.get("league") || "";
  const country = searchParams.get("country") || "";

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [nextMatchLoading, setNextMatchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    params.then((p) => setTeamId(decodeURIComponent(p.teamId)));
  }, [params]);

  useEffect(() => {
    if (!teamId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats/team/${encodeURIComponent(teamId)}?league=${encodeURIComponent(league)}`);
        const json = await res.json();
        if (json.success) setStats(json);
      } catch (err) {
        console.error("Failed to fetch team data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId, league]);

  useEffect(() => {
    if (!teamId || !league) return;
    const fetchNextMatch = async () => {
      setNextMatchLoading(true);
      try {
        const res = await fetch(
          `/api/stats/next-match?team=${encodeURIComponent(teamId)}&league=${encodeURIComponent(league)}`
        );
        const json = await res.json();
        if (json.success) setNextMatch(json.data);
      } catch (_) {}
      finally { setNextMatchLoading(false); }
    };
    fetchNextMatch();
  }, [teamId, league]);

  const ms = stats?.market_stats ?? null;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        {/* Back navigation */}
        <Link
          href={`/stats/league/${encodeURIComponent(league)}?country=${encodeURIComponent(country)}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {league || "Back to League"}
        </Link>

        {/* ── Hero Header ── */}
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5 sm:p-6 mb-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 uppercase tracking-widest">
                <span>{country}</span>
                {country && league && <span>•</span>}
                <span className="text-blue-400">{league}</span>
                <span>•</span>
                <span>2026/27</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 text-white leading-tight">
                <Shield className="w-9 h-9 text-indigo-500 shrink-0" />
                {teamId}
              </h1>
            </div>

            {/* Quick stat pills */}
            {stats && !loading && (
              <div className="flex flex-col gap-2 items-end">
                <PPGPill ppg={stats.general?.ppg ?? 0} />
                <div className="flex items-center gap-4 bg-slate-900/60 rounded-xl px-4 py-2.5 border border-slate-800">
                  <StatPill label="W" value={stats.general?.wins ?? 0} color="green" />
                  <div className="w-px h-8 bg-slate-800" />
                  <StatPill label="D" value={stats.general?.draws ?? 0} color="amber" />
                  <div className="w-px h-8 bg-slate-800" />
                  <StatPill label="L" value={stats.general?.losses ?? 0} color="red" />
                  <div className="w-px h-8 bg-slate-800" />
                  <StatPill label="Pts" value={stats.general?.points ?? 0} color="white" />
                  <div className="w-px h-8 bg-slate-800" />
                  <StatPill label="GP" value={stats.general?.gp ?? 0} color="slate" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Next Match Banner ── */}
        <NextMatchBanner data={nextMatch} loading={nextMatchLoading} team={teamId} />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* ── Tab Navigation ── */}
            <div className="flex overflow-x-auto gap-1 mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-1 justify-center",
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── Tab Content ── */}

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Season Summary */}
                <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Season Overview
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { label: "Games", value: stats.general?.gp ?? 0 },
                      { label: "Wins", value: stats.general?.wins ?? 0, color: "green" },
                      { label: "Draws", value: stats.general?.draws ?? 0, color: "amber" },
                      { label: "Losses", value: stats.general?.losses ?? 0, color: "red" },
                      { label: "Points", value: stats.general?.points ?? 0, color: "white" },
                      { label: "PPG", value: (stats.general?.ppg ?? 0).toFixed(2), color: "blue" },
                    ].map((s) => (
                      <div key={s.label} className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800/50">
                        <StatPill label={s.label} value={s.value} color={s.color ?? "slate"} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Guide */}
                <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    Season Form
                  </h2>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Overall",
                        // Prefer full-season form from sheet, fall back to computed last-5
                        form: ms?.Overall_Form || stats.form?.overall,
                        gp: stats.general?.gp,
                      },
                      {
                        label: "Home",
                        form: ms?.Home_Form || stats.form?.home,
                        gp: parseInt(String(ms?.GP_HOME ?? "0"), 10) || null,
                      },
                      {
                        label: "Away",
                        form: ms?.Away_Form || stats.form?.away,
                        gp: parseInt(String(ms?.GP_AWAY ?? "0"), 10) || null,
                      },
                    ].map((f) => (
                      <div key={f.label} className="bg-slate-900/40 px-4 py-3 rounded-xl border border-slate-800/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-400 w-16">{f.label}</span>
                          {f.gp != null && f.gp > 0 && (
                            <span className="text-[10px] text-slate-600">{f.gp} games</span>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {f.form
                            ? String(f.form).split("").map((r: string, i: number) => (
                                <FormBadge key={i} result={r} />
                              ))
                            : <span className="text-slate-600 text-sm">No data</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PPG Split */}
                <PPGSplitCard
                  ppgAll={stats.general?.ppg}
                  ppgHome={ms?.PPG_Home}
                  ppgAway={ms?.PPG_Away}
                />

                {/* Betting Verdict */}
                <BettingVerdictCard stats={ms} general={stats.general} />
              </div>
            )}

            {/* GOALS */}
            {activeTab === "goals" && (
              <div className="space-y-4">
                <GoalsSplitCard stats={ms} general={stats.general} />
                <GoalThreatCard stats={ms} />
              </div>
            )}

            {/* MARKETS */}
            {activeTab === "markets" && (
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5">
                <MarketSplitGrid stats={ms} />
              </div>
            )}

            {/* WIN / LOSS */}
            {activeTab === "winloss" && (
              <div className="space-y-4">
                <WinRateCard stats={ms} />
                {ms && (
                  <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      Games Played — Home vs Away
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <TeamStatCard
                        label="Home Games"
                        all={ms.GP_HOME}
                        home={ms.GP_HOME}
                        away={ms.GP_AWAY}
                        activeSplit="home"
                        color="indigo"
                        isPercent={false}
                      />
                      <TeamStatCard
                        label="Away Games"
                        all={ms.GP_AWAY}
                        home={ms.GP_HOME}
                        away={ms.GP_AWAY}
                        activeSplit="away"
                        color="purple"
                        isPercent={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ADVANCED */}
            {activeTab === "advanced" && (
              <div className="space-y-4">
                <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-5">
                    <Brain className="w-4 h-4 text-violet-400" />
                    xG Intelligence
                  </h2>
                  <XGIntelligencePanel stats={ms} general={stats.general} />
                </div>
                <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5">
                  <DerivedStatsCard stats={ms} general={stats.general} />
                </div>
              </div>
            )}

          </>
        ) : (
          <div className="text-center py-16 text-slate-500">Team data not found.</div>
        )}
      </div>
    </div>
  );
}

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712] flex items-center justify-center"><div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <TeamPageInner params={params} />
    </Suspense>
  );
}
