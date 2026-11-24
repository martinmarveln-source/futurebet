// @ts-nocheck
import React, { memo } from "react";
import { Sparkles, Timer, ShieldAlert, Target, BarChart2 } from "lucide-react";

function cn(...c: any[]) {
  return c.filter(Boolean).join(" ");
}

interface MatchCardHeaderProps {
  league?: string;
  country?: string;
  date?: string;
  time?: string;
  kickoffTs?: number;
  kickoffPassed?: boolean;
  band?: string;
  bandColor?: string;
  fbScore?: number;
  fbTier?: { label: string; cls: string };
  pickStrength?: { label: string; kind: string } | null;
  convictionTier?: string | null;
  convictionStrength?: number | null;
  isSystemMatch?: boolean;
  canSeeAdvancedData?: boolean;
  darkMode?: boolean;
  onOpenH2H?: () => void;
  showH2H?: boolean;
}

function formatRelativeKickoff(dateStr?: string, timeStr?: string, kickoffPassed?: boolean) {
  if (kickoffPassed) return "Kickoff passed";
  if (!dateStr) return timeStr || "Upcoming";

  try {
    const time = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : "00:00:00";
    const kickoff = new Date(`${dateStr}T${time}`).getTime();
    if (!Number.isFinite(kickoff)) return `${dateStr} • ${timeStr || ""}`;

    const now = Date.now();
    const diffMs = kickoff - now;

    if (diffMs <= 0) return "In Progress / Ended";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours < 1) {
      return `Starts in ${diffMins}m`;
    }
    if (diffHours < 24) {
      return `Today ${timeStr ? timeStr.slice(0, 5) : ""} • in ${diffHours}h ${diffMins}m`;
    }
    return `${dateStr} • ${timeStr ? timeStr.slice(0, 5) : ""}`;
  } catch {
    return `${dateStr} • ${timeStr || ""}`;
  }
}

export const MatchCardHeader = memo(function MatchCardHeader({
  league = "League",
  country,
  date,
  time,
  kickoffPassed,
  band = "A",
  bandColor,
  fbScore = 75,
  fbTier,
  pickStrength,
  convictionTier,
  convictionStrength,
  isSystemMatch = false,
  canSeeAdvancedData = true,
  darkMode = true,
  onOpenH2H,
  showH2H = true,
}: MatchCardHeaderProps) {
  const kickoffDisplay = formatRelativeKickoff(date, time, kickoffPassed);

  const effectiveFbTier = fbTier || (
    fbScore >= 80 ? { label: "Ultra", cls: darkMode ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-purple-100 border-purple-300 text-purple-900 font-black" } :
    fbScore >= 65 ? { label: "Strong", cls: darkMode ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-emerald-100 border-emerald-300 text-emerald-900 font-black" } :
    fbScore >= 50 ? { label: "Moderate", cls: darkMode ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-amber-100 border-amber-300 text-amber-900 font-black" } :
    { label: "Weak", cls: darkMode ? "bg-slate-500/10 border-slate-500/20 text-slate-400" : "bg-slate-100 border-slate-300 text-slate-700 font-bold" }
  );

  return (
    <div className="flex flex-col gap-2.5">
      {/* EV System Match Ribbon if detected */}
      {isSystemMatch && (
        <div
          className={cn(
            "rounded-xl px-3 py-1.5 flex items-center justify-between border shadow-sm transition-all",
            darkMode
              ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
              : "bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-amber-300 text-amber-950 font-black"
          )}
        >
          <div className="flex items-center gap-2">
            <Target
              size={14}
              className={darkMode ? "text-amber-400" : "text-amber-800 animate-pulse"}
            />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              +EV System Value Play
            </span>
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
            darkMode
              ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
              : "bg-amber-200/90 border-amber-300 text-amber-950"
          )}>
            High Edge
          </span>
        </div>
      )}

      {/* Main Top Header Line */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: League & Kickoff status */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={cn(
              "text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors",
              darkMode
                ? "bg-white/[0.04] border-white/10 text-gray-300"
                : "bg-gray-100/90 border-gray-200 text-gray-800"
            )}
            title={country ? `${country} - ${league}` : league}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span className="truncate max-w-[150px] sm:max-w-[200px]">{league}</span>
          </span>

          <span
            className={cn(
              "text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1",
              kickoffPassed
                ? darkMode
                  ? "text-rose-400 bg-rose-500/10"
                  : "text-rose-700 bg-rose-50 font-bold"
                : darkMode
                ? "text-gray-400 bg-white/[0.02]"
                : "text-gray-600 bg-gray-50 font-medium"
            )}
          >
            <Timer size={12} className="opacity-70 shrink-0" />
            <span className="tabular-nums">{kickoffDisplay}</span>
          </span>
        </div>

        {/* Right: Composite FB Score + Conviction + H2H */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Rating Band */}
          {band && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border select-none",
                darkMode
                  ? "bg-white/[0.03] border-white/10 text-gray-300"
                  : "bg-amber-50/90 border-amber-200 text-amber-900"
              )}
              title={`${band} Rating Band`}
            >
              <Sparkles size={11} className={darkMode ? "text-amber-400" : "text-amber-600"} />
              <span>{band} Band</span>
            </span>
          )}

          {/* FutureBet Score & Consistent Score Tier */}
          {canSeeAdvancedData && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border transition-all cursor-help shadow-sm",
                effectiveFbTier.cls
              )}
              title={`FutureBet Composite Score: ${fbScore}/100 (${effectiveFbTier.label})${
                convictionTier ? `\nMarket Conviction: ${convictionTier} (${convictionStrength}%)` : ""
              }`}
            >
              <span className="font-extrabold">⚡ FB {fbScore}</span>
              {effectiveFbTier?.label && (
                <>
                  <span className="opacity-30">•</span>
                  <span className="text-[10px] font-bold opacity-90">{effectiveFbTier.label}</span>
                </>
              )}
            </div>
          )}

          {/* H2H Action Button */}
          {showH2H && onOpenH2H && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenH2H();
              }}
              title="View Head-to-Head Analytics"
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border transition-all active:scale-95",
                darkMode
                  ? "bg-blue-500/10 border-blue-500/25 text-blue-300 hover:bg-blue-500/20 hover:text-white"
                  : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              )}
            >
              <BarChart2 size={11} />
              <span>H2H</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default MatchCardHeader;
