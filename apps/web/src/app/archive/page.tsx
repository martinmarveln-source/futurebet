"use client";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { ChevronLeft, Calendar as CalendarIcon, Loader2, Lock, CheckCircle2, XCircle, MinusCircle, Trophy, Activity, Target } from "lucide-react";
import Link from "next/link";
import { getRecommendedMarket } from "@/utils/pickEngine";

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

    const normalizedMatch = { ...(match.raw_data || {}), ...match };
    const algoPickObj = getRecommendedMarket(normalizedMatch);
    let fallbackPick = match.pick || match.raw_data?.pick || match.tips || match.raw_data?.tips || "";
    let mainPick = fallbackPick.toUpperCase();
    
    if (algoPickObj) {
      const { market, option } = algoPickObj;
      if (market === "1X2") mainPick = option.toUpperCase(); // "HOME", "DRAW", "AWAY"
      else if (market === "Double Chance") {
        if (option === "Home or Draw") mainPick = "1X";
        else if (option === "Home or Away") mainPick = "12";
        else if (option === "Draw or Away") mainPick = "X2";
      }
      else if (market === "BTTS") mainPick = option === "Yes" ? "GG" : "NG";
      else if (market === "Over 2.5") mainPick = option === "Yes" ? "OVER 2.5" : "UNDER 2.5";
      else if (market === "Under 2.5") mainPick = option === "Yes" ? "UNDER 2.5" : "OVER 2.5";
      else if (market === "Over 1.5") mainPick = option === "Yes" ? "OVER 1.5" : "UNDER 1.5";
      else if (market === "Under 1.5") mainPick = option === "Yes" ? "UNDER 1.5" : "OVER 1.5";
      else if (market === "Over 3.5") mainPick = option === "Yes" ? "OVER 3.5" : "UNDER 3.5";
      else if (market === "Under 3.5") mainPick = option === "Yes" ? "UNDER 3.5" : "OVER 3.5";
    }

    let isMainPickHit = false;
    let hasMainPickEvaluation = false;
    
    if (mainPick && hasValidScore) {
       const p = mainPick.replace(/\s+/g, ''); // remove all whitespace for easier matching
       if (p.includes('OVER2.5') || p.includes('OV2.5') || p.includes('0V2.5') || p.includes('O2.5') || p.includes('02.5') || p.includes('OV.2.5') || p === 'OV25') { isMainPickHit = hg + ag > 2.5; hasMainPickEvaluation = true; }
       else if (p.includes('UNDER2.5') || p.includes('UN2.5') || p.includes('U2.5') || p.includes('UN.2.5') || p === 'UN25') { isMainPickHit = hg + ag < 2.5; hasMainPickEvaluation = true; }
       else if (p.includes('OVER1.5') || p.includes('OV1.5') || p.includes('0V1.5') || p.includes('O1.5') || p.includes('01.5') || p.includes('OV.1.5') || p === 'OV15') { isMainPickHit = hg + ag > 1.5; hasMainPickEvaluation = true; }
       else if (p.includes('UNDER1.5') || p.includes('UN1.5') || p.includes('U1.5') || p.includes('UN.1.5') || p === 'UN15') { isMainPickHit = hg + ag < 1.5; hasMainPickEvaluation = true; }
       else if (p.includes('OVER3.5') || p.includes('OV3.5') || p.includes('0V3.5') || p.includes('O3.5') || p.includes('03.5') || p.includes('OV.3.5') || p === 'OV35') { isMainPickHit = hg + ag > 3.5; hasMainPickEvaluation = true; }
       else if (p.includes('UNDER3.5') || p.includes('UN3.5') || p.includes('U3.5') || p.includes('UN.3.5') || p === 'UN35') { isMainPickHit = hg + ag < 3.5; hasMainPickEvaluation = true; }
       else if (p.includes('BTTS-YES') || p === 'GG' || p === 'YES' || p.includes('BTTSYES')) { isMainPickHit = hg > 0 && ag > 0; hasMainPickEvaluation = true; }
       else if (p.includes('BTTS-NO') || p === 'NG' || p === 'NO' || p.includes('BTTSNO')) { isMainPickHit = hg === 0 || ag === 0; hasMainPickEvaluation = true; }
       else if (p.includes('1X')) { isMainPickHit = hg >= ag; hasMainPickEvaluation = true; }
       else if (p.includes('X2')) { isMainPickHit = ag >= hg; hasMainPickEvaluation = true; }
       else if (p.includes('12')) { isMainPickHit = hg !== ag; hasMainPickEvaluation = true; }
       else if (p === '1' || p.includes('HOME')) { isMainPickHit = hg > ag; hasMainPickEvaluation = true; }
       else if (p === '2' || p.includes('AWAY')) { isMainPickHit = ag > hg; hasMainPickEvaluation = true; }
       else if (p === 'X' || p.includes('DRAW')) { isMainPickHit = hg === ag; hasMainPickEvaluation = true; }
    }

    const cScoreRaw = String(match.c_score || match.cScore || match.raw_data?.c_score || match.raw_data?.cScore || match.model_c_score || match.raw_data?.model_c_score || "").replace(/\s+/g, '').replace('-', ':');
    const cleanScoreRaw = String(scoreRaw).replace(/\s+/g, '').replace('-', ':');
    const isExactScoreHit = hasValidScore && cleanScoreRaw === cScoreRaw && cleanScoreRaw.length > 2;

    return {
      hasValidScore,
      scoreRaw,
      cScoreRaw,
      rating: match.rating || match.raw_data?.rating || "-",
      isExactScoreHit,
      mainPick,
      chance: match.chance || match.model_chance || match.raw_data?.chance || match.raw_data?.model_chance || "-",
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
    const rawMatches = (data?.matches || []).filter((m: any) => {
      const rating = parseFloat(m.rating || m.raw_data?.rating || 0);
      return rating >= 50;
    });
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
            max={format(new Date(), "yyyy-MM-dd")} 
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
            
            {/* Removed Stats Summary as per request */}

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
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800">Main Pick</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800 text-center">Chances</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-slate-800 text-center">Rating</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center bg-gray-100 dark:bg-slate-800">Predicted Score</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center bg-gray-100 dark:bg-slate-800">FT Score</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center bg-gray-100 dark:bg-slate-800">Outcome</th>
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
                            <td className="p-4 whitespace-nowrap">
                              {ev.mainPick ? (
                                <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                  {ev.mainPick}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                {ev.chance !== "-" ? (String(ev.chance).includes('%') ? ev.chance : `${ev.chance}%`) : "-"}
                              </span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                                {ev.rating}
                              </span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className="font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
                                {ev.cScoreRaw ? ev.cScoreRaw.replace(':', ' - ') : 'N/A'}
                              </span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 font-mono font-bold text-sm rounded border shadow-inner ${
                                ev.isExactScoreHit
                                  ? "bg-green-600 text-white border-green-700 dark:bg-green-500"
                                  : "bg-slate-800 text-white dark:bg-slate-700 border-slate-700"
                              }`}>
                                {ev.hasValidScore ? ev.scoreRaw.replace(':', ' - ') : 'N/A'}
                              </span>
                            </td>
                            <td className="p-4 whitespace-nowrap text-center">
                              {ev.hasMainPickEvaluation ? (
                                ev.isMainPickHit ? (
                                  <span className="flex items-center justify-center gap-1 text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2 py-1 rounded-md mx-auto w-fit">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Won
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-center gap-1 text-xs font-bold text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400 px-2 py-1 rounded-md mx-auto w-fit">
                                    <XCircle className="w-3.5 h-3.5" /> Lost
                                  </span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
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
