"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WeeklySummaryEmail } from "@/components/emails/WeeklySummaryEmail";
import { formatNaira } from "@/utils/matchUtils";

export default function WeeklyPerformanceReport({ userName, isPremium, isSilver, isAdmin }) {
  const canSee = isSilver || isPremium || isAdmin;
  
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
    if (!data?.tickets) return { winRate: 0, profit: 0, bets: 0 };
    
    // filter last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTickets = data.tickets.filter((t: any) => new Date(t.created_at) >= sevenDaysAgo);
    
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
            if (odds > 0) profit += (stake * odds) - stake;
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
    };
  }, [data]);

  if (!canSee) return null;

  return (
    <div className="max-w-2xl mx-auto my-12 opacity-90 hover:opacity-100 transition-opacity">
      <div className="text-center mb-4">
        <span className="bg-emerald-600/90 border border-emerald-500/50 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/20 backdrop-blur-md">
          Your Weekly Performance Report
        </span>
      </div>
      <WeeklySummaryEmail 
        userName={userName}
        isPremium={isPremium}
        winRate={stats.winRate}
        totalProfit={`${stats.profit >= 0 ? '+' : ''}${formatNaira(stats.profit)}`}
        vipWinRate={data?.vipStats?.winRate || 0}
        totalBets={stats.bets}
      />
    </div>
  );
}
