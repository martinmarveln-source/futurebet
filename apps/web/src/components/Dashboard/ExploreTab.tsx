// @ts-nocheck
import React from "react";
import StatsCards from "@/components/Dashboard/StatsCards";
import { ExploreSearchBar } from "@/components/Dashboard/ExploreSearchBar";
import { ExploreFilters } from "@/components/Dashboard/ExploreFilters";
import SocialLinks from "@/components/Dashboard/SocialLinks";
import MatchesList from "@/components/Dashboard/MatchesList";

export function ExploreTab({
  matchesData,
  finalExploreMatches,
  darkMode,
  exploreQuery,
  setExploreQuery,
  displayQuery,
  shownCount,
  baseCount,
  isPro,
  strengthOnly,
  setStrengthOnly,
  ratingBand,
  setRatingBand,
  oddsMode,
  setOddsMode,
  oddsFilter,
  setOddsFilter,
  matchesLoading,
  refetch,
  chanceThreshold,
  setChanceThreshold,
  ratingThreshold,
  setRatingThreshold,
  hasFilterAccess,
  filterPanelProps,
  sortBy,
  setSortBy,
  matchesError,
  selectedDate,
  hasKickoffPassed,
}) {
  return (
    // 🔥 FIX 1: Wrap in a div instead of a fragment.
    // This gives the browser a stable DOM node to track during re-renders.
    <div className="relative w-full overflow-visible">
      <StatsCards
        matchesData={matchesData}
        filteredMatches={finalExploreMatches}
        darkMode={darkMode}
      />

      <ExploreSearchBar
        exploreQuery={exploreQuery}
        setExploreQuery={setExploreQuery}
        displayQuery={displayQuery}
        shownCount={shownCount}
        baseCount={baseCount}
        darkMode={darkMode}
      />

      <ExploreFilters
        isPro={isPro}
        strengthOnly={strengthOnly}
        setStrengthOnly={setStrengthOnly}
        ratingBand={ratingBand}
        setRatingBand={setRatingBand}
        oddsMode={oddsMode}
        setOddsMode={setOddsMode}
        oddsFilter={oddsFilter}
        setOddsFilter={setOddsFilter}
        matchesLoading={matchesLoading}
        refetch={refetch}
        chanceThreshold={chanceThreshold}
        setChanceThreshold={setChanceThreshold}
        ratingThreshold={ratingThreshold}
        setRatingThreshold={setRatingThreshold}
        darkMode={darkMode}
        hasFilterAccess={hasFilterAccess}
        filterPanelProps={filterPanelProps}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <SocialLinks darkMode={darkMode} />

      <MatchesList
        matchesLoading={matchesLoading}
        matchesError={matchesError}
        filteredMatches={finalExploreMatches}
        matchesData={matchesData}
        selectedDate={selectedDate}
        darkMode={darkMode}
        hasKickoffPassed={hasKickoffPassed}
        sortBy={sortBy}
        isPro={isPro}
      />
    </div>
  );
}