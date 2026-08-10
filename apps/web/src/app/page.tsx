// @ts-nocheck
"use client";

import dynamic from "next/dynamic";import React, {
  useMemo,
  useState,
  lazy,
  Suspense,
  useCallback,
  useEffect,
} from "react";
import { Gauge, Shield, List } from "lucide-react";
import useDashboard from "@/hooks/useDashboard";
import WeeklyPerformanceReport from "@/components/Dashboard/WeeklyPerformanceReport";
import Header from "@/components/Dashboard/Header";
import LoadingScreen from "@/components/Dashboard/LoadingScreen";
import SettingsModal from "@/components/Dashboard/SettingsModal";
import TeamComparisonModal from "@/components/Dashboard/TeamComparisonModal";
import useBetslipStore from "@/store/betslipStore";
import useUserPermissions from "@/hooks/useUserPermissions";
import { SafeFallback } from "@/components/Dashboard/PremiumUI";
import BetslipMarketModal from "@/components/Dashboard/BetslipMarketModal";
import StickySocialBar from "@/components/Dashboard/StickySocialBar";
import { PremiumHomeModal } from "@/components/Dashboard/PremiumHomeModal";
import AutoPickModal from "@/components/Dashboard/AutoPickModal";
import { useAutoPickLogic } from "@/hooks/useAutoPickLogic";
import UpgradeButton from "@/components/Dashboard/UpgradeButton";
import { useHomeData } from "@/hooks/useHomeData";
import { TabNavigation } from "@/components/Dashboard/TabNavigation";
import { DashboardTab } from "@/components/Dashboard/DashboardTab";
import { ExploreTab } from "@/components/Dashboard/ExploreTab";
import { VipPickTab } from "@/components/Dashboard/VipPickTab";
import { useMatchSelectors } from "@/hooks/useMatchSelectors";
import { useKickoffTime } from "@/hooks/useKickoffTime";
import { useBetslipModal } from "@/hooks/useBetslipModal";
import { useExploreFilters } from "@/hooks/useExploreFilters";
import { useHomeActions } from "@/hooks/useHomeActions";
import { cn } from "@/utils/matchUtils";

const BetSlip = dynamic(() => import("@/components/Dashboard/BetSlip"), { ssr: false });
const PerformanceTracker = dynamic(
  () => import("@/components/Dashboard/PerformanceTracker"), { ssr: false }
);
const TeamCompare = dynamic(() => import("@/components/Dashboard/TeamCompare"), { ssr: false });
const GuideTab = dynamic(() => import("@/components/Dashboard/GuideTab"), { ssr: false });
const SandboxTab = dynamic(() => import("@/components/Dashboard/SandboxTab"), { ssr: false });

/* === UPGRADE: NORDIC THEME BACKGROUND === */
function PremiumBackground({ darkMode }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 overflow-hidden z-0 transition-colors duration-700",
        // Soft Slate-100 to cut Light Mode glare, Deep #030712 for Dark Mode contrast
        darkMode ? "bg-[#030712]" : "bg-slate-100"
      )}
    >
      {/* Dulled, ambient neon orbs so they don't overpower the text */}
      <div
        className={cn(
          "absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full blur-[120px] animate-pulse duration-10000",
          darkMode ? "bg-blue-900/20" : "bg-blue-300/20"
        )}
      />
      <div
        className={cn(
          "absolute top-1/4 -left-40 h-[500px] w-[500px] rounded-full blur-[100px]",
          darkMode ? "bg-indigo-900/15" : "bg-indigo-300/15"
        )}
        style={{ animation: "pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
      />
      <div
        className={cn(
          "absolute -bottom-40 left-1/3 h-[600px] w-[600px] rounded-full blur-[120px]",
          darkMode ? "bg-violet-900/15" : "bg-violet-300/15"
        )}
        style={{ animation: "pulse 12s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
      />
    </div>
  );
}

/* === UPGRADE: HIGH-CONTRAST CARD SHELL === */
function GlassShell({ darkMode, className, children }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border shadow-lg transition-colors duration-300",
        // Solid Slate-900 background in dark mode forces high contrast for text readability
        darkMode
          ? "border-white/10 bg-[#0f172a]/95 shadow-black/50 backdrop-blur-xl"
          : "border-slate-200/80 bg-white/95 shadow-slate-200/50 backdrop-blur-md",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function PremiumLazyFallback({ darkMode, text }) {
  return (
    <GlassShell darkMode={darkMode} className="p-6 sm:p-8">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div
              className={cn(
                "mb-2 h-4 w-28 rounded-full",
                darkMode ? "bg-white/10" : "bg-slate-200"
              )}
            />
            <div
              className={cn(
                "h-8 w-56 rounded-full",
                darkMode ? "bg-white/10" : "bg-slate-200"
              )}
            />
          </div>
          <div
            className={cn(
              "h-10 w-24 rounded-2xl",
              darkMode ? "bg-white/10" : "bg-slate-200"
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className={cn(
                "h-32 animate-pulse rounded-3xl border",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-slate-200 bg-white/80"
              )}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
          <SafeFallback text={text} />
        </div>
      </div>
    </GlassShell>
  );
}

function SectionHeader({ darkMode, title, subtitle, badge }) {
  return (
    <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-6 border-slate-200 dark:border-white/10">
      <div>
        <p
          className={cn(
            "mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]",
            darkMode ? "text-slate-400" : "text-slate-500"
          )}
        >
          FutureBet Command Center
        </p>
        <h2
          className={cn(
            "text-2xl font-semibold tracking-tight sm:text-3xl",
            darkMode ? "text-white" : "text-slate-900"
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className={cn(
              "mt-2 max-w-2xl text-sm sm:text-[15px]",
              darkMode ? "text-slate-300" : "text-slate-600"
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {badge ? (
        <div
          className={cn(
            "inline-flex h-fit items-center rounded-full border px-3 py-1.5 text-xs font-bold",
            darkMode
              ? "border-blue-400/20 bg-blue-500/20 text-blue-200"
              : "border-blue-200 bg-blue-50 text-blue-700"
          )}
        >
          {badge}
        </div>
      ) : null}
    </div>
  );
}

export default function FutureBetDashboard() {
  const { addMatch, getMatchCount, isMatchInBetslip, canAddMore, maxMatches } =
    useBetslipStore();
  const betslipCount = getMatchCount();

  const { hasFeatureAccess, isAdmin, isPremium, isSilver } =
    useUserPermissions();
  const isPro = isAdmin || isPremium;
  const canSeeHomeTab = isAdmin || isPremium || isSilver;
  const canUseAutoPick = isAdmin || isPremium;

  const [showPremiumHomeModal, setShowPremiumHomeModal] = useState(false);

  const {
    user,
    userLoading,
    signOut,
    permissions,
    hasFilterAccess,
    darkMode,
    setDarkMode,
    activeTab,
    setActiveTab,
    selectedDate,
    dateRange,
    setDateRange,
    selectedLeagues,
    setSelectedLeagues,
    selectedMarkets,
    setSelectedMarkets,
    chanceThreshold,
    setChanceThreshold,
    ratingThreshold,
    setRatingThreshold,
    onlyAlignedPredictions,
    setOnlyAlignedPredictions,
    kickoffFilter,
    setKickoffFilter,
    sortBy,
    setSortBy,
    showDatePicker,
    setShowDatePicker,
    showSettings,
    setShowSettings,
    matchesData,
    matchesLoading,
    matchesError,
    refetch,
    preferencesData,
    handleSaveSettings,
    savePreferencesMutation,
    filteredMatches,
    uniqueLeagues,
  } = useDashboard();

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    if (!user) {
      setActiveTab("explore");
      return;
    }
    if (!canSeeHomeTab) {
      setActiveTab("explore");
    }
  }, [user, activeTab, setActiveTab, canSeeHomeTab]);

  const selectors = useMatchSelectors();
  const { hasKickoffPassed } = useKickoffTime();

  const {
    exploreQuery,
    setExploreQuery,
    oddsMode,
    setOddsMode,
    oddsFilter,
    setOddsFilter,
    strengthOnly,
    setStrengthOnly,
    ratingBand,
    setRatingBand,
    finalExploreMatches,
    displayQuery,
    shownCount,
    baseCount,
  } = useExploreFilters(filteredMatches, isPro);

  const [compareMatch, setCompareMatch] = useState(null);
  const [showAutoPick, setShowAutoPick] = useState(false);

  const rawMatches = Array.isArray(matchesData?.matches)
    ? matchesData.matches
    : [];

  const { bestToday, bestWeek, todayISO } = useHomeData(rawMatches, selectors);

  const autoPickLogic = useAutoPickLogic({
    user,
    maxMatches,
    getMatchCount,
    rawMatches,
    hasKickoffPassed,
    isMatchInBetslip,
    addMatch,
    selectors,
  });

  const {
    showHomeSlipModal,
    pendingSlipMatch,
    openHomeSlipModal,
    closeHomeSlipModal,
    confirmHomeSlipAdd,
  } = useBetslipModal();

  const { applyHomePreset, handleAddFromHome } = useHomeActions({
    setActiveTab,
    setStrengthOnly,
    setRatingBand,
    setChanceThreshold,
    setRatingThreshold,
    setSortBy,
  });

  const onExplore = useCallback(() => setActiveTab("explore"), [setActiveTab]);
  const onCompare = useCallback((m) => setCompareMatch(m), []);
  const onCloseCompare = useCallback(() => setCompareMatch(null), []);

  const openAutoPick = useCallback(() => {
    if (!canUseAutoPick) {
      setShowPremiumHomeModal(true);
      return;
    }
    setShowAutoPick(true);
  }, [canUseAutoPick]);

  const closeAutoPick = useCallback(() => {
    setShowAutoPick(false);
    autoPickLogic.setAutoPreview([]);
  }, [autoPickLogic]);

  useEffect(() => {
    const handleOpenAutoPick = (e) => {
      const { targetLeague, targetMarket } = e.detail;
      if (!canUseAutoPick) {
        setShowPremiumHomeModal(true);
        return;
      }
      setShowAutoPick(true);

      if (targetLeague) {
        autoPickLogic.setAutoSelectedLeagues([targetLeague]);
      }

      if (targetMarket) {
        autoPickLogic.setAutoMarkets({
          all: false,
          m1x2: targetMarket === "1X2",
          doubleChance: targetMarket === "Double Chance",
          overUnder:
            targetMarket === "Over 2.5" ||
            targetMarket === "Under 2.5" ||
            targetMarket === "O/U 2.5",
          btts: targetMarket === "BTTS",
          correctScore: targetMarket === "Correct Score",
          haOverUnder15: false,
        });
      }
    };

    window.addEventListener("futurebet:open-auto-pick", handleOpenAutoPick);
    return () =>
      window.removeEventListener(
        "futurebet:open-auto-pick",
        handleOpenAutoPick
      );
  }, [canUseAutoPick, autoPickLogic]);

  const filterPanelProps = useMemo(
    () => ({
      dateRange,
      setDateRange,
      selectedDate,
      showDatePicker,
      setShowDatePicker,
      uniqueLeagues,
      selectedLeagues,
      setSelectedLeagues,
      selectedMarkets,
      setSelectedMarkets,
      onlyAlignedPredictions,
      setOnlyAlignedPredictions,
      kickoffFilter,
      setKickoffFilter,
    }),
    [
      dateRange,
      setDateRange,
      selectedDate,
      showDatePicker,
      setShowDatePicker,
      uniqueLeagues,
      selectedLeagues,
      setSelectedLeagues,
      selectedMarkets,
      setSelectedMarkets,
      onlyAlignedPredictions,
      setOnlyAlignedPredictions,
      kickoffFilter,
      setKickoffFilter,
    ]
  );

  const activeTabMeta = useMemo(() => {
    switch (activeTab) {
      case "dashboard":
        return {
          title: "Dashboard",
          subtitle: "Executive workspace for high-value match opportunities.",
          badge: isPro
            ? "Pro active"
            : isSilver
            ? "Silver active"
            : "Silver+ required",
        };
      case "explore":
        return {
          title: "Explore Matches",
          subtitle: "Search, filter, and refine match opportunities.",
          badge: `${shownCount}/${baseCount || 0} visible`,
        };
      case "compare":
        return {
          title: "Team Comparison",
          subtitle: "Review form, matchup balance, and confidence context.",
          badge: "Analysis",
        };
      case "betslip":
        return {
          title: "Smart Betslip",
          subtitle: "Build, review, and manage selections.",
          badge: `${betslipCount}/${maxMatches} selected`,
        };
      case "vip-pick":
        return {
          title: "VIP Picks",
          subtitle: "Access curated selections and premium match insights.",
          badge: isPremium || isAdmin ? "VIP active" : "VIP required",
        };
      case "performance-tracker":
        return {
          title: "Performance Analytics",
          subtitle: "Track outcomes, patterns, and workflow performance.",
          badge: "Analytics",
        };
      case "sandbox":
        return {
          title: "Algorithmic Sandbox",
          subtitle:
            "Quantitative backtesting and machine learning calibration.",
          badge: isAdmin || isPremium ? "Pro" : "Locked",
        };
      case "guide":
        return {
          title: "User Guide",
          subtitle: "Complete manual explaining features and workflows.",
          badge: "Documentation",
        };
      default:
        return {
          title: "Dashboard",
          subtitle: "",
          badge: null,
        };
    }
  }, [
    activeTab,
    isPro,
    isSilver,
    shownCount,
    baseCount,
    betslipCount,
    maxMatches,
    isPremium,
    isAdmin,
  ]);

  const accountBadge = useMemo(() => {
    if (isAdmin) return "Admin";
    if (isPremium) return "Premium";
    if (isSilver) return "Silver";
    return user ? "Standard" : "Guest";
  }, [isAdmin, isPremium, isSilver, user]);

  if (userLoading) return <LoadingScreen darkMode={darkMode} />;

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-x-hidden transition-colors duration-500",
        // The Root Base Colors - Critical for global contrast
        darkMode ? "bg-[#030712] text-slate-100" : "bg-slate-100 text-slate-800"
      )}
    >
      <PremiumBackground darkMode={darkMode} />

      <div className="relative z-10">
        <div
          className={cn(
            "sticky top-0 z-40 border-b backdrop-blur-2xl transition-colors duration-300",
            darkMode
              ? "border-white/10 bg-[#070b17]/85"
              : "border-slate-200/70 bg-white/80"
          )}
        >
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            user={user}
            signOut={signOut}
            onShowSettings={() => setShowSettings(true)}
            userPermissions={permissions}
          />
        </div>

        <PremiumHomeModal
          open={showPremiumHomeModal}
          onClose={() => setShowPremiumHomeModal(false)}
          darkMode={darkMode}
        />

        <BetslipMarketModal
          open={showHomeSlipModal}
          darkMode={darkMode}
          matchName={pendingSlipMatch?.match}
          onClose={closeHomeSlipModal}
          onConfirm={(data) => confirmHomeSlipAdd(data, addMatch, maxMatches)}
        />

        <AutoPickModal
          open={showAutoPick && canUseAutoPick}
          darkMode={darkMode}
          onClose={closeAutoPick}
          isPremiumAccess={canUseAutoPick}
          autoRange={autoPickLogic.autoRange}
          setAutoRange={autoPickLogic.setAutoRange}
          autoCustomRange={autoPickLogic.autoCustomRange}
          setAutoCustomRange={autoPickLogic.setAutoCustomRange}
          autoSelectedLeagues={autoPickLogic.autoSelectedLeagues}
          setAutoSelectedLeagues={autoPickLogic.setAutoSelectedLeagues}
          availableLeagues={uniqueLeagues}
          autoStyle={autoPickLogic.autoStyle}
          setAutoStyle={autoPickLogic.setAutoStyle}
          autoCount={autoPickLogic.autoCount}
          setAutoCount={autoPickLogic.setAutoCount}
          autoMarkets={autoPickLogic.autoMarkets}
          setAutoMarkets={autoPickLogic.setAutoMarkets}
          auto1x2Options={autoPickLogic.auto1x2Options}
          setAuto1x2Options={autoPickLogic.setAuto1x2Options}
          autoOUOptions={autoPickLogic.autoOUOptions}
          setAutoOUOptions={autoPickLogic.setAutoOUOptions}
          autoBTTSOptions={autoPickLogic.autoBTTSOptions}
          setAutoBTTSOptions={autoPickLogic.setAutoBTTSOptions}
          autoDoubleChanceOptions={autoPickLogic.autoDoubleChanceOptions}
          setAutoDoubleChanceOptions={autoPickLogic.setAutoDoubleChanceOptions}
          autoPreview={autoPickLogic.autoPreview}
          setAutoPreview={autoPickLogic.setAutoPreview}
          onPreview={autoPickLogic.generateAutoPreview}
          onConfirm={autoPickLogic.confirmAutoPick}
        />

        {compareMatch && (
          <TeamComparisonModal
            match={compareMatch}
            onClose={onCloseCompare}
            darkMode={darkMode}
          />
        )}

        <div className="mx-auto max-w-7xl px-2 pt-4 sm:px-4 sm:pt-6 relative z-10">
          <GlassShell
            darkMode={darkMode}
            className="p-0 overflow-hidden border-0"
          >
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-8 justify-between relative">
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-[0.3em]",
                      darkMode ? "text-emerald-400" : "text-emerald-600"
                    )}
                  >
                    System Online
                  </span>
                </div>
                <h1 className="sr-only">Futurebet - AI Football Predictions & VIP Betting Analytics</h1>
                <h2
                  className={cn(
                    "text-3xl sm:text-4xl font-black tracking-tighter uppercase",
                    darkMode ? "text-white" : "text-slate-900"
                  )}
                >
                  {activeTabMeta.title}
                </h2>
                <p
                  className={cn(
                    "mt-2 max-w-xl text-sm font-semibold",
                    darkMode ? "text-slate-300" : "text-slate-600"
                  )}
                >
                  {activeTabMeta.subtitle}
                </p>
              </div>

              <div className="flex shrink-0 gap-4 sm:gap-8 flex-wrap lg:flex-nowrap relative z-10 bg-black/5 dark:bg-white/[0.04] p-4 rounded-3xl border border-black/5 dark:border-white/10">
                <div className="flex flex-col justify-center min-w-[100px]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Match Engine
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center shadow-inner",
                        darkMode
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-blue-50 text-blue-600 border border-blue-200"
                      )}
                    >
                      <Gauge size={18} />
                    </div>
                    <div>
                      <div
                        className={cn(
                          "text-xl font-black tabular-nums leading-none",
                          darkMode ? "text-white" : "text-slate-900"
                        )}
                      >
                        {matchesLoading ? "..." : rawMatches.length}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                        Loaded
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "w-px h-12 hidden sm:block my-auto",
                    darkMode ? "bg-white/10" : "bg-slate-200"
                  )}
                />

                <div className="flex flex-col justify-center min-w-[100px]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Clearance
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center shadow-inner",
                        darkMode
                          ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                          : "bg-violet-50 text-violet-600 border border-violet-200"
                      )}
                    >
                      <Shield size={18} />
                    </div>
                    <div>
                      <div
                        className={cn(
                          "text-xl font-black tabular-nums leading-none uppercase tracking-tight",
                          darkMode ? "text-white" : "text-slate-900"
                        )}
                      >
                        {accountBadge}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                        Access Tier
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "w-px h-12 hidden sm:block my-auto",
                    darkMode ? "bg-white/10" : "bg-slate-200"
                  )}
                />

                <div className="flex flex-col justify-center min-w-[100px]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Cart Capacity
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center shadow-inner",
                        darkMode
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      )}
                    >
                      <List size={18} />
                    </div>
                    <div>
                      <div
                        className={cn(
                          "text-xl font-black tabular-nums leading-none",
                          darkMode ? "text-white" : "text-slate-900"
                        )}
                      >
                        {betslipCount}
                        <span className="text-slate-500 text-sm">
                          /{maxMatches}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                        Active Slots
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassShell>
        </div>

        <div className="mx-auto max-w-7xl px-2 pt-3 sm:px-4 sm:pt-4">
          <GlassShell darkMode={darkMode} className="p-2 sm:p-3">
            <TabNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              user={user}
              canSeeHomeTab={canSeeHomeTab}
              setShowPremiumHomeModal={setShowPremiumHomeModal}
              betslipCount={betslipCount}
              hasFeatureAccess={hasFeatureAccess}
              isAdmin={isAdmin}
              isPremium={isPremium}
              darkMode={darkMode}
            />
          </GlassShell>
        </div>

        <main className="mx-auto max-w-7xl px-2 py-3 sm:px-4 sm:py-6">
          <div className="space-y-4 sm:space-y-6 pb-44 sm:pb-52">
            {!isPro && (
              <GlassShell darkMode={darkMode} className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.22em]",
                        darkMode ? "text-blue-400" : "text-blue-700"
                      )}
                    >
                      Upgrade to Pro
                    </p>
                    <h3
                      className={cn(
                        "mt-2 text-xl font-semibold tracking-tight sm:text-2xl",
                        darkMode ? "text-white" : "text-slate-900"
                      )}
                    >
                      Unlock advanced match intelligence
                    </h3>
                    <p
                      className={cn(
                        "mt-2 max-w-2xl text-sm sm:text-[15px]",
                        darkMode ? "text-slate-300" : "text-slate-600"
                      )}
                    >
                      Access the premium dashboard, stronger decision workflows,
                      and VIP tools designed for more confident betting.
                    </p>
                  </div>

                  <UpgradeButton
                    className={cn(
                      "inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold transition-all duration-200",
                      darkMode
                        ? "border-blue-400/20 bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white hover:from-blue-500/30 hover:to-violet-500/30"
                        : "border-blue-200 bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-95"
                    )}
                  >
                    Upgrade to Pro
                  </UpgradeButton>
                </div>
              </GlassShell>
            )}

            <GlassShell darkMode={darkMode} className="p-4 sm:p-6 lg:p-8">
              <SectionHeader
                darkMode={darkMode}
                title={activeTabMeta.title}
                subtitle={activeTabMeta.subtitle}
                badge={activeTabMeta.badge}
              />

              <div className="pt-5 sm:pt-6">
                {activeTab === "dashboard" ? (
                  <DashboardTab
                    darkMode={darkMode}
                    isPro={canSeeHomeTab}
                    bestToday={bestToday}
                    bestWeek={bestWeek}
                    selectors={selectors}
                    applyHomePreset={applyHomePreset}
                    onExplore={onExplore}
                    openAutoPick={openAutoPick}
                    todayISO={todayISO}
                    user={user}
                    maxMatches={maxMatches}
                    isMatchInBetslip={isMatchInBetslip}
                    canAddMore={canAddMore}
                    hasKickoffPassed={hasKickoffPassed}
                    handleAddFromHome={(m) =>
                      handleAddFromHome(
                        m,
                        user,
                        isMatchInBetslip,
                        canAddMore,
                        maxMatches,
                        openHomeSlipModal
                      )
                    }
                    onCompare={onCompare}
                    matchesLoading={matchesLoading}
                    setActiveTab={setActiveTab}
                  />
                ) : activeTab === "explore" ? (
                  <ExploreTab
                    matchesData={matchesData}
                    finalExploreMatches={finalExploreMatches}
                    darkMode={darkMode}
                    exploreQuery={exploreQuery}
                    setExploreQuery={setExploreQuery}
                    displayQuery={displayQuery}
                    shownCount={shownCount}
                    baseCount={baseCount}
                    isPro={isPro}
                    canUseAutoPick={canUseAutoPick}
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
                    hasFilterAccess={hasFilterAccess}
                    filterPanelProps={filterPanelProps}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    matchesError={matchesError}
                    selectedDate={selectedDate}
                    hasKickoffPassed={hasKickoffPassed}
                  />
                ) : activeTab === "compare" ? (
                  permissions.isRestrictedTrial ? (
                    <PremiumLazyFallback
                      darkMode={darkMode}
                      text="Compare tool is not available on the Referral Trial. Upgrade to Full Premium to unlock!"
                    />
                  ) : (
                    <Suspense
                      fallback={
                        <PremiumLazyFallback
                          darkMode={darkMode}
                          text="Loading comparison workspace…"
                        />
                      }
                    >
                      <TeamCompare darkMode={darkMode} />
                    </Suspense>
                  )
                ) : activeTab === "betslip" ? (
                  <Suspense
                    fallback={
                      <PremiumLazyFallback
                        darkMode={darkMode}
                        text="Loading betslip workspace…"
                      />
                    }
                  >
                    <BetSlip darkMode={darkMode} />
                  </Suspense>
                ) : activeTab === "vip-pick" ? (
                  <VipPickTab
                    darkMode={darkMode}
                    isAdmin={isAdmin}
                    isPremium={isPremium}
                    hasKickoffPassed={hasKickoffPassed}
                    setActiveTab={setActiveTab}
                  />
                ) : activeTab === "performance-tracker" ? (
                  permissions.isRestrictedTrial ? (
                    <PremiumLazyFallback
                      darkMode={darkMode}
                      text="Performance Analytics is not available on the Referral Trial. Upgrade to Full Premium to unlock!"
                    />
                  ) : (
                    <Suspense
                      fallback={
                        <PremiumLazyFallback
                          darkMode={darkMode}
                          text="Loading performance analytics…"
                        />
                      }
                    >
                      <PerformanceTracker darkMode={darkMode} />
                    </Suspense>
                  )
                ) : activeTab === "sandbox" ? (
                  permissions.isRestrictedTrial ? (
                    <PremiumLazyFallback
                      darkMode={darkMode}
                      text="Sandbox Mode is not available on the Referral Trial. Upgrade to Full Premium to unlock!"
                    />
                  ) : (
                    <Suspense
                    fallback={
                      <PremiumLazyFallback
                        darkMode={darkMode}
                        text="Loading algorithmic sandbox…"
                      />
                    }
                  >
                    <SandboxTab
                      darkMode={darkMode}
                      isAdmin={isAdmin}
                      isPremium={isPremium}
                    />
                  </Suspense>
                  )
                ) : activeTab === "guide" ? (
                  <Suspense
                    fallback={
                      <PremiumLazyFallback
                        darkMode={darkMode}
                        text="Loading user guide…"
                      />
                    }
                  >
                    <GuideTab darkMode={darkMode} />
                  </Suspense>
                ) : null}
              </div>
            </GlassShell>
          </div>
        </main>

        <SettingsModal
          show={showSettings}
          onClose={() => setShowSettings(false)}
          darkMode={darkMode}
          preferences={preferencesData}
          onSave={handleSaveSettings}
          isLoading={savePreferencesMutation?.isPending}
          isPremium={isAdmin || isPremium}
          isAdmin={isAdmin}
        />

        {/* --- WEEKLY PERFORMANCE REPORT --- */}
        {(isAdmin || isPremium || isSilver) && (
          <WeeklyPerformanceReport 
            userName={user?.name ? user.name.split(' ')[0] : (user?.first_name || "there")}
            isPremium={isPremium}
            isSilver={isSilver}
            isAdmin={isAdmin}
          />
        )}

        <div className="h-28 sm:h-32" />

        <div
          className={cn(
            "relative border-t",
            darkMode
              ? "border-white/10 bg-black/10"
              : "border-slate-200/70 bg-white/20"
          )}
        >
          <StickySocialBar darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}