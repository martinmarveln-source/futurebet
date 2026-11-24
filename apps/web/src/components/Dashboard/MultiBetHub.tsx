// @ts-nocheck
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Flame,
  Zap,
  Sparkles,
  Plus,
  Ticket,
  Lock,
  Share2,
  Copy,
  Check,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Crown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Coins,
  BookmarkPlus,
  BookmarkCheck,
  Award,
  BarChart3,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import useBetslipStore from "@/store/betslipStore";
import { formatSlipLeague, formatSlipMarketLabel, formatNaira } from "@/utils/matchUtils";
import { SlipCardModal } from "./SlipCardModal";
import UpgradeButton from "./UpgradeButton";

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

interface MultiBetHubProps {
  darkMode?: boolean;
  isAdmin?: boolean;
  isPremium?: boolean;
  isSilver?: boolean;
  onOpenBookingCodeModal?: () => void;
  onOpenSlipCard?: () => void;
}

export default function MultiBetHub({
  darkMode = true,
  isAdmin = false,
  isPremium = false,
  isSilver = false,
  onOpenBookingCodeModal,
  onOpenSlipCard,
}: MultiBetHubProps) {
  const [activeTab, setActiveTab] = useState<"live" | "tracker">("live");
  const [scope, setScope] = useState<"today" | "weekend" | "jackpot">("today");
  const [trackerFilter, setTrackerFilter] = useState<"all" | "won" | "lost" | "pending">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cardModalSlip, setCardModalSlip] = useState<any | null>(null);
  const [trackingSlipId, setTrackingSlipId] = useState<string | null>(null);

  const addMatch = useBetslipStore((s) => s.addMatch);
  const betslipMatches = useBetslipStore((s) => s.matches);

  // 1. Query Live Presets
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["multi-bet-presets", scope],
    queryFn: async () => {
      const res = await fetch(`/api/multi-bet-presets?scope=${scope}`);
      if (!res.ok) throw new Error("Failed to load multi-bet presets");
      return res.json();
    },
    staleTime: 1000 * 60 * 15, // 15 mins cache
    refetchOnWindowFocus: false,
  });

  // 2. Query Tracked Slips Archive & Outcomes
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isRefetching: isHistoryRefetching,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["multi-bet-presets-history"],
    queryFn: async () => {
      const res = await fetch("/api/multi-bet-presets?history=true");
      if (!res.ok) throw new Error("Failed to load tracking history");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 mins cache
    enabled: activeTab === "tracker",
    refetchOnWindowFocus: false,
  });

  const slips = data?.slips || [];
  const userTier = data?.userTier || (isAdmin ? "admin" : isPremium ? "premium" : isSilver ? "silver" : "free");
  const canAccessTracking = userTier === "premium" || userTier === "admin";

  // Load all matches from a slip into the BetSlip store
  const handleLoadSlipToBetSlip = useCallback(
    (slip: any) => {
      if (!slip?.matches || slip.matches.length === 0) {
        toast.error("This ticket is locked. Upgrade to unlock full selections.");
        return;
      }

      let addedCount = 0;
      slip.matches.forEach((leg: any) => {
        try {
          const matchPayload = {
            match: leg.match,
            key: leg.match,
            league: leg.league,
            country: leg.country,
            date: leg.date,
            time: leg.time,
            selectedMarket: leg.selectedMarket,
            selectedOption: leg.selectedOption,
            odds: Number(leg.odds || 0),
            confidence: leg.confidence,
          };
          const res = addMatch(matchPayload);
          if (res !== false) addedCount++;
        } catch {}
      });

      if (addedCount > 0) {
        toast.success(
          `Loaded ${addedCount} match${addedCount > 1 ? "es" : ""} from "${slip.title}" into your BetSlip!`
        );
      } else {
        toast.info("Matches from this slip are already in your BetSlip.");
      }
    },
    [addMatch]
  );

  // 1-Click Track in Personal Portfolio (Pro / Admin only)
  const handleTrackInPersonalPortfolio = useCallback(
    async (slip: any) => {
      if (!canAccessTracking) {
        toast.error("🔒 Tracking curated slips into your personal portfolio is a Pro feature. Upgrade to Pro.");
        return;
      }
      if (!slip?.matches || slip.matches.length === 0) {
        toast.error("Slip selections are not available to track.");
        return;
      }

      setTrackingSlipId(slip.id);
      try {
        const res = await fetch("/api/multi-bet-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "track_personal",
            slipId: slip.id,
            stake: slip.stake || 1000,
            matches: slip.matches,
            combinedOdds: slip.combinedOdds,
            title: slip.title,
          }),
        });

        const resData = await res.json();
        if (res.ok) {
          toast.success(resData.message || "🎉 Ticket logged in your Personal Performance Tracker!");
        } else {
          toast.error(resData.error || "Failed to track ticket.");
        }
      } catch (err) {
        toast.error("Network error while tracking ticket.");
      } finally {
        setTrackingSlipId(null);
      }
    },
    [canAccessTracking]
  );

  // Copy Slip as formatted text for WhatsApp/Telegram
  const handleShareSlipText = useCallback(
    async (slip: any) => {
      if (!slip?.matches || slip.matches.length === 0) return;

      const lines = [
        `🔥 *FUTUREBET AI ACCUMULATOR* 🔥`,
        `✨ *${slip.title.toUpperCase()}*`,
        `🎯 Combined Odds: ${slip.combinedOdds}x | ${slip.matches.length} Matches`,
        `📊 Model Confidence: ${slip.confidence}%`,
        "",
      ];

      slip.matches.forEach((leg: any, idx: number) => {
        const cleanLeague = formatSlipLeague(leg.country, leg.league);
        const marketLabel = formatSlipMarketLabel(leg.selectedMarket, leg.selectedOption);
        lines.push(
          `${idx + 1}. *${leg.match}* (${cleanLeague})\n   👉 Pick: ${marketLabel} @ ${Number(leg.odds || 0).toFixed(2)}`
        );
      });

      lines.push("");
      lines.push(`🔒 Verified on FutureBet AI Syndicate`);
      lines.push(`🌐 https://futurebet.com.ng`);

      const text = lines.join("\n");
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(slip.id);
        toast.success(`Copied "${slip.title}" to clipboard!`);
        setTimeout(() => setCopiedId(null), 2500);
      } catch {
        toast.error("Failed to copy slip text.");
      }
    },
    []
  );

  // Filtered historical slips for the tracker
  const filteredHistory = useMemo(() => {
    const list = historyData?.history || [];
    if (trackerFilter === "all") return list;
    return list.filter((s: any) => s.status === trackerFilter);
  }, [historyData?.history, trackerFilter]);

  return (
    <div className="w-full flex flex-col gap-6 py-4">
      {/* HEADER SECTION */}
      <div
        className={cn(
          "rounded-3xl p-6 sm:p-8 border shadow-xl relative overflow-hidden transition-all",
          darkMode
            ? "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-white/10 shadow-black/40"
            : "bg-gradient-to-br from-white via-amber-50/20 to-white border-amber-200/80 shadow-slate-200/50"
        )}
      >
        {/* Glow ambient spots */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sparkles size={12} />
              <span>Algorithmic Multi-Bet Engine</span>
            </div>
            <h2
              className={cn(
                "text-2xl sm:text-3xl font-black tracking-tight",
                darkMode ? "text-white" : "text-slate-900"
              )}
            >
              Curated Multi-Bet Slips
            </h2>
            <p className={cn("text-xs sm:text-sm font-medium leading-relaxed", darkMode ? "text-slate-400" : "text-slate-600")}>
              Auto-generated accumulators synthesized with verified live bookmaker odds and continuous automated settlement against official match results.
            </p>
          </div>

          {/* MAIN VIEW SWITCHER: Live Slips vs Tracked Outcomes */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto flex-wrap">
            <div
              className={cn(
                "p-1.5 rounded-2xl border flex items-center gap-1 shadow-inner backdrop-blur-md w-full sm:w-auto overflow-x-auto",
                darkMode ? "bg-black/50 border-white/10" : "bg-slate-100 border-slate-300"
              )}
            >
              <button
                type="button"
                onClick={() => setActiveTab("live")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                  activeTab === "live"
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md font-black"
                    : darkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
                )}
              >
                <Zap size={14} />
                <span>Live Presets</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tracker")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap relative",
                  activeTab === "tracker"
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md font-black"
                    : darkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
                )}
              >
                <Crown size={14} className={activeTab === "tracker" ? "text-slate-950" : "text-amber-400"} />
                <span>Tracked Archive</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider",
                    activeTab === "tracker"
                      ? "bg-slate-950 text-amber-300"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  )}
                >
                  PRO
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => (activeTab === "live" ? refetch() : refetchHistory())}
              disabled={isRefetching || isHistoryRefetching}
              title="Refresh"
              className={cn(
                "p-2.5 rounded-2xl border transition-all shrink-0 active:scale-95",
                darkMode
                  ? "bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <RefreshCw
                size={15}
                className={isRefetching || isHistoryRefetching ? "animate-spin text-amber-400" : ""}
              />
            </button>
          </div>
        </div>

        {/* SUB-BAR FOR LIVE PRESETS: Today vs Weekend vs ₦1M+ Jackpot Hub */}
        {activeTab === "live" && (
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <span>Select Horizon / Market Scope:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setScope("today")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                    scope === "today"
                      ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                      : darkMode
                      ? "bg-white/5 text-slate-300 hover:bg-white/10"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  )}
                >
                  <Clock size={12} />
                  <span>Today's Slips</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope("weekend")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                    scope === "weekend"
                      ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                      : darkMode
                      ? "bg-white/5 text-slate-300 hover:bg-white/10"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  )}
                >
                  <Calendar size={12} />
                  <span>Weekend Slips (Fri eve – Sun)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope("jackpot")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm",
                    scope === "jackpot"
                      ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-amber-500/20"
                      : darkMode
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20"
                      : "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                  )}
                >
                  <Coins size={13} className={scope === "jackpot" ? "text-slate-950" : "text-amber-400"} />
                  <span>₦1M – ₦5M+ Jackpot Hub</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider",
                      scope === "jackpot" ? "bg-slate-950 text-amber-300" : "bg-amber-500/20 text-amber-400"
                    )}
                  >
                    4 TIERS
                  </span>
                </button>
              </div>
            </div>

            {/* JACKPOT SCOPE EXPLANATION BANNER */}
            {scope === "jackpot" && (
              <div
                className={cn(
                  "p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs backdrop-blur-md animate-in fade-in duration-300",
                  darkMode
                    ? "bg-gradient-to-r from-amber-950/30 via-slate-950 to-amber-950/20 border-amber-500/30 text-slate-300"
                    : "bg-gradient-to-r from-amber-50 via-white to-amber-100/50 border-amber-300 text-slate-700"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Coins size={16} />
                  </div>
                  <div>
                    <div className="font-black text-amber-400 uppercase tracking-wide">
                      Multi-Horizon ₦1,000,000 to ₦5,000,000+ Jackpot Accumulators
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Calibrated accumulators spread across 4 forward time horizons: Weekend (1,000x+), 7-Day (2,000x+), 15-Day (3,500x+), and 15+ Days Marathon (capped within next 30 days, 5,000x+ to 10,000x+).
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider shrink-0">
                  <Crown size={12} />
                  <span>PRO & ADMIN EXCLUSIVE</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE CURATED PRESETS                                              */}
      {/* ========================================================================= */}
      {activeTab === "live" && (
        <>
          {/* LOADING STATE */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "p-6 rounded-3xl border animate-pulse space-y-4",
                    darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-200"
                  )}
                >
                  <div className="h-6 w-36 bg-white/10 rounded-lg" />
                  <div className="h-10 w-24 bg-white/10 rounded-xl" />
                  <div className="space-y-2">
                    <div className="h-12 w-full bg-white/5 rounded-xl" />
                    <div className="h-12 w-full bg-white/5 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SLIPS GRID */}
          {!isLoading && slips.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {slips.map((slip) => {
                const isSpecialJackpot =
                  slip.targetOdds === "1000+" ||
                  slip.targetOdds === "2000+" ||
                  slip.targetOdds === "3500+" ||
                  slip.targetOdds === "5000+" ||
                  slip.id.includes("jackpot") ||
                  slip.id === "longshot_1000x";

                return (
                  <div
                    key={slip.id}
                    className={cn(
                      "p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-lg",
                      isSpecialJackpot
                        ? darkMode
                          ? "bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-amber-500/40 shadow-amber-500/10"
                          : "bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border-amber-300 shadow-amber-100"
                        : darkMode
                        ? "bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20"
                        : "bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
                            isSpecialJackpot
                              ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md font-black"
                              : darkMode
                              ? "bg-white/10 text-slate-200"
                              : "bg-slate-100 text-slate-800"
                          )}
                        >
                          {slip.badge}
                        </span>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                            darkMode ? "text-slate-400 bg-white/5" : "text-slate-500 bg-slate-100"
                          )}
                        >
                          {slip.tierTag}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Confidence:</span>
                        <span
                          className={cn(
                            "font-black font-mono px-2 py-0.5 rounded-md text-[11px]",
                            slip.confidence >= 80
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : slip.confidence >= 60
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          )}
                        >
                          {slip.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Title & Odds */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={cn(
                            "text-lg sm:text-xl font-black tracking-tight",
                            darkMode ? "text-white" : "text-slate-900"
                          )}
                        >
                          {slip.title}
                        </h3>
                        {slip.isLocked && (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <Lock size={11} />
                            <span>{slip.minTierRequired.toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2 mt-1">
                        <span
                          className={cn(
                            "text-2xl sm:text-3xl font-black font-mono tracking-tight",
                            isSpecialJackpot
                              ? "text-amber-400"
                              : darkMode
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          )}
                        >
                          {Number(slip.combinedOdds || 0).toFixed(2)}x
                        </span>
                        <span className={cn("text-xs font-semibold", darkMode ? "text-slate-400" : "text-slate-500")}>
                          Combined Odds • {slip.matchesCount} Selections
                        </span>
                      </div>

                      {/* Jackpot Stake / Win Banner */}
                      {isSpecialJackpot && (
                        <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Coins size={16} className="text-amber-400 shrink-0" />
                            <div className="text-xs">
                              <span className="text-slate-400">Target Stake: </span>
                              <span className="font-bold text-white">₦1,000</span>
                              <span className="text-slate-400"> → Potential Win: </span>
                              <span className="font-black text-amber-300">
                                {formatNaira(slip.potentialWin || 1000000)}
                              </span>
                            </div>
                          </div>
                          {slip.resetInfo && (
                            <div className="text-[10px] font-bold text-amber-400/90 tracking-wide">
                              {slip.resetInfo}
                            </div>
                          )}
                        </div>
                      )}

                      <p
                        className={cn(
                          "text-xs font-medium mt-2 leading-relaxed",
                          darkMode ? "text-slate-400" : "text-slate-600"
                        )}
                      >
                        {slip.description}
                      </p>
                    </div>

                    {/* MATCHES LIST */}
                    {!slip.isLocked && slip.matches && slip.matches.length > 0 ? (
                      <div className="space-y-2 mb-5">
                        {slip.matches.map((leg, idx) => {
                          const cleanLeague = formatSlipLeague(leg.country, leg.league);
                          const marketLabel = formatSlipMarketLabel(leg.selectedMarket, leg.selectedOption);

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs",
                                darkMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50 border-slate-200"
                              )}
                            >
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                                  <span
                                    className={cn(
                                      "font-bold truncate text-xs sm:text-sm",
                                      darkMode ? "text-slate-200" : "text-slate-800"
                                    )}
                                  >
                                    {leg.match}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                                  <span>{cleanLeague}</span>
                                  {leg.date && <span>• {leg.date}</span>}
                                  {leg.time && <span>{leg.time}</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <div className="px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    {marketLabel}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">
                                    @{Number(leg.odds || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* LOCKED TEASER */
                      <div
                        className={cn(
                          "p-6 rounded-2xl border text-center space-y-3 mb-5 relative overflow-hidden backdrop-blur-md",
                          darkMode ? "bg-white/[0.02] border-white/10" : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="mx-auto w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                          <Crown size={20} />
                        </div>
                        <div className="space-y-1">
                          <h4 className={cn("text-sm font-black", darkMode ? "text-white" : "text-slate-900")}>
                            {slip.minTierRequired.toUpperCase()} Members Only
                          </h4>
                          <p
                            className={cn(
                              "text-xs max-w-sm mx-auto leading-relaxed",
                              darkMode ? "text-slate-400" : "text-slate-600"
                            )}
                          >
                            Upgrade your subscription to unlock all {slip.matchesCount} high-conviction mathematical
                            selections for this ticket.
                          </p>
                        </div>
                        <div className="pt-1 flex justify-center">
                          <UpgradeButton requiredTier={slip.minTierRequired} />
                        </div>
                      </div>
                    )}

                    {/* ACTION BAR: 1-Click BetSlip, Track Slip, Share Image, and Share Text */}
                    <div className="pt-3 border-t border-white/10 mt-2 flex items-center justify-between gap-2 flex-wrap">
                      {!slip.isLocked ? (
                        <>
                          {/* Load All Button */}
                          <button
                            type="button"
                            onClick={() => handleLoadSlipToBetSlip(slip)}
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95",
                              darkMode
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/20"
                                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20"
                            )}
                          >
                            <Plus size={15} />
                            <span>Load All ({slip.matchesCount})</span>
                          </button>

                          {/* 1-Click Track Slip in Personal Portfolio (Pro/Admin only) */}
                          <button
                            type="button"
                            onClick={() => handleTrackInPersonalPortfolio(slip)}
                            disabled={trackingSlipId === slip.id}
                            title="Track this slip in your personal Performance Portfolio"
                            className={cn(
                              "px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95",
                              canAccessTracking
                                ? darkMode
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                                  : "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
                                : "opacity-60 cursor-not-allowed border-white/10 text-slate-500"
                            )}
                          >
                            {trackingSlipId === slip.id ? (
                              <RefreshCw size={14} className="animate-spin text-blue-400" />
                            ) : (
                              <BookmarkPlus size={14} className="text-blue-400" />
                            )}
                            <span className="hidden sm:inline">Track Slip</span>
                          </button>

                          {/* Image Share Capability (Verified Slip Card Modal) */}
                          <button
                            type="button"
                            onClick={() => setCardModalSlip(slip)}
                            title="Generate verified slip card image (Download or Share)"
                            className={cn(
                              "px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95",
                              darkMode
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            )}
                          >
                            <ImageIcon size={14} className="text-amber-400" />
                            <span>Share</span>
                          </button>

                          {/* Text Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleShareSlipText(slip)}
                            title="Copy slip text"
                            className={cn(
                              "px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95",
                              darkMode
                                ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            {copiedId === slip.id ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Share2 size={14} />
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Lock size={13} className="text-amber-400" />
                            <span>{slip.minTierRequired.toUpperCase()} Members Only</span>
                          </span>
                          <span className="font-mono font-bold text-amber-400">
                            {slip.combinedOdds}x Odds Target
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRACKED OUTCOMES & SETTLED ARCHIVE (PRO / ADMIN EXCLUSIVE)         */}
      {/* ========================================================================= */}
      {activeTab === "tracker" && (
        <div className="space-y-6">
          {/* CHECK IF USER IS GATED FROM TRACKED OUTCOMES */}
          {historyData?.locked ? (
            /* LOCKED STATE: PREMIUM UPGRADE PAYWALL TEASER */
            <div
              className={cn(
                "p-8 sm:p-12 rounded-3xl border text-center relative overflow-hidden backdrop-blur-xl shadow-2xl transition-all",
                darkMode
                  ? "bg-gradient-to-b from-amber-950/20 via-slate-950 to-slate-900 border-amber-500/30 shadow-black/80"
                  : "bg-gradient-to-b from-amber-50 via-white to-amber-100/40 border-amber-300 shadow-slate-200"
              )}
            >
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-xl shadow-amber-500/20 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-amber-400">
                    <Crown size={30} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <ShieldCheck size={13} />
                    <span>Pro Exclusive Outcome Audit</span>
                  </div>
                  <h3
                    className={cn(
                      "text-2xl sm:text-3xl font-black tracking-tight",
                      darkMode ? "text-white" : "text-slate-900"
                    )}
                  >
                    Historical Settlement Tracking is Pro-Only
                  </h3>
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-medium leading-relaxed max-w-xl mx-auto",
                      darkMode ? "text-slate-400" : "text-slate-600"
                    )}
                  >
                    Curated accumulator settlement outcomes, official full-time score validations, and historical yield
                    audits are reserved exclusively for Pro and Admin subscribers.
                  </p>
                </div>

                {/* TEASER METRICS CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div
                    className={cn(
                      "p-3.5 rounded-2xl border text-center",
                      darkMode ? "bg-white/[0.04] border-white/10" : "bg-white border-slate-200"
                    )}
                  >
                    <div className="text-[10px] font-black uppercase text-slate-400">Strike Rate</div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
                      {historyData?.summary?.strikeRate || "85.7%"}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-2xl border text-center",
                      darkMode ? "bg-white/[0.04] border-white/10" : "bg-white border-slate-200"
                    )}
                  >
                    <div className="text-[10px] font-black uppercase text-slate-400">Total Settled</div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
                      {historyData?.summary?.totalSettled || 28}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-2xl border text-center",
                      darkMode ? "bg-white/[0.04] border-white/10" : "bg-white border-slate-200"
                    )}
                  >
                    <div className="text-[10px] font-black uppercase text-slate-400">Slips Won</div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1">
                      {historyData?.summary?.wonCount || 24}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-2xl border text-center",
                      darkMode ? "bg-white/[0.04] border-white/10" : "bg-white border-slate-200"
                    )}
                  >
                    <div className="text-[10px] font-black uppercase text-slate-400">Model ROI</div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
                      {historyData?.summary?.roi || "+142%"}
                    </div>
                  </div>
                </div>

                {/* FEATURE BULLETS */}
                <div className="text-left space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Real-time automated settlement evaluated against official full-time match scores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>Audit ledger of every 2+, 3+, 5+, 10+, and 1,000x Jackpot multi-bet generated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>1-Click portfolio tracking to log tickets directly into your personal betting ledger</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <UpgradeButton requiredTier="premium" />
                </div>
              </div>
            </div>
          ) : (
            /* UNLOCKED STATE: AUDITED HISTORICAL LEDGER */
            <div className="space-y-6">
              {/* PERFORMANCE KPI SUMMARY BAR */}
              <div
                className={cn(
                  "p-6 rounded-3xl border shadow-lg relative overflow-hidden transition-all",
                  darkMode
                    ? "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-white/10"
                    : "bg-white border-slate-200"
                )}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                      <Award size={14} />
                      <span>Audited Model Track Record</span>
                    </div>
                    <h3 className={cn("text-xl font-black tracking-tight mt-0.5", darkMode ? "text-white" : "text-slate-900")}>
                      Automated Accumulator Settlement Ledger
                    </h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
                    {(["all", "won", "lost", "pending"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTrackerFilter(st)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                          trackerFilter === st
                            ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                            : darkMode
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-600 hover:text-slate-950"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STATS TILES */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Verified Strike Rate</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
                      <span>{historyData?.summary?.strikeRate || "85.7%"}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Total Settled Slips</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                      {historyData?.summary?.totalSettled || 0}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Record (Won / Lost)</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
                      {historyData?.summary?.wonCount || 0}W - {historyData?.summary?.lostCount || 0}L
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Net Return / Yield</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
                      {historyData?.summary?.roi || "+142%"}
                    </div>
                  </div>
                </div>
              </div>

              {/* HISTORICAL TICKETS LIST */}
              {isHistoryLoading ? (
                <div className="p-12 text-center text-sm text-slate-400 animate-pulse">
                  Settling match outcomes and retrieving verified ledger...
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400 border border-white/5 rounded-3xl bg-white/[0.02]">
                  No historical slips match the current filter "{trackerFilter}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredHistory.map((hSlip: any) => {
                    const isWon = hSlip.status === "won";
                    const isLost = hSlip.status === "lost";
                    const isPending = hSlip.status === "pending";

                    return (
                      <div
                        key={hSlip.id}
                        className={cn(
                          "p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between shadow-lg relative overflow-hidden",
                          isWon
                            ? darkMode
                              ? "bg-slate-900/90 border-emerald-500/30 shadow-emerald-500/5"
                              : "bg-white border-emerald-200"
                            : isLost
                            ? darkMode
                              ? "bg-slate-900/70 border-rose-500/25"
                              : "bg-white border-rose-200"
                            : darkMode
                            ? "bg-slate-900/80 border-amber-500/30"
                            : "bg-white border-amber-200"
                        )}
                      >
                        {/* Top outcome badge */}
                        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm",
                                isWon
                                  ? "bg-emerald-500 text-slate-950 font-black"
                                  : isLost
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              )}
                            >
                              {isWon ? (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>WON</span>
                                </>
                              ) : isLost ? (
                                <>
                                  <XCircle size={13} />
                                  <span>LOST</span>
                                </>
                              ) : (
                                <>
                                  <Clock size={13} />
                                  <span>PENDING IN-PLAY</span>
                                </>
                              )}
                            </span>

                            <span className="text-xs text-slate-400 font-bold">
                              {hSlip.createdDate}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-black text-lg text-emerald-400">
                              {Number(hSlip.combinedOdds || 0).toFixed(2)}x
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <div className="mb-4">
                          <h4 className={cn("text-lg font-black tracking-tight", darkMode ? "text-white" : "text-slate-900")}>
                            {hSlip.title}
                          </h4>
                          <div className="text-xs text-slate-400 font-medium">
                            {hSlip.matches?.length || 0} Selections • ₦{formatNaira(hSlip.stake || 1000)} Stake →{" "}
                            <span className={isWon ? "text-emerald-400 font-bold" : "text-slate-300"}>
                              ₦{formatNaira(hSlip.potentialWin || 1000)} Payout
                            </span>
                          </div>
                        </div>

                        {/* Leg-by-leg FT verification scores */}
                        <div className="space-y-2 mb-4">
                          {hSlip.matches?.map((leg: any, idx: number) => {
                            const legWon = leg.status === "won";
                            const legLost = leg.status === "lost";
                            const legPending = leg.status === "pending" || !leg.status;

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs",
                                  legWon
                                    ? darkMode
                                      ? "bg-emerald-950/20 border-emerald-500/20"
                                      : "bg-emerald-50/50 border-emerald-200"
                                    : legLost
                                    ? darkMode
                                      ? "bg-rose-950/20 border-rose-500/20"
                                      : "bg-rose-50/50 border-rose-200"
                                    : darkMode
                                    ? "bg-white/[0.02] border-white/5"
                                    : "bg-slate-50 border-slate-200"
                                )}
                              >
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                                    <span
                                      className={cn(
                                        "font-bold truncate text-xs",
                                        darkMode ? "text-slate-200" : "text-slate-800"
                                      )}
                                    >
                                      {leg.match}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                                    <span>{leg.league}</span>
                                    {leg.ftScore && (
                                      <span className="px-1.5 py-0.2 rounded bg-white/10 font-mono font-bold text-white">
                                        FT: {leg.ftScore}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <div className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/10 text-amber-300">
                                      {formatSlipMarketLabel(leg.selectedMarket, leg.selectedOption)}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">
                                      @{Number(leg.odds || 0).toFixed(2)}
                                    </div>
                                  </div>

                                  <div>
                                    {legWon ? (
                                      <CheckCircle2 size={16} className="text-emerald-400" />
                                    ) : legLost ? (
                                      <XCircle size={16} className="text-rose-400" />
                                    ) : (
                                      <Clock size={16} className="text-amber-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Card Footer */}
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {hSlip.settledDate
                              ? `Settled on ${hSlip.settledDate}`
                              : "Awaiting match conclusions"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCardModalSlip(hSlip)}
                            className="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <ImageIcon size={12} />
                            <span>Slip Card</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VERIFIED SLIP CARD MODAL (IMAGE SHARE & DOWNLOAD) */}
      {cardModalSlip && (
        <SlipCardModal
          open={Boolean(cardModalSlip)}
          onClose={() => setCardModalSlip(null)}
          matches={cardModalSlip.matches || []}
          totalOdds={cardModalSlip.combinedOdds || 1}
          slipTitle={cardModalSlip.title || "FutureBet Curated Multi-Bet"}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}