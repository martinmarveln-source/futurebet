// @ts-nocheck
"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

interface PPGSplitCardProps {
  ppgAll?: number | string;
  ppgHome?: number | string;
  ppgAway?: number | string;
}

function parse(v: any): number {
  const n = parseFloat(String(v || 0));
  return isNaN(n) ? 0 : n;
}

function PPGBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-10 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums w-8 text-right ${
        value >= 2 ? "text-emerald-400" : value >= 1.5 ? "text-amber-400" : "text-red-400"
      }`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export default function PPGSplitCard({ ppgAll, ppgHome, ppgAway }: PPGSplitCardProps) {
  const all = parse(ppgAll);
  const home = parse(ppgHome);
  const away = parse(ppgAway);
  const max = Math.max(all, home, away, 3);

  return (
    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-indigo-400" />
        Points Per Game (PPG) Breakdown
      </h3>
      <div className="space-y-3">
        <PPGBar label="All" value={all} max={max} color="bg-slate-400" />
        <PPGBar label="Home" value={home} max={max} color="bg-indigo-500" />
        <PPGBar label="Away" value={away} max={max} color="bg-purple-500" />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-500">
        <span>0 = no pts/game</span>
        <span className="text-slate-400">Max: <span className="text-slate-200 font-semibold">3.00</span></span>
      </div>
    </div>
  );
}
