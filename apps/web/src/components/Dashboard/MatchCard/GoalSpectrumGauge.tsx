// @ts-nocheck
import React, { memo } from "react";
import { Sparkles, Flame, Shield } from "lucide-react";

function cn(...c: any[]) {
  return c.filter(Boolean).join(" ");
}

interface GoalSpectrumGaugeProps {
  ov15?: number;
  ov25?: number;
  ov35?: number;
  ov45?: number;
  gg?: number;
  ng?: number;
  avgGoals?: number;
  darkMode?: boolean;
}

export const GoalSpectrumGauge = memo(function GoalSpectrumGauge({
  ov15 = 75,
  ov25 = 52,
  ov35 = 28,
  ov45 = 14,
  gg = 55,
  ng = 45,
  avgGoals,
  darkMode = true,
}: GoalSpectrumGaugeProps) {
  // Infer expected goals if not passed
  const estGoals =
    avgGoals && avgGoals > 0
      ? Number(avgGoals).toFixed(1)
      : (1.2 + (Number(ov25 || 50) / 100) * 1.8 + (Number(gg || 50) / 100) * 0.5).toFixed(1);

  const isHighGoalEnvironment = Number(ov25) >= 60;
  const isDefensiveEnvironment = Number(ov25) <= 40;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 relative overflow-hidden",
        darkMode
          ? "bg-gradient-to-b from-white/[0.03] to-transparent border-white/10"
          : "bg-gradient-to-b from-gray-50/70 to-white border-gray-200"
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles
            size={14}
            className={darkMode ? "text-cyan-400" : "text-cyan-600"}
          />
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-wider",
              darkMode ? "text-gray-300" : "text-gray-700"
            )}
          >
            Goal Expectancy Spectrum
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
              isHighGoalEnvironment
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : isDefensiveEnvironment
                ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                : darkMode
                ? "bg-white/5 border-white/10 text-gray-400"
                : "bg-gray-100 border-gray-200 text-gray-600"
            )}
          >
            ~{estGoals} Exp. Goals
          </span>
        </div>
      </div>

      {/* Goal Thresholds Grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { label: "O 1.5", prob: Math.round(Number(ov15) || 0) },
          { label: "O 2.5", prob: Math.round(Number(ov25) || 0) },
          { label: "O 3.5", prob: Math.round(Number(ov35) || 0) },
          { label: "O 4.5", prob: Math.round(Number(ov45) || 0) },
        ].map((line) => {
          const isHigh = line.prob >= 65;
          const isMedium = line.prob >= 45 && line.prob < 65;

          return (
            <div
              key={line.label}
              className={cn(
                "rounded-xl border p-2 flex flex-col items-center justify-center transition-all",
                darkMode
                  ? "bg-white/[0.02] border-white/10"
                  : "bg-white border-gray-200 shadow-sm"
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-extrabold uppercase tracking-wider opacity-60 mb-0.5",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                {line.label}
              </span>
              <span
                className={cn(
                  "text-xs sm:text-sm font-black tabular-nums tracking-tight",
                  isHigh
                    ? "text-emerald-500"
                    : isMedium
                    ? darkMode
                      ? "text-blue-300"
                      : "text-blue-600"
                    : "opacity-60"
                )}
              >
                {line.prob}%
              </span>
              <div
                className={cn(
                  "h-1 w-full rounded-full overflow-hidden mt-1",
                  darkMode ? "bg-white/10" : "bg-gray-100"
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isHigh ? "bg-emerald-500" : isMedium ? "bg-blue-500" : "bg-gray-400"
                  )}
                  style={{ width: `${Math.min(100, line.prob)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* BTTS Split Bar */}
      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
          <span className="flex items-center gap-1 text-emerald-500">
            <Flame size={11} /> BTTS Yes: {Math.round(Number(gg) || 0)}%
          </span>
          <span className="flex items-center gap-1 text-rose-500">
            <Shield size={11} /> BTTS No: {Math.round(Number(ng) || 0)}%
          </span>
        </div>

        {/* Dual Split Bar */}
        <div
          className={cn(
            "h-1.5 w-full rounded-full overflow-hidden flex",
            darkMode ? "bg-white/10" : "bg-gray-200"
          )}
        >
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, Number(gg) || 50))}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, Number(ng) || 50))}%` }}
          />
        </div>
      </div>
    </div>
  );
});

export default GoalSpectrumGauge;
