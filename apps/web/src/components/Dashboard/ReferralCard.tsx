"use client";

import React, { useState, useEffect } from "react";
import { Gift, Copy, Share2, Check, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/utils/matchUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ReferralCard({ darkMode = false, user = null }) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["referralStats"],
    queryFn: async () => {
      const res = await fetch("/api/referrals/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/referrals/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim");
      return data;
    },
    onSuccess: (data) => {
      alert(`Success! You earned: ${data.rewardType.replace(/_/g, ' ')}`);
      queryClient.invalidateQueries(["referralStats"]);
      queryClient.invalidateQueries(["userPermissions"]);
      // reload window to apply new token/permissions fully
      window.location.reload();
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const refCode = stats?.referralCode || user?.referralCode || user?.referral_code || "Log in to view";
  const referralLink = `https://futurebet.com.ng/?ref=${refCode}`;
  
  const pendingCount = stats?.pendingCount || 0;
  const target = 15;
  const progress = Math.min(100, Math.round((pendingCount / target) * 100));
  const canClaim = pendingCount >= target;

  const handleCopy = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Failed to copy link. Please select and copy manually.");
    }
  };

  const handleShare = async () => {
    if (!user) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "FutureBet - Elite Football Predictions",
          text: "Join me on FutureBet and get algorithmic football predictions!",
          url: referralLink,
        });
      } catch (e) {}
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[32px] border p-6 sm:p-8 shadow-xl transition-all flex flex-col gap-6",
        darkMode
          ? "bg-gradient-to-br from-indigo-950/50 via-gray-900 to-black border-indigo-500/20"
          : "bg-gradient-to-br from-indigo-50 via-white to-gray-50 border-indigo-200"
      )}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
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
            Share your link. Once 15 friends sign up, you unlock a 7-Day Premium Trial! If 5 of them upgrade within 10 days, you earn 17 Days of FULL Premium.
          </p>
        </div>

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
                {user ? "Your Referral Code" : "Log in to get your link"}
              </span>
              <span className={cn(
                "font-mono font-bold tracking-wider",
                darkMode ? "text-indigo-400" : "text-indigo-600"
              )}>
                {refCode}
              </span>
            </div>
            {user && (
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
            )}
          </div>

          <button
            onClick={() => {
              if (user) {
                handleShare();
              } else {
                window.location.href = "/account/signin";
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/25"
          >
            {user ? (
              <>
                <Share2 size={18} />
                Share Referral Link
              </>
            ) : (
              "Sign In to Share"
            )}
          </button>
        </div>
      </div>

      {/* Progress Section */}
      {user && (
        <div className="relative z-10 w-full pt-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className={cn("text-sm font-bold", darkMode ? "text-white" : "text-gray-900")}>Reward Progress</span>
              <p className={cn("text-xs mt-0.5", darkMode ? "text-gray-400" : "text-gray-500")}>
                {pendingCount} of {target} referrals complete
              </p>
            </div>
            <span className={cn("font-bold", darkMode ? "text-indigo-400" : "text-indigo-600")}>
              {progress}%
            </span>
          </div>
          <div className={cn("h-3 w-full rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-gray-200")}>
            <div 
              className="h-full bg-indigo-500 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => claimMutation.mutate()}
              disabled={!canClaim || claimMutation.isPending}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all",
                canClaim
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-white/5 dark:text-gray-600"
              )}
            >
              {claimMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {canClaim ? "Claim Reward" : "Reward Locked"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
