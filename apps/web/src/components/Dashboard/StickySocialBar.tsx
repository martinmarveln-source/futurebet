// @ts-nocheck
"use client";
import { FacebookIcon, YoutubeIcon } from "@/components/SocialIcons";
import { useState, useEffect } from "react";
import { Send, X, Radio, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/utils/matchUtils";

const STORAGE_KEY = "futurebet_syndicate_banner_dismissed";

export default function StickySocialBar({ darkMode = true }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const expiry = Number(dismissed);
        // If dismissed within the last 7 days, keep hidden
        if (Date.now() < expiry) {
          return;
        }
      }
    } catch {
      // ignore storage access issues
    }

    // Delay slide-in slightly so main dashboard loads smoothly first
    const timer = setTimeout(() => setIsVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      // Dismiss for 7 days
      localStorage.setItem(
        STORAGE_KEY,
        String(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
    } catch {
      // ignore
    }
  };

  if (!isVisible) return null;

  // Minimized Floating Pill Mode (bottom-right, zero obstruction to filters/cards)
  if (isMinimized) {
    return (
      <aside
        aria-label="Community & Social Links"
        className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <button
          onClick={() => setIsMinimized(false)}
          className={cn(
            "group flex items-center gap-2.5 rounded-full px-3.5 py-2 text-xs font-bold shadow-xl border backdrop-blur-xl transition-all hover:scale-105 active:scale-95",
            darkMode
              ? "bg-gray-950/90 border-cyan-500/30 text-cyan-300 shadow-cyan-500/10 hover:border-cyan-400"
              : "bg-white/95 border-cyan-600/30 text-cyan-700 shadow-cyan-600/10 hover:border-cyan-500"
          )}
          title="Open Syndicate Alerts"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <Radio size={14} className="text-cyan-500 animate-pulse" />
          <span>Syndicate Alerts</span>
          <ChevronUp
            size={14}
            className="text-gray-400 group-hover:text-cyan-400 transition-colors"
          />
        </button>
      </aside>
    );
  }

  // Expanded Docked Card Mode (docked in bottom-right corner, unobstructed center)
  return (
    <aside
      aria-label="Community & Social Links"
      className="fixed bottom-4 right-4 sm:right-6 z-40 max-w-[92vw] sm:max-w-md animate-in slide-in-from-bottom-6 fade-in duration-500 ease-out"
    >
      <div
        className={cn(
          "rounded-2xl p-3.5 shadow-2xl border backdrop-blur-xl relative overflow-hidden flex flex-col gap-2.5",
          darkMode
            ? "bg-gray-950/90 border-white/10 shadow-black/60"
            : "bg-white/95 border-gray-200/90 shadow-slate-300/60"
        )}
      >
        {/* Ambient glow accent */}
        <div className="absolute right-0 top-0 w-28 h-full bg-cyan-500/10 blur-xl pointer-events-none" />

        {/* Header row with Title, Minimize and Close */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "p-1.5 rounded-lg border flex items-center justify-center shrink-0 shadow-inner",
                darkMode
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                  : "bg-cyan-50 border-cyan-200 text-cyan-600"
              )}
            >
              <Radio size={14} className="animate-pulse" />
            </div>
            <div className="min-w-0 truncate">
              <div
                className={cn(
                  "text-xs font-black tracking-tight truncate",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                FutureBet Syndicate
              </div>
              <div
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                Live Intelligence & Alerts
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Minimize button */}
            <button
              onClick={() => setIsMinimized(true)}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                darkMode
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}
              title="Minimize to pill"
            >
              <ChevronDown size={14} />
            </button>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors",
                darkMode
                  ? "text-gray-400 hover:text-rose-400 hover:bg-rose-500/15"
                  : "text-gray-500 hover:text-rose-600 hover:bg-rose-50"
              )}
              title="Dismiss for 7 days"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 relative z-10 pt-0.5">
          {/* Secondary: Facebook */}
          <a
            href="https://www.facebook.com/futurebetprediction"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0",
              darkMode
                ? "bg-white/5 text-gray-300 border-white/10 hover:bg-blue-600 hover:border-blue-500 hover:text-white"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-600 hover:border-blue-500 hover:text-white"
            )}
            title="Facebook"
          >
            <FacebookIcon size={14} />
            <span className="hidden sm:inline text-[11px]">Facebook</span>
          </a>

          {/* Secondary: YouTube */}
          <a
            href="https://www.youtube.com/@FUTUERBET"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0",
              darkMode
                ? "bg-white/5 text-gray-300 border-white/10 hover:bg-red-600 hover:border-red-500 hover:text-white"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-red-600 hover:border-red-500 hover:text-white"
            )}
            title="YouTube"
          >
            <YoutubeIcon size={14} />
            <span className="hidden sm:inline text-[11px]">YouTube</span>
          </a>

          {/* Primary Action: Telegram */}
          <a
            href="https://t.me/futurebetprediction"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white transition-all border shadow-md relative overflow-hidden group",
              "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-blue-400/30"
            )}
          >
            <Send size={13} />
            <span>Join Telegram</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
