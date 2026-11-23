// @ts-nocheck
import { memo, useMemo, useCallback } from "react";
import { cn, fairOddsFromPickMarket } from "@/utils/matchUtils";
import { Chip } from "./PremiumUI";
import { HomePickRow } from "./HomePickRow";
import { Calendar, Sparkles, Target, ArrowRight, Layers, PlusCircle } from "lucide-react";
import useBetslipStore from "@/store/betslipStore";
import { normalizePickDescriptor, resolveOddsForSelection } from "@/utils/pickEngine";

export const HomeCard = memo(function HomeCard({
  title,
  subtitle,
  list,
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
  onExplore,
  selectors,
  matchesLoading,
  groupByDate,
}) {
  const { getChance, getRating, getMatchTitle } = selectors;

  const count = Array.isArray(list) ? list.length : 0;

  const avgChance = count
    ? Math.round(list.reduce((a, m) => a + (getChance(m) || 0), 0) / count)
    : 0;

  const avgRating = count
    ? Math.round(list.reduce((a, m) => a + (getRating(m) || 0), 0) / count)
    : 0;

  // Combined accumulator odds calculation for top picks
  const { accaOdds, accaCount } = useMemo(() => {
    if (!Array.isArray(list) || list.length === 0)
      return { accaOdds: null, accaCount: 0 };
    let mult = 1;
    let validCount = 0;
    for (const m of list.slice(0, 5)) {
      const pick =
        (selectors.getPick ? selectors.getPick(m) : m?.pick) ||
        (selectors.getTips ? selectors.getTips(m) : m?.tips);
      const norm = normalizePickDescriptor(pick);
      let odds = Number(m?.pickOdds);
      if (!odds && norm)
        odds = Number(resolveOddsForSelection(m, norm.market, norm.option));
      if (!odds && norm)
        odds = Number(
          useBetslipStore.getState().computeOddsForSelection(m, norm.market, norm.option)
        );
      if (!odds)
        odds = Number(
          m?.odds || m?.bookmakerOdds || m?.bestOdds || fairOddsFromPickMarket(m)
        );
      if (Number.isFinite(odds) && odds > 1) {
        mult *= odds;
        validCount++;
      }
    }
    return {
      accaOdds: validCount >= 2 ? mult.toFixed(2) : null,
      accaCount: validCount,
    };
  }, [list, selectors]);

  // Quick 1-click "Add All" to BetSlip
  const handleAddAllToSlip = useCallback(() => {
    if (!user) {
      alert("Sign in to add picks to BetSlip.");
      return;
    }
    if (!Array.isArray(list) || list.length === 0) return;
    const addMatch = useBetslipStore.getState().addMatch;

    for (const m of list) {
      if (isMatchInBetslip(m?.match) || hasKickoffPassed(m)) continue;
      if (!canAddMore()) break;

      const pick =
        (selectors.getPick ? selectors.getPick(m) : m?.pick) ||
        (selectors.getTips ? selectors.getTips(m) : m?.tips) ||
        "Main";
      const norm = normalizePickDescriptor(pick);
      const targetMarket = norm?.market || "1X2";
      const targetOption = norm?.option || "Home";

      let odds = Number(m?.pickOdds);
      if (!odds && norm)
        odds = Number(resolveOddsForSelection(m, norm.market, norm.option));
      if (!odds && norm)
        odds = Number(
          useBetslipStore.getState().computeOddsForSelection(m, norm.market, norm.option)
        );
      if (!odds)
        odds = Number(
          m?.odds || m?.bookmakerOdds || m?.bestOdds || fairOddsFromPickMarket(m)
        );

      if (Number.isFinite(odds) && odds > 1) {
        addMatch({
          ...m,
          odds: Number(odds.toFixed(2)),
          selectedMarket: targetMarket,
          selectedOption: targetOption,
          initialMarket: targetMarket,
          initialOption: targetOption,
        });
      }
    }
  }, [user, list, isMatchInBetslip, hasKickoffPassed, canAddMore, selectors]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[32px] border transition-all",
        darkMode
          ? "bg-white/[0.02] border-white/10 shadow-2xl"
          : "bg-white border-gray-200 shadow-xl"
      )}
    >
      {/* Subtle Top Glow */}
      <div
        className={cn(
          "absolute top-0 left-0 w-full h-1",
          darkMode
            ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent"
            : "bg-gradient-to-r from-blue-400 via-indigo-400 to-transparent"
        )}
      />

      <div className="p-5 sm:p-7">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles
                className={cn(
                  "h-5 w-5",
                  darkMode ? "text-amber-400" : "text-amber-500"
                )}
              />
              <h2
                className={cn(
                  "text-xl sm:text-2xl font-black tracking-tight",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {title}
              </h2>
            </div>
            <p
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em]",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              {subtitle}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm",
                  darkMode
                    ? "bg-gray-900/50 border-gray-800 text-gray-300"
                    : "bg-gray-50 border-gray-200 text-gray-700"
                )}
              >
                <Calendar size={14} className="opacity-70" /> {count} Picks
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm",
                  darkMode
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                )}
              >
                <Target size={14} className="opacity-70" /> Chance {avgChance}%
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm",
                  darkMode
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                )}
              >
                <Sparkles size={14} className="opacity-70" /> Rating {avgRating}%
              </div>
              {accaOdds && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm",
                    darkMode
                      ? "bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                      : "bg-purple-50 border-purple-200 text-purple-700"
                  )}
                  title={`Combined accumulator odds for top ${accaCount} picks`}
                >
                  <Layers size={14} className="opacity-70" /> Top {accaCount} Acca ~{accaOdds}x
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {count > 0 && (
              <button
                onClick={handleAddAllToSlip}
                disabled={!user || !canAddMore()}
                className={cn(
                  "shrink-0 inline-flex items-center justify-center gap-1.5 text-xs font-black px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.99]",
                  !user || !canAddMore()
                    ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200 dark:bg-white/5 dark:text-gray-500 dark:border-white/5"
                    : darkMode
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm"
                )}
                title={!user ? "Sign in to add picks" : "Add all available picks to BetSlip"}
              >
                <PlusCircle size={15} /> Add All ({count})
              </button>
            )}
            <button
              onClick={onExplore}
              className={cn(
                "shrink-0 inline-flex items-center justify-center gap-2 text-xs font-black px-5 py-3.5 rounded-2xl border transition-all active:scale-[0.99]",
                darkMode
                  ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  : "bg-gray-900 border-gray-900 hover:bg-black text-white shadow-lg shadow-gray-900/20"
              )}
            >
              Explore All <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {matchesLoading ? (
            <div
              className={cn(
                "py-10 text-center text-sm font-bold uppercase tracking-widest animate-pulse",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}
            >
              Scanning database...
            </div>
          ) : !list || list.length === 0 ? (
            <div
              className={cn(
                "py-10 text-center text-sm font-bold",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}
            >
              No verified matches found for this period.
            </div>
          ) : groupByDate ? (
            (() => {
              const groups = (list || []).reduce((acc, m) => {
                const d = selectors.getISODate(m) || "Unknown date";
                (acc[d] ||= []).push(m);
                return acc;
              }, {});

              return Object.entries(groups)
                .sort(([a], [b]) => (a > b ? 1 : -1))
                .map(([date, items]) => (
                  <div key={date} className="space-y-3 mt-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-px flex-1",
                          darkMode ? "bg-white/5" : "bg-gray-200"
                        )}
                      />
                      <div
                        className={cn(
                          "text-[10px] font-black uppercase tracking-[0.2em]",
                          darkMode ? "text-blue-400" : "text-blue-600"
                        )}
                      >
                        {date}
                      </div>
                      <div
                        className={cn(
                          "h-px flex-1",
                          darkMode ? "bg-white/5" : "bg-gray-200"
                        )}
                      />
                    </div>

                    <div className="grid gap-3">
                      {items.map((m, idx) => (
                        <HomePickRow
                          key={m?.sn ?? `${getMatchTitle(m)}-${date}-${idx}`}
                          m={m}
                          idx={idx}
                          showDateInRows={false}
                          darkMode={darkMode}
                          isPro={isPro}
                          user={user}
                          maxMatches={maxMatches}
                          isMatchInBetslip={isMatchInBetslip}
                          canAddMore={canAddMore}
                          hasKickoffPassed={hasKickoffPassed}
                          onAdd={onAdd}
                          onCompare={onCompare}
                          {...selectors}
                        />
                      ))}
                    </div>
                  </div>
                ));
            })()
          ) : (
            (list || []).map((m, idx) => (
              <HomePickRow
                key={m?.sn ?? `${getMatchTitle(m)}-${idx}`}
                m={m}
                idx={idx}
                showDateInRows={!!showDateInRows}
                darkMode={darkMode}
                isPro={isPro}
                user={user}
                maxMatches={maxMatches}
                isMatchInBetslip={isMatchInBetslip}
                canAddMore={canAddMore}
                hasKickoffPassed={hasKickoffPassed}
                onAdd={onAdd}
                onCompare={onCompare}
                {...selectors}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
});