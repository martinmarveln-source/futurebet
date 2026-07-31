// @ts-nocheck
import { useCallback } from "react";

export function useHomeActions({
  setActiveTab,
  setStrengthOnly,
  setRatingBand,
  setChanceThreshold,
  setRatingThreshold,
  setSortBy,
}) {
  const applyHomePreset = useCallback(
    (preset) => {
      setActiveTab("explore");

      if (preset === "conservative") {
        setStrengthOnly(true);
        setRatingBand("B+");
        setChanceThreshold(75);
        setRatingThreshold(70);
        setSortBy("rating");
        return;
      }

      if (preset === "balanced") {
        setStrengthOnly(true);
        setRatingBand("B");
        setChanceThreshold(70);
        setRatingThreshold(65);
        setSortBy("rating");
        return;
      }

      setStrengthOnly(false);
      setRatingBand("All");
      setChanceThreshold(65);
      setRatingThreshold(60);
      setSortBy("chance");
    },
    [
      setActiveTab,
      setStrengthOnly,
      setRatingBand,
      setChanceThreshold,
      setRatingThreshold,
      setSortBy,
    ],
  );

  const handleAddFromHome = useCallback(
    (m, user, isMatchInBetslip, canAddMore, maxMatches, openHomeSlipModal) => {
      if (!user) {
        alert("Sign in to add picks to BetSlip.");
        return;
      }
      if (isMatchInBetslip(m?.match)) return;

      if (!canAddMore()) {
        alert(`Betslip is full. Max ${maxMatches || 20} matches allowed.`);
        return;
      }

      openHomeSlipModal(m);
    },
    [],
  );

  return {
    applyHomePreset,
    handleAddFromHome,
  };
}
