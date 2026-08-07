"use client";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { ChevronLeft, Calendar as CalendarIcon, Loader2, Lock, CheckCircle2, XCircle, MinusCircle, Trophy, Activity, Target } from "lucide-react";
import Link from "next/link";

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

  // Helper function to evaluate outcomes for a single match row
  const evaluateMatch = (match: any) => {
    const scoreRaw = match.ftScore || match.ft_score || (match.raw_data && match.raw_data.ftScore) || "";
    const hasValidScore = typeof scoreRaw === 'string' && scoreRaw.includes(':');
    
    let hg = 0, ag = 0;
    if (hasValidScore) {
      const parts = scoreRaw.split(':');
      hg = parseInt(parts[0], 10) || 0;
      ag = parseInt(parts[1], 10) || 0;
    }

    const actual1X2 = hg > ag ? "HOME" : hg < ag ? "AWAY" : "DRAW";
    const actualBTTS = hg > 0 && ag > 0 ? "YES" : "NO";
    const actualOU25 = hg + ag > 2.5 ? "OVER" : "UNDER";

    const homeProb = parseFloat(match.homeWin || match.raw_data?.homeWin || 0);
    const drawProb = parseFloat(match.draw || match.raw_data?.draw || 0);
    const awayProb = parseFloat(match.awayWin || match.raw_data?.awayWin || 0);
    const bttsYesProb = parseFloat(match.gg || match.raw_data?.gg || 0);
    const bttsNoProb = parseFloat(match.ng || match.raw_data?.ng || 0);
    const over25Prob = parseFloat(match.ov25 || match.raw_data?.ov25 || 0);
    const under25Prob = parseFloat(match.un25 || match.raw_data?.un25 || 0);

    let algo1X2Favored = "HOME";
    let max1x2 = homeProb;
    if (drawProb > max1x2) { algo1X2Favored = "DRAW"; max1x2 = drawProb; }
    if (awayProb > max1x2) { algo1X2Favored = "AWAY"; max1x2 = awayProb; }

    const algoBTTSFavored = bttsYesProb >= bttsNoProb ? "YES" : "NO";
    const algoOU25Favored = over25Prob >= under25Prob ? "OVER" : "UNDER";

    const mainPick = (match.pick || match.raw_data?.pick || match.tips || match.raw_data?.tips || "").toUpperCase();

    let isMainPickHit = false;
    let hasMainPickEvaluation = false;
    
    if (mainPick && hasValidScore) {
       if (mainPick.includes('OVER 2.5') || mainPick.includes('OV2.5') || mainPick === 'OV25') { isMainPickHit = hg + ag > 2.5; hasMainPickEvaluation = true; }
       else if (mainPick.includes('UNDER 2.5') || mainPick.includes('UN2.5') || mainPick === 'UN25') { isMainPickHit = hg + ag < 2.5; hasMainPickEvaluation = true; }
       else if (mainPick.includes('OVER 1.5') || mainPick.includes('OV1.5') || mainPick === 'OV15') { isMainPickHit = hg + ag > 1.5; hasMainPickEvaluation = true; }
       else if (mainPick.includes('UNDER 1.5') || mainPick.includes('UN1.5') || mainPick === 'UN15') { isMainPickHit = hg + ag < 1.5; hasMainPickEvaluation = true; }
       else if (mainPick.includes('OVER 3.5') || mainPick.includes('OV3.5') || mainPick === 'OV35') { isMainPickHit = hg + ag > 3.5; hasMainPickEvaluation = true; }
       else if (mainPick.includes('UNDER 3.5') || mainPick.includes('UN3.5') || mainPick === 'UN35') { isMainPickHit = hg + ag < 3.5; hasMainPickEvaluation = true; }
       else if (mainPick.includes('BTTS - YES') || mainPick === 'GG' || mainPick === 'YES') { isMainPickHit = hg > 0 && ag > 0; hasMainPickEvaluation = true; }
       else if (mainPick.includes('BTTS - NO') || mainPick === 'NG' || mainPick === 'NO') { isMainPickHit = hg === 0 || ag === 0; hasMainPickEvaluation = true; }
       else if (mainPick.includes('1X')) { isMainPickHit = hg >= ag; hasMainPickEvaluation = true; }
       else if (mainPick.includes('X2')) { isMainPickHit = ag >= hg; hasMainPickEvaluation = true; }
       else if (mainPick.includes('12')) { isMainPickHit = hg !== ag; hasMainPickEvaluation = true; }
       else if (mainPick === '1' || mainPick.includes('HOME')) { isMainPickHit = hg > ag; hasMainPickEvaluation = true; }
       else if (mainPick === '2' || mainPick.includes('AWAY')) { isMainPickHit = ag > hg; hasMainPickEvaluation = true; }
       else if (mainPick === 'X' || mainPick.includes('DRAW')) { isMainPickHit = hg === ag; hasMainPickEvaluation = true; }
    }

    return {
      hasValidScore,
      scoreRaw,
      mainPick,
      matchName: match.match || match.match_label || match.raw_data?.match || `${match.home_team} vs ${match.away_team}`,
      leagueInfo: `${match.country || match.raw_data?.country} • ${match.league || match.raw_data?.league}`,
      time: match.match_time || match.time || match.raw_data?.time || match.match_date?.split('T')[0],
      is1x2Hit: actual1X2 === algo1X2Favored,
      isBttsHit: actualBTTS === algoBTTSFavored,
      isOu25Hit: actualOU25 === algoOU25Favored,
      isMainPickHit,
      hasMainPickEvaluation,
      algo1X2Favored,
      algoBTTSFavored,
      algoOU25Favored
    };
  };

  // Pre-calculate statistics
  const { evaluatedMatches, totalValid, hits1X2, hitsBTTS, hitsOU25, totalMainPickValid, hitsMainPick } = useMemo(() => {
    const rawMatches = data?.matches || [];
    let validCount = 0;
    let h1X2 = 0;
    let hBTTS = 0;
    let hOU25 = 0;
    let mpValid = 0;
    let hMP = 0;
    
    const evaluated = rawMatches.map((match: any) => {
      const ev = evaluateMatch(match);
      if (ev.hasValidScore) {
         validCount++;
         if (ev.is1x2Hit) h1X2++;
         if (ev.isBttsHit) hBTTS++;
         if (ev.isOu25Hit) hOU25++;
         
         if (ev.hasMainPickEvaluation) {
           mpValid++;
           if (ev.isMainPickHit) hMP++;
         }
      }
      return ev;
    });

    return { evaluatedMatches: evaluated, totalValid: validCount, hits1X2: h1X2, hitsBTTS: hBTTS, hitsOU25: hOU25, totalMainPickValid: mpValid, hitsMainPick: hMP };
  }, [data]);

  if (error && error.message === "PREMIUM_REQUIRED") {
     return (
       <div className="min-h-screen bg-slate-100 dark:bg-[#030712] p-6 flex flex-col items-center justify-center text-center">
         <Lock className="w-16 h-16 text-slate-400 mb-4" />
         <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Premium Feature</h1>
         <p className="text-slate-500 mb-6 max-w-md">The Past Results archive is strictly available to Silver and Premium members.</p>
         <Link href="/" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30">
           Go Back Home
         </Link>
       </div>
     )
  }
  const getStatusIcon = (hit: boolean, favored: string, hasScore: boolean) => {
    if (!hasScore) return <MinusCircle className="w-4 h-4 text-gray-400" />;
    return hit ? (
      <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2 py-1 rounded-md w-fit">
        <CheckCircle2 className="w-3.5 h-3.5" /> {favored}
      </span>
    ) : (
      <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400 px-2 py-1 rounded-md w-fit">
        <XCircle className="w-3.5 h-3.5" /> {favored}
      </span>
    );
  };
  const winRate1X2 = totalValid > 0 ? Math.round((hits1X2 / totalValid) * 100) : 0;
  const winRateBTTS = totalValid > 0 ? Math.round((hitsBTTS / totalValid) * 100) : 0;
  const winRateOU25 = totalValid > 0 ? Math.round((hitsOU25 / totalValid) * 100) : 0;
  const winRateMainPick = totalMainPickValid > 0 ? Math.round((hitsMainPick / totalMainPickValid) * 100) : 0;

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

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Date Picker */}
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
            max={format(subDays(new Date(), 1), "yyyy-MM-dd")} 
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
          <div className="space-y-4">
            
            {/* Stats Summary */}
            {totalValid > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                
                {/* Main Pick Stat Card */}
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden ring-2 ring-blue-500/20">
                  <div className="flex items-center gap-2 mb-2 z-10 relative">
                    <div className="p-1.5 bg-blue-500 rounded-lg text-white shadow-md shadow-blue-500/20">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Main Pick</span>
                  </div>
                  <div className="flex items-end gap-2 z-10 relative">
                    <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{winRateMainPick}%</span>
                    <span className="text-sm font-bold text-slate-400 mb-1.5">{hitsMainPick} / {totalMainPickValid} won</span>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1.5 bg-gray-100 dark:bg-slate-800 w-full z-0">
                    <div className="h-full bg-blue-500" style={{ width: `${winRateMainPick}%` }}></div>
                  </div>
                </div>

                {/* 1X2 Stat Card */}
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 z-10 relative">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-500">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">1X2 Accuracy</span>
                  </div>
                  <div className="flex items-end gap-2 z-10 relative">
                    <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{winRate1X2}%</span>
                    <span className="text-sm font-bold text-slate-400 mb-1.5">{hits1X2} / {totalValid} won</span>
                  </div>
                  {/* Progress bar background decoration */}
                  <div className="absolute bottom-0 left-0 h-1.5 bg-gray-100 dark:bg-slate-800 w-full z-0">
                    <div className="h-full bg-amber-500" style={{ width: `${winRate1X2}%` }}></div>
                  </div>
                </div>

                {/* BTTS Stat Card */}
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 z-10 relative">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-500">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">BTTS Accuracy</span>
                  </div>
                  <div className="flex items-end gap-2 z-10 relative">
                    <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{winRateBTTS}%</span>
                    <span className="text-sm font-bold text-slate-400 mb-1.5">{hitsBTTS} / {totalValid} won</span>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1.5 bg-gray-100 dark:bg-slate-800 w-full z-0">
                    <div className="h-full bg-blue-500" style={{ width: `${winRateBTTS}%` }}></div>
                  </div>
                </div>

                {/* O/U 2.5 Stat Card */}
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 z-10 relative">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-500">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">O/U 2.5 Accuracy</span>
                  </div>
                  <div className="flex items-end gap-2 z-10 relative">
                    <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{winRateOU25}%</span>
                    <span className="text-sm font-bold text-slate-400 mb-1.5">{hitsOU25} / {totalValid} won</span>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1.5 bg-gray-100 dark:bg-slate-800 w-full z-0">
                    <div className="h-full bg-purple-500" style={{ width: `${winRateOU25}%` }}></div>
                  </div>
                </div>

              </div>
            )}

            <div className="flex items-center justify-between px-2 mt-8">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Match Results Details
              </h2>
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                {evaluatedMatches.length} Matches
              </span>
            </div>

            {evaluatedMatches.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[800px] relative">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800">Time</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800">Match / League</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center bg-gray-100 dark:bg-slate-800">Score</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800">Main Pick</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800">1X2 Outcome</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800">BTTS</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800">O/U 2.5</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                      {evaluatedMatches.map((ev: any, idx: number) => {
                        return (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                {ev.time}
                              </span>
                            </td>
                            <td className="p-4 min-w-[200px]">
                              <div className="font-bold text-sm text-slate-800 dark:text-white mb-0.5">
                                {ev.matchName}
                              </div>
                              <div className="text-[10px] text-gray-400 uppercase font-semibold">
                                {ev.leagueInfo}
                              </div>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className="inline-block px-3 py-1 bg-slate-800 text-white dark:bg-slate-700 font-mono font-bold text-sm rounded border border-slate-700 shadow-inner">
                                {ev.hasValidScore ? ev.scoreRaw.replace(':', ' - ') : 'N/A'}
                              </span>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {ev.mainPick ? (
                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                    {ev.mainPick}
                                  </span>
                                  {ev.hasMainPickEvaluation && (
                                    ev.isMainPickHit ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    )
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {getStatusIcon(ev.is1x2Hit, ev.algo1X2Favored, ev.hasValidScore)}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {getStatusIcon(ev.isBttsHit, ev.algoBTTSFavored, ev.hasValidScore)}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {getStatusIcon(ev.isOu25Hit, ev.algoOU25Favored, ev.hasValidScore)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
