// @ts-nocheck
import React from "react";
import { cn } from "@/utils/matchUtils";
import Controls from "@/components/Dashboard/Controls";
import { Lock, X, Sliders } from "lucide-react";

export function ExploreFilters({
  isPro,
  strengthOnly,
  setStrengthOnly,
  ratingBand,
  setRatingBand,
  oddsMode,
  setOddsMode,
  oddsFilter,
  setOddsFilter,
  matchesLoading,
  refetch,
  chanceThreshold,
  setChanceThreshold,
  ratingThreshold,
  setRatingThreshold,
  darkMode,
  hasFilterAccess,
  filterPanelProps,
  sortBy,
  setSortBy,
}) {
  const handleChanceChange = (val) => {
    let num = Number(val);
    if (num > 100) num = num / 100;
    setChanceThreshold(num);
  };

  const handleRatingChange = (val) => {
    let num = Number(val);
    if (num > 100) num = num / 100;
    setRatingThreshold(num);
  };

  return (
    <div
      className={cn(
        // 🔥 FIX: Added 'relative' and 'z-50' to ensure menus stay on top of the banner
        "relative z-50 rounded-[32px] border p-4 sm:p-5 mb-6 shadow-sm transition-all",
        darkMode
          ? "bg-white/[0.02] border-white/5 backdrop-blur-xl"
          : "bg-white/80 border-gray-200 backdrop-blur-xl"
      )}
    >
      {/* Toolstrip Header */}
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <div
          className={cn(
            "h-5 w-1.5 rounded-full",
            darkMode
              ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              : "bg-amber-500"
          )}
        />
        <h3
          className={cn(
            "text-xs font-black uppercase tracking-[0.2em]",
            darkMode ? "text-gray-300" : "text-gray-700"
          )}
        >
          Algorithm Calibration
        </h3>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 mb-5">
        {/* === UPGRADE 2: PRO BADGE TOGGLE & RATING BAND === */}
        <div
          className={cn(
            "flex-1 rounded-2xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4",
            darkMode
              ? "bg-gray-950/50 border-white/5"
              : "bg-gray-50 border-gray-200"
          )}
        >
          {isPro ? (
            <>
              {/* Hardware Toggle Switch */}
              <button
                type="button"
                onClick={() => setStrengthOnly((v) => !v)}
                className={cn(
                  "relative flex items-center justify-between sm:justify-start gap-4 px-4 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all active:scale-[0.99]",
                  strengthOnly
                    ? darkMode
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                    : darkMode
                    ? "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                <span>Strength Filter</span>
                <div
                  className={cn(
                    "w-8 h-4 rounded-full relative transition-colors",
                    strengthOnly
                      ? "bg-emerald-500"
                      : darkMode
                      ? "bg-gray-800"
                      : "bg-gray-300"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all shadow-sm",
                      strengthOnly ? "left-[18px]" : "left-0.5"
                    )}
                  />
                </div>
              </button>

              {/* Rating Band Dropdown */}
              <div className="flex-1 min-w-[140px] relative">
                <select
                  aria-label="Filter by rating band"
                  value={ratingBand}
                  onChange={(e) => setRatingBand(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer appearance-none",
                    darkMode
                      ? "bg-black/50 border-white/10 text-gray-200 focus:border-amber-500/50"
                      : "bg-white border-gray-200 text-gray-700 focus:border-amber-400"
                  )}
                >
                  <option value="All">Rating Band: ALL</option>
                  <option value="B">Band: B (Standard)</option>
                  <option value="B+">Band: B+ (Good)</option>
                  <option value="A">Band: A (Premium)</option>
                  <option value="A+">Band: A+ (Elite)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  ▼
                </div>
              </div>

              {/* Quick Reset */}
              {(strengthOnly || ratingBand !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setStrengthOnly(false);
                    setRatingBand("All");
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border transition-colors flex items-center justify-center shrink-0",
                    darkMode
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                      : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                  )}
                  title="Reset Pro Filters"
                >
                  <X size={16} />
                </button>
              )}
            </>
          ) : (
            /* Locked State for Free Users */
            <div
              className={cn(
                "w-full flex items-center justify-between px-2 py-1",
                darkMode ? "text-amber-500/70" : "text-amber-600/70"
              )}
            >
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                <Lock size={14} /> Pro Calibration Locked
              </div>
              <div className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                Strength & Rating Bands
              </div>
            </div>
          )}
        </div>

        {/* === UPGRADE 1: DUAL-ACTION ODDS SELECTORS === */}
        <div
          className={cn(
            "shrink-0 rounded-2xl border p-3 sm:p-4 flex flex-col sm:flex-row gap-3",
            darkMode
              ? "bg-gray-950/50 border-white/5"
              : "bg-gray-50 border-gray-200"
          )}
        >
          <div className="relative w-full sm:w-[160px]">
            <select
              aria-label="Filter by odds availability"
              value={oddsMode}
              onChange={(e) => setOddsMode(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer appearance-none",
                darkMode
                  ? "bg-black/50 border-white/10 text-gray-200 focus:border-blue-500/50"
                  : "bg-white border-gray-200 text-gray-700 focus:border-blue-400"
              )}
            >
              <option value="all">All Matches</option>
              <option value="withOdds">With Odds</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              ▼
            </div>
          </div>

          <div className="relative w-full sm:w-[160px]">
            <select
              aria-label="Filter by odds range"
              value={oddsFilter}
              onChange={(e) => setOddsFilter(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer appearance-none",
                darkMode
                  ? "bg-black/50 border-white/10 text-gray-200 focus:border-blue-500/50"
                  : "bg-white border-gray-200 text-gray-700 focus:border-blue-400"
              )}
            >
              <option value="all">Any Odds</option>
              <option value="1.2-1.5">1.20 – 1.50</option>
              <option value="1.5-2">1.50 – 2.00</option>
              <option value="2-3">2.00 – 3.00</option>
              <option value="3+">3.00+ Edge</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Main Base Controls */}
      <div
        className={cn(
          "pt-4 border-t",
          darkMode ? "border-white/10" : "border-gray-200"
        )}
      >
        <Controls
          matchesLoading={matchesLoading}
          refetch={refetch}
          showFilters={true}
          setShowFilters={() => {}}
          chanceThreshold={chanceThreshold}
          setChanceThreshold={handleChanceChange}
          ratingThreshold={ratingThreshold}
          setRatingThreshold={handleRatingChange}
          darkMode={darkMode}
          hasFilterAccess={hasFilterAccess}
          filterPanelProps={filterPanelProps}
          sortBy={sortBy}
          setSortBy={setSortBy}
          isPro={isPro}
        />
      </div>
    </div>
  );
}