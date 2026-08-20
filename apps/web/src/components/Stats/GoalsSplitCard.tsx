// @ts-nocheck
"use client";

import React from "react";
import { Target } from "lucide-react";

interface GoalsSplitCardProps {
  stats: Record<string, any> | null;
  general: { scored?: number; conceded?: number; gp?: number } | null;
}

function parse(v: any): number {
  const n = parseFloat(String(v || 0).replace(/%/, ""));
  return isNaN(n) ? 0 : n;
}

function CompareBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  const awayPct = (away / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="flex gap-3">
          <span className="text-indigo-400 font-semibold">H: {home.toFixed(2)}</span>
          <span className="text-purple-400 font-semibold">A: {away.toFixed(2)}</span>
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div className="bg-indigo-500 rounded-l-full transition-all duration-500" style={{ width: `${homePct}%` }} />
        <div className="bg-purple-500 rounded-r-full transition-all duration-500" style={{ width: `${awayPct}%` }} />
      </div>
    </div>
  );
}

export default function GoalsSplitCard({ stats, general }: GoalsSplitCardProps) {
  const scored = general?.scored ?? 0;
  const conceded = general?.conceded ?? 0;
  const gp = general?.gp ?? 1;

  const hgsAvg = parse(stats?.XG_HOME);  // Using XG as proxy for home scoring tendency
  const agsAvg = parse(stats?.XG_AWAY);
  const hgcAvg = parse(stats?.XGA_HOME);
  const agcAvg = parse(stats?.XGA_AWAY);

  const gfPerGame = gp > 0 ? (scored / gp).toFixed(2) : "0.00";
  const gaPerGame = gp > 0 ? (conceded / gp).toFixed(2) : "0.00";

  const hgsO15 = parse(stats?.HGS_Over_15);
  const hgcO15 = parse(stats?.HGC_Over_15);
  const agsO15 = parse(stats?.AGS_Over_15);
  const agcO15 = parse(stats?.AGC_Over_15);

  return (
    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 space-y-5">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <Target className="w-4 h-4 text-rose-400" />
        Goals Analysis
      </h3>

      {/* Top row totals */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Scored", value: scored, color: "text-emerald-400" },
          { label: "GF/Game", value: gfPerGame, color: "text-emerald-300" },
          { label: "Conceded", value: conceded, color: "text-red-400" },
          { label: "GA/Game", value: gaPerGame, color: "text-red-300" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 rounded-lg p-2.5 border border-slate-800/50">
            <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
            <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* xG / xGA compare bars */}
      {stats && (
        <div className="space-y-3">
          <CompareBar label="xG (Expected Goals)" home={parse(stats.XG_HOME)} away={parse(stats.XG_AWAY)} />
          <CompareBar label="xGA (Expected Goals Against)" home={parse(stats.XGA_HOME)} away={parse(stats.XGA_AWAY)} />
        </div>
      )}

      {/* Over 1.5 goal splits */}
      {stats && (hgsO15 || hgcO15 || agsO15 || agcO15) ? (
        <div className="border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
            Over 1.5 Goals — Per Half
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            {[
              { label: "HGS Over 1.5", value: hgsO15, color: "text-indigo-400" },
              { label: "HGC Over 1.5", value: hgcO15, color: "text-rose-400" },
              { label: "AGS Over 1.5", value: agsO15, color: "text-purple-400" },
              { label: "AGC Over 1.5", value: agcO15, color: "text-orange-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 rounded-lg p-2 border border-slate-800/50">
                <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
                <div className={`text-base font-black ${s.color}`}>{Math.round(s.value)}%</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
