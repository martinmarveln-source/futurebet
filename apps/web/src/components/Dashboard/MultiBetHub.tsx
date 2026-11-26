// @ts-nocheck
"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
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
  X,
  Image as ImageIcon,
  Coins,
  BookmarkPlus,
  BookmarkCheck,
  Award,
  BarChart3,
  Filter,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import useBetslipStore from "@/store/betslipStore";
import { formatSlipLeague, formatSlipMarketLabel, formatNaira } from "@/utils/matchUtils";
import { SlipCardModal } from "./SlipCardModal";
import BookingCodeModal from "./BookingCodeModal";
import UpgradeButton from "./UpgradeButton";
import TeamComparisonModal from "./TeamComparisonModal";

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

function formatDateHeader(dateStr: string): string {
  if (!dateStr || dateStr === "Recent") return "Recent Outcomes";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return dt.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    }
  } catch {}
  return dateStr;
}

function formatPillDate(dateStr: string): string {
  if (!dateStr || dateStr === "Recent") return "Recent";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return dt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    }
  } catch {}
  return dateStr;
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
  const [selectedDate, setSelectedDate] = useState<string>("latest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cardModalSlip, setCardModalSlip] = useState<any | null>(null);
  const [trackingSlipId, setTrackingSlipId] = useState<string | null>(null);
  const [bookingModalSlip, setBookingModalSlip] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  // H2H button state — opens TeamComparisonModal pre-seeded with the selected match
  const [h2hModal, setH2hModal] = useState<any | null>(null);
  const matchesCacheRef = useRef<any[] | null>(null);
  // Admin delete+regenerate — tracks which leg indices have been marked for removal per slip
  const [removedLegs, setRemovedLegs] = useState<Record<string, Set<number>>>({});
  const [regeneratingSlipId, setRegeneratingSlipId] = useState<string | null>(null);
  // Admin settlement audit — inline FT score editor & re-settle all pending
  const [editingLeg, setEditingLeg] = useState<{ slipId: string; idx: number; score: string } | null>(null);
  const [resettlingAll, setResettlingAll] = useState(false);

  // Lookup full match stats from /api/matches so TeamComparisonModal displays real PPG/goals/H2H/recent form
  const handleOpenH2H = useCallback(async (leg: any) => {
    const parts = String(leg.match || "").split(/\s+(?:-|–|—|vs\.?)\s+/i);
    const home = parts[0]?.trim() || leg.match;
    const away = parts[1]?.trim() || "";
    const fallbackObj = {
      match: leg.match,
      homeTeam: home,
      awayTeam: away,
      league: leg.league,
      country: leg.country,
      date: leg.date,
      time: leg.time,
      selectedMarket: leg.selectedMarket,
      selectedOption: leg.selectedOption,
      odds: leg.odds,
    };

    try {
      let pool = matchesCacheRef.current;
      if (!pool) {
        const toastId = toast.loading("Loading match comparison stats...");
        const res = await fetch("/api/matches");
        toast.dismiss(toastId);
        if (res.ok) {
          const json = await res.json();
          pool = Array.isArray(json?.matches) ? json.matches : [];
          matchesCacheRef.current = pool;
        }
      }
      if (pool && pool.length > 0) {
        const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const hNorm = norm(home);
        const aNorm = norm(away);
        const mNorm = norm(leg.match);
        const found = pool.find((m: any) => {
          const mh = norm(m.homeTeam);
          const ma = norm(m.awayTeam);
          const mm = norm(m.match || `${m.homeTeam}${m.awayTeam}`);
          if (mm && mNorm && mm === mNorm) return true;
          if (hNorm && aNorm && mh && ma) {
            return (mh.includes(hNorm) || hNorm.includes(mh)) && (ma.includes(aNorm) || aNorm.includes(ma));
          }
          return false;
        });
        if (found) {
          setH2hModal({
            ...found,
            ...fallbackObj,
            homeTeam: found.homeTeam || home,
            awayTeam: found.awayTeam || away,
            country: found.country || leg.country || "",
            league: found.league || leg.league || "",
          });
          return;
        }
      }
    } catch {}

    setH2hModal(fallbackObj);
  }, []);

  const handleOpenBookingModal = useCallback((slip: any) => {
    setBookingModalSlip(slip);
    setBookingModalOpen(true);
  }, []);

  // Admin: toggle a leg for removal
  const handleToggleRemoveLeg = useCallback((slipId: string, idx: number) => {
    setRemovedLegs((prev) => {
      const existing = new Set(prev[slipId] || []);
      if (existing.has(idx)) {
        existing.delete(idx);
      } else {
        existing.add(idx);
      }
      return { ...prev, [slipId]: existing };
    });
  }, []);

  // Admin: regenerate slip excluding removed legs
  const handleRegenerateSlip = useCallback(async (slip: any, removedIndices: Set<number>) => {
    const excludedMatches = Array.from(removedIndices).map((i) => slip.matches?.[i]?.match).filter(Boolean);
    if (!excludedMatches.length) return;
    setRegeneratingSlipId(slip.slipId || slip.id);
    try {
      const res = await fetch("/api/multi-bet-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate_slip",
          slipId: slip.slipId || slip.id,
          excludedMatches,
          scope,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Slip regenerated without removed matches.");
        setRemovedLegs((prev) => { const copy = { ...prev }; delete copy[slip.slipId || slip.id]; return copy; });
        refetch();
      } else {
        toast.error(result.error || "Failed to regenerate slip.");
      }
    } catch {
      toast.error("Failed to regenerate slip.");
    } finally {
      setRegeneratingSlipId(null);
    }
  }, [scope]);

  // Admin: remove marked match(es) from a Live Slip without replacing them (e.g. postponed match)
  const handleRemoveMatchesFromSlip = useCallback(async (slip: any, removedIndices: Set<number>) => {
    const matchNames = Array.from(removedIndices).map((i) => slip.matches?.[i]?.match).filter(Boolean);
    if (!matchNames.length) return;
    const sid = slip.slipId || slip.id;
    setRegeneratingSlipId(sid);
    try {
      const res = await fetch("/api/multi-bet-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_match_from_slip",
          slipId: sid,
          matchNames,
          matches: slip.matches,
          stake: slip.stake || 1000,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || "Match(es) removed from slip.");
        setRemovedLegs((prev) => { const copy = { ...prev }; delete copy[sid]; return copy; });
        refetch();
        refetchHistory();
      } else {
        toast.error(result.error || "Failed to remove match(es).");
      }
    } catch {
      toast.error("Failed to remove match(es).");
    } finally {
      setRegeneratingSlipId(null);
    }
  }, []);

  // Admin: remove a single match (e.g. postponed) from a Tracked/History Slip
  const handleRemoveTrackerMatch = useCallback(async (hSlip: any, legMatch: string) => {
    if (!hSlip?.id || !legMatch) return;
    setRegeneratingSlipId(hSlip.id);
    try {
      const res = await fetch("/api/multi-bet-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_match_from_slip",
          slipId: hSlip.id,
          matchName: legMatch,
          stake: hSlip.stake || 1000,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || "Match removed from slip.");
        refetchHistory();
        refetch();
      } else {
        toast.error(result.error || "Failed to remove match.");
      }
    } catch {
      toast.error("Failed to remove match.");
    } finally {
      setRegeneratingSlipId(null);
    }
  }, []);

  // Admin: delete an entire slip from Tracker
  const handleDeleteTrackerSlip = useCallback(async (hSlip: any) => {
    if (!hSlip?.id) return;
    setRegeneratingSlipId(hSlip.id);
    try {
      const res = await fetch("/api/multi-bet-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_slip",
          slipId: hSlip.id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Slip deleted.");
        refetchHistory();
      } else {
        toast.error(result.error || "Failed to delete slip.");
      }
    } catch {
      toast.error("Failed to delete slip.");
    } finally {
      setRegeneratingSlipId(null);
    }
  }, []);

  // Admin: manually settle or correct a leg's official FT score
  const handleManualSettleLeg = useCallback(async (slipId: string, idx: number, matchName: string, ftScore: string) => {
    if (!slipId || !ftScore.trim()) return;
    setRegeneratingSlipId(slipId);
    try {
      const res = await fetch("/api/multi-bet-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_settle_leg",
          slipId,
          legIndex: idx,
          matchName,
          ftScore: ftScore.trim(),
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || "Leg settled.");
        setEditingLeg(null);
        refetchHistory();
      } else {
        toast.error(result.error || "Failed to settle leg.");
      }
    } catch {
      toast.error("Failed to settle leg.");
    } finally {
      setRegeneratingSlipId(null);
    }
  }, []);

  // Admin: re-run auto-settlement across all pending slips
  const handleResettledAllPending = useCallback(async () => {
    setResettlingAll(true);
    try {
      const res = await fetch("/api/multi-bet-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resettled_all_pending" }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || "Pending slips re-settled.");
        refetchHistory();
      } else {
        toast.error(result.error || "Failed to re-settle slips.");
      }
    } catch {
      toast.error("Failed to re-settle slips.");
    } finally {
      setResettlingAll(false);
    }
  }, []);

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
    staleTime: 1000 * 20, // 20s cache for fast settlement updates
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

  // Historical slips grouped by settlement / creation date
  const groupedHistory = useMemo(() => {
    const list = filteredHistory;
    const groups: Record<string, any[]> = {};

    list.forEach((s: any) => {
      const rawDate = s.createdDate || s.settledDate || "Recent";
      if (!groups[rawDate]) groups[rawDate] = [];
      groups[rawDate].push(s);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === "Recent") return 1;
      if (b === "Recent") return -1;
      return b.localeCompare(a);
    });

    return sortedDates.map((dateKey) => {
      const items = groups[dateKey];
      const won = items.filter((x) => x.status === "won").length;
      const lost = items.filter((x) => x.status === "lost").length;
      const pending = items.filter((x) => x.status === "pending" || !x.status).length;
      return {
        dateKey,
        items,
        won,
        lost,
        pending,
      };
    });
  }, [filteredHistory]);

  // Grouped slips filtered by selected date to save space as days accumulate (Premium & Admin)
  const visibleGroups = useMemo(() => {
    if (groupedHistory.length === 0) return [];
    if (selectedDate === "all") return groupedHistory;
    const target = selectedDate === "latest" ? groupedHistory[0]?.dateKey : selectedDate;
    const matched = groupedHistory.filter((g) => g.dateKey === target);
    return matched.length > 0 ? matched : groupedHistory.slice(0, 1);
  }, [groupedHistory, selectedDate]);

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

            {/* ISSUE 1: INSUFFICIENT TODAY MATCHES BANNER — Never use tomorrow's fixtures */}
            {scope === "today" && data?.insufficientTodayMatches && !isLoading && (
              <div
                className={cn(
                  "p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-300",
                  darkMode
                    ? "bg-slate-900/60 border-slate-600/40 text-slate-300"
                    : "bg-slate-100 border-slate-300 text-slate-700"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-500/20 text-slate-400 flex items-center justify-center shrink-0 text-base">
                    ⚠️
                  </div>
                  <div>
                    <div className={cn("font-black uppercase tracking-wide", darkMode ? "text-slate-100" : "text-slate-900")}>
                      Only {data.availableTodayCount ?? 0} Matches Available Today
                    </div>
                    <div className={cn("text-[11px] mt-0.5", darkMode ? "text-slate-400" : "text-slate-600")}>
                      Not enough today's fixtures to generate a full slip. The selections below are built from what's available.
                      Check back later or switch to <strong>Weekend Slips</strong> for more options.
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                      "p-6 rounded-3xl border transition-all duration-300 flex flex-col relative overflow-hidden group shadow-lg",
                      isSpecialJackpot
                        ? darkMode
                          ? "bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-amber-500/40 shadow-amber-500/10"
                          : "bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border-amber-300 shadow-amber-100"
                        : darkMode
                        ? "bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20"
                        : "bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex-1 flex flex-col min-w-0">
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
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
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

                        {/* Verified Bookmaker Code Badges */}
                        {slip.bookingCodes && Object.keys(slip.bookingCodes).length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            {Object.entries(slip.bookingCodes).map(([bookie, code]) => (
                              <button
                                key={bookie}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard?.writeText?.(String(code));
                                  toast.success(`Copied ${bookie.toUpperCase()} code: ${code}`);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-sm active:scale-95"
                                title={`Click to copy ${bookie} code`}
                              >
                                <Ticket size={11} className="text-emerald-400" />
                                <span>{bookie}: {String(code)}</span>
                                <Copy size={10} className="text-emerald-400/80 ml-0.5" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* MATCHES LIST */}
                      {!slip.isLocked && slip.matches && slip.matches.length > 0 ? (
                        <div className="space-y-2 mb-5 max-h-[460px] overflow-y-auto pr-1">
                          {slip.matches.map((leg, idx) => {
                            const cleanLeague = formatSlipLeague(leg.country, leg.league);
                            const marketLabel = formatSlipMarketLabel(leg.selectedMarket, leg.selectedOption);
                            const slipKey = slip.slipId || slip.id;
                            const isRemoved = removedLegs[slipKey]?.has(idx);

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs",
                                  isRemoved
                                    ? "opacity-45 bg-rose-950/20 border-rose-500/30"
                                    : darkMode
                                    ? "bg-white/[0.03] border-white/5"
                                    : "bg-slate-50 border-slate-200"
                                )}
                              >
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                                    <span
                                      className={cn(
                                        "font-bold truncate text-xs sm:text-sm",
                                        isRemoved && "line-through text-rose-400",
                                        !isRemoved && (darkMode ? "text-slate-200" : "text-slate-800")
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

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* H2H / Compare Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenH2H(leg)}
                                    title="View H2H & Team Comparison"
                                    className={cn(
                                      "p-1.5 rounded-lg border transition-all active:scale-95",
                                      darkMode
                                        ? "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    )}
                                  >
                                    <BarChart3 size={13} />
                                  </button>

                                  <div className="text-right">
                                    <div
                                      className={cn(
                                        "px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider border",
                                        darkMode
                                          ? "bg-sky-500/15 text-sky-200 border-sky-500/30"
                                          : "bg-sky-100 text-sky-800 border-sky-200"
                                      )}
                                    >
                                      {marketLabel}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">
                                      @{Number(leg.odds || 0).toFixed(2)}
                                    </div>
                                  </div>

                                  {/* Admin Delete Leg Toggle */}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRemoveLeg(slipKey, idx)}
                                      title={isRemoved ? "Restore match" : "Remove match from slip"}
                                      className={cn(
                                        "p-1.5 rounded-lg border transition-all active:scale-95 ml-0.5",
                                        isRemoved
                                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                                          : "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                      )}
                                    >
                                      {isRemoved ? <RefreshCw size={12} /> : <Trash2 size={12} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : !slip.isLocked ? (
                        /* NO QUALIFYING MATCHES TODAY (Unlocked user, 0 selections) */
                        <div
                          className={cn(
                            "p-6 rounded-2xl border text-center space-y-2 mb-5",
                            darkMode ? "bg-white/[0.02] border-white/10" : "bg-slate-50 border-slate-200"
                          )}
                        >
                          <div className="mx-auto w-10 h-10 rounded-2xl bg-slate-500/15 border border-slate-500/30 flex items-center justify-center text-slate-400">
                            <Calendar size={18} />
                          </div>
                          <h4 className={cn("text-sm font-black", darkMode ? "text-slate-200" : "text-slate-800")}>
                            No Qualifying Matches Available
                          </h4>
                          <p
                            className={cn(
                              "text-xs max-w-sm mx-auto leading-relaxed",
                              darkMode ? "text-slate-400" : "text-slate-600"
                            )}
                          >
                            There aren&apos;t enough qualifying fixtures in today&apos;s pool for this slip tier. Check back later or switch to <strong>Weekend Slips</strong>.
                          </p>
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
                    </div>

                    {/* ADMIN REMOVE / REGENERATE BAR (when matches are marked for removal) */}
                    {isAdmin && !slip.isLocked && (removedLegs[slip.slipId || slip.id]?.size || 0) > 0 && (
                      <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-rose-300">
                          {removedLegs[slip.slipId || slip.id].size} match(es) selected
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={regeneratingSlipId === (slip.slipId || slip.id)}
                            onClick={() => handleRemoveMatchesFromSlip(slip, removedLegs[slip.slipId || slip.id])}
                            title="Remove selected match(es) from this slip (e.g. postponed) and recalculate odds"
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider bg-slate-700 hover:bg-slate-600 text-white transition-all flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            <Trash2 size={11} />
                            <span>Remove Only</span>
                          </button>
                          <button
                            type="button"
                            disabled={regeneratingSlipId === (slip.slipId || slip.id)}
                            onClick={() => handleRegenerateSlip(slip, removedLegs[slip.slipId || slip.id])}
                            title="Remove selected match(es) and replace with new selections"
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            <RefreshCw size={11} className={regeneratingSlipId === (slip.slipId || slip.id) ? "animate-spin" : ""} />
                            <span>
                              {regeneratingSlipId === (slip.slipId || slip.id) ? "Working..." : "Regenerate"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ACTION BAR: 1-Click BetSlip, Track Slip, Share Image, and Share Text */}
                    <div className="pt-4 border-t border-white/10 mt-auto flex items-center justify-between gap-2 flex-wrap">
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

                          {/* 1-Click Real Bookmaker Router / Booking Code Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenBookingModal(slip)}
                            title="Get 1-click booking codes for SportyBet, Bet9ja, and 1xBet"
                            className={cn(
                              "px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95",
                              slip.bookingCodes?.sportybet
                                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 shadow-sm shadow-emerald-500/10"
                                : darkMode
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            )}
                          >
                            <Ticket size={14} className="text-emerald-400" />
                            <span className="hidden sm:inline">
                              {slip.bookingCodes?.sportybet ? `Code: ${slip.bookingCodes.sportybet}` : "Book Code"}
                            </span>
                            <span className="sm:hidden">Code</span>
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
                                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                                : "border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                            )}
                          >
                            <ImageIcon size={14} className="text-indigo-400" />
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
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                      darkMode
                        ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    )}
                  >
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

                {/* FEATURE BULLETS */}
                <div
                  className={cn(
                    "text-left space-y-2 p-4 rounded-2xl border text-xs",
                    darkMode
                      ? "bg-white/[0.03] border-white/10 text-slate-300"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Real-time automated settlement evaluated against official full-time match scores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Audit ledger of every 2+, 3+, 5+, 10+, and 1,000x Jackpot multi-bet generated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
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

                  <div className="flex items-center gap-2.5 flex-wrap">
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

                    {/* Sync / Refresh Results Button */}
                    <button
                      type="button"
                      onClick={() => {
                        refetchHistory();
                        toast.success("Syncing match results and settling outcomes from database...");
                      }}
                      disabled={isHistoryLoading || isHistoryRefetching}
                      title="Fetch latest match results and auto-settle outcomes"
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border shadow-sm active:scale-95",
                        darkMode
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                          : "bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100"
                      )}
                    >
                      <RefreshCw
                        size={13}
                        className={isHistoryLoading || isHistoryRefetching ? "animate-spin" : ""}
                      />
                      <span>Sync Results</span>
                    </button>

                    {/* Admin One-Click Re-Settle All Pending */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleResettledAllPending}
                        disabled={resettlingAll}
                        title="Admin: Re-evaluate all pending slips against latest official FT scores"
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border shadow-sm active:scale-95 disabled:opacity-50",
                          darkMode
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-500"
                        )}
                      >
                        <ShieldCheck size={13} />
                        <span>{resettlingAll ? "Re-Settling..." : "Re-Settle Pending"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* STATS TILES */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Verified Strike Rate</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-500 mt-1 flex items-center gap-1.5">
                      <span>{historyData?.summary?.strikeRate || "0%"}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Total Settled Slips</div>
                    <div className={cn("text-2xl sm:text-3xl font-black font-mono mt-1", darkMode ? "text-white" : "text-slate-900")}>
                      {historyData?.summary?.totalSettled || 0}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Record (Won / Lost)</div>
                    <div className={cn("text-2xl sm:text-3xl font-black font-mono mt-1", darkMode ? "text-blue-300" : "text-blue-700")}>
                      {historyData?.summary?.wonCount || 0}W - {historyData?.summary?.lostCount || 0}L
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Net Return / Yield</div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-500 mt-1">
                      {historyData?.summary?.roi || "0%"}
                    </div>
                  </div>
                </div>

                {/* DATE SELECTOR BAR (PREMIUM & ADMIN EXCLUSIVE) */}
                {groupedHistory.length > 0 && (
                  <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
                        <Calendar size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                            Select Date:
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            PRO / ADMIN
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {selectedDate === "all"
                            ? `Showing all ${groupedHistory.length} dates`
                            : `Showing ${formatDateHeader(visibleGroups[0]?.dateKey || "")}`}
                        </span>
                      </div>
                    </div>

                    {/* Date Pills & Jump Dropdown */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* All Dates Pill */}
                      <button
                        type="button"
                        onClick={() => setSelectedDate("all")}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border active:scale-95",
                          selectedDate === "all"
                            ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black"
                            : darkMode
                            ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                            : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <span>All Dates</span>
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                            selectedDate === "all"
                              ? "bg-slate-950/20 text-slate-950 font-black"
                              : "bg-white/10 text-slate-400"
                          )}
                        >
                          {groupedHistory.length}
                        </span>
                      </button>

                      {/* Quick Date Pills (up to 4 most recent) */}
                      {groupedHistory.slice(0, 4).map((group) => {
                        const isSelected =
                          selectedDate === group.dateKey ||
                          (selectedDate === "latest" && group.dateKey === groupedHistory[0]?.dateKey);
                        return (
                          <button
                            key={group.dateKey}
                            type="button"
                            onClick={() => setSelectedDate(group.dateKey)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95",
                              isSelected
                                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black"
                                : darkMode
                                ? "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                                : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                            )}
                          >
                            <span>{formatPillDate(group.dateKey)}</span>
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                                isSelected
                                  ? "bg-slate-950/20 text-slate-950 font-black"
                                  : "bg-white/10 text-slate-400"
                              )}
                            >
                              {group.items.length}
                            </span>
                            {group.won > 0 && (
                              <span
                                className={cn(
                                  "text-[10px] font-black",
                                  isSelected ? "text-slate-950" : "text-emerald-400"
                                )}
                              >
                                {group.won}W
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Jump to Any Date Dropdown (if more than 4 dates exist) */}
                      {groupedHistory.length > 4 && (
                        <div className="relative">
                          <select
                            value={
                              selectedDate === "latest"
                                ? groupedHistory[0]?.dateKey
                                : selectedDate
                            }
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all appearance-none cursor-pointer pr-7",
                              darkMode
                                ? "bg-slate-900 border-white/15 text-slate-300 hover:border-amber-500/50"
                                : "bg-white border-slate-300 text-slate-700 hover:border-amber-500"
                            )}
                          >
                            <option value="all">Jump to Date...</option>
                            {groupedHistory.map((g) => (
                              <option key={g.dateKey} value={g.dateKey}>
                                {formatDateHeader(g.dateKey)} ({g.items.length} slips)
                              </option>
                            ))}
                          </select>
                          <ChevronRight
                            size={12}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* HISTORICAL TICKETS LIST GROUPED BY DATE */}
              {isHistoryLoading ? (
                <div className="p-12 text-center text-sm text-slate-400 animate-pulse">
                  Settling match outcomes and retrieving verified ledger...
                </div>
              ) : visibleGroups.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400 border border-white/5 rounded-3xl bg-white/[0.02] flex flex-col items-center justify-center gap-3">
                  <p>No historical slips match the current filter "{trackerFilter}".</p>
                  <div className="flex items-center gap-2">
                    {trackerFilter !== "all" && (
                      <button
                        type="button"
                        onClick={() => setTrackerFilter("all")}
                        className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 transition-all shadow-sm active:scale-95"
                      >
                        Reset Filter to All
                      </button>
                    )}
                    {selectedDate !== "all" && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate("all")}
                        className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all shadow-sm active:scale-95"
                      >
                        View All Dates
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  {visibleGroups.map((group) => (
                    <div key={group.dateKey} className="space-y-4">
                      {/* Date Group Header */}
                      <div className="flex items-center justify-between gap-3 px-1 py-1 flex-wrap border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
                            <Calendar size={15} />
                          </div>
                          <div>
                            <h3 className={cn("text-base font-black tracking-tight", darkMode ? "text-white" : "text-slate-900")}>
                              {formatDateHeader(group.dateKey)}
                            </h3>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {group.items.length} Multi-Bet Slip{group.items.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Outcome Badges for this date */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {group.won > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                              <CheckCircle2 size={12} />
                              <span>{group.won} WON</span>
                            </span>
                          )}
                          {group.lost > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-sm">
                              <XCircle size={12} />
                              <span>{group.lost} LOST</span>
                            </span>
                          )}
                          {group.pending > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                              <Clock size={12} />
                              <span>{group.pending} IN-PLAY</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Slips Grid for this date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {group.items.map((hSlip: any) => {
                          const isWon = hSlip.status === "won";
                          const isLost = hSlip.status === "lost";
                          const isPending = hSlip.status === "pending";

                          return (
                            <div
                              key={hSlip.id}
                              className={cn(
                                "p-6 rounded-3xl border transition-all duration-300 flex flex-col shadow-lg relative overflow-hidden",
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
                              <div className="flex-1 flex flex-col min-w-0">
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
                                <div className="space-y-2 mb-4 max-h-[380px] overflow-y-auto pr-1">
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
                                          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 flex-wrap">
                                            <span>{leg.league}</span>
                                            {leg.ftScore && (
                                              <span
                                                className={cn(
                                                  "px-1.5 py-0.2 rounded font-mono font-bold",
                                                  darkMode ? "bg-white/15 text-white" : "bg-slate-200 text-slate-900"
                                                )}
                                              >
                                                FT: {leg.ftScore}
                                              </span>
                                            )}
                                            {isAdmin && editingLeg?.slipId === hSlip.id && editingLeg?.idx === idx && (
                                              <form
                                                onSubmit={(e) => {
                                                  e.preventDefault();
                                                  handleManualSettleLeg(hSlip.id, idx, leg.match, editingLeg.score);
                                                }}
                                                className="inline-flex items-center gap-1 ml-1"
                                              >
                                                <input
                                                  type="text"
                                                  value={editingLeg.score}
                                                  onChange={(e) => setEditingLeg({ ...editingLeg, score: e.target.value })}
                                                  placeholder="2-1"
                                                  className={cn(
                                                    "w-12 px-1.5 py-0.5 rounded border text-[11px] font-mono font-bold focus:outline-none",
                                                    darkMode
                                                      ? "bg-slate-900 border-blue-500/50 text-white"
                                                      : "bg-white border-blue-500 text-slate-900"
                                                  )}
                                                  autoFocus
                                                />
                                                <button
                                                  type="submit"
                                                  className="p-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                                  title="Save FT score & re-settle"
                                                >
                                                  <Check size={11} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingLeg(null)}
                                                  className="p-0.5 rounded bg-slate-600 text-white hover:bg-slate-500"
                                                  title="Cancel"
                                                >
                                                  <X size={11} />
                                                </button>
                                              </form>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {isAdmin && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditingLeg({
                                                  slipId: hSlip.id,
                                                  idx,
                                                  score: leg.ftScore || "",
                                                })
                                              }
                                              title="Admin: Set or correct official FT score"
                                              className={cn(
                                                "px-1.5 py-1 rounded-lg border text-[10px] font-black transition-all active:scale-95",
                                                darkMode
                                                  ? "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                              )}
                                            >
                                              FT
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => handleOpenH2H(leg)}
                                            title="View H2H & Team Comparison"
                                            className={cn(
                                              "p-1.5 rounded-lg border transition-all active:scale-95",
                                              darkMode
                                                ? "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                                                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                            )}
                                          >
                                            <BarChart3 size={12} />
                                          </button>
                                          <div className="text-right">
                                            <div
                                              className={cn(
                                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                                darkMode
                                                  ? "bg-sky-500/15 text-sky-200 border-sky-500/20"
                                                  : "bg-sky-100 text-sky-800 border-sky-200"
                                              )}
                                            >
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

                                          {isAdmin && (
                                            <button
                                              type="button"
                                              disabled={regeneratingSlipId === hSlip.id}
                                              onClick={() => handleRemoveTrackerMatch(hSlip, leg.match)}
                                              title="Remove this match from slip (e.g. postponed)"
                                              className={cn(
                                                "p-1.5 rounded-lg border transition-all active:scale-95 disabled:opacity-50",
                                                darkMode
                                                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                              )}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Card Footer */}
                              <div className="pt-3 border-t border-white/10 mt-auto flex items-center justify-between text-[11px] text-slate-400">
                                <span>
                                  {hSlip.settledDate
                                    ? `Settled on ${hSlip.settledDate}`
                                    : "Awaiting match conclusions"}
                                </span>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBookingModal(hSlip)}
                                    className="font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                                  >
                                    <Ticket size={12} />
                                    <span>
                                      {hSlip.bookingCodes?.sportybet
                                        ? `Code: ${hSlip.bookingCodes.sportybet}`
                                        : "Booking Code"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCardModalSlip(hSlip)}
                                    className="font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                  >
                                    <ImageIcon size={12} />
                                    <span>Slip Card</span>
                                  </button>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      disabled={regeneratingSlipId === hSlip.id}
                                      onClick={() => handleDeleteTrackerSlip(hSlip)}
                                      title="Delete entire slip"
                                      className="font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                                    >
                                      <Trash2 size={12} />
                                      <span>Delete Slip</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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

      {/* 1-CLICK REAL BOOKMAKER ROUTER & BOOKING CODE MODAL */}
      {bookingModalSlip && (
        <BookingCodeModal
          open={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setBookingModalSlip(null);
          }}
          matches={bookingModalSlip.matches || []}
          slipId={bookingModalSlip.slipId || bookingModalSlip.id}
          slipTitle={bookingModalSlip.title || "FutureBet Curated Multi-Bet"}
          stake={bookingModalSlip.stake || 1000}
          userTier={userTier}
          darkMode={darkMode}
          onCodeUpdated={() => {
            refetchHistory();
            refetch();
          }}
        />
      )}

      {/* H2H & TEAM COMPARISON MODAL */}
      {h2hModal && (
        <TeamComparisonModal
          match={h2hModal}
          onClose={() => setH2hModal(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}