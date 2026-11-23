// @ts-nocheck
import React, { memo } from "react";
import TeamCrest from "./TeamCrest";
import { Check, X, Lock } from "lucide-react";

function cn(...c: any[]) {
  return c.filter(Boolean).join(" ");
}

export const VisualFormGuide = memo(function VisualFormGuide({
  formStr,
  darkMode = true,
}: {
  formStr?: string;
  darkMode?: boolean;
}) {
  if (!formStr) return null;
  const matches = String(formStr)
    .toUpperCase()
    .replace(/[^WDL]/g, "")
    .slice(-5)
    .split("");

  if (!matches.length) return null;

  return (
    <div className="flex items-center gap-1 select-none" title={`Recent Form: ${matches.join("-")}`}>
      {matches.map((result, i) => {
        const isWin = result === "W";
        const isDraw = result === "D";
        const isLoss = result === "L";

        return (
          <span
            key={i}
            className={cn(
              "w-4 h-4 rounded-[4px] text-[9px] font-black flex items-center justify-center transition-transform hover:scale-110",
              isWin
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                : isDraw
                ? darkMode
                  ? "bg-amber-500/80 text-black"
                  : "bg-amber-400 text-amber-950"
                : isLoss
                ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20"
                : "bg-gray-400 text-white"
            )}
          >
            {result}
          </span>
        );
      })}
    </div>
  );
});

interface TeamMatchupProps {
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeForm?: string;
  awayForm?: string;
  ftScore?: string | null;
  wonStatus?: boolean | null;
  kickoffPassed?: boolean;
  predictedScore?: string | null;
  canSeePredictedScore?: boolean;
  isSystemMatch?: boolean;
  darkMode?: boolean;
}

export const TeamMatchup = memo(function TeamMatchup({
  homeTeam = "Home",
  awayTeam = "Away",
  homeLogo,
  awayLogo,
  homeForm,
  awayForm,
  ftScore,
  wonStatus,
  kickoffPassed = false,
  predictedScore,
  canSeePredictedScore = true,
  isSystemMatch = false,
  darkMode = true,
}: TeamMatchupProps) {
  const isFinished = Boolean(ftScore && ftScore !== "#N/A");

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 overflow-hidden shadow-sm",
        darkMode
          ? "bg-gradient-to-b from-white/[0.04] to-transparent border-white/10"
          : "bg-gradient-to-b from-gray-50/90 to-white border-gray-200"
      )}
    >
      {/* Background glow for system match */}
      {isSystemMatch && (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none opacity-[0.04]",
            darkMode ? "bg-amber-400" : "bg-amber-500"
          )}
        />
      )}

      <div className="flex items-center justify-between gap-3 relative z-10">
        {/* Home Team */}
        <div className="flex flex-col items-center sm:items-start gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 w-full">
            <TeamCrest name={homeTeam} logoUrl={homeLogo} size={38} />
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  "text-sm sm:text-base font-black leading-tight line-clamp-2 block transition-colors",
                  darkMode ? "text-white" : "text-gray-900"
                )}
                title={homeTeam}
              >
                {homeTeam}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider block mt-0.5",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                Home
              </span>
            </div>
          </div>
          <div className="mt-0.5 self-center sm:self-start">
            <VisualFormGuide formStr={homeForm} darkMode={darkMode} />
          </div>
        </div>

        {/* Center Arena: Scoreboard or VS Indicator */}
        <div className="flex flex-col items-center justify-center shrink-0 px-2 sm:px-4">
          {isFinished ? (
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "px-3 py-1 rounded-xl text-base sm:text-lg font-black tracking-widest font-mono border shadow-inner",
                  darkMode
                    ? "bg-gray-900/90 border-white/15 text-white"
                    : "bg-gray-100 border-gray-300 text-gray-900"
                )}
              >
                {ftScore}
              </div>

              {/* Settlement Outcome Stamp */}
              {wonStatus === true ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Check size={10} strokeWidth={3} /> Pick Won
                </span>
              ) : wonStatus === false ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <X size={10} strokeWidth={3} /> Pick Lost
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">
                  Full Time
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black italic shadow-inner ring-4 transition-transform group-hover:scale-105",
                  darkMode
                    ? "bg-gray-900 ring-white/5 text-gray-400"
                    : "bg-gray-100 ring-gray-200 text-gray-500"
                )}
              >
                VS
              </div>
              {predictedScore && (
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded border select-none",
                    darkMode
                      ? "bg-white/[0.03] border-white/10 text-gray-300"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  )}
                  title={canSeePredictedScore ? "Predicted Most Likely Scoreline" : "Upgrade to Pro to see predicted score"}
                >
                  {canSeePredictedScore ? (
                    `CS ${predictedScore}`
                  ) : (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Lock size={9} /> Pro
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center sm:items-end gap-2 flex-1 min-w-0">
          <div className="flex items-center sm:flex-row-reverse gap-2.5 w-full">
            <TeamCrest name={awayTeam} logoUrl={awayLogo} size={38} />
            <div className="min-w-0 flex-1 sm:text-right">
              <span
                className={cn(
                  "text-sm sm:text-base font-black leading-tight line-clamp-2 block transition-colors",
                  darkMode ? "text-white" : "text-gray-900"
                )}
                title={awayTeam}
              >
                {awayTeam}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider block mt-0.5",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                Away
              </span>
            </div>
          </div>
          <div className="mt-0.5 self-center sm:self-end">
            <VisualFormGuide formStr={awayForm} darkMode={darkMode} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default TeamMatchup;
