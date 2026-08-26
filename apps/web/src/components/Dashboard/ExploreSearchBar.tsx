// @ts-nocheck
import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/utils/matchUtils";

export function ExploreSearchBar({
  exploreQuery,
  setExploreQuery,
  displayQuery,
  shownCount,
  baseCount,
  darkMode,
  noBorder,
}) {
  return (
    <div
      className={cn(
        "p-4",
        noBorder
          ? "bg-transparent"
          : darkMode
          ? "rounded-3xl border border-white/10 bg-white/5 mb-3 p-3"
          : "rounded-3xl border border-gray-200 bg-white mb-3 p-3",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-3 py-2.5 w-full sm:max-w-md shadow-sm transition-colors",
            darkMode
              ? "border-white/10 bg-white/5 focus-within:border-blue-500/50 focus-within:bg-white/10"
              : "border-gray-200 bg-gray-50/50 focus-within:border-blue-400 focus-within:bg-white",
          )}
        >
          <Search
            size={18}
            className={darkMode ? "text-gray-400" : "text-gray-500"}
          />
          <input
            aria-label="Search query"
            value={exploreQuery}
            onChange={(e) => setExploreQuery(e.target.value)}
            placeholder="Search match, league, market, pick..."
            className={cn(
              "w-full bg-transparent outline-none text-[15px]",
              darkMode
                ? "text-gray-100 placeholder:text-gray-500"
                : "text-gray-900 placeholder:text-gray-400",
            )}
          />
          {exploreQuery ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => setExploreQuery("")}
              className={cn(
                "p-1 rounded-xl border transition active:scale-[0.99]",
                darkMode
                  ? "border-white/10 bg-white/10 hover:bg-white/20"
                  : "border-gray-200 bg-white hover:bg-gray-100",
              )}
              title="Clear"
            >
              <X
                size={14}
                className={darkMode ? "text-gray-200" : "text-gray-700"}
              />
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            "text-[13px] font-medium",
            darkMode ? "text-gray-400" : "text-gray-500",
          )}
        >
          {displayQuery ? (
            <>
              Showing <b className={darkMode ? "text-blue-400" : "text-blue-600"}>{shownCount}</b> results for{" "}
              <b className={darkMode ? "text-white" : "text-gray-900"}>
                "{displayQuery}"
              </b>{" "}
              (out of <b>{baseCount}</b>)
            </>
          ) : (
            <>
              Showing <b className={darkMode ? "text-blue-400" : "text-blue-600"}>{shownCount}</b> of <b>{baseCount}</b>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
