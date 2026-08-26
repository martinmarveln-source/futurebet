// @ts-nocheck
"use client";

import React, { useMemo } from "react";
import { Zap } from "lucide-react";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function avgOf(arr, pick) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const nums = arr
    .map((m) => Number(pick(m)))
    .filter((v) => Number.isFinite(v));
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function StatsCards({ matchesData, filteredMatches, darkMode }) {
  const allMatches = useMemo(() => {
    return Array.isArray(matchesData?.matches) ? matchesData.matches : [];
  }, [matchesData]);

  const total = allMatches.length;
  const filtered = Array.isArray(filteredMatches) ? filteredMatches.length : 0;
  const base = filtered > 0 ? filteredMatches : allMatches;

  const avgChance = Math.round(avgOf(base, (m) => m?.chance));
  const avgRating = Math.round(avgOf(base, (m) => m?.rating));

  let premiumCount = 0;
  base.forEach((m) => {
    if (Number(m?.chance) >= 60 && Number(m?.rating) >= 65) premiumCount++;
  });

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      {/* Item 1: Total */}
      <div
        className={cx(
          "flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm backdrop-blur-md transition-colors",
          darkMode
            ? "bg-slate-800/60 border-slate-700/60"
            : "bg-white/80 border-slate-200"
        )}
      >
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest",
            darkMode ? "text-slate-400" : "text-slate-500"
          )}
        >
          Total
        </span>
        <span
          className={cx(
            "text-sm font-black tabular-nums",
            darkMode ? "text-white" : "text-slate-900"
          )}
        >
          {total}
        </span>
      </div>

      {/* Item 2: Filtered */}
      <div
        className={cx(
          "flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm backdrop-blur-md transition-colors",
          darkMode
            ? "bg-blue-900/30 border-blue-800/50"
            : "bg-blue-50 border-blue-200"
        )}
      >
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest",
            darkMode ? "text-blue-400" : "text-blue-600"
          )}
        >
          Filtered
        </span>
        <span
          className={cx(
            "text-sm font-black tabular-nums",
            darkMode ? "text-blue-200" : "text-blue-900"
          )}
        >
          {filtered}
        </span>
      </div>

      {/* Item 3: Avg Chance */}
      <div
        className={cx(
          "flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm backdrop-blur-md transition-colors",
          darkMode
            ? "bg-emerald-900/30 border-emerald-800/50"
            : "bg-emerald-50 border-emerald-200"
        )}
      >
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest",
            darkMode ? "text-emerald-400" : "text-emerald-600"
          )}
        >
          Avg Chance
        </span>
        <span
          className={cx(
            "text-sm font-black tabular-nums",
            darkMode ? "text-emerald-200" : "text-emerald-900"
          )}
        >
          {avgChance}%
        </span>
      </div>

      {/* Item 4: Avg Rating */}
      <div
        className={cx(
          "flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm backdrop-blur-md transition-colors",
          darkMode
            ? "bg-indigo-900/30 border-indigo-800/50"
            : "bg-indigo-50 border-indigo-200"
        )}
      >
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest",
            darkMode ? "text-indigo-400" : "text-indigo-600"
          )}
        >
          Avg Rating
        </span>
        <span
          className={cx(
            "text-sm font-black tabular-nums",
            darkMode ? "text-indigo-200" : "text-indigo-900"
          )}
        >
          {avgRating}
        </span>
      </div>

      {/* Item 5: Premium Targets */}
      <div
        className={cx(
          "flex items-center gap-2 px-4 py-2 rounded-full border shadow-[0_0_15px_rgba(245,158,11,0.15)] backdrop-blur-md transition-all",
          darkMode
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
            : "bg-amber-50 border-amber-300 text-amber-700"
        )}
      >
        <Zap size={14} className={darkMode ? "fill-amber-400" : "fill-amber-500"} />
        <span className="text-[10px] font-extrabold uppercase tracking-widest">
          +EV Targets
        </span>
        <span className="text-sm font-black tabular-nums">{premiumCount}</span>
      </div>
    </div>
  );
}
