// @ts-nocheck
import { memo, useMemo } from "react";
import {
  Sparkles,
  Zap,
  Shield,
  Target,
  Flame,
  Activity,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { cn, fairOddsFromChance, valueTagFromVip } from "@/utils/matchUtils";
import { Chip } from "./PremiumUI";

export const PremiumBrief = memo(function PremiumBrief({
  darkMode,
  isPro,
  bestToday,
  bestWeek,
  selectors,
  onPreset,
  onExplore,
  onOpenAutoPick,
}) {
  const { getChance, getRating, getMatchTitle, getLeague } = selectors;

  const summary = useMemo(() => {
    const todayCount = Array.isArray(bestToday) ? bestToday.length : 0;
    const weekCount = Array.isArray(bestWeek) ? bestWeek.length : 0;

    const avg = (list, getter) => {
      const arr = Array.isArray(list) ? list : [];
      if (!arr.length) return 0;
      return Math.round(
        arr.reduce((a, m) => a + (getter(m) || 0), 0) / arr.length
      );
    };

    const avgChanceToday = avg(bestToday, getChance);
    const avgRatingToday = avg(bestToday, getRating);

    const top = todayCount ? bestToday[0] : null;
    const topChance = top ? getChance(top) : 0;
    const topRating = top ? getRating(top) : 0;
    const vipScore = Math.round(topChance * 0.6 + topRating * 0.4);

    return {
      todayCount,
      weekCount,
      avgChanceToday,
      avgRatingToday,
      top,
      topChance,
      topRating,
      vipScore,
    };
  }, [bestToday, bestWeek, getChance, getRating]);

  const topTitle = summary.top ? getMatchTitle(summary.top) : "—";
  const topLeague = summary.top ? getLeague(summary.top) : "—";
  const topFair = summary.top ? fairOddsFromChance(summary.topChance) : "—";
  const topValue = valueTagFromVip(summary.vipScore);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[32px] border p-6 sm:p-8 shadow-2xl transition-all",
        darkMode
          ? "bg-gray-950/40 border-white/10 backdrop-blur-2xl"
          : "bg-white/80 border-gray-200 backdrop-blur-xl"
      )}
    >
      {/* Ambient Dashboard Glow */}
      <div
        className={cn(
          "absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-50",
          darkMode ? "bg-blue-600/20" : "bg-blue-400/20"
        )}
      />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 relative z-10">
        {/* === LEFT COLUMN: HOLOGRAPHIC TOP PICK === */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div
              className={cn(
                "h-10 w-10 rounded-2xl flex items-center justify-center shadow-inner",
                darkMode
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-blue-50 text-blue-600 border border-blue-200"
              )}
            >
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={cn(
                    "text-xl sm:text-2xl font-black tracking-tight",
                    darkMode ? "text-white" : "text-gray-900"
                  )}
                >
                  Premium Engine
                </h2>
                {isPro && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                      darkMode
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    )}
                  >
                    <Sparkles size={10} className="inline mr-1 mb-0.5" /> Pro
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                Quantitative Analysis Live
              </p>
            </div>
          </div>

          {/* Holographic Pedestal */}
          <div
            className={cn(
              "relative flex-1 rounded-[28px] border p-6 sm:p-8 flex flex-col justify-center overflow-hidden transition-all duration-500 group",
              darkMode
                ? "bg-gradient-to-br from-blue-900/20 to-purple-900/10 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:shadow-[0_0_40px_rgba(59,130,246,0.25)] hover:border-blue-400/50"
                : "bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-200 shadow-xl hover:shadow-2xl hover:border-blue-300"
            )}
          >
            {/* Breathing Neon Pulse */}
            <div
              className={cn(
                "absolute inset-0 opacity-50 animate-[pulse_4s_ease-in-out_infinite]",
                darkMode
                  ? "bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_70%)]"
                  : "bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)]"
              )}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em]",
                    darkMode ? "text-blue-400" : "text-blue-600"
                  )}
                >
                  Highest Conviction Play
                </div>
                <div className="flex gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "text-2xl sm:text-3xl font-black tracking-tight truncate mb-1",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {topTitle}
              </div>
              <div
                className={cn(
                  "text-xs font-bold uppercase tracking-widest mb-6 truncate",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                {topLeague}
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip
                  tone={
                    topValue === "Value"
                      ? "green"
                      : topValue === "Solid"
                      ? "blue"
                      : "gray"
                  }
                  darkMode={darkMode}
                >
                  {topValue}
                </Chip>
                <Chip tone="purple" darkMode={darkMode}>
                  VIP{" "}
                  {Number.isFinite(summary.vipScore) ? summary.vipScore : "—"}
                </Chip>
                <Chip tone="gray" darkMode={darkMode}>
                  Fair {topFair}
                </Chip>
              </div>
            </div>

            <button
              onClick={onExplore}
              className={cn(
                "absolute bottom-6 right-6 h-10 w-10 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg group-hover:scale-110",
                darkMode
                  ? "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                  : "bg-white text-gray-900 hover:bg-gray-50"
              )}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* === RIGHT COLUMN: TELEMETRY & AI CORE === */}
        <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-4 justify-between">
          {/* AI Automation Core */}
          <button
            onClick={onOpenAutoPick}
            className={cn(
              "w-full relative overflow-hidden p-5 rounded-[24px] text-white transition-all active:scale-[0.99] group shadow-xl",
              darkMode
                ? "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-[length:200%_auto] hover:bg-right shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]"
                : "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 bg-[length:200%_auto] hover:bg-right shadow-amber-500/40"
            )}
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-left">
                <div className="text-sm font-black uppercase tracking-widest mb-0.5 flex items-center gap-2">
                  <Zap size={16} className="fill-white" /> Auto Pick
                </div>
                <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                  Initialize AI Slip Builder
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowRight size={16} />
              </div>
            </div>
          </button>

          {/* Telemetry Stat Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={cn(
                "rounded-[20px] border p-3.5",
                darkMode
                  ? "bg-black/20 border-white/5"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest mb-1",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                <Calendar size={12} /> Today Matches
              </div>
              <div
                className={cn(
                  "text-2xl font-black tabular-nums",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {summary.todayCount}
              </div>
            </div>

            <div
              className={cn(
                "rounded-[20px] border p-3.5",
                darkMode
                  ? "bg-black/20 border-white/5"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest mb-1",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                <Activity size={12} /> Week Volume
              </div>
              <div
                className={cn(
                  "text-2xl font-black tabular-nums",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {summary.weekCount}
              </div>
            </div>

            <div
              className={cn(
                "rounded-[20px] border p-3.5",
                darkMode
                  ? "bg-black/20 border-white/5"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest mb-1",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                <Target size={12} className="text-emerald-500" /> Avg Chance
              </div>
              <div
                className={cn(
                  "text-xl font-black tabular-nums mb-1",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {summary.avgChanceToday}%
              </div>
              {/* Mini Progress Bar */}
              <div
                className={cn(
                  "h-1 w-full rounded-full overflow-hidden",
                  darkMode ? "bg-white/10" : "bg-gray-200"
                )}
              >
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${summary.avgChanceToday}%` }}
                />
              </div>
            </div>

            <div
              className={cn(
                "rounded-[20px] border p-3.5",
                darkMode
                  ? "bg-black/20 border-white/5"
                  : "bg-gray-50 border-gray-200"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest mb-1",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                <Shield size={12} className="text-blue-500" /> Avg Rating
              </div>
              <div
                className={cn(
                  "text-xl font-black tabular-nums mb-1",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {summary.avgRatingToday}%
              </div>
              {/* Mini Progress Bar */}
              <div
                className={cn(
                  "h-1 w-full rounded-full overflow-hidden",
                  darkMode ? "bg-white/10" : "bg-gray-200"
                )}
              >
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${summary.avgRatingToday}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interlocking Presets Toggle */}
          <div
            className={cn(
              "w-full p-1.5 rounded-[20px] flex items-center border",
              darkMode
                ? "bg-black/40 border-white/5"
                : "bg-gray-100 border-gray-200"
            )}
          >
            <button
              onClick={() => onPreset("conservative")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all active:scale-95",
                darkMode
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm"
              )}
            >
              <Shield size={14} className="mb-1" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Safe
              </span>
            </button>
            <div
              className={cn(
                "w-px h-8 mx-1",
                darkMode ? "bg-white/10" : "bg-gray-300"
              )}
            />
            <button
              onClick={() => onPreset("balanced")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all active:scale-95",
                darkMode
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm"
              )}
            >
              <Target size={14} className="mb-1" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Bal
              </span>
            </button>
            <div
              className={cn(
                "w-px h-8 mx-1",
                darkMode ? "bg-white/10" : "bg-gray-300"
              )}
            />
            <button
              onClick={() => onPreset("aggressive")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all active:scale-95",
                darkMode
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm"
              )}
            >
              <Flame size={14} className="mb-1" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Edge
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});