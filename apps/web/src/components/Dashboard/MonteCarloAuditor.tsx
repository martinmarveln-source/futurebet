// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Dice5,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import useBetslipStore from "@/store/betslipStore";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export function MonteCarloAuditor({
  matches = [],
  totalOdds = 1,
  darkMode = true,
  onOpenMarketModal,
}) {
  const updateMatchSelection = useBetslipStore((s) => s.updateMatchSelection);
  const [simulationCount, setSimulationCount] = useState(10000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simRunId, setSimRunId] = useState(0);

  const auditResults = useMemo(() => {
    if (!matches || matches.length === 0) return null;

    const N = matches.length;
    // Extract probabilities
    const legs = matches.map((m, idx) => {
      const odds = Number(m.odds) || 1.5;
      const rawChance = String(m.chance || "").replace(/[^0-9.]/g, "");
      let prob = Number(rawChance) ? Number(rawChance) / 100 : 1 / odds;
      prob = Math.max(0.15, Math.min(0.92, prob));

      return {
        match: m.match,
        league: m.league,
        selectedMarket: m.selectedMarket || "1X2",
        selectedOption: m.selectedOption || "Home",
        odds,
        prob,
        idx,
      };
    });

    // Run Monte Carlo Simulation
    let fullWins = 0;
    let cut1Wins = 0;
    let cut2Wins = 0;
    const legLossCount = new Array(N).fill(0);

    for (let i = 0; i < simulationCount; i++) {
      let legsHit = 0;
      for (let j = 0; j < N; j++) {
        if (Math.random() <= legs[j].prob) {
          legsHit++;
        } else {
          legLossCount[j]++;
        }
      }
      if (legsHit === N) fullWins++;
      if (legsHit >= N - 1) cut1Wins++;
      if (legsHit >= N - 2) cut2Wins++;
    }

    const fullWinRate = (fullWins / simulationCount) * 100;
    const cut1Rate = (cut1Wins / simulationCount) * 100;
    const cut2Rate = (cut2Wins / simulationCount) * 100;

    // Implied bookmaker probability
    const impliedProb = totalOdds > 1 ? (1 / totalOdds) * 100 : 0;
    const edgeDiff = fullWinRate - impliedProb;

    // Identify Weakest Leg (lowest probability)
    let weakestIdx = 0;
    let lowestProb = 1;
    for (let j = 0; j < N; j++) {
      if (legs[j].prob < lowestProb) {
        lowestProb = legs[j].prob;
        weakestIdx = j;
      }
    }

    const weakestLeg = legs[weakestIdx];
    const totalLosses = simulationCount - fullWins;
    const failureContribution =
      totalLosses > 0 ? Math.round((legLossCount[weakestIdx] / totalLosses) * 100) : 0;

    // Suggest safety swap
    let suggestedMarket = "Double Chance";
    let suggestedOption = "Home or Draw";
    let boostPct = 25;

    if (weakestLeg.selectedMarket === "1X2") {
      if (weakestLeg.selectedOption === "Away") {
        suggestedOption = "Draw or Away";
      } else {
        suggestedOption = "Home or Draw";
      }
      boostPct = Math.round((0.82 - weakestLeg.prob) * 100);
    } else if (weakestLeg.selectedMarket === "Over 2.5") {
      suggestedMarket = "Over 1.5";
      suggestedOption = "Yes";
      boostPct = Math.round((0.85 - weakestLeg.prob) * 100);
    } else {
      suggestedMarket = "Double Chance";
      suggestedOption = "Home or Draw";
      boostPct = 22;
    }

    // Health Score
    let healthGrade = "B";
    let healthColor = "text-amber-400";
    let healthBg = "bg-amber-500/10 border-amber-500/30";

    if (fullWinRate >= 45) {
      healthGrade = "A+ (Elite)";
      healthColor = "text-emerald-400";
      healthBg = "bg-emerald-500/10 border-emerald-500/30";
    } else if (fullWinRate >= 30) {
      healthGrade = "A (Solid Value)";
      healthColor = "text-emerald-400";
      healthBg = "bg-emerald-500/10 border-emerald-500/30";
    } else if (fullWinRate >= 18) {
      healthGrade = "B (Moderate)";
      healthColor = "text-blue-400";
      healthBg = "bg-blue-500/10 border-blue-500/30";
    } else if (fullWinRate >= 8) {
      healthGrade = "C (High Risk)";
      healthColor = "text-amber-400";
      healthBg = "bg-amber-500/10 border-amber-500/30";
    } else {
      healthGrade = "D (Speculative)";
      healthColor = "text-rose-400";
      healthBg = "bg-rose-500/10 border-rose-500/30";
    }

    return {
      simulationCount,
      fullWinRate: fullWinRate.toFixed(1),
      cut1Rate: cut1Rate.toFixed(1),
      cut2Rate: cut2Rate.toFixed(1),
      impliedProb: impliedProb.toFixed(1),
      edgeDiff: edgeDiff.toFixed(1),
      isPositiveEdge: edgeDiff > 0,
      weakestLeg,
      failureContribution,
      suggestedMarket,
      suggestedOption,
      boostPct: Math.max(15, boostPct),
      healthGrade,
      healthColor,
      healthBg,
      legs,
    };
  }, [matches, totalOdds, simulationCount, simRunId]);

  const handleRerun = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSimRunId((prev) => prev + 1);
      setIsSimulating(false);
      toast.success("Monte Carlo simulation re-run complete (10,000 iterations)!");
    }, 400);
  };

  const handleApplySwap = () => {
    if (!auditResults?.weakestLeg) return;
    const { weakestLeg, suggestedMarket, suggestedOption } = auditResults;
    updateMatchSelection(weakestLeg.match, suggestedMarket, suggestedOption);
    toast.success("Safety swap applied!", {
      description: `${weakestLeg.match} updated to ${suggestedMarket} (${suggestedOption}).`,
    });
  };

  if (!auditResults) return null;

  return (
    <div className="space-y-4 mb-5 animate-in fade-in duration-300">
      {/* Monte Carlo Summary Hero */}
      <div
        className={cn(
          "rounded-3xl border p-5 sm:p-6 relative overflow-hidden transition-all shadow-xl",
          darkMode ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Dice5 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black uppercase tracking-wider">
                  Monte Carlo Slip Auditor
                </h4>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  10,000 Runs
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                True probability distribution & ruin risk diagnostics
              </p>
            </div>
          </div>

          <button
            onClick={handleRerun}
            disabled={isSimulating}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <RefreshCw size={12} className={cn(isSimulating && "animate-spin")} />
            Re-Simulate
          </button>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Win Probability Card */}
          <div
            className={cn(
              "rounded-2xl p-4 border",
              darkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              True Slip Win Rate
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {auditResults.fullWinRate}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Bookie Implied:</span>
              <span className="font-bold">{auditResults.impliedProb}%</span>
            </div>
          </div>

          {/* Model Edge Card */}
          <div
            className={cn(
              "rounded-2xl p-4 border",
              darkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Mathematical Edge
            </div>
            <div
              className={cn(
                "text-2xl sm:text-3xl font-black font-mono",
                auditResults.isPositiveEdge ? "text-emerald-400" : "text-amber-400"
              )}
            >
              {auditResults.isPositiveEdge ? `+${auditResults.edgeDiff}%` : `${auditResults.edgeDiff}%`}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {auditResults.isPositiveEdge ? "Positive EV (+Edge) Slip" : "Market Normalized"}
            </div>
          </div>

          {/* Health Grade Card */}
          <div className={cn("rounded-2xl p-4 border", auditResults.healthBg)}>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Slip Health Score
            </div>
            <div className={cn("text-xl sm:text-2xl font-black tracking-tight", auditResults.healthColor)}>
              {auditResults.healthGrade}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Cut-1 Survival: <span className="font-bold text-white">{auditResults.cut1Rate}%</span>
            </div>
          </div>
        </div>

        {/* WEAKEST LEG & SAFETY SWAP DIAGNOSTIC */}
        <div
          className={cn(
            "rounded-2xl border p-4 sm:p-5 relative overflow-hidden",
            darkMode ? "bg-rose-500/[0.06] border-rose-500/20" : "bg-rose-50 border-rose-200"
          )}
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-400 mb-2">
            <AlertTriangle size={15} />
            Weakest Leg Diagnostic (Ruin Risk)
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">
                {auditResults.weakestLeg.match}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Current Pick: <span className="font-bold text-rose-300">{auditResults.weakestLeg.selectedMarket} ({auditResults.weakestLeg.selectedOption})</span> @ {auditResults.weakestLeg.odds}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                ⚠️ Accounts for <span className="font-bold text-rose-400">{auditResults.failureContribution}%</span> of slip failure risk.
              </p>
            </div>

            <button
              onClick={handleApplySwap}
              className="py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] shrink-0"
            >
              <Sparkles size={14} />
              Swap to {auditResults.suggestedMarket} (+{auditResults.boostPct}% Safety)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
