// @ts-nocheck
import { memo } from "react";
import { Check, Plus, AlertCircle } from "lucide-react";
import {
  cn,
  fairOddsFromPickMarket,
  valueTagFromVip,
  generatePickReasons,
} from "@/utils/matchUtils";
import { Chip, ProgressBar } from "./PremiumUI";

export const HomePickRow = memo(function HomePickRow({
  m,
  idx,
  showDateInRows,
  darkMode,
  isPro,
  user,
  maxMatches,
  isMatchInBetslip,
  canAddMore,
  hasKickoffPassed,
  onAdd,
  onCompare,
  getISODate,
  getTime,
  getCountry,
  getLeague,
  getMatchTitle,
  getPick,
  getTips,
  getChance,
  getRating,
}) {
  const { confidenceLabel, reasons } = generatePickReasons(m);

  const matchTitle = getMatchTitle(m);
  const league = getLeague(m);
  const country = getCountry(m);
  const time = getTime(m);
  const date = getISODate(m);

  const chance = getChance(m);
  const rating = getRating(m);

  const alreadyAdded = isMatchInBetslip(m?.match);
  const kickoffPassed = hasKickoffPassed(m);
  const canAdd = user && !alreadyAdded && canAddMore() && !kickoffPassed;

  const vipScore = Math.round(chance * 0.6 + rating * 0.4);
  const valueLabel = valueTagFromVip(vipScore);
  const fairOdds = fairOddsFromPickMarket(m);
  const marketLabel = getPick(m) || getTips(m) || "Main";

  const riskNote = (() => {
    const chanceN = Number(chance) || 0;
    const ratingN = Number(rating) || 0;

    const hBtts = Number(m?.hBtts);
    const aBtts = Number(m?.aBtts);
    const bttsStrong =
      Number.isFinite(hBtts) &&
      Number.isFinite(aBtts) &&
      (hBtts + aBtts) / 2 >= 65;

    const hOv2 = Number(m?.hOv2);
    const aOv2 = Number(m?.aOv2);
    const overStrong =
      Number.isFinite(hOv2) && Number.isFinite(aOv2) && (hOv2 + aOv2) / 2 >= 62;

    if (chanceN >= 82 && ratingN >= 75)
      return "Low volatility: strong edge signals.";
    if (bttsStrong)
      return "Risk note: BTTS markets can swing late — manage stake.";
    if (overStrong)
      return "Risk note: Goal lines depend on early tempo — avoid over-staking.";
    if (chanceN < 70) return "Risk note: Medium edge — keep stake small.";
    return "Risk note: Watch lineup/news before staking.";
  })();

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[24px] border p-4 sm:p-5 transition-all duration-300",
        darkMode
          ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-blue-500/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          : "bg-white/80 border-gray-200 hover:bg-white hover:border-blue-300/50 hover:shadow-xl backdrop-blur-xl"
      )}
    >
      {/* Value Indicator Line */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5 transition-colors",
          valueLabel === "Value"
            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            : valueLabel === "Solid"
            ? "bg-blue-500"
            : "bg-transparent group-hover:bg-gray-300/50"
        )}
      />

      <div className="flex flex-col gap-4 pl-2 relative z-10 w-full">
        {/* === TOP SECTION: MATCH INFO (FULL WIDTH GUARANTEED) === */}
        <div className="w-full flex flex-col gap-2.5">
          <div
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.25em] flex flex-wrap items-center gap-2",
              darkMode ? "text-gray-400" : "text-gray-500"
            )}
          >
            {showDateInRows && date && (
              <span className="text-blue-500">{date}</span>
            )}
            {showDateInRows && date && <span className="opacity-30">•</span>}
            <span className="truncate max-w-full">
              {country ? `${country} • ` : ""}
              {league}
            </span>
            {time && <span className="opacity-30 shrink-0">•</span>}
            {time && <span className="shrink-0">{time}</span>}
          </div>

          {/* Team Names: Using line-clamp instead of truncate so long names wrap instead of breaking layout */}
          <div
            className={cn(
              "text-lg sm:text-xl font-black tracking-tight leading-tight line-clamp-2 break-words w-full",
              darkMode ? "text-gray-100" : "text-gray-900"
            )}
          >
            {matchTitle}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip
              tone={
                valueLabel === "Value"
                  ? "green"
                  : valueLabel === "Solid"
                  ? "blue"
                  : "gray"
              }
              darkMode={darkMode}
            >
              {valueLabel}
            </Chip>
            <Chip tone="purple" darkMode={darkMode}>
              VIP {vipScore}
            </Chip>
            <Chip tone="blue" darkMode={darkMode}>
              {marketLabel}
            </Chip>
            {fairOdds && (
              <Chip tone="gray" darkMode={darkMode}>
                Fair {fairOdds}
              </Chip>
            )}
          </div>
        </div>

        {/* === BOTTOM SECTION: METRICS & ACTIONS === */}
        <div
          className={cn(
            "flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t w-full",
            darkMode ? "border-white/5" : "border-gray-100"
          )}
        >
          {/* Metrics */}
          <div className="w-full sm:flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-end mb-1.5 text-[10px] font-black uppercase tracking-widest">
                  <span
                    className={darkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Chance
                  </span>
                  <span
                    className={
                      darkMode ? "text-emerald-400" : "text-emerald-600"
                    }
                  >
                    {chance}%
                  </span>
                </div>
                <ProgressBar value={chance} tone="green" darkMode={darkMode} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-end mb-1.5 text-[10px] font-black uppercase tracking-widest">
                  <span
                    className={darkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    Rating
                  </span>
                  <span
                    className={darkMode ? "text-blue-400" : "text-blue-600"}
                  >
                    {rating}%
                  </span>
                </div>
                <ProgressBar value={rating} tone="blue" darkMode={darkMode} />
              </div>
            </div>

            <div
              className={cn(
                "text-[10px] font-bold leading-relaxed w-full",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              {isPro ? (
                <div className="flex flex-col gap-1.5 w-full">
                  {reasons?.length > 0 && (
                    <div
                      className={cn(
                        "truncate w-full",
                        darkMode ? "text-gray-300" : "text-gray-700"
                      )}
                      title={reasons[0]}
                    >
                      <Check
                        size={12}
                        className="inline mr-1 text-emerald-500 mb-0.5 shrink-0"
                      />{" "}
                      {reasons[0]}
                    </div>
                  )}
                  <div
                    className={cn(
                      "truncate w-full",
                      darkMode ? "text-amber-400/80" : "text-amber-600/80"
                    )}
                    title={riskNote}
                  >
                    <AlertCircle
                      size={10}
                      className="inline mr-1 mb-0.5 shrink-0"
                    />{" "}
                    {riskNote}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-500/70 truncate w-full">
                  <span>🔒 Premium shows tactical rationale & risk notes</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Strip */}
          <div className="w-full sm:w-[130px] shrink-0 flex flex-row sm:flex-col items-center justify-end gap-2.5">
            <button
              onClick={() => onAdd(m)}
              disabled={!canAdd}
              title={
                !user
                  ? "Sign in to add picks"
                  : kickoffPassed
                  ? "Kickoff passed"
                  : alreadyAdded
                  ? "Already in BetSlip"
                  : !canAddMore()
                  ? `Max ${maxMatches || 20} matches reached`
                  : "Add to BetSlip"
              }
              className={cn(
                "flex-1 sm:w-full inline-flex justify-center items-center gap-2 px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.99]",
                alreadyAdded
                  ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400"
                  : !user || !canAddMore() || kickoffPassed
                  ? "bg-gray-200 text-gray-400 border border-transparent dark:bg-white/5 dark:text-gray-600 cursor-not-allowed"
                  : "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/40 border border-transparent"
              )}
            >
              {alreadyAdded ? (
                <>
                  <Check size={14} /> Added
                </>
              ) : (
                <>
                  <Plus size={14} /> Add
                </>
              )}
            </button>

            <button
              onClick={() => onCompare(m)}
              className={cn(
                "flex-1 sm:w-full inline-flex justify-center items-center px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border active:scale-[0.99]",
                darkMode
                  ? "bg-transparent border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/30"
                  : "bg-transparent border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
              )}
            >
              Compare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});