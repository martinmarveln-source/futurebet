// @ts-nocheck
"use client";

import React from "react";
import { FlaskConical } from "lucide-react";

interface DerivedStatsCardProps {
  stats: Record<string, any> | null;
  general: { scored?: number; conceded?: number; gp?: number } | null;
}

function parse(v: any, isPercent = false): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(String(v).replace(/%/, ""));
  if (isNaN(n)) return 0;
  if (isPercent && n <= 1.0) return n * 100;
  return n;
}

function MetricRow({
  label,
  value,
  description,
  format,
  goodIfHigh = true,
}: {
  label: string;
  value: number;
  description: string;
  format: "ratio" | "percent" | "score";
  goodIfHigh?: boolean;
}) {
  let display = "";
  let color = "";

  if (format === "ratio") {
    display = value.toFixed(2) + "x";
    color = goodIfHigh
      ? value >= 1.1 ? "text-emerald-400" : value >= 0.9 ? "text-amber-400" : "text-red-400"
      : value <= 0.9 ? "text-emerald-400" : value <= 1.1 ? "text-amber-400" : "text-red-400";
  } else if (format === "percent") {
    display = Math.round(value) + "%";
    color = goodIfHigh
      ? value >= 60 ? "text-emerald-400" : value >= 40 ? "text-amber-400" : "text-red-400"
      : value <= 40 ? "text-emerald-400" : value <= 60 ? "text-amber-400" : "text-red-400";
  } else {
    display = value.toFixed(2);
    color = goodIfHigh
      ? value >= 60 ? "text-emerald-400" : value >= 30 ? "text-amber-400" : "text-red-400"
      : value <= 30 ? "text-emerald-400" : value <= 60 ? "text-amber-400" : "text-red-400";
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-0">
      <div>
        <div className="text-sm text-slate-300 font-semibold">{label}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{description}</div>
      </div>
      <span className={`text-lg font-black tabular-nums ${color}`}>{display}</span>
    </div>
  );
}

export default function DerivedStatsCard({ stats, general }: DerivedStatsCardProps) {
  if (!stats) return null;

  const xgAll   = parse(stats.XG_ALL);
  const xgaAll  = parse(stats.XGA_ALL);
  const xgHome  = parse(stats.XG_HOME);
  const xgaHome = parse(stats.XGA_HOME);
  const xgAway  = parse(stats.XG_AWAY);
  const xgaAway = parse(stats.XGA_AWAY);

  const btts    = parse(stats.BTTS_ALL, true);
  const cs      = parse(stats.CS_ALL, true);
  const o15     = parse(stats.O15_ALL, true);
  const o25     = parse(stats.O25_ALL, true);
  const hgsO15  = parse(stats.HGS_Over_15 ?? stats["HGS_Over_1.5"]);
  const hgcO15  = parse(stats.HGC_Over_15 ?? stats["HGC_Over_1.5"]);

  const scored    = general?.scored ?? 0;
  const conceded  = general?.conceded ?? 0;
  const gp        = general?.gp ?? 1;
  const ppgHome   = parseFloat(String(stats.PPG_Home ?? "0")) || 0;
  const ppgAway   = parseFloat(String(stats.PPG_Away ?? "0")) || 0;

  const gfPerGame = gp > 0 ? scored / gp : 0;
  const gaPerGame = gp > 0 ? conceded / gp : 0;

  // Derived metrics
  const attackEff       = xgAll > 0    ? gfPerGame / xgAll : 0;
  const defenceEff      = xgaAll > 0   ? xgaAll / (gaPerGame || xgaAll) : 1;
  const homeDominance   = ppgAway > 0  ? ppgHome / ppgAway : ppgHome > 0 ? 3 : 0;
  const bttsValue       = (btts / 100) * (1 - cs / 100) * 100;
  const xgDiff          = xgAll - xgaAll;
  const attackPower     = hgsO15 > 0 ? (o15 + o25 + hgsO15) / 3 : (o15 + o25) / 2;
  const defFragility    = hgcO15 > 0 ? (1 - cs / 100) * (hgcO15 / 100) * 100 : 0;

  const hasXg = xgAll > 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
      <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
        <FlaskConical className="w-4 h-4 text-violet-400" />
        Derived Stats
        <span className="text-[10px] font-normal text-slate-500 ml-1">— computed from raw data</span>
      </h3>

      {hasXg && (
        <>
          <MetricRow
            label="xG Efficiency"
            value={attackEff}
            description="Goals scored per game ÷ xG. >1.0 = clinical finisher"
            format="ratio"
            goodIfHigh
          />
          <MetricRow
            label="xG Defensive Efficiency"
            value={defenceEff}
            description="xGA ÷ goals conceded per game. >1.0 = better than expected"
            format="ratio"
            goodIfHigh
          />
          <MetricRow
            label="xG Dominance (xGD)"
            value={xgDiff}
            description="xG minus xGA per game — net expected dominance"
            format="score"
            goodIfHigh
          />
        </>
      )}

      {ppgHome > 0 && ppgAway > 0 && (
        <MetricRow
          label="Home Dominance Index"
          value={homeDominance}
          description="Home PPG ÷ Away PPG. >2.0 = plays much better at home"
          format="ratio"
          goodIfHigh={false}
        />
      )}

      <MetricRow
        label="BTTS Value Score"
        value={bttsValue}
        description="BTTS% × (1 – CS%) — rewards high BTTS with clean sheet risk factored in"
        format="percent"
        goodIfHigh
      />

      {attackPower > 0 && (
        <MetricRow
          label="Attack Power Score"
          value={attackPower}
          description="Composite of Over 1.5, Over 2.5 rates — measures raw offensive output"
          format="percent"
          goodIfHigh
        />
      )}

      {defFragility > 0 && (
        <MetricRow
          label="Defensive Fragility"
          value={defFragility}
          description="How likely this defence is to concede multiple goals — lower is better"
          format="percent"
          goodIfHigh={false}
        />
      )}
    </div>
  );
}
