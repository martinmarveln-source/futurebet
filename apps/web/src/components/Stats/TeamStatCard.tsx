// @ts-nocheck
"use client";

import React from "react";

interface TeamStatCardProps {
  label: string;
  all?: string | number | null;
  home?: string | number | null;
  away?: string | number | null;
  activeSplit?: "all" | "home" | "away";
  suffix?: string;
  color?: "blue" | "emerald" | "amber" | "red" | "purple" | "indigo";
  isPercent?: boolean;
  description?: string;
  gpAll?: number;
  gpHome?: number;
  gpAway?: number;
}

const colorMap = {
  blue:    { bar: "bg-blue-500",    text: "text-blue-400",    glow: "shadow-blue-500/20"    },
  emerald: { bar: "bg-emerald-500", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
  amber:   { bar: "bg-amber-500",   text: "text-amber-400",   glow: "shadow-amber-500/20"   },
  red:     { bar: "bg-red-500",     text: "text-red-400",     glow: "shadow-red-500/20"     },
  purple:  { bar: "bg-purple-500",  text: "text-purple-400",  glow: "shadow-purple-500/20"  },
  indigo:  { bar: "bg-indigo-500",  text: "text-indigo-400",  glow: "shadow-indigo-500/20"  },
};

/** Parses a value that may be whole percent "65", fractional "0.65", or string "65%" */
function parseVal(v: string | number | null | undefined, isPercent: boolean): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/%/g, "").trim());
  if (!isFinite(n)) return 0;
  if (!isPercent) return n;
  // If stored as fractional decimal (0 < n ≤ 1): multiply by 100
  return n > 0 && n <= 1.0 ? n * 100 : n;
}

function heatColor(val: number): string {
  if (val >= 70) return "text-emerald-400";
  if (val >= 50) return "text-amber-400";
  if (val >= 30) return "text-orange-400";
  return "text-red-400";
}

/** Format a count/percentage pair: "70% (7/10)" when GP is available */
function fmtWithGp(pct: number, gp?: number): string {
  if (!gp) return `${Math.round(pct)}%`;
  const count = Math.round((pct / 100) * gp);
  return `${Math.round(pct)}% (${count}/${gp})`;
}

export default function TeamStatCard({
  label,
  all,
  home,
  away,
  activeSplit = "all",
  suffix = "",
  color = "blue",
  isPercent = false,
  description,
  gpAll,
  gpHome,
  gpAway,
}: TeamStatCardProps) {
  const raw =
    activeSplit === "home" ? home : activeSplit === "away" ? away : all;
  const activeGp =
    activeSplit === "home" ? gpHome : activeSplit === "away" ? gpAway : gpAll;

  const val = parseVal(raw, isPercent);

  // Main display value
  let displayVal: string;
  if (isPercent) {
    displayVal = gpAll !== undefined || gpHome !== undefined || gpAway !== undefined
      ? fmtWithGp(val, activeGp)
      : `${Math.round(val)}%`;
  } else if (suffix) {
    displayVal = `${val}${suffix}`;
  } else {
    // For non-percent numbers (e.g. PPG, xG) always 2dp if it looks decimal
    displayVal = Number.isInteger(val) ? String(val) : val.toFixed(2);
  }

  const barWidth = Math.min(100, isPercent ? val : Math.min(val * 10, 100));
  const c = colorMap[color] || colorMap.blue;
  const textColor = isPercent ? heatColor(val) : c.text;

  const homeVal = parseVal(home, isPercent);
  const awayVal = parseVal(away, isPercent);

  const fmtMini = (pct: number, gp?: number): string => {
    if (!isPercent) return pct.toFixed(2);
    return gp ? `${Math.round(pct)}% (${Math.round((pct / 100) * gp)}/${gp})` : `${Math.round(pct)}%`;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-2 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-slate-400 text-xs font-medium leading-tight">{label}</span>
        <span className={`text-xl font-black tabular-nums leading-none ${textColor}`}>
          {displayVal}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Home / Away mini comparison — always uses isPercent flag correctly */}
      {(home !== undefined || away !== undefined) && (
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
            H: <span className="text-slate-300 font-semibold ml-0.5">{fmtMini(homeVal, gpHome)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
            A: <span className="text-slate-300 font-semibold ml-0.5">{fmtMini(awayVal, gpAway)}</span>
          </span>
        </div>
      )}

      {description && (
        <p className="text-[10px] text-slate-600 leading-tight">{description}</p>
      )}
    </div>
  );
}
