// @ts-nocheck
import React from "react";
import {
  BarChart3,
  Crown,
  Ticket,
  Target,
  Compass,
  Lock,
  GitCompare,
  BookOpen,
  TestTubes,
} from "lucide-react";
import { cn } from "@/utils/matchUtils";

export function TabNavigation({
  activeTab,
  setActiveTab,
  user,
  canSeeHomeTab,
  setShowPremiumHomeModal,
  betslipCount,
  hasFeatureAccess,
  isAdmin,
  isPremium,
  darkMode,
}) {
  return (
    <div
      className={cn(
        "border-b",
        darkMode ? "border-white/10" : "border-gray-200"
      )}
    >
      <nav className="flex flex-wrap gap-1 sm:gap-2 md:space-x-6 md:gap-0 overflow-x-auto scrollbar-hide">
        {user && canSeeHomeTab ? (
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
              activeTab === "dashboard"
                ? darkMode
                  ? "border-blue-400 text-blue-300"
                  : "border-blue-600 text-blue-700"
                : darkMode
                ? "border-transparent text-gray-400 hover:text-gray-200"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Home</span>
          </button>
        ) : user ? (
          <button
            onClick={() => setShowPremiumHomeModal(true)}
            className={cn(
              "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
              "border-transparent",
              darkMode
                ? "text-gray-500 hover:text-gray-200"
                : "text-gray-500 hover:text-gray-800"
            )}
            title="Premium only"
          >
            <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Home</span>
          </button>
        ) : null}

        <button
          onClick={() => setActiveTab("explore")}
          className={cn(
            "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
            activeTab === "explore"
              ? darkMode
                ? "border-indigo-400 text-indigo-300"
                : "border-indigo-600 text-indigo-700"
              : darkMode
              ? "border-transparent text-gray-400 hover:text-gray-200"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          <Compass className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Explore</span>
        </button>

        <button
          onClick={() => setActiveTab("compare")}
          className={cn(
            "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
            activeTab === "compare"
              ? darkMode
                ? "border-emerald-400 text-emerald-300"
                : "border-emerald-600 text-emerald-700"
              : darkMode
              ? "border-transparent text-gray-400 hover:text-gray-200"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          <GitCompare className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Compare</span>
        </button>

        <button
          onClick={() => setActiveTab("betslip")}
          className={cn(
            "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
            activeTab === "betslip"
              ? darkMode
                ? "border-emerald-400 text-emerald-300"
                : "border-emerald-600 text-emerald-700"
              : darkMode
              ? "border-transparent text-gray-400 hover:text-gray-200"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          <Ticket className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>BetSlip</span>
          {betslipCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold bg-emerald-500 text-white rounded-full min-w-[18px] text-center">
              {betslipCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("vip-pick")}
          className={cn(
            "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
            activeTab === "vip-pick"
              ? "border-yellow-500 text-yellow-500"
              : darkMode
              ? "border-transparent text-gray-400 hover:text-gray-200"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">VIP PICK</span>
          <span className="sm:hidden">VIP</span>
          {(isPremium || isAdmin) && (
            <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold bg-yellow-500 text-white rounded-full">
              <span className="hidden sm:inline">PREMIUM</span>
              <span className="sm:hidden">PRO</span>
            </span>
          )}
        </button>

        {hasFeatureAccess("performance-tracker") && (
          <button
            onClick={() => setActiveTab("performance-tracker")}
            className={cn(
              "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
              activeTab === "performance-tracker"
                ? "border-purple-500 text-purple-500"
                : darkMode
                ? "border-transparent text-gray-400 hover:text-gray-200"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <Target className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perf</span>
            <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold bg-purple-500 text-white rounded-full">
              <span className="hidden sm:inline">PREMIUM</span>
              <span className="sm:hidden">PRO</span>
            </span>
          </button>
        )}

        {/* 🔥 UPGRADE: THE NEW SANDBOX TAB BUTTON */}
        {(isAdmin || isPremium) && (
          <button
            onClick={() => setActiveTab("sandbox")}
            className={cn(
              "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
              activeTab === "sandbox"
                ? "border-cyan-500 text-cyan-500"
                : darkMode
                ? "border-transparent text-gray-400 hover:text-gray-200"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <TestTubes className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Sandbox</span>
            <span className="sm:hidden">Box</span>
            <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold bg-cyan-500 text-white rounded-full">
              <span className="hidden sm:inline">PREMIUM</span>
              <span className="sm:hidden">PRO</span>
            </span>
          </button>
        )}

        {/* PAST RESULTS / ARCHIVE TAB */}
        <a
          href="/archive"
          className={cn(
            "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 border-transparent",
            darkMode
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history h-3 w-3 sm:h-4 sm:w-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
          <span className="hidden sm:inline">Past Results</span>
          <span className="sm:hidden">Past</span>
          <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold bg-amber-500 text-white rounded-full">
            PRO
          </span>
        </a>

        <button
          onClick={() => setActiveTab("guide")}
          className={cn(
            "flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
            activeTab === "guide"
              ? darkMode
                ? "border-sky-400 text-sky-300"
                : "border-sky-600 text-sky-700"
              : darkMode
              ? "border-transparent text-gray-400 hover:text-gray-200"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Guide</span>
        </button>
      </nav>
    </div>
  );
}