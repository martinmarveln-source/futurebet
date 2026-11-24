// @ts-nocheck
import React, { useState, useMemo, memo, useCallback } from "react";
import { Check, Plus, Lock, TrendingUp, Sparkles } from "lucide-react";
import useBetslipStore from "@/store/betslipStore";
import { toast } from "sonner";

function cn(...c: any[]) {
  return c.filter(Boolean).join(" ");
}

const MARKETS = [
  { id: "1X2", label: "1X2" },
  { id: "OU", label: "O/U 2.5" },
  { id: "BTTS", label: "BTTS" },
  { id: "DC", label: "Double Chance" },
];

interface InteractiveOddsStripProps {
  match: any;
  darkMode?: boolean;
  canSeeAdvancedData?: boolean;
  isPro?: boolean;
  user?: any;
  kickoffPassed?: boolean;
  defaultMarket?: string;
}

export const InteractiveOddsStrip = memo(function InteractiveOddsStrip({
  match,
  darkMode = true,
  canSeeAdvancedData = true,
  isPro = false,
  user,
  kickoffPassed = false,
  defaultMarket = "1X2",
}: InteractiveOddsStripProps) {
  const [activeTab, setActiveTab] = useState(defaultMarket);

  const { matches: slipMatches, isMatchInBetslip, canAddMore } = useBetslipStore();
  const matchKey = String(match?.match || match?.fixture || "").trim();

  // Find if this match is currently in the slip, and which market/option was selected
  const activeSlipSelection = useMemo(() => {
    if (!matchKey || !slipMatches?.length) return null;
    return slipMatches.find(
      (m) => String(m.match || "").toLowerCase().trim() === matchKey.toLowerCase()
    );
  }, [slipMatches, matchKey]);

  // Derive options based on active tab
  const marketOptions = useMemo(() => {
    const store = useBetslipStore.getState();

    const getOddsAndProb = (marketName: string, optionName: string, fallbackProb: number) => {
      let odds = null;
      try {
        odds = store.computeOddsForSelection?.(match, marketName, optionName);
      } catch {
        odds = null;
      }
      const numOdds = Number(odds);
      const validOdds = Number.isFinite(numOdds) && numOdds > 1 ? Number(numOdds.toFixed(2)) : null;

      const prob = Math.round(Number(fallbackProb) || 0);

      // Value edge calculation: modelProb% - (1 / odds)%
      let edge = null;
      if (validOdds && prob > 0) {
        edge = Math.round((prob / 100 - 1 / validOdds) * 100 * 10) / 10;
      }

      return {
        market: marketName,
        option: optionName,
        odds: validOdds,
        prob,
        edge,
      };
    };

    if (activeTab === "1X2") {
      return [
        {
          key: "home",
          shortLabel: "1",
          subLabel: "Home",
          ...getOddsAndProb("1X2", "Home", match?.homeWin),
        },
        {
          key: "draw",
          shortLabel: "X",
          subLabel: "Draw",
          ...getOddsAndProb("1X2", "Draw", match?.draw),
        },
        {
          key: "away",
          shortLabel: "2",
          subLabel: "Away",
          ...getOddsAndProb("1X2", "Away", match?.awayWin),
        },
      ];
    }

    if (activeTab === "OU") {
      return [
        {
          key: "ov25",
          shortLabel: "Over 2.5",
          subLabel: "Goals",
          ...getOddsAndProb("Over 2.5", "Yes", match?.ov25),
        },
        {
          key: "un25",
          shortLabel: "Under 2.5",
          subLabel: "Goals",
          ...getOddsAndProb("Under 2.5", "Yes", match?.un25),
        },
      ];
    }

    if (activeTab === "BTTS") {
      return [
        {
          key: "btts_yes",
          shortLabel: "Yes (GG)",
          subLabel: "Both Score",
          ...getOddsAndProb("BTTS", "Yes", match?.gg),
        },
        {
          key: "btts_no",
          shortLabel: "No (NG)",
          subLabel: "Clean Sheet",
          ...getOddsAndProb("BTTS", "No", match?.ng),
        },
      ];
    }

    if (activeTab === "DC") {
      const pHome = Number(match?.homeWin) || 0;
      const pDraw = Number(match?.draw) || 0;
      const pAway = Number(match?.awayWin) || 0;

      return [
        {
          key: "dc_1x",
          shortLabel: "1X",
          subLabel: "Home/Draw",
          ...getOddsAndProb("Double Chance", "Home or Draw", pHome + pDraw),
        },
        {
          key: "dc_12",
          shortLabel: "12",
          subLabel: "Home/Away",
          ...getOddsAndProb("Double Chance", "Home or Away", pHome + pAway),
        },
        {
          key: "dc_x2",
          shortLabel: "X2",
          subLabel: "Draw/Away",
          ...getOddsAndProb("Double Chance", "Draw or Away", pDraw + pAway),
        },
      ];
    }

    return [];
  }, [activeTab, match]);

  // Handler for adding/toggling this specific market option in betslip
  const handleSelectOption = useCallback(
    (item: any) => {
      if (kickoffPassed) {
        toast.error("Kickoff has passed for this match.");
        return;
      }

      if (!user) {
        toast.error("Please sign in to add selections to your BetSlip.");
        return;
      }

      const store = useBetslipStore.getState();

      // If already in slip with this exact market and option, remove it
      if (
        activeSlipSelection &&
        activeSlipSelection.selectedMarket === item.market &&
        activeSlipSelection.selectedOption === item.option
      ) {
        store.removeMatch?.(matchKey);
        toast.info(`Removed ${matchKey} (${item.shortLabel}) from BetSlip`);
        return;
      }

      // Check if max allowed matches is reached
      if (!activeSlipSelection && !store.canAddMore?.()) {
        toast.error("BetSlip is full. Remove a pick to add a new one.");
        return;
      }

      if (!item.odds || item.odds <= 1) {
        toast.error("Odds are currently unavailable for this selection.");
        return;
      }

      // If match already exists with another selection, remove previous first
      if (activeSlipSelection) {
        store.removeMatch?.(matchKey);
      }

      const payload = {
        ...match,
        match: matchKey,
        league: match?.fullLeague || match?.league || "",
        selectedMarket: item.market,
        selectedOption: item.option,
        odds: item.odds,
      };

      try {
        const added = store.addMatch?.(payload);
        if (added) {
          toast.success(
            `Added ${item.shortLabel} @ ${Number(item.odds || 0).toFixed(2)} to BetSlip`
          );
        } else {
          toast.error("Could not add to BetSlip.");
        }
      } catch (err) {
        toast.error("Failed to add selection.");
      }
    },
    [kickoffPassed, user, activeSlipSelection, match, matchKey]
  );

  return (
    <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
      {/* Market Tabs Selector */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 no-scrollbar">
        <div className="flex items-center gap-1">
          {MARKETS.map((m) => {
            const isActive = activeTab === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveTab(m.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none whitespace-nowrap active:scale-95",
                  isActive
                    ? darkMode
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                      : "bg-blue-600 text-white shadow-sm"
                    : darkMode
                    ? "bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08]"
                    : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <span
          className={cn(
            "text-[9px] font-bold uppercase tracking-widest hidden sm:inline-block",
            darkMode ? "text-gray-400" : "text-gray-500"
          )}
        >
          Quick Add
        </span>
      </div>

      {/* Outcome Cards Grid */}
      <div
        className={cn(
          "grid gap-2",
          marketOptions.length === 2 ? "grid-cols-2" : "grid-cols-3"
        )}
      >
        {marketOptions.map((item) => {
          const isSelectedInSlip =
            activeSlipSelection &&
            activeSlipSelection.selectedMarket === item.market &&
            activeSlipSelection.selectedOption === item.option;

          const hasPositiveEdge = item.edge !== null && item.edge > 0;

          return (
            <button
              key={item.key}
              type="button"
              disabled={kickoffPassed}
              onClick={() => handleSelectOption(item)}
              className={cn(
                "group relative rounded-xl border p-2 flex flex-col items-center justify-between text-center transition-all duration-200 active:scale-[0.98]",
                kickoffPassed && "opacity-50 cursor-not-allowed",
                isSelectedInSlip
                  ? darkMode
                    ? "bg-emerald-500/15 border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                    : "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm"
                  : darkMode
                  ? "bg-white/[0.02] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                  : "bg-gray-50/80 border-gray-200 hover:bg-white hover:border-gray-300"
              )}
            >
              {/* Top: Selection label & Slip status indicator */}
              <div className="flex items-center justify-between w-full px-0.5 mb-1">
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider truncate",
                    isSelectedInSlip
                      ? "text-emerald-500"
                      : darkMode
                      ? "text-gray-300"
                      : "text-gray-700"
                  )}
                >
                  {item.shortLabel}
                </span>

                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center transition-transform",
                    isSelectedInSlip
                      ? "bg-emerald-500 text-white"
                      : darkMode
                      ? "bg-white/10 text-gray-400 group-hover:scale-110"
                      : "bg-gray-200 text-gray-500 group-hover:scale-110"
                  )}
                >
                  {isSelectedInSlip ? (
                    <Check size={10} strokeWidth={3} />
                  ) : (
                    <Plus size={10} strokeWidth={2.5} />
                  )}
                </span>
              </div>

              {/* Middle: Odds */}
              <div className="my-0.5">
                {item.odds ? (
                  canSeeAdvancedData ? (
                    <span
                      className={cn(
                        "text-base sm:text-lg font-black tabular-nums tracking-tight",
                        isSelectedInSlip
                          ? "text-emerald-500"
                          : darkMode
                          ? "text-white"
                          : "text-gray-900"
                      )}
                    >
                      {Number(item.odds || 0).toFixed(2)}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 cursor-pointer text-amber-500 text-xs font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.error("🔒 Upgrade to Pro to see exact real-time odds!");
                      }}
                    >
                      <span className="blur-[3px] select-none opacity-40 font-black text-sm">
                        1.95
                      </span>
                      <Lock size={10} />
                    </span>
                  )
                ) : (
                  <span className="text-xs font-bold opacity-40">—</span>
                )}
              </div>

              {/* Bottom: Probability + Edge badge */}
              <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-black/5 dark:border-white/5 text-[9px] tabular-nums font-bold">
                <span
                  className={cn(
                    darkMode ? "text-gray-400" : "text-gray-500"
                  )}
                >
                  {item.prob > 0 ? `${item.prob}% prob` : "—"}
                </span>

                {hasPositiveEdge && canSeeAdvancedData && (
                  <span
                    className={cn(
                      "font-black flex items-center gap-0.5",
                      item.edge >= 6
                        ? "text-emerald-500"
                        : "text-amber-500"
                    )}
                    title={`Model Expected Value Edge: +${item.edge}%`}
                  >
                    <TrendingUp size={9} />
                    +{item.edge}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default InteractiveOddsStrip;
