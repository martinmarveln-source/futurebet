"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { ChevronLeft, Calendar as CalendarIcon, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import ArchiveMatchCard from "@/components/ArchiveMatchCard";

export default function ArchivePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1));
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data, isLoading, error } = useQuery({
    queryKey: ["archive-matches", dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/archive?date=${dateStr}`);
      if (res.status === 403 || res.status === 401) {
         throw new Error("PREMIUM_REQUIRED");
      }
      if (!res.ok) throw new Error("Failed to load archive data");
      return res.json();
    }
  });

  if (error && error.message === "PREMIUM_REQUIRED") {
     return (
       <div className="min-h-screen bg-slate-100 dark:bg-[#030712] p-6 flex flex-col items-center justify-center text-center">
         <Lock className="w-16 h-16 text-slate-400 mb-4" />
         <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Premium Feature</h1>
         <p className="text-slate-500 mb-6 max-w-md">The Past Results archive is strictly available to Silver, Premium, and Admin members.</p>
         <Link href="/" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30">
           Go Back Home
         </Link>
       </div>
     )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#030712] pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-40 px-4 py-4 flex items-center gap-4">
        <Link href="/" className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition">
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Past Results</h1>
          <p className="text-xs text-slate-500">View historical matches & outcomes</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Date Picker (Simple native date input for reliability on mobile) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
               <CalendarIcon className="w-5 h-5" />
             </div>
             <span className="font-bold text-slate-700 dark:text-slate-200">Select Date</span>
          </div>
          <input 
            type="date" 
            value={dateStr}
            max={format(subDays(new Date(), 1), "yyyy-MM-dd")} // Can only select past dates
            onChange={(e) => {
              if (e.target.value) setSelectedDate(new Date(e.target.value));
            }}
            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-500 font-medium">Loading historical data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Results for {format(selectedDate, "MMMM do, yyyy")}
              </h2>
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                {data?.matches?.length || 0} Matches
              </span>
            </div>

            {data?.matches?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.matches.map((match: any, idx: number) => (
                  <ArchiveMatchCard key={idx} match={match} />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-12 flex flex-col items-center text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No Results Found</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  We don't have any matches with Full Time results stored for this date.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
