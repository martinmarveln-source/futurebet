// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import {
  Shield,
  Zap,
  Activity,
  Flame,
  ArrowRight,
  TrendingUp,
  Target,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export function TacticalPitchVisualizer({
  teamA = "Team A",
  teamB = "Team B",
  statsA,
  statsB,
  insight,
  darkMode = true,
}) {
  const [activeLayer, setActiveLayer] = useState("channels"); // "channels" | "heatmap" | "xg"

  // Derive tactical values from stats
  const tacticalData = useMemo(() => {
    const aGf = Number(statsA?.modelGoalsFor || statsA?.tableGoalsFor || 1.4);
    const aGa = Number(statsA?.modelGoalsAgainst || statsA?.tableGoalsAgainst || 1.1);
    const bGf = Number(statsB?.modelGoalsFor || statsB?.tableGoalsFor || 1.2);
    const bGa = Number(statsB?.modelGoalsAgainst || statsB?.tableGoalsAgainst || 1.3);

    const aPpg = Number(statsA?.modelPPG || statsA?.tablePPG || 1.5);
    const bPpg = Number(statsB?.modelPPG || statsB?.tablePPG || 1.3);

    const aOv2 = Number(statsA?.over25Percent || 50);
    const bOv2 = Number(statsB?.over25Percent || 50);

    const aBtts = Number(statsA?.bttsPercent || 50);
    const bBtts = Number(statsB?.bttsPercent || 50);

    // Flank strength computations
    const aLeftStrength = Math.min(88, Math.max(30, Math.round(aGf * 26 + aPpg * 12)));
    const bRightDef = Math.min(88, Math.max(30, Math.round((2.2 - bGa) * 28 + bPpg * 10)));
    const leftBattleA = Math.round((aLeftStrength / (aLeftStrength + bRightDef)) * 100);

    const aCenterStrength = Math.min(92, Math.max(32, Math.round(aPpg * 25 + aGf * 18)));
    const bCenterDef = Math.min(92, Math.max(32, Math.round(bPpg * 24 + (2.2 - bGa) * 20)));
    const centerBattleA = Math.round((aCenterStrength / (aCenterStrength + bCenterDef)) * 100);

    const aRightStrength = Math.min(85, Math.max(28, Math.round(aGf * 24 + aPpg * 11)));
    const bLeftDef = Math.min(85, Math.max(28, Math.round((2.2 - bGa) * 27 + bPpg * 11)));
    const rightBattleA = Math.round((aRightStrength / (aRightStrength + bLeftDef)) * 100);

    // Possession and territorial dominance
    const territoryA = Math.min(75, Math.max(25, Math.round((aPpg / (aPpg + bPpg || 3)) * 100)));
    const territoryB = 100 - territoryA;

    // 15-Minute Goal Timing Curves
    const intervals = [
      {
        label: "0-15'",
        threatA: Math.round(12 + (aPpg > 1.8 ? 8 : 2)),
        threatB: Math.round(10 + (bPpg > 1.8 ? 6 : 2)),
      },
      {
        label: "16-30'",
        threatA: Math.round(16 + aGf * 4),
        threatB: Math.round(14 + bGf * 3),
      },
      {
        label: "31-45'",
        threatA: Math.round(20 + aGf * 5),
        threatB: Math.round(18 + bGf * 4),
      },
      {
        label: "46-60'",
        threatA: Math.round(18 + (aPpg > bPpg ? 6 : 2)),
        threatB: Math.round(16 + (bPpg > aPpg ? 6 : 2)),
      },
      {
        label: "61-75'",
        threatA: Math.round(22 + (aOv2 > 55 ? 7 : 3)),
        threatB: Math.round(21 + (bOv2 > 55 ? 6 : 3)),
      },
      {
        label: "76-90+'",
        threatA: Math.round(26 + (aGf > 1.5 ? 9 : 4)),
        threatB: Math.round(25 + (bGf > 1.5 ? 8 : 4)),
      },
    ];

    // Primary tactical conclusion
    let tacticalBrief = "";
    if (leftBattleA > 55) {
      tacticalBrief = `${teamA}'s left flank creates a clear mismatch against ${teamB}'s right back, opening high-probability cut-back crosses.`;
    } else if (centerBattleA > 55) {
      tacticalBrief = `${teamA} commands the half-spaces and central spine, controlling match tempo through defensive transitions.`;
    } else if (leftBattleA < 45 || centerBattleA < 45) {
      tacticalBrief = `${teamB} possesses resilient defensive solidity and quick counter-threats into space behind ${teamA}'s high line.`;
    } else {
      tacticalBrief = `A tightly contested tactical grid where set-pieces, tempo adjustments, and second-half substitutions will dictate the margin.`;
    }

    return {
      leftBattleA,
      leftBattleB: 100 - leftBattleA,
      centerBattleA,
      centerBattleB: 100 - centerBattleA,
      rightBattleA,
      rightBattleB: 100 - rightBattleA,
      territoryA,
      territoryB,
      intervals,
      tacticalBrief,
      isHighTempo: aOv2 > 55 || bOv2 > 55,
      isBttsHigh: aBtts > 52 && bBtts > 52,
    };
  }, [statsA, statsB, teamA, teamB]);

  return (
    <div
      className={cn(
        "rounded-[32px] border p-5 sm:p-7 relative overflow-hidden transition-all duration-300 mb-5 shadow-2xl",
        darkMode
          ? "bg-slate-950/80 border-slate-800 backdrop-blur-xl"
          : "bg-white border-slate-200 shadow-xl"
      )}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                darkMode
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
            >
              <Activity size={12} className="animate-pulse" />
              2D Tactical Pitch Radar
            </span>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                darkMode
                  ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              )}
            >
              AI Pitch Simulator
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Tactical Matchup & Pitch Dominance
          </h3>
          <p
            className={cn(
              "text-xs font-semibold mt-0.5",
              darkMode ? "text-slate-400" : "text-slate-500"
            )}
          >
            Visualizing territorial momentum, flank battle edges, and xG danger zones
          </p>
        </div>

        {/* Layer Selector Switch */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveLayer("channels")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black transition-all",
              activeLayer === "channels"
                ? "bg-emerald-500 text-slate-950 shadow-md scale-[1.02]"
                : darkMode
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-black"
            )}
          >
            Flank Channels
          </button>
          <button
            onClick={() => setActiveLayer("heatmap")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black transition-all",
              activeLayer === "heatmap"
                ? "bg-blue-500 text-white shadow-md scale-[1.02]"
                : darkMode
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-black"
            )}
          >
            Territory Heatmap
          </button>
          <button
            onClick={() => setActiveLayer("xg")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black transition-all",
              activeLayer === "xg"
                ? "bg-purple-500 text-white shadow-md scale-[1.02]"
                : darkMode
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-black"
            )}
          >
            xG Danger Zones
          </button>
        </div>
      </div>

      {/* Main Pitch & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 2D PITCH GRAPHIC (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div
            className={cn(
              "relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden border shadow-inner transition-all",
              darkMode
                ? "bg-gradient-to-r from-emerald-950/80 via-emerald-900/70 to-emerald-950/80 border-emerald-500/20"
                : "bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 border-emerald-600"
            )}
          >
            {/* Lawn Stripe Pattern */}
            <div className="absolute inset-0 grid grid-cols-6 pointer-events-none opacity-20">
              <div className="bg-white/10" />
              <div className="bg-transparent" />
              <div className="bg-white/10" />
              <div className="bg-transparent" />
              <div className="bg-white/10" />
              <div className="bg-transparent" />
            </div>

            {/* SVG Pitch Markings */}
            <svg
              className="absolute inset-0 w-full h-full stroke-white/40"
              strokeWidth="1.8"
              fill="none"
              viewBox="0 0 1000 600"
              preserveAspectRatio="none"
            >
              {/* Outer boundary */}
              <rect x="30" y="30" width="940" height="540" rx="4" />
              {/* Halfway line */}
              <line x1="500" y1="30" x2="500" y2="570" />
              {/* Center Circle */}
              <circle cx="500" cy="300" r="85" />
              <circle cx="500" cy="300" r="3" fill="rgba(255,255,255,0.8)" />

              {/* Left Penalty Area (Team A Defending Zone) */}
              <rect x="30" y="150" width="160" height="300" />
              <rect x="30" y="225" width="60" height="150" />
              <circle cx="140" cy="300" r="3" fill="rgba(255,255,255,0.8)" />
              <path d="M 190 240 A 85 85 0 0 1 190 360" />

              {/* Right Penalty Area (Team B Defending Zone) */}
              <rect x="810" y="150" width="160" height="300" />
              <rect x="910" y="225" width="60" height="150" />
              <circle cx="860" cy="300" r="3" fill="rgba(255,255,255,0.8)" />
              <path d="M 810 240 A 85 85 0 0 0 810 360" />

              {/* Corner arcs */}
              <path d="M 30 50 A 20 20 0 0 0 50 30" />
              <path d="M 30 550 A 20 20 0 0 1 50 570" />
              <path d="M 970 50 A 20 20 0 0 1 950 30" />
              <path d="M 970 550 A 20 20 0 0 0 950 570" />
            </svg>

            {/* DYNAMIC LAYER 1: FLANK CHANNELS & ATTACK VECTORS */}
            {activeLayer === "channels" && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-6 px-10">
                {/* Top Flank (Left Wing A vs Right Back B) */}
                <div className="flex items-center justify-between relative">
                  <div className="flex items-center gap-2 bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-400 text-white text-[11px] font-black shadow-lg">
                    <span>{teamA} LW</span>
                    <span className="text-emerald-300 font-mono">{tacticalData.leftBattleA}%</span>
                  </div>
                  <div className="h-0.5 flex-1 mx-4 bg-gradient-to-r from-blue-500/60 via-emerald-400/80 to-purple-500/60 relative">
                    <span
                      className="absolute -top-3 text-[10px] font-black uppercase text-white bg-black/60 px-2 py-0.5 rounded-full border border-white/20"
                      style={{ left: `${tacticalData.leftBattleA - 10}%` }}
                    >
                      {tacticalData.leftBattleA > 50 ? `${teamA} Edge` : `${teamB} Edge`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-400 text-white text-[11px] font-black shadow-lg">
                    <span className="text-emerald-300 font-mono">{tacticalData.leftBattleB}%</span>
                    <span>{teamB} RB</span>
                  </div>
                </div>

                {/* Central Channel (Midfield & Box Penetration) */}
                <div className="flex items-center justify-between relative">
                  <div className="flex items-center gap-2 bg-blue-600/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-blue-400 text-white text-xs font-black shadow-xl">
                    <span>{teamA} Spine</span>
                    <span className="text-amber-300 font-mono">{tacticalData.centerBattleA}%</span>
                  </div>
                  <div className="h-1 flex-1 mx-6 bg-gradient-to-r from-blue-500 via-amber-400 to-purple-500 rounded-full relative shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                    <span
                      className="absolute -top-3.5 text-[10px] font-black uppercase text-amber-300 bg-black/80 px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow-md"
                      style={{ left: `${tacticalData.centerBattleA - 12}%` }}
                    >
                      Midfield Control
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-600/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-purple-400 text-white text-xs font-black shadow-xl">
                    <span className="text-amber-300 font-mono">{tacticalData.centerBattleB}%</span>
                    <span>{teamB} Spine</span>
                  </div>
                </div>

                {/* Bottom Flank (Right Wing A vs Left Back B) */}
                <div className="flex items-center justify-between relative">
                  <div className="flex items-center gap-2 bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-400 text-white text-[11px] font-black shadow-lg">
                    <span>{teamA} RW</span>
                    <span className="text-emerald-300 font-mono">{tacticalData.rightBattleA}%</span>
                  </div>
                  <div className="h-0.5 flex-1 mx-4 bg-gradient-to-r from-blue-500/60 via-emerald-400/80 to-purple-500/60 relative">
                    <span
                      className="absolute -top-3 text-[10px] font-black uppercase text-white bg-black/60 px-2 py-0.5 rounded-full border border-white/20"
                      style={{ left: `${tacticalData.rightBattleA - 10}%` }}
                    >
                      {tacticalData.rightBattleA > 50 ? `${teamA} Edge` : `${teamB} Edge`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-400 text-white text-[11px] font-black shadow-lg">
                    <span className="text-emerald-300 font-mono">{tacticalData.rightBattleB}%</span>
                    <span>{teamB} LB</span>
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC LAYER 2: TERRITORIAL POSSESSION HEATMAP */}
            {activeLayer === "heatmap" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Team A Territory Glow */}
                <div
                  className="absolute left-10 w-96 h-96 rounded-full blur-3xl opacity-50 bg-blue-500 transition-all duration-700"
                  style={{ opacity: tacticalData.territoryA / 100 }}
                />
                {/* Team B Territory Glow */}
                <div
                  className="absolute right-10 w-96 h-96 rounded-full blur-3xl opacity-50 bg-purple-500 transition-all duration-700"
                  style={{ opacity: tacticalData.territoryB / 100 }}
                />

                <div className="relative z-10 flex items-center gap-8 bg-black/75 px-6 py-3 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md">
                  <div className="text-center">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">{teamA}</div>
                    <div className="text-2xl font-black text-white">{tacticalData.territoryA}%</div>
                    <div className="text-[9px] text-slate-400 uppercase">Field Tilt</div>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <div className="text-center">
                    <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">{teamB}</div>
                    <div className="text-2xl font-black text-white">{tacticalData.territoryB}%</div>
                    <div className="text-[9px] text-slate-400 uppercase">Field Tilt</div>
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC LAYER 3: xG DANGER BOXES */}
            {activeLayer === "xg" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-8">
                <div className="w-48 h-56 rounded-2xl border-2 border-dashed border-blue-400/80 bg-blue-500/20 backdrop-blur-sm p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-200">
                    {teamA} Box Danger Index
                  </span>
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">
                      {(Number(statsA?.modelGoalsFor || 1.4) * 0.85).toFixed(2)}
                    </div>
                    <div className="text-[9px] text-blue-200">Avg Box Entries / Game</div>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-300">
                    Clean Sheet Likelihood: {Number(statsA?.csPercent || 30)}%
                  </span>
                </div>

                <div className="w-48 h-56 rounded-2xl border-2 border-dashed border-purple-400/80 bg-purple-500/20 backdrop-blur-sm p-3 flex flex-col justify-between text-right">
                  <span className="text-[10px] font-black uppercase text-purple-200">
                    {teamB} Box Danger Index
                  </span>
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">
                      {(Number(statsB?.modelGoalsFor || 1.2) * 0.82).toFixed(2)}
                    </div>
                    <div className="text-[9px] text-purple-200">Avg Box Entries / Game</div>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-300 text-left">
                    Clean Sheet Likelihood: {Number(statsB?.csPercent || 25)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pitch Legend */}
          <div className="flex items-center justify-between text-xs mt-3 text-slate-400 font-semibold px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              {teamA} (Attacking Left ➔ Right)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              {teamB} (Attacking Right ➔ Left)
            </span>
          </div>
        </div>

        {/* TELEMETRY & TACTICAL SCRIPT PANEL (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3">
          {/* AI Tactical Briefing Card */}
          <div
            className={cn(
              "rounded-2xl p-4 border relative overflow-hidden",
              darkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase text-emerald-400 tracking-wider">
              <Sparkles size={14} />
              AI Game Script Forecast
            </div>
            <p className="text-xs leading-relaxed font-medium mb-3">
              {tacticalData.tacticalBrief}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                  tacticalData.isHighTempo
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                )}
              >
                {tacticalData.isHighTempo ? "⚡ High-Tempo Transition" : "🛡️ Controlled Tactical Pace"}
              </span>
              {tacticalData.isBttsHigh && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  🔥 High BTTS Correlation
                </span>
              )}
            </div>
          </div>

          {/* 15-Minute Goal Threat Distribution Curves */}
          <div
            className={cn(
              "rounded-2xl p-4 border flex-grow flex flex-col justify-between",
              darkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"
            )}
          >
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2.5 text-slate-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} className="text-blue-400" />
                Momentum Timeline (90')
              </span>
              <span className="text-[10px] font-normal text-slate-400">Threat Index</span>
            </div>

            <div className="space-y-2">
              {tacticalData.intervals.map((iv, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>{iv.label}</span>
                    <span className="text-[9px]">
                      {iv.threatA}% vs {iv.threatB}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-500 transition-all duration-500"
                      style={{ width: `${iv.threatA}%` }}
                      title={`${teamA} ${iv.label} Threat: ${iv.threatA}%`}
                    />
                    <div
                      className="bg-purple-500 ml-auto transition-all duration-500"
                      style={{ width: `${iv.threatB}%` }}
                      title={`${teamB} ${iv.label} Threat: ${iv.threatB}%`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className="text-blue-400">1st Half Dominance: {tacticalData.leftBattleA > 50 ? teamA : teamB}</span>
              <span className="text-purple-400">Late Surge (75+'): Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
