// @ts-nocheck
import { useMemo, useCallback } from "react";
import { getOddsForMatch } from "@/utils/matchUtils";
import { getRecommendedMarket } from "@/components/Dashboard/MatchCard";
import { getOddsForPick } from "@/app/api/utils/oddsMath";

export function useMatchFiltering() {
  const bandRank = useCallback(
    (b) =>
      b === "B" ? 1 : b === "B+" ? 2 : b === "A" ? 3 : b === "A+" ? 4 : 0,
    [],
  );

  const ratingToBand = useCallback((r) => {
    const n = Number(r) || 0;
    if (n >= 85) return "A+";
    if (n >= 80) return "A";
    if (n >= 75) return "B+";
    if (n >= 70) return "B";
    return "C";
  }, []);

  const passesRatingBand = useCallback(
    (m, isPro, ratingBand) => {
      if (!isPro) return true;
      if (!ratingBand || ratingBand === "All") return true;
      const selectedRank = bandRank(ratingBand);
      const matchBand = ratingToBand(Number(m?.rating) || 0);
      const matchRank = bandRank(matchBand);
      return matchRank >= selectedRank;
    },
    [bandRank, ratingToBand],
  );

  const applyPremiumFilters = useCallback(
    (matches, isPro, strengthOnly, ratingBand, passesRatingBandFn) => {
      if (!isPro) return matches;

      let list = matches;

      if (strengthOnly) {
        list = list.filter((m) => {
          const chance = Number(m?.chance) || 0;
          const rating = Number(m?.rating) || 0;
          const flag = String(m?.flag || "") === "✅";
          return flag || (chance >= 75 && rating >= 65);
        });
      }

      list = list.filter((m) => passesRatingBandFn(m, isPro, ratingBand));
      return list;
    },
    [],
  );

  const applySearchFilter = useCallback((matches, query) => {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return matches;

    return matches.filter((m) => {
      const match = String(m?.match || m?.fixture || "").toLowerCase();
      const league = String(m?.fullLeague || m?.league || "").toLowerCase();
      const country = String(m?.country || "").toLowerCase();
      const market = String(
        m?.market || m?.marketLabel || m?.tipMarket || "",
      ).toLowerCase();
      const pick = String(
        m?.pick || m?.pickLabel || m?.prediction || "",
      ).toLowerCase();
      return (
        match.includes(q) ||
        league.includes(q) ||
        country.includes(q) ||
        market.includes(q) ||
        pick.includes(q)
      );
    });
  }, []);

  const applyOddsFilters = useCallback((matches, oddsMode, oddsFilter) => {
    let list = matches;

    if (oddsMode === "withOdds") {
      list = list.filter((m) => getOddsForMatch(m));
    }

    if (oddsFilter !== "all") {
      list = list.filter((m) => {
        const rec = getRecommendedMarket(m);
        
        if (oddsFilter === "value-edge") {
          return rec?.valueEdge > 0;
        }

        if (oddsFilter === "ev-system") {
          return rec?.valueEdge >= 5.0 && rec?.prob >= 60 && Number(m.rating || 0) >= 65;
        }

        if (oddsFilter === "push-alerts") {
          const guide = String(m?.pick || m?.guide || "");
          const chance = Number(m?.chance || 0);
          const rating = Number(m?.rating || 0);
          
          if (!guide || guide.toUpperCase() === "N/A") return false;
          if (chance < 70 || rating < 60) return false;
          
          const rawData = m?.rawData || m;
          const odds = getOddsForPick(rawData, guide);
          return odds > 1.01;
        }

        const odds = rec?.realOdds || getOddsForMatch(m);
        if (!odds) return false;

        if (oddsFilter === "1.1-1.49") return odds >= 1.1 && odds < 1.5;
        if (oddsFilter === "1.5-1.99") return odds >= 1.5 && odds < 2;
        if (oddsFilter === "2-2.99") return odds >= 2 && odds < 3;
        if (oddsFilter === "3+") return odds >= 3;

        return true;
      });
    }

    return list;
  }, []);

  return {
    bandRank,
    ratingToBand,
    passesRatingBand,
    applyPremiumFilters,
    applySearchFilter,
    applyOddsFilters,
  };
}
