// @ts-nocheck
import React, { memo } from "react";
import { TrendingUp, ShieldCheck, AlertCircle, Lock } from "lucide-react";

function cn(...c: any[]) {
  return c.filter(Boolean).join(" ");
}

interface ValueEdgeGaugeProps {
  modelProb: number | null;
  odds: number | null;
  selectionLabel?: string;
  darkMode?: boolean;
  canSeeAdvancedData?: boolean;
}

export const ValueEdgeGauge = memo(function ValueEdgeGauge({
  modelProb,
  odds,
  selectionLabel = "Primary Pick",
  darkMode = true,
  canSeeAdvancedData = true,
}: ValueEdgeGaugeProps) {
  if (!modelProb || !odds || odds <= 1) return null;

  const validOdds = Number(odds);
  const impliedProb = Math.round((1 / validOdds) * 100 * 10) / 10;
  const trueProb = Math.round(Number(modelProb) * 10) / 10;
  const edge = Math.round((trueProb - impliedProb) * 10) / 10;
  const fairOdds = trueProb > 0 ? (100 / trueProb).toFixed(2) : null;

  const isValue = edge > 0;
  const isHighValue = edge >= 7;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 sm:p-3.5 transition-all duration-300 relative overflow-hidden",
        isValue
          ? darkMode
            ? "bg-gradient-to-r from-emerald-500/[0.08] to-blue-500/[0.05] border-emerald-500/30"
            : "bg-gradient-to-r from-emerald-50/80 to-blue-50/60 border-emerald-200"
          : darkMode
          ? "bg-white/[0.02] border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      {/* Header Line */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp
            size={14}
            className={
              isValue
                ? isHighValue
                  ? "text-emerald-400 animate-pulse"
                  : "text-emerald-500"
                : "text-gray-400"
            }
          />
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-wider",
              darkMode ? "text-gray-300" : "text-gray-700"
            )}
          >
            Model vs. Market Edge
          </span>
        </div>

        {canSeeAdvancedData ? (
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
              isHighValue
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : isValue
                ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                : darkMode
                ? "bg-white/5 border-white/10 text-gray-400"
                : "bg-gray-200 border-gray-300 text-gray-600"
            )}
          >
            {edge > 0 ? `+${edge}% EV Edge` : `${edge}% Edge`}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
            <Lock size={10} /> Pro Edge
          </span>
        )}
      </div>

      {/* Dual Comparative Visual Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
            FutureBet Model Prob
          </span>
          <span
            className={cn(
              "font-black tabular-nums",
              darkMode ? "text-emerald-400" : "text-emerald-600"
            )}
          >
            {trueProb}%{" "}
            {fairOdds && (
              <span className="text-[10px] font-semibold opacity-70">
                (Fair: @{fairOdds})
              </span>
            )}
          </span>
        </div>

        {/* Progress tracks */}
        <div
          className={cn(
            "h-2 w-full rounded-full overflow-hidden relative",
            darkMode ? "bg-white/10" : "bg-gray-200"
          )}
        >
          {/* Implied Bookmaker marker */}
          <div
            className="absolute top-0 bottom-0 bg-gray-400/40 z-10 w-0.5"
            style={{ left: `${Math.min(100, Math.max(0, impliedProb))}%` }}
            title={`Market Implied: ${impliedProb}%`}
          />
          {/* True Model Bar */}
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isHighValue
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : isValue
                ? "bg-gradient-to-r from-blue-500 to-emerald-400"
                : "bg-gray-400"
            )}
            style={{ width: `${Math.min(100, Math.max(0, trueProb))}%` }}
          />
        </div>

        {/* Bottom Metrics Details */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
          <span>
            Bookmaker Odds:{" "}
            <strong className={darkMode ? "text-white" : "text-gray-900"}>
              @{validOdds.toFixed(2)}
            </strong>
          </span>
          <span>
            Implied Prob:{" "}
            <strong className={darkMode ? "text-white" : "text-gray-900"}>
              {impliedProb}%
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
});

export default ValueEdgeGauge;
