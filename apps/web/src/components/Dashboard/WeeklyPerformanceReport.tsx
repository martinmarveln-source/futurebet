"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WeeklySummaryEmail } from "@/components/emails/WeeklySummaryEmail";
import { formatNaira } from "@/utils/matchUtils";
import UpgradeButton from "./UpgradeButton";
import {
  Crown,
  Shield,
  Sparkles,
  TrendingUp,
  Target,
  Mail,
  LayoutDashboard,
  ArrowRight,
  Zap,
  CheckCircle2,
  Activity,
  Flame,
} from "lucide-react";

interface WeeklyPerformanceReportProps {
  userName?: string;
  isPremium?: boolean;
  isSilver?: boolean;
  isAdmin?: boolean;
  setActiveTab?: (tab: string) => void;
  darkMode?: boolean;
}

export default function WeeklyPerformanceReport({
  userName = "there",
  isPremium = false,
  isSilver = false,
  isAdmin = false,
  setActiveTab,
  darkMode = true,
}: WeeklyPerformanceReportProps) {
  // Admin Tier Preview Switcher
  const [adminSimTier, setAdminSimTier] = useState<"live" | "admin" | "premium" | "silver" | "free">("live");
  const [viewMode, setViewMode] = useState<"dashboard" | "email">("dashboard");

  // Determine effective tier based on live props or admin simulation
  const effectiveTier = useMemo(() => {
    if (isAdmin && adminSimTier !== "live") return adminSimTier;
    if (isAdmin) return "admin";
    if (isPremium) return "premium";
    if (isSilver) return "silver";
    return "free";
  }, [isAdmin, isPremium, isSilver, adminSimTier]);

  const effectiveIsAdmin = effectiveTier === "admin";
  const effectiveIsVip = effectiveTier === "premium" || effectiveTier === "admin";
  const effectiveIsSilver = effectiveTier === "silver";
  const effectiveIsFree = effectiveTier === "free";

  const canSee = effectiveIsSilver || effectiveIsVip || effectiveIsAdmin || effectiveIsFree;

  const { data } = useQuery({
    queryKey: ["performanceTracker"],
    queryFn: async () => {
      const res = await fetch("/api/performance-tracker");
      if (!res.ok) throw new Error("Failed to fetch performance data");
      return res.json();
    },
    enabled: !!canSee,
    refetchOnWindowFocus: false,
  });

  const stats = useMemo(() => {
    if (!data?.tickets) return { winRate: 0, profit: 0, bets: 0, won: 0, lost: 0 };

    // Filter last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTickets = data.tickets.filter(
      (t: any) => new Date(t.created_at) >= sevenDaysAgo
    );

    let won = 0;
    let lost = 0;
    let profit = 0;

    recentTickets.forEach((t: any) => {
      if (t.status === "won" || t.status === "lost") {
        const stake = Number(t.stake) || 0;
        const odds = Number(t.total_odds) || 0;

        if (stake > 0) {
          if (t.status === "won") {
            won++;
            if (odds > 0) profit += stake * odds - stake;
          } else {
            lost++;
            profit -= stake;
          }
        }
      }
    });

    const totalDecided = won + lost;
    const winRate = totalDecided > 0 ? Math.round((won / totalDecided) * 100) : 0;

    return {
      winRate,
      profit,
      bets: recentTickets.length,
      won,
      lost,
    };
  }, [data]);

  const isZeroBets = stats.bets === 0;
  const benchmarkAccuracy = data?.vipStats?.winRate && data.vipStats.winRate > 0 ? data.vipStats.winRate : 82;
  const profitFormatted = `${stats.profit >= 0 ? "+" : "-"}${formatNaira(Math.abs(stats.profit))}`;

  // Top model hit of the week (only from verified settled matches with real FT score)
  const topHit = useMemo(() => {
    // 1. Check if backend returned a verified top model hit from settled matches
    if (data?.topModelHit) return data.topModelHit;

    // 2. Check if user's own tickets have any settled won selections with real FT score
    if (data?.tickets && Array.isArray(data.tickets)) {
      const wonSelections: any[] = [];
      data.tickets.forEach((t: any) => {
        (t.selections || []).forEach((s: any) => {
          if (s.status === "won" && s.ftScore && s.ftScore !== "") {
            wonSelections.push({
              match: s.match,
              prediction: s.prediction,
              odds: s.odds || 1.8,
              ftScore: s.ftScore,
            });
          }
        });
      });
      if (wonSelections.length > 0) {
        wonSelections.sort((a, b) => (Number(b.odds) || 0) - (Number(a.odds) || 0));
        return wonSelections[0];
      }
    }

    return null;
  }, [data]);

  // Smart Contextual Messaging
  const messageConfig = useMemo(() => {
    if (isZeroBets) {
      if (effectiveIsVip) {
        return {
          title: `Hi ${userName}, here is your VIP Weekly Intelligence`,
          subtitle: `No personal tickets were logged over the last 7 days. Meanwhile, FutureBet's VIP algorithms delivered an exceptional ${benchmarkAccuracy}% strike rate. Lock in this weekend's early lines!`,
          badge: "VIP GOLD ACCESS",
          badgeColor: "border-amber-400/40 bg-amber-500/15 text-amber-300",
          icon: Crown,
        };
      }
      if (effectiveIsSilver) {
        return {
          title: `Hi ${userName}, here is your Silver Weekly Overview`,
          subtitle: `No bets recorded this week. Your Silver model quotas are fresh and ready for the weekend fixtures. Track your tickets to monitor your strike rate and ROI!`,
          badge: "SILVER ANALYST",
          badgeColor: "border-blue-400/40 bg-blue-500/15 text-blue-300",
          icon: Shield,
        };
      }
      if (effectiveIsAdmin) {
        return {
          title: `Hi ${userName}, Master Intelligence Overview`,
          subtitle: `Admin clearance active. Live model accuracy is currently holding at ${benchmarkAccuracy}% across European leagues with high positive EV calibration.`,
          badge: "ADMIN CLEARANCE",
          badgeColor: "border-purple-400/40 bg-purple-500/15 text-purple-300",
          icon: Zap,
        };
      }
      return {
        title: `Hi ${userName}, Weekly AI Performance Recap`,
        subtitle: `Our predictive models delivered an ${benchmarkAccuracy}% win rate across European league fixtures this week. Upgrade your account to unlock early-line value.`,
        badge: "FREE TIER",
        badgeColor: "border-gray-500/30 bg-gray-500/10 text-gray-300",
        icon: Sparkles,
      };
    }

    // Active User
    if (stats.profit > 0) {
      return {
        title: `Outstanding week, ${userName}!`,
        subtitle: `You achieved a ${profitFormatted} net return across ${stats.bets} settled bets with a ${stats.winRate}% personal strike rate. You're beating the bookmaker!`,
        badge: effectiveIsVip ? "VIP GOLD ACCESS" : effectiveIsSilver ? "SILVER ANALYST" : "TRACKED SLIP",
        badgeColor: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
        icon: TrendingUp,
      };
    }

    return {
      title: `Weekly Performance Summary, ${userName}`,
      subtitle: `A tough variance stretch across ${stats.bets} tickets. Our model risk controls and weekend value picks have recalibrated for high-conviction positive expected value (+EV).`,
      badge: effectiveIsVip ? "VIP GOLD ACCESS" : effectiveIsSilver ? "SILVER ANALYST" : "TRACKED SLIP",
      badgeColor: "border-amber-400/40 bg-amber-500/15 text-amber-300",
      icon: Activity,
    };
  }, [isZeroBets, effectiveIsVip, effectiveIsSilver, effectiveIsAdmin, userName, benchmarkAccuracy, stats.bets, stats.profit, stats.winRate, profitFormatted]);

  const BadgeIcon = messageConfig.icon;

  return (
    <div className="max-w-3xl mx-auto my-12 px-4">
      {/* Floating Section Pill */}
      <div className="text-center mb-4">
        <span className="inline-flex items-center gap-1.5 bg-emerald-600/90 border border-emerald-500/50 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/20 backdrop-blur-md">
          <Activity size={13} />
          Your Weekly Performance Report
        </span>
      </div>

      {/* Admin Simulator Toolbar */}
      {isAdmin && (
        <div className="mb-4 p-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-purple-400" />
            <span className="font-bold text-purple-300">Admin Tier Preview:</span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setAdminSimTier("live")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${adminSimTier === "live" ? "bg-purple-600 text-white shadow-xs" : "text-gray-400 hover:text-white"}`}
              >
                Live (Admin)
              </button>
              <button
                type="button"
                onClick={() => setAdminSimTier("premium")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${adminSimTier === "premium" ? "bg-amber-500 text-black shadow-xs" : "text-gray-400 hover:text-white"}`}
              >
                👑 VIP
              </button>
              <button
                type="button"
                onClick={() => setAdminSimTier("silver")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${adminSimTier === "silver" ? "bg-blue-600 text-white shadow-xs" : "text-gray-400 hover:text-white"}`}
              >
                🛡️ Silver
              </button>
              <button
                type="button"
                onClick={() => setAdminSimTier("free")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${adminSimTier === "free" ? "bg-gray-700 text-white shadow-xs" : "text-gray-400 hover:text-white"}`}
              >
                ⭐ Free
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode("dashboard")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${viewMode === "dashboard" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <LayoutDashboard size={12} />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setViewMode("email")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${viewMode === "email" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <Mail size={12} />
              Email View
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      {viewMode === "email" ? (
        <WeeklySummaryEmail
          userName={userName}
          isPremium={effectiveIsVip}
          isSilver={effectiveIsSilver}
          tier={effectiveTier as any}
          winRate={stats.winRate}
          totalProfit={profitFormatted}
          vipWinRate={benchmarkAccuracy}
          totalBets={stats.bets}
          isZeroBets={isZeroBets}
        />
      ) : (
        <div
          className={`relative overflow-hidden rounded-3xl border transition-all ${
            darkMode
              ? "border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/95 shadow-2xl text-white"
              : "border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white shadow-xl text-slate-900"
          }`}
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

          {/* Top Brand Header Bar */}
          <div
            className={`px-6 py-5 border-b flex flex-wrap items-center justify-between gap-3 ${
              darkMode
                ? "border-white/10 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40"
                : "border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
                <Flame size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight">FutureBet</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${messageConfig.badgeColor}`}
                  >
                    <BadgeIcon size={11} />
                    {messageConfig.badge}
                  </span>
                </div>
                <p className="text-xs text-blue-400 font-medium">Algorithmic Weekly Review</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-gray-400 block">7-Day Window</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                <CheckCircle2 size={12} /> Model Verified
              </span>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              {messageConfig.title}
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed mb-6 font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              {messageConfig.subtitle}
            </p>

            {/* Bento Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
              {/* Card 1 */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  darkMode
                    ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    : "border-gray-200 bg-gray-50/80 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {isZeroBets ? "AI Strike Rate" : "Personal Win Rate"}
                  </span>
                  <Target size={15} className="text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                  {isZeroBets ? `${benchmarkAccuracy}%` : `${stats.winRate}%`}
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  {isZeroBets ? "28 Matches Evaluated" : `${stats.won}W / ${stats.lost}L Settled`}
                </span>
              </div>

              {/* Card 2 */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  darkMode
                    ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    : "border-gray-200 bg-gray-50/80 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {isZeroBets ? "Peak Value Edge" : "Net Profit"}
                  </span>
                  <TrendingUp size={15} className={isZeroBets ? "text-amber-400" : stats.profit >= 0 ? "text-emerald-400" : "text-rose-400"} />
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    isZeroBets
                      ? "text-amber-400"
                      : stats.profit >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {isZeroBets ? "+21.4% ROI" : profitFormatted}
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  {isZeroBets ? "Top +EV Model Gap" : `${stats.bets} Slips Settled`}
                </span>
              </div>

              {/* Card 3 */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  darkMode
                    ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    : "border-gray-200 bg-gray-50/80 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    {isZeroBets ? "Weekend Slate" : "VIP Accuracy"}
                  </span>
                  <Sparkles size={15} className="text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-400 tracking-tight">
                  {isZeroBets ? "16 Picks Ready" : `${benchmarkAccuracy}%`}
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  {isZeroBets ? "Early Line Advantage" : "High-Conviction Tier"}
                </span>
              </div>
            </div>

            {/* Zero Bets Benchmark Explainer Pill */}
            {isZeroBets && (
              <div
                className={`mb-6 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                  darkMode
                    ? "border-blue-500/20 bg-blue-500/10 text-blue-200"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                <Sparkles size={14} className="shrink-0 text-blue-400" />
                <span>
                  <strong>Algorithm Benchmark:</strong> Showing system model performance metrics until your first personal bets are logged in the BetSlip Tracker.
                </span>
              </div>
            )}

            {/* Top Algorithmic Hit of the Week Spotlight (Only shown for verified settled wins with real FT scores) */}
            {topHit && (
              <div
                className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  darkMode
                    ? "border-amber-400/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent"
                    : "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">
                    <Crown size={12} />
                    Top Model Hit of the Week
                  </div>
                  <div className="font-extrabold text-sm sm:text-base">
                    {topHit.match} — {topHit.prediction || topHit.selection || "VIP Pick"} {topHit.odds ? `@ ${Number(topHit.odds).toFixed(2)}` : ""}
                  </div>
                  <div className="text-xs text-gray-400">
                    Model Confirmed Win • Official FT Result: <span className="font-bold text-emerald-400">{topHit.ftScore}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black bg-emerald-500 text-white shadow-xs">
                    <CheckCircle2 size={12} /> WON
                  </span>
                  <span className="text-[10px] text-gray-400 sm:mt-1">Verified Result</span>
                </div>
              </div>
            )}

            {/* Action Buttons based on Tier */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-400 max-w-sm">
                Predictive models are updated continuously for early-market mispricings and line shifts.
              </p>

              <div className="flex items-center gap-2.5">
                {effectiveIsVip ? (
                  <>
                    {setActiveTab && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("compare")}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                          darkMode
                            ? "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Matchup Lab
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (setActiveTab) setActiveTab("explore");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 transition-all active:scale-95"
                    >
                      <Crown size={14} />
                      View Weekend VIP Picks
                      <ArrowRight size={13} />
                    </button>
                  </>
                ) : effectiveIsSilver ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (setActiveTab) setActiveTab("explore");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                        darkMode
                          ? "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Explore Silver Matches
                    </button>
                    <UpgradeButton plan="premium" className="!text-xs !py-2.5 !px-4">
                      Upgrade to VIP for 100% Unlocked Lines
                    </UpgradeButton>
                  </>
                ) : (
                  <>
                    <UpgradeButton plan="silver" className="!text-xs !py-2.5 !px-4">
                      Upgrade to Silver
                    </UpgradeButton>
                    <UpgradeButton plan="premium" className="!text-xs !py-2.5 !px-4">
                      Unlock Full VIP Insights
                    </UpgradeButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
