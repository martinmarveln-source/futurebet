// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import useBetslipStore from "@/store/betslipStore";
import useUserPermissions from "@/hooks/useUserPermissions";
import BetslipMarketModal from "@/components/Dashboard/BetslipMarketModal";
import { formatNaira } from "@/utils/matchUtils";
import {
  Ticket,
  X,
  AlertTriangle,
  Lock,
  Share2,
  Zap,
  Edit2,
  ExternalLink,
  ChevronDown,
  Calculator,
} from "lucide-react";

/* =========================
   Small UI helper
========================= */
function cn(...c) {
  return c.filter(Boolean).join(" ");
}

/* =========================
   🔥 UPGRADE: O(n^2) DYNAMIC PROGRAMMING ENGINE
========================= */
function calculateSystemBetFast(validSelections, comboSize, stakePerBet) {
  const n = validSelections.length;
  const k = comboSize;

  const dp = new Array(k + 1).fill(0);
  dp[0] = 1;

  for (let i = 0; i < n; i++) {
    const odds = Number(validSelections[i]?.odds || 1);
    for (let j = Math.min(i + 1, k); j >= 1; j--) {
      dp[j] = dp[j] + odds * dp[j - 1];
    }
  }

  const maxReturn = dp[k] * stakePerBet;

  let numBets = 1;
  for (let i = 1; i <= k; i++) {
    numBets = (numBets * (n - i + 1)) / i;
  }
  numBets = Math.round(numBets);

  const totalStake = numBets * stakePerBet;

  const label =
    comboSize === 1
      ? "Singles"
      : comboSize === 2
      ? "Doubles"
      : comboSize === 3
      ? "Trebles"
      : `${comboSize}-Folds (Acca)`;

  return {
    size: comboSize,
    label,
    numBets,
    totalStake,
    maxReturn,
  };
}

/* =========================
   BetSlip (SYSTEM BET ENGINE)
========================= */
export default function BetSlip({ darkMode = false }) {
  const { isAdmin, isPremium } = useUserPermissions();
  const isPro = Boolean(isAdmin || isPremium);

  const {
    matches,
    removeMatch,
    clearAll,
    updateMatchSelection,
    setStakeAmount,
  } = useBetslipStore();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [tracking, setTracking] = useState(false);

  // Router State
  const [selectedBookie, setSelectedBookie] = useState("1XBET");
  const [isRouting, setIsRouting] = useState(false);

  // System Bets State
  const [systemStakes, setSystemStakes] = useState({});

  const total = matches?.length || 0;

  const missingSelection = useMemo(() => {
    return (matches || []).some(
      (m) => !m?.selectedMarket || !m?.selectedOption
    );
  }, [matches]);

  const validMatches = useMemo(() => {
    return (matches || []).filter((m) => {
      const o = Number(m?.odds);
      return Number.isFinite(o) && o > 1;
    });
  }, [matches]);

  const systemBets = useMemo(() => {
    const types = [];
    const n = validMatches.length;
    if (n === 0) return types;

    for (let k = 1; k <= n; k++) {
      const stakePerBet = Number(systemStakes[k]) || 0;
      types.push(calculateSystemBetFast(validMatches, k, stakePerBet));
    }
    return types;
  }, [validMatches, systemStakes]);

  const grandTotalStake = useMemo(() => {
    return systemBets.reduce((sum, bet) => sum + bet.totalStake, 0);
  }, [systemBets]);

  const grandMaxReturn = useMemo(() => {
    return systemBets.reduce((sum, bet) => sum + bet.maxReturn, 0);
  }, [systemBets]);

  useEffect(() => {
    setStakeAmount(grandTotalStake);
  }, [grandTotalStake, setStakeAmount]);

  const handleSystemStakeChange = (size, val) => {
    setSystemStakes((prev) => ({
      ...prev,
      [size]: Math.max(0, Number(val)),
    }));
  };

  // 🔥 UX FIX: Dedicated button for quick Singles
  const handleQuickStakeSingles = (amt) => {
    if (validMatches.length > 0) {
      setSystemStakes((prev) => ({
        ...prev,
        [1]: amt,
      }));
    }
  };

  // Dedicated button for quick Accumulator
  const handleQuickStakeAll = (amt) => {
    const n = validMatches.length;
    if (n > 0) {
      setSystemStakes((prev) => ({
        ...prev,
        [n]: amt,
      }));
    }
  };

  const handleRouteToBookie = () => {
    if (!isPro) {
      alert(
        "🔒 Premium Feature: Upgrade to Pro to unlock One-Click Sportsbook Routing!"
      );
      window.dispatchEvent(new CustomEvent("futurebet:trigger-premium"));
      return;
    }

    if (missingSelection) {
      alert(
        "Please ensure all matches have a market and option selected before routing."
      );
      return;
    }

    setIsRouting(true);

    const payloadStr = matches
      .map((m) => {
        const cleanMatch = encodeURIComponent(
          m.match.replace(/\s+/g, "-").toLowerCase()
        );
        const cleanMarket = encodeURIComponent(
          m.selectedMarket.replace(/\s+/g, "").toLowerCase()
        );
        return `${cleanMatch}_${cleanMarket}`;
      })
      .join("|");

    let targetUrl = "";
    if (selectedBookie === "1XBET") {
      targetUrl = `https://1xbet.ng/en/line/football?betslip=${payloadStr}&stake=${
        grandTotalStake || 1000
      }`;
    } else if (selectedBookie === "SPORTYBET") {
      targetUrl = `https://www.sportybet.com/ng/m/sports/football?loadslip=${payloadStr}`;
    } else if (selectedBookie === "BETWAY") {
      targetUrl = `https://www.betway.com.ng/sport/soccer?bets=${payloadStr}`;
    }

    setTimeout(() => {
      setIsRouting(false);
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }, 800);
  };

  const handleTrack = () => {
    if (!isPro) {
      alert("Premium feature: Upgrade to track tickets and share Ticket ID.");
      return;
    }
    if (!total) {
      alert("Your BetSlip is empty.");
      return;
    }
    if (missingSelection) {
      alert(
        "Some selections are missing Market/Option. Please select them first."
      );
      return;
    }
    if (grandTotalStake <= 0) {
      alert("Please enter a stake for at least one bet type.");
      return;
    }

    setTracking(true);
    const result = useBetslipStore.getState().trackThisBet(systemStakes);
    setTracking(false);

    if (!result?.ok) {
      if (result.reason === "empty") return alert("Your BetSlip is empty.");
      if (result.reason === "missing_selection")
        return alert("Please select market and option for all matches.");
      if (result.reason === "invalid_stake")
        return alert("Please enter a valid stake amount.");
      if (result.reason === "too_many_combinations")
        return alert(result.message);
      return alert("Failed to track ticket.");
    }
    alert(`Tracked: ${result.ticketId}`);

    // 🔥 UX FIX: Clear the inputs so old stakes don't accidentally get applied to new tickets
    setSystemStakes({});
  };

  const handleShare = async () => {
    if (!total) return alert("Your BetSlip is empty.");
    if (missingSelection)
      return alert("Complete all selections before sharing!");

    const lines = ["🔥 *MY FUTUREBET SYSTEM* 🔥", ""];
    matches.forEach((m, i) => {
      lines.push(`${i + 1}️⃣ ${m.match}`);
      lines.push(`🎯 ${m.selectedMarket}: ${m.selectedOption}`);
      if (Number(m.odds) > 0)
        lines.push(`📊 Odds: ${Number(m.odds).toFixed(2)}`);
      lines.push("");
    });

    systemBets.forEach((bet) => {
      if (bet.totalStake > 0) {
        lines.push(`💸 ${bet.label} (${bet.numBets} bets)`);
        lines.push(
          `Stake: ₦${bet.totalStake} | Potential: ₦${bet.maxReturn.toFixed(2)}`
        );
      }
    });

    lines.push("");
    lines.push(`📈 Grand Total Stake: ${formatNaira(grandTotalStake)}`);
    if (grandMaxReturn > 0) {
      lines.push(
        `🚀 Max Potential Return: ${formatNaira(grandMaxReturn)}`
      );
    }
    lines.push("");
    lines.push("🤖 Built with FutureBet Pro");

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      alert("✅ VIP System Slip copied to clipboard!");
    } catch {
      alert("Copy failed on this device.");
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <div
        className={cn(
          "rounded-3xl border p-5 flex items-center justify-between shadow-sm",
          darkMode
            ? "border-white/10 bg-white/[0.02]"
            : "border-gray-200 bg-white"
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
              darkMode
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-emerald-50 text-emerald-600 border border-emerald-200"
            )}
          >
            <Ticket size={24} />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight">
              System Bet Builder
            </div>
            <div
              className={cn(
                "text-xs font-bold uppercase tracking-widest mt-0.5",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}
            >
              {total} Selections • Max 20
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            clearAll();
            setSystemStakes({});
          }}
          disabled={!total}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-extrabold border transition",
            !total
              ? "opacity-30 cursor-not-allowed"
              : darkMode
              ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-300"
              : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
          )}
        >
          Clear All
        </button>
      </div>

      {/* Warnings */}
      {missingSelection && total > 0 && (
        <div
          className={cn(
            "rounded-2xl border p-4 flex items-start gap-3",
            darkMode
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm font-semibold">
            Missing markets! Tap "Edit Market" on your matches to calculate odds
            and system combinations.
          </div>
        </div>
      )}

      {/* Matches List */}
      <div className="space-y-3 pb-6">
        {!total ? (
          <div
            className={cn(
              "rounded-3xl border p-10 text-center flex flex-col items-center justify-center gap-3",
              darkMode
                ? "border-white/5 bg-white/[0.01]"
                : "border-gray-200 bg-gray-50/50"
            )}
          >
            <Ticket
              className={cn(
                "h-12 w-12",
                darkMode ? "text-gray-800" : "text-gray-300"
              )}
            />
            <div
              className={cn(
                "text-sm font-bold",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}
            >
              Your accumulator is empty. Find matches in Explore or VIP.
            </div>
          </div>
        ) : (
          matches.map((m) => {
            const market = m?.selectedMarket || "";
            const option = m?.selectedOption || "";
            const oddsNum = Number(m?.odds);
            const matchHasOdds = Number.isFinite(oddsNum) && oddsNum > 1;
            const ready = Boolean(market && option);

            return (
              <div
                key={m.match}
                className={cn(
                  "relative rounded-[24px] border transition-all group overflow-hidden",
                  darkMode
                    ? "bg-white/[0.02] border-white/5 hover:border-white/10"
                    : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                )}
              >
                {ready && matchHasOdds && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                )}

                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 pl-2">
                      <div
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest mb-1.5",
                          darkMode ? "text-blue-400" : "text-blue-600"
                        )}
                      >
                        {m.league || "Custom League"}
                      </div>
                      <div className="text-base sm:text-lg font-black tracking-tight truncate mb-3">
                        {m.match}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {ready ? (
                          <>
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                darkMode
                                  ? "bg-white/10 text-gray-300"
                                  : "bg-gray-100 text-gray-700"
                              )}
                            >
                              {market}
                            </span>
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                darkMode
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                  : "bg-blue-50 border-blue-200 text-blue-700"
                              )}
                            >
                              {option}
                            </span>
                            <button
                              onClick={() => {
                                setEditingMatch(m);
                                setModalOpen(true);
                              }}
                              className={cn(
                                "ml-1 p-1 rounded-md transition-colors",
                                darkMode
                                  ? "text-gray-500 hover:text-white hover:bg-white/10"
                                  : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                              )}
                              title="Edit Market Selection"
                            >
                              <Edit2 size={12} />
                            </button>
                          </>
                        ) : (
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                              darkMode
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            )}
                          >
                            Action Required
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-white/5 pl-2 sm:pl-0 mt-3 sm:mt-0">
                      <button
                        onClick={() => {
                          removeMatch(m.match);
                          setSystemStakes({});
                        }}
                        className={cn(
                          "p-2 rounded-xl transition-colors sm:opacity-40 sm:hover:opacity-100 shrink-0",
                          darkMode
                            ? "hover:bg-rose-500/20 hover:text-rose-400 text-rose-500 sm:text-gray-500"
                            : "hover:bg-rose-50 text-rose-600 sm:text-gray-400"
                        )}
                        title="Remove Match"
                      >
                        <X size={18} />
                      </button>

                      {matchHasOdds ? (
                        <div
                          className={cn(
                            "text-xl sm:text-2xl font-black tabular-nums tracking-tighter",
                            darkMode ? "text-emerald-400" : "text-emerald-600"
                          )}
                        >
                          {oddsNum.toFixed(2)}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingMatch(m);
                            setModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black hover:bg-amber-400 transition animate-pulse shadow-sm"
                        >
                          Select Market
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* === SYSTEM BET BUILDER === */}
      {total > 0 && validMatches.length > 0 && (
        <div
          className={cn(
            "sticky bottom-4 z-40 rounded-[32px] p-5 sm:p-6 border shadow-2xl backdrop-blur-2xl mt-4",
            darkMode
              ? "bg-gray-950/90 border-white/10"
              : "bg-white/95 border-gray-200"
          )}
        >
          <div className="flex items-center gap-2 mb-4 text-xs font-black uppercase tracking-widest text-gray-500">
            <Calculator size={14} /> System Bet Combinations
          </div>

          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {systemBets.map((bet) => (
              <div
                key={bet.size}
                className={cn(
                  "p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                  bet.totalStake > 0
                    ? darkMode
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-emerald-400 bg-emerald-50"
                    : darkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-gray-50"
                )}
              >
                <div className="flex-1">
                  <div
                    className={cn(
                      "text-sm font-black tracking-tight",
                      darkMode ? "text-white" : "text-gray-900"
                    )}
                  >
                    {bet.label}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                    {bet.numBets} {bet.numBets === 1 ? "Bet" : "Bets"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">
                      ₦
                    </span>
                    <input
                      aria-label="Stake per bet"
                      type="number"
                      value={systemStakes[bet.size] || ""}
                      onChange={(e) =>
                        handleSystemStakeChange(bet.size, e.target.value)
                      }
                      placeholder="Stake / Bet"
                      className={cn(
                        "w-full pl-6 pr-3 py-2 rounded-xl text-xs font-black tabular-nums outline-none transition-all",
                        darkMode
                          ? "bg-black/50 border-transparent focus:bg-black/80 focus:ring-1 focus:ring-emerald-500 text-white"
                          : "bg-white border-gray-200 focus:ring-2 focus:ring-emerald-400 text-gray-900 border"
                      )}
                    />
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                      Potential
                    </div>
                    <div
                      className={cn(
                        "text-xs font-black tabular-nums truncate",
                        bet.maxReturn > 0
                          ? "text-emerald-500"
                          : darkMode
                          ? "text-gray-400"
                          : "text-gray-400"
                      )}
                    >
                      ₦{bet.maxReturn.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-end justify-between mb-6 pt-4 border-t border-gray-200 dark:border-white/10">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1.5">
                <Zap
                  size={12}
                  className={
                    grandTotalStake > 0 ? "text-amber-500" : "text-gray-400"
                  }
                />{" "}
                Total Stake
              </div>
              <div
                className={cn(
                  "text-3xl sm:text-4xl font-black tabular-nums tracking-tighter leading-none transition-all duration-500",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {formatNaira(grandTotalStake)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                Max Potential Payout
              </div>
              <div
                className={cn(
                  "text-xl sm:text-2xl font-black tabular-nums leading-none",
                  grandMaxReturn > 0
                    ? darkMode
                      ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                      : "text-emerald-600"
                    : darkMode
                    ? "text-gray-500"
                    : "text-gray-400"
                )}
              >
                {formatNaira(grandMaxReturn)}
              </div>
            </div>
          </div>

          {/* 🔥 UX FIX: Dual Quick Stake Buttons */}
          <div className="flex flex-col gap-3 w-full mb-6">
            <div className="flex gap-2 items-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest w-24 shrink-0">
                Quick Singles:
              </div>
              {[1000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleQuickStakeSingles(amt)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all active:scale-[0.98]",
                    darkMode
                      ? "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-gray-300"
                      : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                  )}
                >
                  {amt / 1000}k
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest w-24 shrink-0">
                Quick Acca:
              </div>
              {[1000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleQuickStakeAll(amt)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all active:scale-[0.98]",
                    darkMode
                      ? "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-gray-300"
                      : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                  )}
                >
                  {amt / 1000}k
                </button>
              ))}
            </div>
          </div>

          {/* ROUTING AND ACTION ROW */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex gap-3 w-full sm:w-1/2">
              <button
                onClick={handleShare}
                disabled={missingSelection}
                className={cn(
                  "flex-1 py-3.5 rounded-2xl text-xs font-black transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                  darkMode
                    ? "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300"
                    : "bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700",
                  missingSelection && "opacity-50 cursor-not-allowed"
                )}
              >
                <Share2 size={14} /> Share
              </button>

              <button
                onClick={handleTrack}
                disabled={
                  missingSelection ||
                  tracking ||
                  !isPro ||
                  grandTotalStake === 0
                }
                className={cn(
                  "flex-1 py-3.5 rounded-2xl text-xs font-black transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                  !isPro
                    ? "bg-gray-200 text-gray-500"
                    : missingSelection || tracking || grandTotalStake === 0
                    ? "bg-gray-400 text-white opacity-50 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-black text-white"
                )}
                title={
                  !isPro
                    ? "Premium only"
                    : grandTotalStake === 0
                    ? "Enter stake to track"
                    : ""
                }
              >
                {!isPro && <Lock size={12} />}
                {tracking ? "..." : "Track"}
              </button>
            </div>

            <div className="flex w-full sm:w-1/2">
              <div className="relative w-1/3">
                <select
                  value={selectedBookie}
                  onChange={(e) => setSelectedBookie(e.target.value)}
                  className={cn(
                    "w-full h-full appearance-none pl-3 pr-8 py-3.5 rounded-l-2xl text-[10px] font-black uppercase tracking-widest outline-none border cursor-pointer transition-colors",
                    darkMode
                      ? "bg-gray-800 border-white/10 text-gray-300 hover:bg-gray-700"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <option value="1XBET">1xBet</option>
                  <option value="SPORTYBET">SportyBet</option>
                  <option value="BETWAY">Betway</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
                />
              </div>

              <button
                onClick={handleRouteToBookie}
                disabled={missingSelection || isRouting}
                className={cn(
                  "w-2/3 py-3.5 rounded-r-2xl text-sm font-black transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 relative overflow-hidden",
                  missingSelection
                    ? "bg-gray-400 text-white opacity-50 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40"
                )}
              >
                {isRouting ? (
                  <span className="animate-pulse">Routing...</span>
                ) : (
                  <>
                    {isPro ? <ExternalLink size={16} /> : <Lock size={14} />}
                    Route Slip
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Market Modal */}
      <BetslipMarketModal
        open={modalOpen}
        darkMode={darkMode}
        matchName={editingMatch?.match}
        initialMarket={editingMatch?.selectedMarket}
        initialOption={editingMatch?.selectedOption}
        onClose={() => {
          setModalOpen(false);
          setEditingMatch(null);
        }}
        onConfirm={({ selectedMarket, selectedOption }) => {
          if (editingMatch?.match) {
            updateMatchSelection(
              editingMatch.match,
              selectedMarket,
              selectedOption
            );
          }
          setModalOpen(false);
          setEditingMatch(null);
        }}
      />
    </div>
  );
}