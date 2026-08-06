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
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-3 mb-3",
        darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-3 py-2 w-full sm:max-w-md",
            darkMode
              ? "border-white/10 bg-white/5"
              : "border-gray-200 bg-white",
          )}
        >
          <Search
            size={16}
            className={darkMode ? "text-gray-300" : "text-gray-500"}
          />
          <input
            aria-label="Search query"
            value={exploreQuery}
            onChange={(e) => setExploreQuery(e.target.value)}
            placeholder="Search match, league, market, pick…"
            className={cn(
              "w-full bg-transparent outline-none text-sm",
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
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-gray-200 bg-white hover:bg-gray-50",
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
            "text-xs",
            darkMode ? "text-gray-300" : "text-gray-600",
          )}
        >
          {displayQuery ? (
            <>
              Showing <b>{shownCount}</b> results for{" "}
              <b className={darkMode ? "text-white" : "text-gray-900"}>
                "{displayQuery}"
              </b>{" "}
              (out of <b>{baseCount}</b>)
            </>
          ) : (
            <>
              Showing <b>{shownCount}</b> of <b>{baseCount}</b>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
