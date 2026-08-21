// @ts-nocheck
"use client";

import React from "react";
import { Target } from "lucide-react";

interface GoalsSplitCardProps {
  stats: Record<string, any> | null;
  general: { scored?: number; conceded?: number; gp?: number } | null;
}

function parsePct(v: any): number {
  if (v === null || v === undefined || String(v).trim() === "") return 0;
  const n = parseFloat(String(v).replace(/%/g, "").trim());
  if (!isFinite(n)) return 0;
  return n > 0 && n <= 1.0 ? n * 100 : n;
}

function parseRaw(v: any): number {
  const n = parseFloat(String(v ?? "0"));
  return isFinite(n) ? n : 0;
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

/** Shows GP(n) / Pct% format: e.g. "7 (70%)" */
function GpPctCell({
  label,
  pct,
  gp,
  color,
}: {
  label: string;
  pct: number;
  gp?: number;
  color: string;
}) {
  const count = gp ? Math.round((pct / 100) * gp) : null;
  return (
    <div className="bg-slate-900 rounded-lg p-2 border border-slate-800/50 text-center flex flex-col justify-center">
      <div className="text-[10px] text-slate-500 mb-1">{label}</div>
      <div className={`text-sm font-black ${color}`}>
        {count !== null && gp ? `${count}/${gp} (${Math.round(pct)}%)` : `${Math.round(pct)}%`}
      </div>
    </div>
  );
}

export default function GoalsSplitCard({ stats, general }: GoalsSplitCardProps) {
  const scored   = general?.scored ?? 0;
  const conceded = general?.conceded ?? 0;
  const gp       = general?.gp ?? 1;

  const gfPerGame = gp > 0 ? (scored   / gp).toFixed(2) : "0.00";
  const gaPerGame = gp > 0 ? (conceded / gp).toFixed(2) : "0.00";

  const gpHome = parseInt(String(stats?.GP_HOME ?? "0"), 10) || undefined;
  const gpAway = parseInt(String(stats?.GP_AWAY ?? "0"), 10) || undefined;

  const hgsO15 = parsePct(stats?.HGS_Over_15 ?? stats?.["HGS_Over_1.5"]);
  const hgcO15 = parsePct(stats?.HGC_Over_15 ?? stats?.["HGC_Over_1.5"]);
  const agsO15 = parsePct(stats?.AGS_Over_15 ?? stats?.["AGS_Over_1.5"]);
  const agcO15 = parsePct(stats?.AGC_Over_15 ?? stats?.["AGC_Over_1.5"]);

  const xgHome  = parseRaw(stats?.XG_HOME);
  const xgAway  = parseRaw(stats?.XG_AWAY);
  const xgaHome = parseRaw(stats?.XGA_HOME);
  const xgaAway = parseRaw(stats?.XGA_AWAY);

  return (
    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 space-y-5">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <Target className="w-4 h-4 text-rose-400" />
        Goals Analysis
      </h3>

      {/* Top row totals */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Scored",   value: scored,    color: "text-emerald-400" },
          { label: "GF/Game",  value: gfPerGame, color: "text-emerald-300" },
          { label: "Conceded", value: conceded,  color: "text-red-400"     },
          { label: "GA/Game",  value: gaPerGame, color: "text-red-300"     },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 rounded-lg p-2.5 border border-slate-800/50">
            <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
            <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* xG / xGA compare bars */}
      {stats && (xgHome > 0 || xgAway > 0) && (
        <div className="space-y-3">
          <CompareBar label="xG (Expected Goals)"         home={xgHome}  away={xgAway}  />
          <CompareBar label="xGA (Expected Goals Against)" home={xgaHome} away={xgaAway} />
        </div>
      )}

      {/* Over 1.5 goal splits — show GP(n/total) context */}
      {stats && (hgsO15 > 0 || hgcO15 > 0 || agsO15 > 0 || agcO15 > 0) && (
        <div className="border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
            Over 1.5 Goals — Per Side
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <GpPctCell label="HGS Over 1.5" pct={hgsO15} gp={gpHome} color="text-indigo-400" />
            <GpPctCell label="HGC Over 1.5" pct={hgcO15} gp={gpHome} color="text-rose-400"   />
            <GpPctCell label="AGS Over 1.5" pct={agsO15} gp={gpAway} color="text-purple-400" />
            <GpPctCell label="AGC Over 1.5" pct={agcO15} gp={gpAway} color="text-orange-400" />
          </div>
        </div>
      )}
    </div>
  );
}
