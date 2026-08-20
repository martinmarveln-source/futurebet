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
                    Recent Form
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: "Overall", form: stats.form?.overall },
                      { label: "Home", form: stats.form?.home },
                      { label: "Away", form: stats.form?.away },
                    ].map((f) => (
                      <div key={f.label} className="flex items-center justify-between bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-800/50">
                        <span className="text-xs font-semibold text-slate-400 w-14">{f.label}</span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {f.form?.split("").slice(0, 10).map((r: string, i: number) => (
                            <FormBadge key={i} result={r} />
                          ))}
                          {!f.form && <span className="text-slate-600 text-sm">No data</span>}
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
              </div>
            )}

            {/* GOALS */}
            {activeTab === "goals" && (
              <GoalsSplitCard stats={ms} general={stats.general} />
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
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5 space-y-6">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  Advanced Analytics
                </h2>

                {ms ? (
                  <>
                    {/* Column headers */}
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 pb-1 border-b border-slate-800">
                      <span>Metric</span>
                      <div className="flex gap-4">
                        <span className="w-12 text-right text-slate-400">ALL</span>
                        <span className="w-12 text-right text-indigo-400">HOME</span>
                        <span className="w-12 text-right text-purple-400">AWAY</span>
                      </div>
                    </div>

                    <AdvancedStatRow
                      label="FTS (Failed to Score)"
                      all={ms.FTS_ALL != null ? `${Math.round(parse(ms.FTS_ALL))}%` : "—"}
                      home={ms.FTS_HOME != null ? `${Math.round(parse(ms.FTS_HOME))}%` : "—"}
                      away={ms.FTS_AWAY != null ? `${Math.round(parse(ms.FTS_AWAY))}%` : "—"}
                    />
                    <AdvancedStatRow
                      label="Clean Sheet (CS)"
                      all={ms.CS_ALL != null ? `${Math.round(parse(ms.CS_ALL))}%` : "—"}
                      home={ms.CS_HOME != null ? `${Math.round(parse(ms.CS_HOME))}%` : "—"}
                      away={ms.CS_AWAY != null ? `${Math.round(parse(ms.CS_AWAY))}%` : "—"}
                    />
                    <AdvancedStatRow
                      label="HGS Over 1.5"
                      all={ms.HGS_Over_15 != null ? `${Math.round(parse(ms.HGS_Over_15))}%` : "—"}
                      home="—"
                      away="—"
                    />
                    <AdvancedStatRow
                      label="HGC Over 1.5"
                      all={ms.HGC_Over_15 != null ? `${Math.round(parse(ms.HGC_Over_15))}%` : "—"}
                      home="—"
                      away="—"
                    />
                    <AdvancedStatRow
                      label="AGS Over 1.5"
                      all={ms.AGS_Over_15 != null ? `${Math.round(parse(ms.AGS_Over_15))}%` : "—"}
                      home="—"
                      away="—"
                    />
                    <AdvancedStatRow
                      label="AGC Over 1.5"
                      all={ms.AGC_Over_15 != null ? `${Math.round(parse(ms.AGC_Over_15))}%` : "—"}
                      home="—"
                      away="—"
                    />
                    <AdvancedStatRow
                      label="Over 3.5 Goals"
                      all={ms.O35_ALL != null ? `${Math.round(parse(ms.O35_ALL))}%` : "—"}
                      home={ms.O35_HOME != null ? `${Math.round(parse(ms.O35_HOME))}%` : "—"}
                      away={ms.O35_AWAY != null ? `${Math.round(parse(ms.O35_AWAY))}%` : "—"}
                    />
                    <AdvancedStatRow
                      label="Over 4.5 Goals"
                      all={ms.O45_ALL != null ? `${Math.round(parse(ms.O45_ALL))}%` : "—"}
                      home={ms.O45_HOME != null ? `${Math.round(parse(ms.O45_HOME))}%` : "—"}
                      away={ms.O45_AWAY != null ? `${Math.round(parse(ms.O45_AWAY))}%` : "—"}
                    />
                    <AdvancedStatRow
                      label="xG (Expected Goals)"
                      all={ms.XG_ALL ?? "—"}
                      home={ms.XG_HOME ?? "—"}
                      away={ms.XG_AWAY ?? "—"}
                    />
                    <AdvancedStatRow
                      label="xGA (Exp. Goals Against)"
                      all={ms.XGA_ALL ?? "—"}
                      home={ms.XGA_HOME ?? "—"}
                      away={ms.XGA_AWAY ?? "—"}
                    />
                  </>
                ) : (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No advanced market stats available for this team.
                  </div>
                )}
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
