const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', 'utf8');

const replacement = `  const handleConfirmBetslip = useCallback(
    (selectedMarket, selectedOption) => {
      const market = String(selectedMarket || "").trim();
      const option = String(selectedOption || "").trim();
      if (!market || !option) return;
      const store = useBetslipStore.getState();
      const computedOdds =
        typeof store?.computeOddsForSelection === "function"
          ? store.computeOddsForSelection(match, market, option)
          : null;

      if (computedOdds === null || computedOdds === undefined) {
        toast.error("Exact odds are currently unavailable for this selection. This match cannot be added to the betslip.");
        return;
      }

      const payload = {
        ...match,
        match: match?.match || match?.match_name || match?.matchName,
        league: match?.fullLeague || match?.league || "",
        selectedMarket: market,
        selectedOption: option,
        odds: computedOdds,
      };
      try {
        const added = store.addMatch?.(payload);
        if (added) {
          setShowBetslipModal(false);
        } else {
          toast.error("Could not add match. It may already be in your betslip.");
        }
      } catch (e) {
        toast.error("Could not add match to BetSlip.");
      }
    },
    [match]
  );

  const localConvictionStrength = useMemo(() => {
    if (!activeMarket || !marketViewPick) return convictionStrength;
    const prob = marketViewPick.prob || 0;
    if (prob <= 50) return 0;
    const diff = prob - (100 - prob);
    return Math.round((diff / prob) * 100);
  }, [activeMarket, marketViewPick, convictionStrength]);

  const localConvictionTier = useMemo(() => {
    if (!activeMarket) return convictionTier;
    const s = localConvictionStrength;
    if (s >= 80) return "Ultra";
    if (s >= 60) return "Strong";
    if (s >= 40) return "Moderate";
    if (s >= 20) return "Weak";
    return "Low";
  }, [activeMarket, localConvictionStrength, convictionTier]);

  const handleShareClick = async (e) => {
    e.preventDefault();
    if (!canSeeAdvancedData) {
      toast.error("🔒 Premium Feature: Upgrade to Pro to share elite VIP slips and unlock exact market odds!");
      window.dispatchEvent(new CustomEvent("futurebet:trigger-premium"));
      return;
    }

    if (!cardRef.current) return;
    setIsSharing(true);

    try {
      // Allow React to re-render to hide buttons and show the watermark`;

const startIdx = code.indexOf('  const handleConfirmBetslip = useCallback(');
const endIdx = code.indexOf('      // Allow React to re-render to hide buttons and show the watermark');

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find start or end indices!');
  process.exit(1);
}

const finalCode = code.substring(0, startIdx) + replacement + code.substring(endIdx + 72);
fs.writeFileSync('apps/web/src/components/Dashboard/MatchCard.tsx', finalCode);
console.log('Successfully repaired MatchCard.tsx!');
