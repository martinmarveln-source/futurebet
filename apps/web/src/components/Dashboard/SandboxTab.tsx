"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Lock,
  TestTubes,
  TrendingUp,
  Database,
  Settings2,
  Activity,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  LineChart as LineChartIcon,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import UpgradeButton from "./UpgradeButton";

function cn(...c: any[]) {
  return c.filter(Boolean).join(" ");
}

const MARKET_OPTIONS = [
  { value: "ALL", label: "All Markets" },
  { value: "HOME", label: "Home Wins (1X2)" },
  { value: "DRAW", label: "Draws (1X2)" },
  { value: "AWAY", label: "Away Wins (1X2)" },
  { value: "GG", label: "BTTS (Yes)" },
  { value: "NG", label: "BTTS (No)" },
  { value: "OV", label: "Over 2.5" },
  { value: "UN", label: "Under 2.5" },
];

const MIN_ODDS = 1.01;
const MAX_ODDS = 100;

export function useMlArchive() {
  return useQuery({
    queryKey: ["ml-archive-data"],
    queryFn: async () => {
      const response = await fetch("/api/ml-archive");

      if (response.status === 403) {
        const err: any = new Error("PREMIUM_REQUIRED");
        err.code = "PREMIUM_REQUIRED";
        throw err;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch archive data");
      }

      const data = await response.json();
      if (data && data.code === "PREMIUM_REQUIRED") {
        const err: any = new Error(data.error || "PREMIUM_REQUIRED");
        err.code = "PREMIUM_REQUIRED";
        throw err;
      }

      return data;
    },
    staleTime: 0,
    gcTime: 0,
    retry: (failureCount, error: any) =>
      error?.code === "PREMIUM_REQUIRED" ? false : failureCount < 2,
  });
}

function clampOdds(value: number) {
  if (Number.isNaN(value)) return MIN_ODDS;
  return Math.min(Math.max(value, MIN_ODDS), MAX_ODDS);
}

export function BacktestingSandbox({ darkMode }: { darkMode?: boolean }) {
  const {
    data: archiveData = [],
    isLoading: dataLoading,
    isError,
    error,
  } = useMlArchive();

  const [minChance, setMinChance] = useState(65);
  const [minRating, setMinRating] = useState(55);
  const [marketFilter, setMarketFilter] = useState("ALL");
  const [assumedOdds, setAssumedOdds] = useState(1.85);

  const results = useMemo(() => {
    if (!archiveData.length)
      return { total: 0, wins: 0, losses: 0, winRate: 0, roi: 0, netUnits: 0, chartData: [], maxDrawdown: 0, maxWinStreak: 0, maxLossStreak: 0 };

    let total = 0;
    let wins = 0;
    let losses = 0;
    
    let currentStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    
    let cumulativeUnits = 0;
    let peakUnits = 0;
    let maxDrawdown = 0;
    
    const chartData: any[] = [];
    const sortedData = [...archiveData].reverse();

    sortedData.forEach((row: any) => {
      const chance = Number(row.chance || 0);
      const rating = Number(row.rating || 0);
      const market = String(row.market || "").toUpperCase();
      const result = String(row.result || "").toUpperCase().trim();

      // Normalize to 100-scale
      const normalizedChance = chance <= 1 && chance > 0 ? chance * 100 : chance;
      const normalizedRating = rating <= 1 && rating > 0 ? rating * 100 : rating;

      if (normalizedChance < minChance) return;
      if (normalizedRating < minRating) return;
      if (marketFilter !== "ALL" && market !== marketFilter) return;

      const safeOdds = clampOdds(assumedOdds);
      let pnl = 0;

      if (result === "W") {
        wins++;
        pnl = safeOdds - 1;
        currentStreak++;
        currentLossStreak = 0;
        if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
      }
      else if (result === "L") {
        losses++;
        pnl = -1;
        currentLossStreak++;
        currentStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }
      
      if (result === "W" || result === "L") {
        total++;
        cumulativeUnits += pnl;
        if (cumulativeUnits > peakUnits) peakUnits = cumulativeUnits;
        
        const drawdown = peakUnits - cumulativeUnits;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;

        chartData.push({
          bet: total,
          profit: Number(cumulativeUnits.toFixed(2))
        });
      }
    });

    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const roi = total > 0 ? (cumulativeUnits / total) * 100 : 0;

    return { total, wins, losses, winRate, roi, netUnits: cumulativeUnits, chartData, maxDrawdown, maxWinStreak, maxLossStreak };
  }, [archiveData, minChance, minRating, marketFilter, assumedOdds]);

  const oddsInvalid = Number(assumedOdds) < MIN_ODDS || Number.isNaN(assumedOdds);

  return (
    <div
      className={cn(
        "rounded-[32px] border shadow-2xl overflow-hidden relative z-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4",
        darkMode
          ? "bg-[#030712]/80 border-white/10 backdrop-blur-3xl shadow-black/50"
          : "bg-white/90 border-gray-200 backdrop-blur-2xl shadow-gray-200/50"
      )}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500 opacity-80" />

      {/* Header */}
      <div
        className={cn(
          "px-6 py-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          darkMode
            ? "border-white/10 bg-white/[0.02]"
            : "border-gray-200 bg-gray-50/50"
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner",
              darkMode
                ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                : "bg-blue-50 border-blue-200 text-blue-600"
            )}
          >
            <TestTubes size={24} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tighter">
              Algorithmic Sandbox
            </h2>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Pro Quantitative Engine
            </div>
          </div>
        </div>
        <div
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black border flex items-center justify-center gap-2",
            darkMode
              ? "bg-black/40 border-white/10 text-gray-300"
              : "bg-white border-gray-200 text-gray-600"
          )}
        >
          <Database
            size={14}
            className={darkMode ? "text-emerald-400" : "text-emerald-500"}
          />
          {dataLoading
            ? "Syncing vault…"
            : isError
            ? "Connection error"
            : `${archiveData.length} matches indexed`}
        </div>
      </div>

      {isError && (
        <div
          className={cn(
            "mx-6 mt-6 px-4 py-3 rounded-xl border flex items-center gap-3 text-sm font-bold",
            darkMode
              ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
              : "bg-rose-50 border-rose-200 text-rose-700"
          )}
        >
          <AlertTriangle size={18} className="shrink-0" />
          <span>
            {(error as any)?.code === "PREMIUM_REQUIRED"
              ? "Your session no longer has premium access. Refresh or re-subscribe to continue."
              : "Couldn't load the archive right now. Try again shortly."}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-white/10">
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-5 p-6 sm:p-8 space-y-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-50 mb-4">
            <Settings2 size={16} /> Hyperparameters
          </div>

          <div className="space-y-3">
            <label htmlFor="min-chance" className="text-xs font-bold flex justify-between items-end">
              <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Minimum Chance
              </span>
              <span className="text-lg font-black text-emerald-500">
                {minChance}%
              </span>
            </label>
            <div
              className={cn(
                "p-4 rounded-2xl border",
                darkMode
                  ? "bg-black/40 border-white/5"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <input
                id="min-chance"
                type="range"
                min="0"
                max="100"
                value={minChance}
                onChange={(e) => setMinChance(Number(e.target.value))}
                aria-valuetext={`${minChance} percent`}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-800 accent-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="min-rating" className="text-xs font-bold flex justify-between items-end">
              <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Minimum Rating
              </span>
              <span className="text-lg font-black text-blue-500">
                {minRating}
              </span>
            </label>
            <div
              className={cn(
                "p-4 rounded-2xl border",
                darkMode
                  ? "bg-black/40 border-white/5"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <input
                id="min-rating"
                type="range"
                min="0"
                max="100"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                aria-valuetext={String(minRating)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-800 accent-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="market-filter"
              className={cn(
                "text-[10px] font-black uppercase tracking-widest block",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}
            >
              Target Market Focus
            </label>
            <div className="relative">
              <select
                id="market-filter"
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className={cn(
                  "w-full p-4 rounded-2xl text-sm font-black uppercase tracking-widest border outline-none appearance-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50",
                  darkMode
                    ? "bg-black/60 border-white/10 text-white"
                    : "bg-gray-50 border-gray-200 text-gray-900"
                )}
              >
                {MARKET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                ▼
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-white/10">
            <label
              htmlFor="assumed-odds"
              className={cn(
                "text-[10px] font-black uppercase tracking-widest block",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}
            >
              Assumed Average Odds (For ROI)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black">
                @
              </span>
              <input
                id="assumed-odds"
                type="number"
                step="0.01"
                min={MIN_ODDS}
                max={MAX_ODDS}
                value={assumedOdds}
                onChange={(e) => setAssumedOdds(Number(e.target.value))}
                onBlur={() => setAssumedOdds((v) => clampOdds(Number(v)))}
                aria-invalid={oddsInvalid}
                className={cn(
                  "w-full pl-8 p-4 rounded-2xl text-lg font-black border outline-none tabular-nums transition-all focus:ring-2",
                  oddsInvalid
                    ? "border-rose-500/60 focus:ring-rose-500/50"
                    : "focus:ring-amber-500/50",
                  darkMode
                    ? "bg-black/60 border-white/10 text-amber-400"
                    : "bg-gray-50 border-gray-200 text-amber-600"
                )}
              />
            </div>
            {oddsInvalid && (
              <p className="text-xs font-bold text-rose-500">
                Odds must be at least {MIN_ODDS}.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Results */}
        <div className="lg:col-span-7 p-6 sm:p-8 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(currentColor 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000",
              results.roi > 0
                ? "bg-emerald-500"
                : results.roi < 0
                ? "bg-rose-500"
                : "bg-blue-500"
            )}
          />

          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-6 relative z-10">
            <Activity size={16} /> Strategy Simulation
          </div>

          {dataLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 relative z-10">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "p-6 rounded-[24px] border animate-pulse h-40",
                    darkMode
                      ? "bg-gray-900/60 border-white/10"
                      : "bg-white/70 border-gray-200"
                  )}
                >
                  <div className="h-3 w-24 rounded bg-current opacity-10 mb-4" />
                  <div className="h-10 w-32 rounded bg-current opacity-10 mb-4" />
                  <div className="h-2 w-full rounded bg-current opacity-10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 mb-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Win Rate Card */}
                <div
                  className={cn(
                    "p-6 rounded-[24px] border shadow-xl relative overflow-hidden",
                    darkMode
                      ? "bg-gray-900/80 border-white/10 backdrop-blur-md"
                      : "bg-white/90 border-gray-200 backdrop-blur-md"
                  )}
                >
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                    Historical Hit Rate
                  </div>
                  <div className="flex items-end gap-3 mb-4">
                    <span
                      className={cn(
                        "text-5xl font-black tabular-nums tracking-tighter",
                        results.winRate >= 55
                          ? "text-emerald-500"
                          : "text-amber-500"
                      )}
                    >
                      {results.total > 0 ? results.winRate.toFixed(1) : "—"}
                      {results.total > 0 && "%"}
                    </span>
                  </div>
                  <div className="text-xs font-bold opacity-70 mb-3 bg-black/5 dark:bg-white/5 inline-block px-3 py-1 rounded-lg">
                    {results.wins} won / {results.losses} lost
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000 ease-out",
                        results.winRate >= 55
                          ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                          : "bg-gradient-to-r from-amber-400 to-amber-600"
                      )}
                      style={{ width: `${results.winRate}%` }}
                    />
                  </div>
                </div>

                {/* ROI Card */}
                <div
                  className={cn(
                    "p-6 rounded-[24px] border shadow-xl relative overflow-hidden",
                    darkMode
                      ? "bg-gray-900/80 border-white/10 backdrop-blur-md"
                      : "bg-white/90 border-gray-200 backdrop-blur-md"
                  )}
                >
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                    Estimated Yield (ROI)
                  </div>
                  <div className="flex items-end gap-3 mb-4">
                    <span
                      className={cn(
                        "text-5xl font-black tabular-nums tracking-tighter",
                        results.total === 0
                          ? "text-gray-400"
                          : results.roi > 0
                          ? "text-blue-500"
                          : results.roi < 0
                          ? "text-rose-500"
                          : "text-gray-500"
                      )}
                    >
                      {results.total === 0
                        ? "—"
                        : `${results.roi > 0 ? "+" : ""}${results.roi.toFixed(1)}%`}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-xs font-bold inline-block px-3 py-1 rounded-lg",
                      results.netUnits > 0
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : results.netUnits < 0
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "bg-gray-500/10 text-gray-500"
                    )}
                  >
                    Net profit: {results.netUnits > 0 ? "+" : ""}
                    {results.netUnits.toFixed(2)} units
                  </div>
                </div>
              </div>

              {/* Advanced Metrics */}
              {results.total > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className={cn("p-4 rounded-[20px] border", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Max Drawdown</div>
                    <div className="text-lg font-black text-rose-500">-{results.maxDrawdown.toFixed(2)}u</div>
                  </div>
                  <div className={cn("p-4 rounded-[20px] border", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Best Streak</div>
                    <div className="text-lg font-black text-emerald-500">{results.maxWinStreak} W</div>
                  </div>
                  <div className={cn("p-4 rounded-[20px] border", darkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-200")}>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Worst Streak</div>
                    <div className="text-lg font-black text-amber-500">{results.maxLossStreak} L</div>
                  </div>
                </div>
              )}

              {/* Equity Curve Chart */}
              {results.chartData && results.chartData.length > 1 && (
                <div className={cn("p-6 rounded-[24px] border shadow-xl", darkMode ? "bg-gray-900/80 border-white/10" : "bg-white/90 border-gray-200")}>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 mb-6">
                    <LineChartIcon size={14} /> Cumulative Profit (Units)
                  </div>
                  <div className="w-full" style={{ minHeight: "250px", height: "250px" }}>
                    <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                      <LineChart data={results.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"} vertical={false} />
                        <XAxis dataKey="bet" tick={{ fontSize: 10, fill: darkMode ? '#888' : '#aaa' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: darkMode ? '#888' : '#aaa' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                            backgroundColor: darkMode ? '#111' : '#fff',
                            color: darkMode ? '#fff' : '#000',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                          itemStyle={{ color: '#3b82f6' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          stroke={results.netUnits >= 0 ? "#10b981" : "#f43f5e"} 
                          strokeWidth={3} 
                          dot={false}
                          activeDot={{ r: 6, fill: results.netUnits >= 0 ? "#10b981" : "#f43f5e", strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            className={cn(
              "p-6 rounded-[24px] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 shadow-lg",
              darkMode
                ? "bg-black/60 border-white/10 backdrop-blur-md"
                : "bg-gray-50 border-gray-200 backdrop-blur-md"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center border",
                  results.total > 50
                    ? darkMode
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                      : "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : darkMode
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                    : "bg-amber-50 border-amber-200 text-amber-600"
                )}
              >
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="text-sm font-black">Qualified Sample Size</div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-0.5">
                  {results.total > 0 && results.total <= 30
                    ? "Small sample — treat results as directional"
                    : "Matches meeting exact criteria"}
                </div>
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter">
              {dataLoading ? "…" : results.total}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SandboxTab({ darkMode, isAdmin, isPremium }: { darkMode?: boolean, isAdmin?: boolean, isPremium?: boolean }) {
  const hasAccess = isAdmin || isPremium;

  if (!hasAccess) {
    return (
      <div className="relative flex flex-col items-center justify-center py-32 px-4 gap-6 text-center w-full min-h-[600px] overflow-hidden rounded-[32px] border dark:border-white/5 border-gray-200">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div
          className={cn(
            "relative z-10 h-24 w-24 rounded-[2rem] flex items-center justify-center border shadow-2xl animate-in zoom-in duration-500",
            darkMode
              ? "border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
              : "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 shadow-xl"
          )}
        >
          <Lock size={40} className="drop-shadow-md" />
          <Sparkles
            className="absolute -top-2 -right-2 text-amber-400 animate-pulse"
            size={20}
          />
        </div>

        <div className="relative z-10 max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <h3
            className={cn(
              "text-2xl sm:text-3xl font-black uppercase tracking-tight",
              darkMode ? "text-white" : "text-gray-900"
            )}
          >
            Executive Access Required
          </h3>
          <p
            className={cn(
              "text-sm font-medium leading-relaxed",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}
          >
            The{" "}
            <span className="font-bold text-blue-500">
              Quantitative Sandbox
            </span>{" "}
            is a high-level backtesting engine available exclusively to
            Premium members. Simulate strategies and find mathematically
            proven edges.
          </p>
        </div>

        <UpgradeButton
          className="relative z-10 group mt-4 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200"
        >
          <Sparkles size={16} className="opacity-80 group-hover:animate-spin" />
          Upgrade to Premium
          <ChevronRight
            size={16}
            className="opacity-80 group-hover:translate-x-1 transition-transform"
          />
        </UpgradeButton>
      </div>
    );
  }

  return (
    <div className="w-full relative z-10">
      <BacktestingSandbox darkMode={darkMode} />
    </div>
  );
}