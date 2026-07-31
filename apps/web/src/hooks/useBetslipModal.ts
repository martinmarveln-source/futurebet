// @ts-nocheck
import { useState, useCallback } from "react";

export function useBetslipModal() {
  const [showHomeSlipModal, setShowHomeSlipModal] = useState(false);
  const [pendingSlipMatch, setPendingSlipMatch] = useState(null);

  // === UPGRADE 1: Telemetry Feedback State ===
  // This replaces the ugly browser alert() with state we can use for in-app UI
  const [slipFeedback, setSlipFeedback] = useState(null);

  const openHomeSlipModal = useCallback((m) => {
    setPendingSlipMatch(m);
    setShowHomeSlipModal(true);
    setSlipFeedback(null); // Clear any old errors when opening
  }, []);

  const closeHomeSlipModal = useCallback(() => {
    setShowHomeSlipModal(false);
    setSlipFeedback(null);

    // === UPGRADE 2: Animation Preservation ===
    // We wait 300ms before clearing the match data so the modal
    // doesn't suddenly flash empty while it is animating closed.
    setTimeout(() => {
      setPendingSlipMatch(null);
    }, 300);
  }, []);

  const confirmHomeSlipAdd = useCallback(
    ({ selectedMarket, selectedOption }, addMatch, maxMatches) => {
      if (!pendingSlipMatch) return { success: false };

      const ok = addMatch({
        ...pendingSlipMatch,
        selectedMarket,
        selectedOption,
      });

      if (!ok) {
        // === UPGRADE 3: Silent Failure Handling ===
        // Instead of freezing the browser with an alert(), we set an error state
        setSlipFeedback({
          type: "error",
          message: `Capacity Reached: Maximum of ${
            maxMatches || 20
          } matches allowed in Slip Engine.`,
        });
        return { success: false, error: "capacity_reached" };
      }

      setShowHomeSlipModal(false);

      setTimeout(() => {
        setPendingSlipMatch(null);
      }, 300);

      return { success: true };
    },
    [pendingSlipMatch]
  );

  return {
    showHomeSlipModal,
    pendingSlipMatch,
    slipFeedback, // Export the new feedback state
    openHomeSlipModal,
    closeHomeSlipModal,
    confirmHomeSlipAdd,
    setSlipFeedback, // Export setter in case you need to clear it manually
  };
}