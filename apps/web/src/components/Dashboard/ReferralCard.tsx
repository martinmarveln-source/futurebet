"use client";

import React, { useState, useEffect } from "react";
import { Gift, Copy, Share2, Check, ArrowRight } from "lucide-react";
import { cn } from "@/utils/matchUtils";
import { Card } from "@/components/ui/card"; // assuming this exists, if not I'll just use a div

export function ReferralCard({ darkMode = false }) {
  const [copied, setCopied] = useState(false);
  const [refCode, setRefCode] = useState("FB-2026-X8Y9");

  // Generate a somewhat unique looking code based on local storage so it persists
  useEffect(() => {
    let code = localStorage.getItem("fb_ref_code");
    if (!code) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const randomPart = Array.from({ length: 4 })
        .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
        .join("");
      code = `FB-${new Date().getFullYear()}-${randomPart}`;
      localStorage.setItem("fb_ref_code", code);
    }
    setRefCode(code);
  }, []);

  const referralLink = `https://futurebet.com.ng/?ref=${refCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Failed to copy link. Please select and copy manually.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "FutureBet - Elite Football Predictions",
          text: "Join me on FutureBet and get algorithmic football predictions!",
          url: referralLink,
        });
      } catch (e) {
        // user aborted or failed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[32px] border p-6 sm:p-8 shadow-xl transition-all",
        darkMode
          ? "bg-gradient-to-br from-indigo-950/50 via-gray-900 to-black border-indigo-500/20"
          : "bg-gradient-to-br from-indigo-50 via-white to-gray-50 border-indigo-200"
      )}
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left Content */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-2">
            <Gift className="h-6 w-6" />
          </div>
          <h3 className={cn(
            "text-2xl font-black tracking-tight",
            darkMode ? "text-white" : "text-gray-900"
          )}>
            Invite Friends, Earn Rewards
          </h3>
          <p className={cn(
            "text-sm max-w-md",
            darkMode ? "text-gray-400" : "text-gray-600"
          )}>
            Share your unique referral link with friends. When they join and upgrade, you both unlock exclusive Premium perks and extended access!
          </p>
        </div>

        {/* Right Content - Actions */}
        <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
          <div className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border",
            darkMode ? "bg-black/50 border-white/10" : "bg-gray-100 border-gray-200"
          )}>
            <div className="flex flex-col mr-6">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest mb-0.5",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}>
                Your Referral Code
              </span>
              <span className={cn(
                "font-mono font-bold tracking-wider",
                darkMode ? "text-indigo-400" : "text-indigo-600"
              )}>
                {refCode}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center justify-center",
                copied 
                  ? "bg-emerald-500/20 text-emerald-500" 
                  : darkMode 
                    ? "bg-white/5 hover:bg-white/10 text-gray-300" 
                    : "bg-white hover:bg-gray-50 text-gray-600 shadow-sm"
              )}
              title="Copy Link"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/25"
          >
            <Share2 size={18} />
            Share Referral Link
          </button>
        </div>

      </div>
    </div>
  );
}
