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
    <div
      className={cx(
        "flex items-center justify-between sm:justify-start gap-4 sm:gap-8 px-5 sm:px-8 py-3.5 sm:py-4 rounded-[20px] border mb-5 shadow-sm overflow-x-auto scrollbar-hide backdrop-blur-xl transition-all duration-300",
        darkMode
          ? "bg-white/5 border-white/10 shadow-black/20"
          : "bg-white/60 border-slate-200/60 shadow-slate-200/50"
      )}
    >
      {/* Item 1: Total */}
      <div className="flex flex-col justify-center shrink-0">
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest mb-1",
            darkMode ? "text-slate-400" : "text-slate-500"
          )}
        >
          Total
        </span>
        <span
          className={cx(
            "text-base sm:text-lg font-black tabular-nums leading-none",
            darkMode ? "text-white" : "text-slate-900"
          )}
        >
          {total}
        </span>
      </div>

      <div
        className={cx(
          "w-px h-8 shrink-0",
          darkMode ? "bg-white/10" : "bg-slate-200"
        )}
      />

      {/* Item 2: Filtered */}
      <div className="flex flex-col justify-center shrink-0">
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest mb-1",
            darkMode ? "text-slate-400" : "text-slate-500"
          )}
        >
          Filtered
        </span>
        <span
          className={cx(
            "text-base sm:text-lg font-black tabular-nums leading-none",
            darkMode ? "text-white" : "text-slate-900"
          )}
        >
          {filtered}
        </span>
      </div>

      <div
        className={cx(
          "w-px h-8 shrink-0",
          darkMode ? "bg-white/10" : "bg-slate-200"
        )}
      />

      {/* Item 3: Avg Chance */}
      <div className="flex flex-col justify-center shrink-0">
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest mb-1",
            darkMode ? "text-slate-400" : "text-slate-500"
          )}
        >
          Avg Chance
        </span>
        <span
          className={cx(
            "text-base sm:text-lg font-black tabular-nums leading-none",
            darkMode ? "text-emerald-400" : "text-emerald-600"
          )}
        >
          {avgChance}%
        </span>
      </div>

      <div
        className={cx(
          "w-px h-8 shrink-0",
          darkMode ? "bg-white/10" : "bg-slate-200"
        )}
      />

      {/* Item 4: Avg Rating */}
      <div className="flex flex-col justify-center shrink-0">
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest mb-1",
            darkMode ? "text-slate-400" : "text-slate-500"
          )}
        >
          Avg Rating
        </span>
        <span
          className={cx(
            "text-base sm:text-lg font-black tabular-nums leading-none",
            darkMode ? "text-blue-400" : "text-blue-600"
          )}
        >
          {avgRating}
        </span>
      </div>

      <div
        className={cx(
          "w-px h-8 shrink-0 hidden sm:block",
          darkMode ? "bg-white/10" : "bg-slate-200"
        )}
      />

      {/* Item 5: Premium Targets */}
      <div className="flex flex-col justify-center shrink-0">
        <span
          className={cx(
            "text-[10px] font-extrabold uppercase tracking-widest mb-1",
            darkMode ? "text-amber-500/80" : "text-amber-600/80"
          )}
        >
          +EV Targets
        </span>
        <span
          className={cx(
            "flex items-center gap-1.5 text-base sm:text-lg font-black tabular-nums leading-none",
            darkMode ? "text-amber-400" : "text-amber-600"
          )}
        >
          <Zap size={16} className="fill-current" />
          {premiumCount}
        </span>
      </div>
    </div>
  );
}