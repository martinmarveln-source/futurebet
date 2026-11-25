// @ts-nocheck
import React, { useState, useMemo } from "react";
import { cn } from "@/utils/matchUtils";
import Controls from "@/components/Dashboard/Controls";
import {
  Lock,
  X,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Flame,
  Clock,
  RotateCcw,
  Zap,
} from "lucide-react";
import { MARKET_OPTIONS } from "@/utils/marketViewAlgorithm";
import useUserPermissions from "@/hooks/useUserPermissions";
import { toast } from "sonner";

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
  noBorder,
  activeMarket,
  setActiveMarket,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

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

  const { kickoffFilter, setKickoffFilter } = filterPanelProps || {};
  const { isAdmin, isPremium } = useUserPermissions();
  const hasMarketViewAccess = isAdmin || isPremium;

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (strengthOnly) count++;
    if (ratingBand && ratingBand !== "All") count++;
    if (kickoffFilter && kickoffFilter !== "all") count++;
    if (oddsMode && oddsMode !== "all") count++;
    if (oddsFilter && oddsFilter !== "all") count++;
    if (chanceThreshold && chanceThreshold > 0.5) count++;
    if (ratingThreshold && ratingThreshold > 0) count++;
    if (activeMarket && activeMarket !== "") count++;
    return count;
  }, [
    strengthOnly,
    ratingBand,
    kickoffFilter,
    oddsMode,
    oddsFilter,
    chanceThreshold,
    ratingThreshold,
    activeMarket,
  ]);

  // 1-Tap Quick Strategy Handlers
  const handleSelectPreset = (presetId: string) => {
    if (activePreset === presetId) {
      // Toggle off / reset
      handleResetAll();
      return;
    }

    setActivePreset(presetId);

    if (presetId === "bankers") {
      setOddsFilter?.("1.1-1.49");
      setChanceThreshold?.(0.75);
      setStrengthOnly?.(true);
      setActiveMarket?.("");
      toast.success("🟢 Filtered for Safe Bankers (1.10 – 1.49 Odds, 75%+ Win Chance)");
    } else if (presetId === "value") {
      setOddsFilter?.("value-edge");
      setChanceThreshold?.(0.55);
      setStrengthOnly?.(false);
      setActiveMarket?.("");
      toast.success("🟡 Filtered for High Value AI Edge Picks");
    } else if (presetId === "over_goals") {
      if (hasMarketViewAccess) {
        setActiveMarket?.("O/U 2.5");
      }
      setOddsFilter?.("all");
      setChanceThreshold?.(0.60);
      toast.success("⚽ Filtered for Over Goals Markets");
    } else if (presetId === "double_chance") {
      if (hasMarketViewAccess) {
        setActiveMarket?.("Double Chance");
      }
      setOddsFilter?.("all");
      setChanceThreshold?.(0.70);
      toast.success("🛡️ Filtered for Double Chance (1X/X2) Banker Plays");
    } else if (presetId === "today") {
      setKickoffFilter?.("upcoming");
      toast.success("⏰ Filtered for Today's Upcoming Matches");
    }
  };

  const handleResetAll = () => {
    setActivePreset(null);
    setStrengthOnly?.(false);
    setRatingBand?.("All");
    setKickoffFilter?.("all");
    setOddsMode?.("all");
    setOddsFilter?.("all");
    setChanceThreshold?.(0.5);
    setRatingThreshold?.(0);
    setActiveMarket?.("");
    toast.info("All filters reset to default");
  };

  return (
    <div
      className={cn(
        "relative z-40 p-4 sm:p-5 transition-all space-y-4",
        noBorder
          ? "bg-transparent"
          : darkMode
          ? "rounded-[32px] border border-white/5 bg-white/[0.02] shadow-sm mb-6 backdrop-blur-xl"
          : "rounded-[32px] border border-gray-200 bg-white/80 shadow-sm mb-6 backdrop-blur-xl"
      )}
    >
      {/* ========================================================================= */}
      {/* 1. BETTOR-FRIENDLY QUICK STRATEGY PILLS (1-TAP FILTERS)                   */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5",
              darkMode ? "text-amber-400" : "text-amber-600"
            )}
          >
            <Sparkles size={12} />
            Quick Strategy Presets
          </span>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={10} />
              Reset ({activeFilterCount} active)
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Preset 1: Safe Bankers */}
          <button
            type="button"
            onClick={() => handleSelectPreset("bankers")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 active:scale-95 shadow-sm",
              activePreset === "bankers"
                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20"
                : darkMode
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            )}
          >
            <ShieldCheck size={14} className={activePreset === "bankers" ? "text-slate-950" : "text-emerald-400"} />
            <span>Safe Bankers (1.20 - 1.50)</span>
          </button>

          {/* Preset 2: Value Edge */}
          <button
            type="button"
            onClick={() => handleSelectPreset("value")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 active:scale-95 shadow-sm",
              activePreset === "value"
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20"
                : darkMode
                ? "bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/20"
                : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
            )}
          >
            <TrendingUp size={14} className={activePreset === "value" ? "text-slate-950" : "text-amber-400"} />
            <span>Value Edge (High ROI)</span>
          </button>

          {/* Preset 3: Over Goals */}
          <button
            type="button"
            onClick={() => handleSelectPreset("over_goals")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 active:scale-95 shadow-sm",
              activePreset === "over_goals"
                ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/20"
                : darkMode
                ? "bg-blue-500/10 text-blue-300 border-blue-500/25 hover:bg-blue-500/20"
                : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
            )}
          >
            <Flame size={14} className={activePreset === "over_goals" ? "text-white" : "text-blue-400"} />
            <span>Over Goals (1.5 / 2.5)</span>
          </button>

          {/* Preset 4: Double Chance */}
          <button
            type="button"
            onClick={() => handleSelectPreset("double_chance")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 active:scale-95 shadow-sm",
              activePreset === "double_chance"
                ? "bg-purple-600 text-white border-purple-500 shadow-purple-500/20"
                : darkMode
                ? "bg-purple-500/10 text-purple-300 border-purple-500/25 hover:bg-purple-500/20"
                : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
            )}
          >
            <ShieldCheck size={14} className={activePreset === "double_chance" ? "text-white" : "text-purple-400"} />
            <span>Double Chance (1X/X2)</span>
          </button>

          {/* Preset 5: Playing Today */}
          <button
            type="button"
            onClick={() => handleSelectPreset("today")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 active:scale-95 shadow-sm",
              activePreset === "today"
                ? "bg-teal-600 text-white border-teal-500 shadow-teal-500/20"
                : darkMode
                ? "bg-teal-500/10 text-teal-300 border-teal-500/25 hover:bg-teal-500/20"
                : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
            )}
          >
            <Clock size={14} className={activePreset === "today" ? "text-white" : "text-teal-400"} />
            <span>Upcoming Kickoffs</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT MARKET VIEW ROW                                                */}
      {/* ========================================================================= */}
      {setActiveMarket && (
        <div className="pt-2 border-t border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 px-1">
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              Market View
            </span>

            {/* COLLAPSIBLE ADVANCED FILTER TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all self-start sm:self-auto",
                showAdvanced
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                  : darkMode
                  ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              )}
            >
              <Sliders size={13} />
              <span>{showAdvanced ? "Hide Advanced Controls" : "More Algorithm Filters"}</span>
              {activeFilterCount > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[9px] font-black",
                    showAdvanced
                      ? "bg-slate-950 text-amber-300"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  )}
                >
                  {activeFilterCount}
                </span>
              )}
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MARKET_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === "") {
                    setActiveMarket(key);
                  } else if (!hasMarketViewAccess) {
                    toast.error("🔒 Upgrade to Premium to unlock Market View predictions!");
                  } else {
                    setActiveMarket(key);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all active:scale-[0.98]",
                  activeMarket === key
                    ? darkMode
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                      : "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : darkMode
                    ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  !hasMarketViewAccess && key !== "" && "opacity-60 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {label}
                  {!hasMarketViewAccess && key !== "" && <Lock size={10} className="opacity-70" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. COLLAPSIBLE ADVANCED ALGORITHM CALIBRATION & CONTROLS                   */}
      {/* (HIDDEN BY DEFAULT TO SAVE SPACE FOR COMMON BETTORS!)                     */}
      {/* ========================================================================= */}
      {showAdvanced && (
        <div className="pt-4 border-t border-white/10 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <h3
                className={cn(
                  "text-xs font-black uppercase tracking-[0.2em]",
                  darkMode ? "text-gray-300" : "text-gray-700"
                )}
              >
                Fine-Grained Algorithm Calibration
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(false)}
              className="text-[10px] font-bold uppercase text-slate-400 hover:text-white"
            >
              Close Panel ✕
            </button>
          </div>

          {/* Row 1: Pro Strength & Rating Band & Kickoff */}
          <div className="flex flex-col xl:flex-row gap-4">
            <div
              className={cn(
                "flex-1 rounded-2xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4",
                darkMode ? "bg-gray-950/50 border-white/5" : "bg-gray-50 border-gray-200"
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
                        strengthOnly ? "bg-emerald-500" : darkMode ? "bg-gray-800" : "bg-gray-300"
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

                  {/* Kickoff Status Dropdown */}
                  <div className="flex-1 min-w-[140px] relative">
                    <select
                      aria-label="Filter by kickoff status"
                      value={kickoffFilter || "all"}
                      onChange={(e) => setKickoffFilter?.(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer appearance-none",
                        darkMode
                          ? "bg-black/50 border-white/10 text-gray-200 focus:border-amber-500/50"
                          : "bg-white border-gray-200 text-gray-700 focus:border-amber-400"
                      )}
                    >
                      <option value="all">Kickoff: ALL</option>
                      <option value="upcoming">Kickoff: UPCOMING</option>
                      <option value="passed">Kickoff: PASSED</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                      ▼
                    </div>
                  </div>
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

            {/* Row 2: Odds availability & Range */}
            <div
              className={cn(
                "shrink-0 rounded-2xl border p-3 sm:p-4 flex flex-col sm:flex-row gap-3",
                darkMode ? "bg-gray-950/50 border-white/5" : "bg-gray-50 border-gray-200"
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
                  <option value="1.1-1.49">1.10 — 1.49 (Ultra Safe)</option>
                  <option value="1.5-1.99">1.50 — 1.99 (Solid Value)</option>
                  <option value="2-2.99">2.00 — 2.99 (High Return)</option>
                  <option value="3+">3.00+ (Extreme Edge)</option>
                  <option value="value-edge">Positive Value Edge</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Deep Base Controls (Sliders, League & Date Selectors, CSV Export) */}
          <div className={cn("pt-4 border-t", darkMode ? "border-white/10" : "border-gray-200")}>
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
      )}
    </div>
  );
}
