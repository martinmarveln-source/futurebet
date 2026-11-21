// @ts-nocheck
import { useState, useMemo, useDeferredValue } from "react";
import { useMatchFiltering } from "@/hooks/useMatchFiltering";

export function useExploreFilters(filteredMatches, isPro) {
  const [exploreQuery, setExploreQuery] = useState("");
  const [oddsMode, setOddsMode] = useState("all");
  const [oddsFilter, setOddsFilter] = useState("all");
  const [strengthOnly, setStrengthOnly] = useState(false);
  const [ratingBand, setRatingBand] = useState("All");
  const [evOnly, setEvOnly] = useState(false);

  const deferredQuery = useDeferredValue(exploreQuery);

  const {
    passesRatingBand,
    applyPremiumFilters,
    applySearchFilter,
    applyOddsFilters,
  } = useMatchFiltering();

  const exploreFilteredMatches = useMemo(() => {
    const base = Array.isArray(filteredMatches) ? filteredMatches : [];
    return applySearchFilter(base, deferredQuery);
  }, [filteredMatches, deferredQuery, applySearchFilter]);

  const finalExploreMatches = useMemo(() => {
    const base = Array.isArray(exploreFilteredMatches)
      ? exploreFilteredMatches
      : [];

    let list = applyOddsFilters(base, oddsMode, oddsFilter);

    // Interactive +EV filter toggle
    if (evOnly) {
      list = list.filter((m) => {
        return Boolean(
          m?.isValueBet ||
          (Number(m?.ev) > 0) ||
          (Number(m?.chance) >= 60 && Number(m?.rating) >= 65)
        );
      });
    }

    list = applyPremiumFilters(
      list,
      isPro,
      strengthOnly,
      ratingBand,
      passesRatingBand,
    );

    return list;
  }, [
    exploreFilteredMatches,
    isPro,
    strengthOnly,
    ratingBand,
    evOnly,
    oddsMode,
    oddsFilter,
    passesRatingBand,
    applyPremiumFilters,
    applyOddsFilters,
  ]);

  const displayQuery = exploreQuery.trim();
  const shownCount = finalExploreMatches.length;
  const baseCount = filteredMatches.length;

  return {
    exploreQuery,
    setExploreQuery,
    oddsMode,
    setOddsMode,
    oddsFilter,
    setOddsFilter,
    strengthOnly,
    setStrengthOnly,
    ratingBand,
    setRatingBand,
    evOnly,
    setEvOnly,
    finalExploreMatches,
    displayQuery,
    shownCount,
    baseCount,
  };
}
