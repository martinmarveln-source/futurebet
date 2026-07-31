// @ts-nocheck
"use client";
import { FacebookIcon, YoutubeIcon } from "@/components/SocialIcons";

import { useState, useEffect } from "react";
import { Send, X, Radio } from "lucide-react";
import { cn } from "@/utils/matchUtils"; // Adjust if your import path is different

export default function StickySocialBar({ darkMode = true }) {
  const [isVisible, setIsVisible] = useState(false);

  // Slight delay before sliding in to let the main dashboard load first
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-3xl animate-in slide-in-from-bottom-10 fade-in duration-700 ease-out">
      <div
        className={cn(
          "flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[24px] p-3 pl-5 pr-4 shadow-2xl border backdrop-blur-xl relative overflow-hidden",
          darkMode
            ? "bg-gray-950/80 border-white/10 shadow-blue-500/10"
            : "bg-white/90 border-gray-200 shadow-blue-500/5"
        )}
      >
        {/* Subtle background glow effect */}
        <div className="absolute left-0 top-0 w-32 h-full bg-blue-500/10 blur-2xl pointer-events-none" />

        {/* Left Side: Brand Call to Action */}
        <div className="flex items-center gap-3 self-start sm:self-auto w-full sm:w-auto">
          <div
            className={cn(
              "p-2 rounded-xl border flex items-center justify-center shadow-inner",
              darkMode
                ? "bg-white/5 border-white/10 text-blue-400"
                : "bg-gray-50 border-gray-200 text-blue-600"
            )}
          >
            <Radio size={18} className="animate-pulse" />
          </div>
          <div>
            <div
              className={cn(
                "text-sm font-black tracking-tight",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              FutureBet Syndicate
            </div>
            <div
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              Live Intelligence & Alerts
            </div>
          </div>

          {/* Mobile Close Button (Shows only on small screens next to title) */}
          <button
            onClick={() => setIsVisible(false)}
            className="sm:hidden ml-auto p-2 rounded-full hover:bg-gray-500/20 transition-colors"
          >
            <X
              size={16}
              className={darkMode ? "text-gray-400" : "text-gray-500"}
            />
          </button>
        </div>

        {/* Right Side: The Network Links */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {/* Secondary: Facebook */}
          <a
            href="https://www.facebook.com/futurebetprediction"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0",
              darkMode
                ? "bg-white/5 text-gray-300 border-white/10 hover:bg-blue-600 hover:border-blue-500 hover:text-white"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-600 hover:border-blue-500 hover:text-white"
            )}
            title="Facebook"
          >
            <FacebookIcon size={16} />
            <span className="hidden sm:inline">Facebook</span>
          </a>

          {/* Secondary: YouTube */}
          <a
            href="https://www.youtube.com/@FUTUERBET"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0",
              darkMode
                ? "bg-white/5 text-gray-300 border-white/10 hover:bg-red-600 hover:border-red-500 hover:text-white"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-red-600 hover:border-red-500 hover:text-white"
            )}
            title="YouTube"
          >
            <YoutubeIcon size={16} />
            <span className="hidden sm:inline">YouTube</span>
          </a>

          {/* Primary Action: Telegram (Execution Channel) */}
          <a
            href="https://t.me/futurebetprediction"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all border shrink-0 shadow-lg relative overflow-hidden group",
              "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-blue-500/50"
            )}
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            <Send size={16} className="-ml-0.5" />
            <span>Join Telegram</span>
          </a>

          {/* Desktop Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="hidden sm:flex ml-1 p-2.5 rounded-xl hover:bg-rose-500/20 hover:text-rose-500 text-gray-400 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}