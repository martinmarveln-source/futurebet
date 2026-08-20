// @ts-nocheck
"use client";

import React from "react";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface XGIntelligencePanelProps {
  stats: Record<string, any> | null;
  general: { scored?: number; conceded?: number; gp?: number } | null;
}

function parse(v: any): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(String(v).replace(/%/, ""));
  return isNaN(n) ? 0 : n;
}

function XGBar({
  label,
  value,
  maxVal,
  color,
  subLabel,
}: {
  label: string;
  value: number;
  maxVal: number;
  color: string;
  subLabel?: string;
}) {
  const pct = maxVal > 0 ? Math.min(100, (value / maxVal) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          {subLabel && <span className="text-[10px] text-slate-500">{subLabel}</span>}
          <span className={`text-sm font-black tabular-nums ${color}`}>{value.toFixed(2)}</span>
        </div>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color.replace("text-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EfficiencyBadge({ label, ratio }: { label: string; ratio: number }) {
  const isOver = ratio >= 1.0;
  const color = isOver ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : ratio >= 0.85 ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
    : "text-red-400 bg-red-500/10 border-red-500/30";
  const Icon = isOver ? TrendingUp : ratio >= 0.85 ? Minus : TrendingDown;
  const adjective = isOver ? "Clinical" : ratio >= 0.85 ? "Average" : "Wasteful";
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${color}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <div>
        <div className="text-[10px] uppercase tracking-wider font-bold">{label}</div>
        <div className="text-xs font-black">{adjective} ({ratio.toFixed(2)}x)</div>
      </div>
    </div>
  );
}

export default function XGIntelligencePanel({ stats, general }: XGIntelligencePanelProps) {
  if (!stats) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No xG data available for this team.
      </div>
    );
  }

  const xgAll   = parse(stats.XG_ALL);
  const xgHome  = parse(stats.XG_HOME);
  const xgAway  = parse(stats.XG_AWAY);
  const xgaAll  = parse(stats.XGA_ALL);
  const xgaHome = parse(stats.XGA_HOME);
  const xgaAway = parse(stats.XGA_AWAY);

  const scored    = general?.scored ?? 0;
  const conceded  = general?.conceded ?? 0;
  const gp        = general?.gp ?? 1;

  // Efficiency: actual / expected (>1 = outperforming)
  const attackEff  = xgAll > 0   ? (scored   / gp) / xgAll  : 0;
  const defenceEff = xgaAll > 0  ? (conceded / gp) / xgaAll : 0; // lower = better
  const defenceRating = xgaAll > 0 ? xgaAll / (conceded / gp || xgaAll) : 1; // higher = better

  const xgd = xgAll - xgaAll;
  const xgdColor  = xgd >= 0.5 ? "text-emerald-400" : xgd >= 0 ? "text-amber-400" : "text-red-400";
  const xgdLabel  = xgd >= 0.5 ? "Dominant" : xgd >= 0 ? "Balanced" : "Vulnerable";
  const maxXg = Math.max(xgAll, xgaAll, xgHome, xgAway, xgaHome, xgaAway, 2.5);

  // Derived: home/away xG dominance
  const homeXgd = xgHome - xgaHome;
  const awayXgd = xgAway - xgaAway;

  return (
    <div className="space-y-6">
      {/* xGD Summary Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Goal Difference (xGD)</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            xgd >= 0.5  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
            xgd >= 0    ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                          "bg-red-500/10 text-red-400 border-red-500/30"
          }`}>{xgdLabel}</span>
        </div>
        <div className={`text-4xl font-black tabular-nums ${xgdColor}`}>
          {xgd >= 0 ? "+" : ""}{xgd.toFixed(2)}
          <span className="text-base font-normal text-slate-500 ml-1">xGD / game</span>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-slate-500">
          <span>xG: <strong className="text-emerald-400">{xgAll.toFixed(2)}</strong></span>
          <span>xGA: <strong className="text-red-400">{xgaAll.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* Main xG vs xGA bars */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">xG Profile (per game avg)</div>
        <XGBar label="⚔️ xG Attack (Overall)"  value={xgAll}   maxVal={maxXg} color="text-emerald-400" />
        <XGBar label="🛡️ xGA Defence (Overall)" value={xgaAll}  maxVal={maxXg} color="text-red-400"     />
        <div className="border-t border-slate-800 pt-3 space-y-3">
          <XGBar label="xG Attack — Home"  value={xgHome}  maxVal={maxXg} color="text-indigo-400" subLabel={`xGD ${homeXgd >= 0 ? "+" : ""}${homeXgd.toFixed(2)}`} />
          <XGBar label="xGA Defence — Home" value={xgaHome} maxVal={maxXg} color="text-orange-400" />
          <XGBar label="xG Attack — Away"  value={xgAway}  maxVal={maxXg} color="text-purple-400" subLabel={`xGD ${awayXgd >= 0 ? "+" : ""}${awayXgd.toFixed(2)}`} />
          <XGBar label="xGA Defence — Away" value={xgaAway} maxVal={maxXg} color="text-rose-400"   />
        </div>
      </div>

      {/* Efficiency badges */}
      {(attackEff > 0 || defenceRating > 0) && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Efficiency vs Expected</div>
          <div className="grid grid-cols-2 gap-3">
            <EfficiencyBadge label="Attack Efficiency" ratio={attackEff} />
            <EfficiencyBadge label="Defence Rating" ratio={defenceRating} />
          </div>
          <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
            Attack Efficiency = Goals Scored per game ÷ xG. &gt;1.0 = clinical finisher, &lt;1.0 = wasteful.
            Defence Rating = xGA ÷ Goals Conceded per game. &gt;1.0 = keeping above xGA expectation.
          </p>
        </div>
      )}

      {/* Home vs Away xGD comparison */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Home vs Away xG Dominance</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Home xGD", val: homeXgd, color: "text-indigo-400" },
            { label: "Away xGD", val: awayXgd, color: "text-purple-400" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
              <div className={`text-2xl font-black tabular-nums ${val >= 0.5 ? "text-emerald-400" : val >= 0 ? "text-amber-400" : "text-red-400"}`}>
                {val >= 0 ? "+" : ""}{val.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
