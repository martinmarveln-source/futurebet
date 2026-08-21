// @ts-nocheck
"use client";

import React, { useState } from "react";
import TeamStatCard from "./TeamStatCard";
import { BarChart3 } from "lucide-react";

interface MarketSplitGridProps {
  stats: Record<string, any> | null;
}

const MARKETS = [
  { key: "O15",  label: "Over 1.5 Goals",              allKey: "O15_ALL",  homeKey: "O15_HOME",  awayKey: "O15_AWAY",  color: "emerald" as const },
  { key: "O25",  label: "Over 2.5 Goals",              allKey: "O25_ALL",  homeKey: "O25_HOME",  awayKey: "O25_AWAY",  color: "blue"    as const },
  { key: "O35",  label: "Over 3.5 Goals",              allKey: "O35_ALL",  homeKey: "O35_HOME",  awayKey: "O35_AWAY",  color: "indigo"  as const },
  { key: "O45",  label: "Over 4.5 Goals",              allKey: "O45_ALL",  homeKey: "O45_HOME",  awayKey: "O45_AWAY",  color: "purple"  as const },
  { key: "BTTS", label: "BTTS (Both Score)",           allKey: "BTTS_ALL", homeKey: "BTTS_HOME", awayKey: "BTTS_AWAY", color: "amber"   as const },
  { key: "CS",   label: "Clean Sheet",                 allKey: "CS_ALL",   homeKey: "CS_HOME",   awayKey: "CS_AWAY",   color: "blue"    as const },
  { key: "FTS",  label: "Failed To Score",             allKey: "FTS_ALL",  homeKey: "FTS_HOME",  awayKey: "FTS_AWAY",  color: "red"     as const },
  { key: "XG",   label: "Expected Goals (xG)",         allKey: "XG_ALL",   homeKey: "XG_HOME",   awayKey: "XG_AWAY",   color: "emerald" as const, isPercent: false },
  { key: "XGA",  label: "Expected Goals Against (xGA)",allKey: "XGA_ALL",  homeKey: "XGA_HOME",  awayKey: "XGA_AWAY",  color: "red"     as const, isPercent: false },
];

type Split = "all" | "home" | "away";

export default function MarketSplitGrid({ stats }: MarketSplitGridProps) {
  const [split, setSplit] = useState<Split>("all");

  if (!stats) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No market stats available for this team.
      </div>
    );
  }

  const gpHome = parseInt(String(stats.GP_HOME ?? "0"), 10) || undefined;
  const gpAway = parseInt(String(stats.GP_AWAY ?? "0"), 10) || undefined;
  const gpAll  = gpHome && gpAway ? gpHome + gpAway : undefined;

  // Safe PPG: always 2dp, no more
  const ppgHome = parseFloat(String(stats.PPG_Home ?? "0")) || 0;
  const ppgAway = parseFloat(String(stats.PPG_Away ?? "0")) || 0;

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Betting Markets
        </h3>
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
          {(["all", "home", "away"] as Split[]).map((s) => (
            <button
              key={s}
              onClick={() => setSplit(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                split === s
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Market cards grid — pass GP context for count display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MARKETS.map((m) => {
          const isPercent = m.isPercent !== false;
          return (
            <TeamStatCard
              key={m.key}
              label={m.label}
              all={stats[m.allKey]}
              home={stats[m.homeKey]}
              away={stats[m.awayKey]}
              activeSplit={split}
              color={m.color}
              isPercent={isPercent}
              gpAll={isPercent ? gpAll : undefined}
              gpHome={isPercent ? gpHome : undefined}
              gpAway={isPercent ? gpAway : undefined}
            />
          );
        })}
      </div>

      {/* PPG split — always 2dp, clearly labelled */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-400 text-xs font-medium">PPG (Home)</span>
            <span className={`text-xl font-black tabular-nums ${ppgHome >= 2 ? "text-emerald-400" : ppgHome >= 1.5 ? "text-amber-400" : "text-red-400"}`}>
              {ppgHome.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ppgHome * 33.3)}%` }} />
          </div>
          {gpHome && <div className="text-[10px] text-slate-600">{gpHome} home games</div>}
        </div>
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-400 text-xs font-medium">PPG (Away)</span>
            <span className={`text-xl font-black tabular-nums ${ppgAway >= 2 ? "text-emerald-400" : ppgAway >= 1.5 ? "text-amber-400" : "text-red-400"}`}>
              {ppgAway.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ppgAway * 33.3)}%` }} />
          </div>
          {gpAway && <div className="text-[10px] text-slate-600">{gpAway} away games</div>}
        </div>
      </div>
    </div>
  );
}
