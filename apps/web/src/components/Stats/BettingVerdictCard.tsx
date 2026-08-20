// @ts-nocheck
"use client";

import React from "react";
import { Lightbulb } from "lucide-react";

interface BettingVerdictCardProps {
  stats: Record<string, any> | null;
  general: { scored?: number; conceded?: number; gp?: number; ppg?: number } | null;
}

function parse(v: any): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(String(v).replace(/%/, ""));
  if (isNaN(n)) return 0;
  return n <= 1.0 ? n * 100 : n;
}

type VerdictLevel = "strong" | "good" | "warning" | "avoid";

interface Verdict {
  level: VerdictLevel;
  emoji: string;
  text: string;
  sub?: string;
}

const LEVEL_STYLES: Record<VerdictLevel, string> = {
  strong:  "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  good:    "bg-blue-500/10 border-blue-500/30 text-blue-400",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  avoid:   "bg-red-500/10 border-red-500/30 text-red-400",
};

export default function BettingVerdictCard({ stats, general }: BettingVerdictCardProps) {
  if (!stats) return null;

  const btts    = parse(stats.BTTS_ALL);
  const bttsH   = parse(stats.BTTS_HOME);
  const bttsA   = parse(stats.BTTS_AWAY);
  const o15     = parse(stats.O15_ALL);
  const o25     = parse(stats.O25_ALL);
  const o35     = parse(stats.O35_ALL);
  const o45     = parse(stats.O45_ALL);
  const cs      = parse(stats.CS_ALL);
  const csH     = parse(stats.CS_HOME);
  const csA     = parse(stats.CS_AWAY);
  const fts     = parse(stats.FTS_ALL);
  const ftsA    = parse(stats.FTS_AWAY);
  const hwRate  = parse(stats.Home_Win);
  const awRate  = parse(stats.Away_Win);
  const ppgH    = parseFloat(String(stats.PPG_Home ?? "0")) || 0;
  const ppgA    = parseFloat(String(stats.PPG_Away ?? "0")) || 0;
  const xg      = parseFloat(String(stats.XG_ALL ?? "0")) || 0;
  const xga     = parseFloat(String(stats.XGA_ALL ?? "0")) || 0;
  const scored  = general?.scored ?? 0;
  const conceded= general?.conceded ?? 0;
  const gp      = general?.gp ?? 1;

  const verdicts: Verdict[] = [];

  // BTTS verdicts
  if (btts >= 70) {
    verdicts.push({ level: "strong", emoji: "🟢", text: `HIGH BTTS: Both teams score in ${Math.round(btts)}% of all games.`, sub: `H: ${Math.round(bttsH)}% | A: ${Math.round(bttsA)}%` });
  } else if (btts >= 55) {
    verdicts.push({ level: "good", emoji: "🔵", text: `BTTS LIKELY: Hits in ${Math.round(btts)}% of games — above average.` });
  } else if (btts < 35) {
    verdicts.push({ level: "avoid", emoji: "🔴", text: `LOW BTTS: Both teams score in only ${Math.round(btts)}% of games — avoid BTTS.` });
  }

  // Over/Under verdicts
  if (o25 >= 70) {
    verdicts.push({ level: "strong", emoji: "🟢", text: `OVER 2.5 STRONG: ${Math.round(o25)}% of games go Over 2.5 goals.` });
  } else if (o25 < 35) {
    verdicts.push({ level: "avoid", emoji: "🔴", text: `UNDER 2.5 VALUE: Only ${Math.round(o25)}% go Over 2.5. Under 2.5 is the play.` });
  }

  if (o35 >= 50) {
    verdicts.push({ level: "good", emoji: "🔵", text: `HIGH SCORING: Over 3.5 lands in ${Math.round(o35)}% of games.` });
  }

  if (o45 >= 35) {
    verdicts.push({ level: "warning", emoji: "🟡", text: `GOAL FEST: Over 4.5 has hit ${Math.round(o45)}% of the time — this team is involved in big-scoring games.` });
  }

  // Clean Sheet verdicts
  if (csH >= 50) {
    verdicts.push({ level: "strong", emoji: "🟢", text: `HOME CLEAN SHEET: Keeps a clean sheet in ${Math.round(csH)}% of home games. Strong home CS bet.` });
  }
  if (csA <= 10 && gp >= 5) {
    verdicts.push({ level: "avoid", emoji: "🔴", text: `AVOID AWAY CS: Only ${Math.round(csA)}% clean sheet rate away from home.` });
  }
  if (cs >= 40) {
    verdicts.push({ level: "good", emoji: "🔵", text: `SOLID DEFENCE: Keeps clean sheets in ${Math.round(cs)}% of all games.` });
  }

  // Failed to Score
  if (fts >= 40) {
    verdicts.push({ level: "warning", emoji: "🟡", text: `SCORING STRUGGLES: Fails to score in ${Math.round(fts)}% of games — avoid backing this team to score.` });
  }
  if (ftsA >= 50) {
    verdicts.push({ level: "avoid", emoji: "🔴", text: `POOR AWAY ATTACK: Fails to score in ${Math.round(ftsA)}% of away games.` });
  }

  // Home/Away disparity
  if (ppgH > 0 && ppgA > 0) {
    const ratio = ppgH / ppgA;
    if (ratio >= 2.5) {
      verdicts.push({ level: "warning", emoji: "🟡", text: `HOME ONLY TEAM: PPG drops from ${ppgH.toFixed(2)} at home to ${ppgA.toFixed(2)} away — bet home wins only.` });
    } else if (ratio <= 0.6) {
      verdicts.push({ level: "good", emoji: "🔵", text: `STRONG TRAVELLERS: Actually performs better away (${ppgA.toFixed(2)} PPG) than at home (${ppgH.toFixed(2)} PPG).` });
    }
  }

  // xG-based verdict
  if (xg > 0 && xga > 0) {
    const xgd = xg - xga;
    if (xgd >= 0.8) {
      verdicts.push({ level: "strong", emoji: "🟢", text: `xG DOMINANT: ${xg.toFixed(2)} xG vs ${xga.toFixed(2)} xGA. Statistically one of the strongest teams in this league.` });
    } else if (xgd <= -0.5) {
      verdicts.push({ level: "avoid", emoji: "🔴", text: `xG VULNERABLE: Concedes ${xga.toFixed(2)} xGA vs only creating ${xg.toFixed(2)} xG. Under pressure most games.` });
    }

    // Clinical finishing
    const gfPerGame = gp > 0 ? scored / gp : 0;
    if (xg > 0 && gfPerGame / xg >= 1.15) {
      verdicts.push({ level: "good", emoji: "🔵", text: `CLINICAL FINISHER: Scoring ${gfPerGame.toFixed(2)} goals/game vs ${xg.toFixed(2)} xG — converts better than expected.` });
    } else if (xg > 0 && gfPerGame / xg <= 0.75 && gp >= 6) {
      verdicts.push({ level: "warning", emoji: "🟡", text: `WASTEFUL IN FRONT OF GOAL: Only ${gfPerGame.toFixed(2)} goals/game vs ${xg.toFixed(2)} xG — underperforming xG.` });
    }
  }

  if (verdicts.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5 space-y-4">
      <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        Betting Verdict
        <span className="text-[10px] font-normal text-slate-500 ml-1">— AI-generated insights</span>
      </h2>
      <div className="space-y-2">
        {verdicts.map((v, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${LEVEL_STYLES[v.level]}`}>
            <span className="text-base flex-shrink-0 mt-0.5">{v.emoji}</span>
            <div>
              <p className="text-sm font-semibold leading-snug">{v.text}</p>
              {v.sub && <p className="text-[11px] opacity-70 mt-0.5">{v.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
