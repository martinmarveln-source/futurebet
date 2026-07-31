// @ts-nocheck
import { useMemo } from "react";
import { useMatchFiltering } from "@/hooks/useMatchFiltering";

export function useDashboardFilters(
  filteredMatches,
  isPro,
  strengthOnly,
  ratingBand,
) {
  const { passesRatingBand, applyPremiumFilters } = useMatchFiltering();

  const premiumFilteredMatches = useMemo(() => {
    const base = Array.isArray(filteredMatches) ? filteredMatches : [];
    return applyPremiumFilters(
      base,
      isPro,
      strengthOnly,
      ratingBand,
      passesRatingBand,
    );
  }, [
    filteredMatches,
    isPro,
    strengthOnly,
    ratingBand,
    passesRatingBand,
    applyPremiumFilters,
  ]);

  return premiumFilteredMatches;
}
