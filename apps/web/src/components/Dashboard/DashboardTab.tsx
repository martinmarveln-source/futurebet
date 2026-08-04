// @ts-nocheck
import React, { Suspense } from "react";
import { cn } from "@/utils/matchUtils";
import { SafeFallback } from "@/components/Dashboard/PremiumUI";
import { PremiumBrief } from "@/components/Dashboard/PremiumBrief";
import { HomeCard } from "@/components/Dashboard/HomeCard";
import SocialLinks from "@/components/Dashboard/SocialLinks";
import { ReferralCard } from "@/components/Dashboard/ReferralCard";

const BetSlip = React.lazy(() => import("@/components/Dashboard/BetSlip"));

export function DashboardTab({
  darkMode,
  isPro,
  bestToday,
  bestWeek,
  selectors,
  applyHomePreset,
  onExplore,
  openAutoPick,
  todayISO,
  user,
  maxMatches,
  isMatchInBetslip,
  canAddMore,
  hasKickoffPassed,
  handleAddFromHome,
  onCompare,
  matchesLoading,
  setActiveTab,
}) {
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* === UPGRADE 3: SYSTEM BOOT ANIMATION (STAGE 1) === */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PremiumBrief
          darkMode={darkMode}
          isPro={isPro}
          bestToday={bestToday}
          bestWeek={bestWeek}
          selectors={selectors}
          onPreset={applyHomePreset}
          onExplore={onExplore}
          onOpenAutoPick={openAutoPick}
        />
      </div>

      {/* === UPGRADE 1: BENTO BOX GRID LAYOUT (STAGE 2) === */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
        <HomeCard
          title="Best Today"
          subtitle={todayISO}
          list={bestToday}
          showDateInRows={false}
          darkMode={darkMode}
          isPro={isPro}
          user={user}
          maxMatches={maxMatches}
          isMatchInBetslip={isMatchInBetslip}
          canAddMore={canAddMore}
          hasKickoffPassed={hasKickoffPassed}
          onAdd={handleAddFromHome}
          onCompare={onCompare}
          onExplore={onExplore}
          selectors={selectors}
          matchesLoading={matchesLoading}
        />

        <HomeCard
          title="Best This Week"
          subtitle="Mon – Sun (current week)"
          list={bestWeek}
          showDateInRows={true}
          groupByDate={true}
          darkMode={darkMode}
          isPro={isPro}
          user={user}
          maxMatches={maxMatches}
          isMatchInBetslip={isMatchInBetslip}
          canAddMore={canAddMore}
          hasKickoffPassed={hasKickoffPassed}
          onAdd={handleAddFromHome}
          onCompare={onCompare}
          onExplore={onExplore}
          selectors={selectors}
          matchesLoading={matchesLoading}
        />
      </section>

      {/* === UPGRADE 2: ACTIVE TERMINAL BETSLIP (STAGE 3) === */}
      <section
        className={cn(
          "relative overflow-hidden rounded-[32px] border p-5 sm:p-6 sm:pb-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both transition-all",
          darkMode
            ? "bg-gray-950/40 border-white/10 backdrop-blur-2xl"
            : "bg-white/70 border-gray-200 backdrop-blur-2xl"
        )}
      >
        {/* Ambient Background Glow for BetSlip Terminal */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest opacity-60",
                  darkMode ? "text-gray-300" : "text-gray-500"
                )}
              >
                Slip Engine
              </div>
              <h3
                className={cn(
                  "text-base sm:text-lg font-black uppercase tracking-widest",
                  darkMode ? "text-emerald-400" : "text-emerald-600"
                )}
              >
                Active Terminal
              </h3>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("betslip")}
            className={cn(
              "text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl border transition-all active:scale-[0.99] flex items-center gap-2 shadow-sm",
              darkMode
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            )}
          >
            Expand Slip &rarr;
          </button>
        </div>

        <div className="relative z-10">
          <Suspense fallback={<SafeFallback text="Booting Terminal..." />}>
            <BetSlip darkMode={darkMode} />
          </Suspense>
        </div>
      </section>

      {/* Stage 4: Referral System */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
        <ReferralCard darkMode={darkMode} />
      </div>

      {/* Stage 5: Social Links */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700 fill-mode-both">
        <SocialLinks darkMode={darkMode} />
      </div>
    </div>
  );
}