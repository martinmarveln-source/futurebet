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
} from "lucide-react";
import { toast } from "sonner";
import useBetslipStore from "@/store/betslipStore";
import { formatSlipLeague, formatSlipMarketLabel } from "@/utils/matchUtils";
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
  const [scope, setScope] = useState<"today" | "weekend">("today");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const addMatch = useBetslipStore((s) => s.addMatch);
  const betslipMatches = useBetslipStore((s) => s.matches);

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

  const slips = data?.slips || [];
  const userTier = data?.userTier || (isAdmin ? "admin" : isPremium ? "premium" : isSilver ? "silver" : "free");

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
            odds: leg.odds,
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

  // Copy Slip as formatted text for WhatsApp/Telegram
  const handleShareSlip = useCallback(
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
        lines.push(`${idx + 1}. ⚽ ${leg.match}`);
        if (cleanLeague) lines.push(`   🌍 ${cleanLeague}`);
        lines.push(`   🎯 ${marketLabel} @ ${leg.odds.toFixed(2)}`);
        lines.push("");
      });

      lines.push("🤖 Verified by FutureBet Quantitative Engine");
      lines.push("🔗 futurebet.com.ng");

      try {
        await navigator.clipboard.writeText(lines.join("\n"));
        setCopiedId(slip.id);
        toast.success(`Copied ${slip.title} to clipboard!`);
        setTimeout(() => setCopiedId(null), 2500);
      } catch {
        toast.error("Could not copy slip on this device.");
      }
    },
    []
  );

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
              Auto-generated daily and weekend accumulators synthesized by our quantitative model with live bookmaker odds. Calibrated into 4 targeted risk/reward tiers.
            </p>
          </div>

          {/* Scope Selector: Today vs Weekend */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <div
              className={cn(
                "p-1.5 rounded-2xl border flex items-center gap-1 shadow-inner backdrop-blur-md w-full sm:w-auto",
                darkMode ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-300"
              )}
            >
              <button
                type="button"
                onClick={() => setScope("today")}
                className={cn(
                  "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                  scope === "today"
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md font-black"
                    : darkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
                )}
              >
                <Clock size={13} />
                <span>Today's Slips</span>
              </button>

              <button
                type="button"
                onClick={() => setScope("weekend")}
                className={cn(
                  "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                  scope === "weekend"
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md font-black"
                    : darkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
                )}
              >
                <Calendar size={13} />
                <span>Weekend Mega</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              title="Refresh Slips"
              className={cn(
                "p-2.5 rounded-2xl border transition-all shrink-0 active:scale-95",
                darkMode
                  ? "bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <RefreshCw size={15} className={isRefetching ? "animate-spin text-amber-400" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* LOADING STATE */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "p-6 rounded-3xl border animate-pulse flex flex-col gap-4",
                darkMode ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-200"
              )}
            >
              <div className="h-6 w-32 bg-slate-700/30 rounded-lg" />
              <div className="h-10 w-full bg-slate-700/20 rounded-xl" />
              <div className="h-24 w-full bg-slate-700/20 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : (
        /* ACCUMULATOR CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {slips.map((slip: any) => {
            const is2x = slip.targetOdds === "2+";
            const is3x = slip.targetOdds === "3+";
            const is5x = slip.targetOdds === "5+";
            const is10x = slip.targetOdds === "10+";

            const accentColor = is2x
              ? "blue"
              : is3x
              ? "emerald"
              : is5x
              ? "amber"
              : "purple";

            return (
              <div
                key={slip.id}
                className={cn(
                  "rounded-3xl border p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-md",
                  darkMode
                    ? "bg-slate-900/90 border-white/10 hover:border-white/20 hover:shadow-xl"
                    : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xl"
                )}
              >
                {/* Top Corner Ribbon */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase border shadow-sm",
                        is2x
                          ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                          : is3x
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : is5x
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          : "bg-purple-500/15 border-purple-500/30 text-purple-300"
                      )}
                    >
                      {slip.badge}
                    </span>

                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        darkMode ? "bg-white/[0.04] text-slate-300" : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {slip.tierTag}
                    </span>
                  </div>

                  {/* Estimated Win Probability */}
                  <div className="flex items-center gap-1.5 text-right">
                    <span className="text-[11px] font-bold text-slate-400">Confidence:</span>
                    <span
                      className={cn(
                        "text-xs font-black font-mono px-2 py-0.5 rounded-md",
                        slip.confidence >= 75
                          ? "bg-emerald-500/10 text-emerald-400"
                          : slip.confidence >= 60
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-purple-500/10 text-purple-300"
                      )}
                    >
                      {slip.confidence}%
                    </span>
                  </div>
                </div>

                {/* Slip Title & Combined Odds Headline */}
                <div className="mb-4">
                  <h3
                    className={cn(
                      "text-lg sm:text-xl font-black tracking-tight",
                      darkMode ? "text-white" : "text-slate-900"
                    )}
                  >
                    {slip.title}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={cn(
                        "text-2xl sm:text-3xl font-black font-mono tracking-tight",
                        is2x
                          ? "text-blue-400"
                          : is3x
                          ? "text-emerald-400"
                          : is5x
                          ? "text-amber-400"
                          : "text-purple-400"
                      )}
                    >
                      {slip.combinedOdds}x
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Combined Odds • {slip.matchesCount} Selections
                    </span>
                  </div>
                  <p className={cn("text-xs mt-1.5 line-clamp-2", darkMode ? "text-slate-400" : "text-slate-500")}>
                    {slip.description}
                  </p>
                </div>

                {/* CONTENT AREA: UNLOCKED MATCHES OR FROSTED GLASS LOCK */}
                {slip.isLocked ? (
                  /* LOCKED TIER TEASER */
                  <div
                    className={cn(
                      "my-3 p-6 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 relative overflow-hidden backdrop-blur-xl",
                      darkMode
                        ? "bg-slate-950/80 border-white/10"
                        : "bg-slate-50/90 border-slate-200"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md">
                      <Lock size={22} />
                    </div>

                    <div className="space-y-1 max-w-sm">
                      <div className="text-sm font-black tracking-tight">
                        {slip.minTierRequired === "premium" ? "Pro Clearance Required" : "Silver or Pro Clearance Required"}
                      </div>
                      <p className={cn("text-xs font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
                        {slip.minTierRequired === "premium"
                          ? `Unlock the ${slip.targetOdds} Multiplier slip, high-conviction picks, and multi-bookmaker booking codes.`
                          : `Upgrade to Silver or Pro to unlock the ${slip.targetOdds} Banker accumulator and full selections.`}
                      </p>
                    </div>

                    <div className="pt-2">
                      <UpgradeButton
                        buttonText={slip.minTierRequired === "premium" ? "Upgrade to Pro" : "Upgrade to Unlock"}
                        className="shadow-lg shadow-amber-500/20"
                      />
                    </div>
                  </div>
                ) : (
                  /* UNLOCKED SELECTION LIST */
                  <div
                    className={cn(
                      "my-3 rounded-2xl border p-3 divide-y transition-all",
                      darkMode
                        ? "bg-black/30 border-white/5 divide-white/5"
                        : "bg-slate-50 border-slate-200 divide-slate-200"
                    )}
                  >
                    {slip.matches.map((leg: any, idx: number) => {
                      const cleanLeague = formatSlipLeague(leg.country, leg.league);
                      const cleanMarket = formatSlipMarketLabel(leg.selectedMarket, leg.selectedOption);

                      return (
                        <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                #{idx + 1}
                              </span>
                              <span
                                className={cn(
                                  "text-xs sm:text-sm font-black truncate",
                                  darkMode ? "text-slate-100" : "text-slate-900"
                                )}
                              >
                                {leg.match}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 truncate">
                              <span>{cleanLeague}</span>
                              {leg.time && <span>• {leg.time}</span>}
                            </div>
                          </div>

                          {/* Market Badge & Odds */}
                          <div className="text-right shrink-0">
                            <div
                              className={cn(
                                "text-xs font-extrabold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 shadow-xs",
                                darkMode
                                  ? "bg-white/[0.04] border-white/10 text-amber-300"
                                  : "bg-white border-amber-200 text-amber-800"
                              )}
                            >
                              <span>{cleanMarket}</span>
                            </div>
                            <div className="text-[11px] font-mono font-bold text-slate-400 mt-0.5">
                              @{leg.odds.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ACTION BAR */}
                <div className="pt-3 border-t mt-2 flex items-center justify-between gap-2.5 flex-wrap">
                  {!slip.isLocked ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleLoadSlipToBetSlip(slip)}
                        className={cn(
                          "flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95",
                          darkMode
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/20"
                            : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20"
                        )}
                      >
                        <Plus size={15} />
                        <span>Load All ({slip.matchesCount}) into Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareSlip(slip)}
                        title="Copy slip for social sharing"
                        className={cn(
                          "px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95",
                          darkMode
                            ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {copiedId === slip.id ? (
                          <>
                            <Check size={14} className="text-emerald-400" />
                            <span className="hidden sm:inline">Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 size={14} />
                            <span className="hidden sm:inline">Share</span>
                          </>
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
    </div>
  );
}
