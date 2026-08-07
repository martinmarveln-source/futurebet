import React from "react";
import { CheckCircle2, XCircle, MinusCircle, Trophy, Activity, Target } from "lucide-react";

interface ArchiveMatchCardProps {
  match: any;
}

export default function ArchiveMatchCard({ match }: ArchiveMatchCardProps) {
  const scoreRaw = match.ftScore || match.ft_score || (match.raw_data && match.raw_data.ftScore) || "";
  
  const hasValidScore = typeof scoreRaw === 'string' && scoreRaw.includes(':');
  
  let hg = 0;
  let ag = 0;
  if (hasValidScore) {
    const parts = scoreRaw.split(':');
    hg = parseInt(parts[0], 10) || 0;
    ag = parseInt(parts[1], 10) || 0;
  }

  // Calculate outcomes based on actual goals
  const actual1X2 = hg > ag ? "HOME" : hg < ag ? "AWAY" : "DRAW";
  const actualBTTS = hg > 0 && ag > 0 ? "YES" : "NO";
  const actualOU25 = hg + ag > 2.5 ? "OVER" : "UNDER";

  // Get Algorithm's predictions (probabilities)
  const homeProb = parseFloat(match.homeWin || match.raw_data?.homeWin || 0) * 100;
  const drawProb = parseFloat(match.draw || match.raw_data?.draw || 0) * 100;
  const awayProb = parseFloat(match.awayWin || match.raw_data?.awayWin || 0) * 100;
  
  const bttsYesProb = parseFloat(match.gg || match.raw_data?.gg || 0) * 100;
  const bttsNoProb = parseFloat(match.ng || match.raw_data?.ng || 0) * 100;

  const over25Prob = parseFloat(match.ov25 || match.raw_data?.ov25 || 0) * 100;
  const under25Prob = parseFloat(match.un25 || match.raw_data?.un25 || 0) * 100;

  // Determine what the algorithm favored most
  let algo1X2Favored = "HOME";
  let max1x2 = homeProb;
  if (drawProb > max1x2) { algo1X2Favored = "DRAW"; max1x2 = drawProb; }
  if (awayProb > max1x2) { algo1X2Favored = "AWAY"; max1x2 = awayProb; }

  const algoBTTSFavored = bttsYesProb >= bttsNoProb ? "YES" : "NO";
  const algoOU25Favored = over25Prob >= under25Prob ? "OVER" : "UNDER";

  const getStatusIcon = (actual: string, predicted: string) => {
    if (!hasValidScore) return <MinusCircle className="w-5 h-5 text-gray-400" />;
    return actual === predicted ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const mainPick = (match.pick || match.raw_data?.pick || match.tips || match.raw_data?.tips || "").toUpperCase();

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      
      {/* Header Info */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50 dark:border-slate-800/50">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {match.country || match.raw_data?.country} • {match.league || match.raw_data?.league}
          </span>
          <span className="text-xs text-gray-500 mt-0.5">
            {match.match_time || match.time || match.raw_data?.time || match.match_date?.split('T')[0]}
          </span>
        </div>
        
        {/* The Full Time Score Badge */}
        <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-inner">
          <span className="text-xs font-bold uppercase opacity-80">FT</span>
          <span className="text-base font-black tracking-widest">{hasValidScore ? scoreRaw.replace(':', ' - ') : 'N/A'}</span>
        </div>
      </div>

      {/* Teams & Primary Pick */}
      <div className="flex flex-col mb-5">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
          {match.match || match.match_label || match.raw_data?.match || `${match.home_team} vs ${match.away_team}`}
        </h3>
        {mainPick && (
          <div className="mt-2 flex items-center gap-2">
            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800/50 uppercase">
              Main Pick: {mainPick}
            </span>
          </div>
        )}
      </div>

      {/* Predictions vs Outcomes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1X2 Market */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 flex flex-col items-center justify-between border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">1X2 Outcome</span>
          </div>
          <div className="text-lg font-black text-slate-700 dark:text-slate-200 mb-2">
            {actual1X2}
          </div>
          <div className="w-full flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg p-2 text-xs border border-gray-200 dark:border-slate-700">
            <span className="text-gray-400 font-medium">AI Favored: <strong className="text-slate-700 dark:text-slate-300">{algo1X2Favored}</strong></span>
            {getStatusIcon(actual1X2, algo1X2Favored)}
          </div>
        </div>

        {/* BTTS Market */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 flex flex-col items-center justify-between border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">BTTS</span>
          </div>
          <div className="text-lg font-black text-slate-700 dark:text-slate-200 mb-2">
            {actualBTTS}
          </div>
          <div className="w-full flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg p-2 text-xs border border-gray-200 dark:border-slate-700">
            <span className="text-gray-400 font-medium">AI Favored: <strong className="text-slate-700 dark:text-slate-300">{algoBTTSFavored}</strong></span>
            {getStatusIcon(actualBTTS, algoBTTSFavored)}
          </div>
        </div>

        {/* O/U 2.5 Market */}
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 flex flex-col items-center justify-between border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Over/Under 2.5</span>
          </div>
          <div className="text-lg font-black text-slate-700 dark:text-slate-200 mb-2">
            {actualOU25}
          </div>
          <div className="w-full flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg p-2 text-xs border border-gray-200 dark:border-slate-700">
            <span className="text-gray-400 font-medium">AI Favored: <strong className="text-slate-700 dark:text-slate-300">{algoOU25Favored}</strong></span>
            {getStatusIcon(actualOU25, algoOU25Favored)}
          </div>
        </div>
      </div>

    </div>
  );
}
