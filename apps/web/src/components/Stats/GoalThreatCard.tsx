// @ts-nocheck
"use client";

import React from "react";
import { Swords, ShieldAlert } from "lucide-react";

interface GoalThreatCardProps {
  stats: Record<string, any> | null;
}

function parsePct(v: any): number {
  if (v === null || v === undefined || String(v).trim() === "") return 0;
  const n = parseFloat(String(v).replace(/%/g, "").trim());
  if (!isFinite(n)) return 0;
  return n > 0 && n <= 1.0 ? n * 100 : n;
}

function parseGP(v: any): number | undefined {
  const n = parseInt(String(v ?? "0"), 10);
  return isFinite(n) && n > 0 ? n : undefined;
}

function ThreatBar({
  label,
  value,
  type,
  gp,
}: {
  label: string;
  value: number;
  type: "attack" | "concede";
  gp?: number;
}) {
  const isAttack = type === "attack";
  // Attack: high is good (green). Concede: high is bad (red).
  let color: string;
  if (isAttack) {
    color = value >= 65 ? "bg-emerald-500" : value >= 45 ? "bg-amber-500" : "bg-red-500";
  } else {
    color = value >= 65 ? "bg-red-500" : value >= 45 ? "bg-amber-500" : "bg-emerald-500";
  }

  const textColor = isAttack
    ? value >= 65 ? "text-emerald-400" : value >= 45 ? "text-amber-400" : "text-red-400"
    : value >= 65 ? "text-red-400" : value >= 45 ? "text-amber-400" : "text-emerald-400";

  const verdict = isAttack
    ? value >= 65 ? "HIGH THREAT" : value >= 45 ? "MODERATE" : "LOW THREAT"
    : value >= 65 ? "VULNERABLE" : value >= 45 ? "AVERAGE" : "SOLID";
    
  const countStr = gp ? `${Math.round((value / 100) * gp)}/${gp} ` : "";

  return (
    <div className="space-y-1.5 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-[10px] font-black uppercase tracking-wider ${textColor}`}>{verdict}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
        <span className={`text-[11px] font-black tabular-nums w-14 text-right ${textColor}`}>
          {countStr}({Math.round(value)}%)
        </span>
      </div>
    </div>
  );
}

export default function GoalThreatCard({ stats }: GoalThreatCardProps) {
  if (!stats) return null;

  const hgsO15 = parsePct(stats.HGS_Over_15 ?? stats["HGS_Over_1.5"]);
  const hgcO15 = parsePct(stats.HGC_Over_15 ?? stats["HGC_Over_1.5"]);
  const agsO15 = parsePct(stats.AGS_Over_15 ?? stats["AGS_Over_1.5"]);
  const agcO15 = parsePct(stats.AGC_Over_15 ?? stats["AGC_Over_1.5"]);

  const gpHome = parseGP(stats.GP_HOME);
  const gpAway = parseGP(stats.GP_AWAY);

  const hasData = hgsO15 || hgcO15 || agsO15 || agcO15;
  if (!hasData) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
        <Swords className="w-4 h-4 text-rose-400" />
        Goal Threat Analysis
        <span className="text-[10px] font-normal text-slate-500 ml-1">— scored/conceded 2+ goals</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Home Attack */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            Home
          </div>
          {hgsO15 > 0 && <ThreatBar label="Scored 2+ Goals at Home" value={hgsO15} type="attack" gp={gpHome} />}
          {hgcO15 > 0 && <ThreatBar label="Conceded 2+ Goals at Home" value={hgcO15} type="concede" gp={gpHome} />}
        </div>

        {/* Away Attack */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            Away
          </div>
          {agsO15 > 0 && <ThreatBar label="Scored 2+ Goals Away" value={agsO15} type="attack" gp={gpAway} />}
          {agcO15 > 0 && <ThreatBar label="Conceded 2+ Goals Away" value={agcO15} type="concede" gp={gpAway} />}
        </div>
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed">
        Measures the percentage of games where 2 or more goals were scored/conceded by this team specifically — not total match goals.
      </p>
    </div>
  );
}
