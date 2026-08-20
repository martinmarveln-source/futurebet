// @ts-nocheck
"use client";

import React from "react";
import { Trophy } from "lucide-react";

interface WinRateCardProps {
  stats: Record<string, any> | null;
}

function parse(v: any): number {
  const n = parseFloat(String(v || 0).replace(/%/, ""));
  return isNaN(n) ? 0 : n;
}

function RateRow({
  label,
  homeVal,
  awayVal,
  homeColor,
  awayColor,
}: {
  label: string;
  homeVal: number;
  awayVal: number;
  homeColor: string;
  awayColor: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="flex gap-3">
          <span className={`font-bold ${homeColor}`}>H: {Math.round(homeVal)}%</span>
          <span className={`font-bold ${awayColor}`}>A: {Math.round(awayVal)}%</span>
        </span>
      </div>
      {/* Two stacked bars */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-indigo-400 w-4 text-right">H</span>
          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${homeColor.replace("text-", "bg-")}`}
              style={{ width: `${Math.min(100, homeVal)}%` }}
            />
          </div>
          <span className={`text-[10px] font-bold w-7 tabular-nums ${homeColor}`}>{Math.round(homeVal)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-purple-400 w-4 text-right">A</span>
          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${awayColor.replace("text-", "bg-")}`}
              style={{ width: `${Math.min(100, awayVal)}%` }}
            />
          </div>
          <span className={`text-[10px] font-bold w-7 tabular-nums ${awayColor}`}>{Math.round(awayVal)}%</span>
        </div>
      </div>
    </div>
  );
}

export default function WinRateCard({ stats }: WinRateCardProps) {
  if (!stats) return null;

  const homeWin = parse(stats.Home_Win);
  const awayWin = parse(stats.Away_Win);
  const homeDraw = parse(stats.HOME_DRAW);
  const awayDraw = parse(stats.AWAY_DRAW);
  const homeLost = parse(stats.HOME_LOST);
  const awayLost = parse(stats.AWAY_LOST);
  const ppgHome = parse(stats.PPG_Home);
  const ppgAway = parse(stats.PPG_Away);

  return (
    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        Win / Draw / Loss Split
      </h3>

      <div className="space-y-4">
        <RateRow
          label="Win Rate"
          homeVal={homeWin}
          awayVal={awayWin}
          homeColor="text-emerald-400"
          awayColor="text-emerald-300"
        />
        <RateRow
          label="Draw Rate"
          homeVal={homeDraw}
          awayVal={awayDraw}
          homeColor="text-amber-400"
          awayColor="text-amber-300"
        />
        <RateRow
          label="Loss Rate"
          homeVal={homeLost}
          awayVal={awayLost}
          homeColor="text-red-400"
          awayColor="text-red-300"
        />
      </div>

      {/* PPG summary */}
      <div className="border-t border-slate-800 pt-3 grid grid-cols-2 gap-3 text-center">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400 mb-1">Home PPG</div>
          <div className={`text-xl font-black ${ppgHome >= 2 ? "text-emerald-400" : ppgHome >= 1.5 ? "text-amber-400" : "text-red-400"}`}>
            {ppgHome.toFixed(2)}
          </div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400 mb-1">Away PPG</div>
          <div className={`text-xl font-black ${ppgAway >= 2 ? "text-emerald-400" : ppgAway >= 1.5 ? "text-amber-400" : "text-red-400"}`}>
            {ppgAway.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
