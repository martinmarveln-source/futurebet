// @ts-nocheck
"use client";
import { useState, useCallback, useMemo, useEffect, memo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Brain,
  BarChart3,
  Lock,
  Plus,
  Check,
  ChevronDown,
  X,
  Sparkles,
  ShieldAlert,
  Timer,
  Star,
  CircleHelp,
  Share2,
  MoreHorizontal,
  Database,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertTriangle,
  Target,
} from "lucide-react";
import { getRatingColor, getRatingBand } from "@/utils/ratings";
import useUserPermissions from "@/hooks/useUserPermissions";
import useUser from "@/utils/useUser";
import { useQuery } from "@tanstack/react-query";
import useBetslipStore from "@/store/betslipStore";
import TeamComparisonModal from "./TeamComparisonModal";

const getConvictionColor = (tier) => {
  switch (tier) {
    case "Ultra":
      return "bg-purple-600 text-white";
    case "Strong":
      return "bg-green-600 text-white";
    case "Moderate":
      return "bg-yellow-500 text-black";
    case "Weak":
      return "bg-orange-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

/* =============================================================================
  DATA FETCHERS 
============================================================================= */
export function useMlArchive() {
  return useQuery({
    queryKey: ["ml-archive-data"],
    queryFn: async () => {
      const response = await fetch("/api/ml-archive");
      if (response.status === 403) {
        const err: any = new Error("PREMIUM_REQUIRED");
        err.code = "PREMIUM_REQUIRED";
        throw err;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch archive data");
      }
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    retry: (failureCount, error: any) =>
      error?.code === "PREMIUM_REQUIRED" ? false : failureCount < 2,
  });
}

export function useLiveOddsArchive() {
  return useQuery({
    queryKey: ["live-odds-data"],
    queryFn: async () => {
      const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
      const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Odds2`;
      const response = await fetch(CSV_URL);
      if (!response.ok) return [];
      const csvText = await response.text();
      const rows = csvText.split("\n");
      if (rows.length < 2) return [];
      const headers = rows[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));
      const archiveData = [];
      for (let i = 1; i < rows.length; i++) {
        const rowText = rows[i].trim();
        if (!rowText) continue;
        const values = rowText.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let rowObj = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index]
            ? values[index].trim().replace(/^"|"$/g, "")
            : null;
        });
        archiveData.push(rowObj);
      }
      return archiveData;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/* =============================================================================
  Helpers 
============================================================================= */
function cn(...c) {
  return c.filter(Boolean).join(" ");
}
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
};
const pct = (v) => Math.round(toNum(v));
const avg = (...values) => {
  const flat = values.flat(Infinity).map(toNum).filter(Number.isFinite);
  return flat.length ? flat.reduce((a, b) => a + b, 0) / flat.length : 0;
};
const safeStr = (v) =>
  v === null || v === undefined || v === 0 || v === "0" ? "" : String(v).trim();
const formatML = (val) => {
  const num = Number(val || 0);
  if (!num) return null;
  return num <= 1 ? (num * 100).toFixed(1) : num.toFixed(1);
};

function getDbMarketName(pickStr) {
  const rawMarket = String(pickStr || "").trim().toUpperCase();
  if (rawMarket === "HOME WIN" || rawMarket === "HOME" || rawMarket === "1" || rawMarket.includes("HOME")) return "HOME";
  if (rawMarket === "AWAY WIN" || rawMarket === "AWAY" || rawMarket === "2" || rawMarket.includes("AWAY")) return "AWAY";
  if (rawMarket === "DRAW" || rawMarket === "X") return "DRAW";
  if (rawMarket === "GG" || rawMarket === "BTTS - YES" || rawMarket === "BTTS YES" || rawMarket.includes("GG") || rawMarket.includes("YES")) return "GG";
  if (rawMarket === "NG" || rawMarket === "BTTS - NO" || rawMarket === "BTTS NO" || rawMarket.includes("NG") || rawMarket.includes("NO")) return "NG";
  if (rawMarket === "OV2.5" || rawMarket === "OV.2.5" || rawMarket === "OVER 2.5" || rawMarket === "OVER2.5" || rawMarket === "OV" || rawMarket.includes("OV") || rawMarket.includes("OVER")) return "OV";
  if (rawMarket === "UN2.5" || rawMarket === "UN.2.5" || rawMarket === "UNDER 2.5" || rawMarket === "UNDER2.5" || rawMarket === "UN" || rawMarket.includes("UN") || rawMarket.includes("UNDER")) return "UN";
  return rawMarket;
}

// Derive Double Chance Odds from 1X2
function getDoubleChanceOdds(match) {
  const h = Number(match?.homeOdds);
  const d = Number(match?.drawOdds);
  const a = Number(match?.awayOdds);

  if (!h || !d || !a || h <= 1 || d <= 1 || a <= 1)
    return { h1x: null, h12: null, hx2: null };

  const implied1 = 1 / h;
  const impliedX = 1 / d;
  const implied2 = 1 / a;

  const margin = implied1 + impliedX + implied2;
  const true1 = implied1 / margin;
  const trueX = impliedX / margin;
  const true2 = implied2 / margin;

  const dcMargin = 1.05;

  return {
    h1x: (1 / ((true1 + trueX) * dcMargin)).toFixed(2),
    h12: (1 / ((true1 + true2) * dcMargin)).toFixed(2),
    hx2: (1 / ((trueX + true2) * dcMargin)).toFixed(2),
  };
}

function parsePredictedScore(score) {
  const m = String(score || "").match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!m) return null;
  const home = Number(m[1]),
    away = Number(m[2]);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return { home, away, total: home + away };
}

function normalizePickDescriptor(input = "") {
  const token = String(input)
    .toUpperCase()
    .replace(/[%\s._-]+/g, "")
    .trim();
  if (!token) return null;
  if (["1", "HOME"].includes(token) || token.includes("HOMEWIN"))
    return { market: "1X2", option: "Home", label: "1X2 — Home" };
  if (["X", "DRAW"].includes(token))
    return { market: "1X2", option: "Draw", label: "1X2 — Draw" };
  if (["2", "AWAY"].includes(token) || token.includes("AWAYWIN"))
    return { market: "1X2", option: "Away", label: "1X2 — Away" };
  if (["GG", "BTTSYES"].includes(token) || token.includes("BOTHTEAMSTOSCORE"))
    return { market: "BTTS", option: "Yes", label: "BTTS — Yes" };
  if (["NG", "BTTSNO"].includes(token) || token.includes("BOTHTEAMSNOTTOSCORE"))
    return { market: "BTTS", option: "No", label: "BTTS — No" };
  if (
    ["OV25", "O25", "OVER25"].includes(token) ||
    token.includes("OVER25") ||
    token.includes("OV25")
  )
    return { market: "Over 2.5", option: "Yes", label: "Over 2.5" };
  if (
    ["UN25", "U25", "UNDER25"].includes(token) ||
    token.includes("UNDER25") ||
    token.includes("UN25")
  )
    return { market: "Under 2.5", option: "Yes", label: "Under 2.5" };
  if (["OV15", "O15", "OVER15"].includes(token) || token.includes("OVER15"))
    return { market: "Over 1.5", option: "Yes", label: "Over 1.5" };
  if (["UN15", "U15", "UNDER15"].includes(token) || token.includes("UNDER15"))
    return { market: "Under 1.5", option: "Yes", label: "Under 1.5" };
  if (["OV35", "O35", "OVER35"].includes(token) || token.includes("OVER35"))
    return { market: "Over 3.5", option: "Yes", label: "Over 3.5" };
  if (["UN35", "U35", "UNDER35"].includes(token) || token.includes("UNDER35"))
    return { market: "Under 3.5", option: "Yes", label: "Under 3.5" };
  return null;
}

function formatSelectionLabel(selection) {
  if (!selection) return "—";
  if (selection.label) return selection.label;
  if (
    [
      "Over 1.5",
      "Over 2.5",
      "Over 3.5",
      "Under 1.5",
      "Under 2.5",
      "Under 3.5",
    ].includes(selection.market)
  )
    return selection.market;
  return `${selection.market} — ${selection.option}`;
}

function resolveOddsForSelection(match, market, option) {
  if (!market) return null;
  if (market === "BTTS")
    return option === "Yes" ? match?.bttsYesOdds : match?.bttsNoOdds;
  if (market === "Over 2.5")
    return option === "Yes" ? match?.o25Odds : match?.u25Odds;
  if (market === "Under 2.5")
    return option === "Yes" ? match?.u25Odds : match?.o25Odds;
  if (market === "Over 1.5")
    return option === "Yes" ? match?.o15Odds : match?.u15Odds;
  if (market === "Under 1.5")
    return option === "Yes" ? match?.u15Odds : match?.o15Odds;
  if (market === "Over 3.5")
    return option === "Yes" ? match?.o35Odds : match?.u35Odds;
  if (market === "Under 3.5")
    return option === "Yes" ? match?.u35Odds : match?.o35Odds;
  if (market === "1X2") {
    if (option === "Home") return match?.homeOdds;
    if (option === "Draw") return match?.drawOdds;
    if (option === "Away") return match?.awayOdds;
  }
  if (market === "Double Chance") {
    const dcOdds = getDoubleChanceOdds(match);
    if (option === "Home or Draw") return dcOdds.h1x;
    if (option === "Home or Away") return dcOdds.h12;
    if (option === "Draw or Away") return dcOdds.hx2;
  }
  return null;
}

function getOddsForRecommendation(match, recommended, pickText) {
  const selection =
    recommended?.market && recommended?.option
      ? recommended
      : normalizePickDescriptor(pickText);
  if (!selection) return null;
  return resolveOddsForSelection(match, selection.market, selection.option);
}

function resolveProbabilityForSelection(match, market, option) {
  if (!market) return 0;
  if (market === "BTTS") return pct(option === "Yes" ? match?.gg : match?.ng);
  if (market === "Over 2.5")
    return pct(option === "Yes" ? match?.ov25 : match?.un25);
  if (market === "Under 2.5")
    return pct(option === "Yes" ? match?.un25 : match?.ov25);
  if (market === "Over 1.5")
    return pct(
      option === "Yes"
        ? match?.ov15 || avg(match?.hgsOver15, match?.agsOver15)
        : match?.un15 || 100 - avg(match?.hgsOver15, match?.agsOver15)
    );
  if (market === "Under 1.5")
    return pct(
      option === "Yes"
        ? match?.un15 || 100 - avg(match?.hgsOver15, match?.agsOver15)
        : match?.ov15 || avg(match?.hgsOver15, match?.agsOver15)
    );
  if (market === "Over 3.5")
    return pct(option === "Yes" ? match?.ov35 : match?.un35);
  if (market === "Under 3.5")
    return pct(option === "Yes" ? match?.un35 : match?.ov35);
  if (market === "1X2") {
    if (option === "Home") return pct(match?.homeWin);
    if (option === "Draw") return pct(match?.draw);
    if (option === "Away") return pct(match?.awayWin);
  }
  if (market === "Double Chance") {
    if (option === "Home or Draw")
      return pct(match?.homeWin) + pct(match?.draw);
    if (option === "Home or Away")
      return pct(match?.homeWin) + pct(match?.awayWin);
    if (option === "Draw or Away")
      return pct(match?.draw) + pct(match?.awayWin);
  }
  return 0;
}

function getEdgeColor(edge) {
  if (edge === null || edge === undefined) return "text-gray-400";
  if (edge >= 12) return "text-green-600 font-black";
  if (edge >= 6) return "text-green-500 font-bold";
  if (edge >= 2) return "text-yellow-400 font-bold";
  if (edge >= -2) return "text-orange-400";
  return "text-red-500";
}

function calculateValueEdge(probability, odds) {
  if (!probability || !odds || Number(odds) <= 1) return null;
  const edge = (Number(probability) / 100 - 1 / Number(odds)) * 100;
  return Math.round(edge * 10) / 10;
}

function getPickStrength({ chance = 0, rating = 0, flag = "" }) {
  const isFlagged = safeStr(flag) === "✅";
  if (isFlagged && chance >= 75 && rating >= 65)
    return { label: "Strong", kind: "success" };
  if (chance >= 65 && rating >= 55) return { label: "Good", kind: "info" };
  return { label: "Risky", kind: "danger" };
}

function createCandidate({
  market,
  option,
  label,
  prob,
  opposition = 0,
  support = 0,
  penalty = 0,
}) {
  const margin = prob - opposition;
  const score = prob * 0.62 + clamp(margin, -20, 35) * 0.45 + support - penalty;
  return {
    market,
    option,
    label,
    prob,
    score: Math.round(score * 10) / 10,
    margin: Math.round(margin),
  };
}

function getRecommendedMarket(match) {
  const gg = pct(match?.gg),
    ng = pct(match?.ng),
    ov25 = pct(match?.ov25),
    un25 = pct(match?.un25);
  const home = pct(match?.homeWin),
    draw = pct(match?.draw),
    away = pct(match?.awayWin);
  const hgs = toNum(match?.hgs),
    hgc = toNum(match?.hgc),
    ags = toNum(match?.ags),
    agc = toNum(match?.agc);
  const hBtts = pct(match?.hBtts),
    aBtts = pct(match?.aBtts),
    hOv2 = pct(match?.hOv2),
    aOv2 = pct(match?.aOv2);
  const failRate = avg(
    pct(match?.hfts ?? match?.hFailedToScore),
    pct(match?.afts ?? match?.aFailedToScore)
  );
  const cleanSheetRate = avg(pct(match?.hcs), pct(match?.acs));
  const predicted = parsePredictedScore(match?.cScore || match?.predictedScore);
  const totalAvg =
    toNum(match?.avg) ||
    (hgs || hgc || ags || agc ? (hgs + hgc + ags + agc) / 2 : 0);
  const bttsProfile = avg(hBtts, aBtts, gg),
    overProfile = avg(hOv2, aOv2, ov25);

  const homeDir =
    (toNum(match?.hppg) > toNum(match?.appg) + 0.3 ? 4 : 0) +
    (toNum(match?.hPts) > toNum(match?.aPts) + 2 ? 3 : 0) +
    (predicted && predicted.home > predicted.away ? 3 : 0) +
    (hgs > ags ? 1 : 0) +
    (agc > hgc ? 1 : 0);
  const awayDir =
    (toNum(match?.appg) > toNum(match?.hppg) + 0.3 ? 4 : 0) +
    (toNum(match?.aPts) > toNum(match?.hPts) + 2 ? 3 : 0) +
    (predicted && predicted.away > predicted.home ? 3 : 0) +
    (ags > hgs ? 1 : 0) +
    (hgc > agc ? 1 : 0);

  const candidates = [
    home > 0
      ? createCandidate({
          market: "1X2",
          option: "Home",
          label: "1X2 — Home",
          prob: home,
          opposition: Math.max(draw, away),
          support: homeDir,
          penalty: draw >= 30 && Math.abs(home - draw) <= 5 ? 4 : 0,
        })
      : null,
    draw > 0
      ? createCandidate({
          market: "1X2",
          option: "Draw",
          label: "1X2 — Draw",
          prob: draw,
          opposition: Math.max(home, away),
          support: (draw >= 30 ? 4 : 0) + (Math.abs(home - away) <= 6 ? 3 : 0),
          penalty: Math.max(home, away) >= 50 ? 4 : 0,
        })
      : null,
    away > 0
      ? createCandidate({
          market: "1X2",
          option: "Away",
          label: "1X2 — Away",
          prob: away,
          opposition: Math.max(home, draw),
          support: awayDir,
          penalty: draw >= 30 && Math.abs(away - draw) <= 5 ? 4 : 0,
        })
      : null,
    gg > 0
      ? createCandidate({
          market: "BTTS",
          option: "Yes",
          label: "BTTS — Yes",
          prob: gg,
          opposition: ng,
          support: (bttsProfile >= 56 ? 4 : 0) + (totalAvg >= 2.55 ? 4 : 0),
          penalty: failRate >= 40 ? 4 : 0,
        })
      : null,
    ng > 0
      ? createCandidate({
          market: "BTTS",
          option: "No",
          label: "BTTS — No",
          prob: ng,
          opposition: gg,
          support: (failRate >= 34 ? 4 : 0) + (cleanSheetRate >= 28 ? 4 : 0),
          penalty: bttsProfile >= 60 && totalAvg >= 2.7 ? 4 : 0,
        })
      : null,
    ov25 > 0
      ? createCandidate({
          market: "Over 2.5",
          option: "Yes",
          label: "Over 2.5",
          prob: ov25,
          opposition: un25,
          support: (overProfile >= 58 ? 4 : 0) + (totalAvg >= 2.65 ? 5 : 0),
          penalty: un25 >= 58 ? 4 : 0,
        })
      : null,
    un25 > 0
      ? createCandidate({
          market: "Under 2.5",
          option: "Yes",
          label: "Under 2.5",
          prob: un25,
          opposition: ov25,
          support: (un25 >= 56 ? 4 : 0) + (totalAvg <= 2.2 ? 5 : 0),
          penalty: overProfile >= 60 ? 4 : 0,
        })
      : null,
  ].filter(Boolean);

  if (!candidates.length) return null;
  candidates.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : b.prob !== a.prob
      ? b.prob - a.prob
      : b.margin - a.margin
  );

  const best = candidates[0];
  const minProb =
    best.market === "1X2" ? (best.option === "Draw" ? 28 : 42) : 54;
  if (best.prob < minProb) return null;
  return best;
}

const pill = (darkMode, kind = "default") => {
  const base =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur";
  const map = {
    default: darkMode
      ? "border-white/10 bg-white/5 text-gray-100"
      : "border-gray-200 bg-white text-gray-800",
    premium: darkMode
      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
      : "border-amber-200 bg-amber-50 text-amber-800",
    info: darkMode
      ? "border-blue-400/25 bg-blue-500/10 text-blue-200"
      : "border-blue-200 bg-blue-50 text-blue-700",
    success: darkMode
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700",
    danger: darkMode
      ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
      : "border-rose-200 bg-rose-50 text-rose-700",
    violet: darkMode
      ? "border-violet-400/25 bg-violet-500/10 text-violet-200"
      : "border-violet-200 bg-violet-50 text-violet-700",
  };
  return `${base} ${map[kind] || map.default}`;
};

const Card = memo(function Card({ darkMode, children, accent, isSystemMatch }) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border p-4 sm:p-5 transition-all duration-300 active:scale-[0.98]",
        "shadow-sm hover:shadow-xl hover:-translate-y-1",
        darkMode
          ? "bg-gradient-to-b from-white/[0.06] to-white/[0.03]"
          : "bg-white",
        isSystemMatch
          ? darkMode
            ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
            : "border-amber-400 shadow-amber-500/20 ring-1 ring-amber-400"
          : darkMode
          ? "border-white/10"
          : "border-gray-200"
      )}
      style={
        accent && !isSystemMatch
          ? { borderLeft: `5px solid ${accent}` }
          : undefined
      }
    >
      {isSystemMatch && (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]",
            darkMode ? "bg-amber-400" : "bg-amber-500"
          )}
        />
      )}
      <div
        className={cn(
          "pointer-events-none absolute -top-28 left-1/2 h-48 w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-60",
          darkMode
            ? "bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-amber-500/10"
            : "bg-gradient-to-r from-indigo-200/40 via-cyan-200/40 to-amber-200/40"
        )}
      />
      {children}
    </article>
  );
});

const Section = memo(function Section({ darkMode, title, icon, children }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        darkMode ? "border-white/10 bg-black/20" : "border-gray-200 bg-gray-50"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span
            className={cn(
              "h-8 w-8 rounded-2xl flex items-center justify-center ring-1",
              darkMode ? "bg-white/5 ring-white/10" : "bg-white ring-gray-200"
            )}
          >
            {icon}
          </span>
        )}
        <div className="text-sm font-extrabold">{title}</div>
      </div>
      {children}
    </div>
  );
});

function InsightBlock({ title, children, darkMode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 text-sm leading-7",
        darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
      )}
    >
      <div className="font-extrabold mb-2 text-xs opacity-70">{title}</div>
      {children}
    </div>
  );
}

function Meter({
  label,
  value,
  colorClass = "from-amber-500 to-yellow-300",
  darkMode,
}) {
  const v = clamp(pct(value));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
          {label}
        </span>
        <span className="font-extrabold">{v}%</span>
      </div>
      <div
        className={cn(
          "h-2 rounded-full overflow-hidden",
          darkMode ? "bg-white/10" : "bg-gray-200"
        )}
      >
        <div
          className={cn("h-full bg-gradient-to-r", colorClass)}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function SmallStat({ k, v, darkMode, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 flex flex-col justify-between h-full",
        darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white",
        className
      )}
    >
      <div
        className={cn(
          "text-[11px] font-semibold mb-2",
          darkMode ? "text-gray-400" : "text-gray-500"
        )}
      >
        {k}
      </div>
      <div
        className={cn(
          "mt-1 text-sm font-extrabold w-full",
          darkMode ? "text-white" : "text-gray-900"
        )}
      >
        {v === null || v === undefined || v === "" ? "—" : v}
      </div>
    </div>
  );
}

function InlineEdgeVisualizer({ prob, odds, darkMode, compact = false }) {
  const edge = calculateValueEdge(prob, odds);
  if (!edge || edge <= 0) return null;

  return (
    <div
      className={cn(
        "mt-2 pt-2 border-t flex items-center justify-center sm:justify-between flex-wrap gap-1",
        darkMode ? "border-white/10" : "border-gray-100"
      )}
    >
      {!compact && (
        <span
          className={cn(
            "text-[8px] font-black uppercase tracking-widest",
            darkMode ? "text-emerald-400/80" : "text-emerald-600/80"
          )}
        >
          +EV Detected
        </span>
      )}
      <span
        className={cn(
          "text-[10px] font-extrabold px-1.5 py-0.5 rounded-md",
          darkMode
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-emerald-100 text-emerald-700"
        )}
      >
        +{edge.toFixed(1)}%
      </span>
    </div>
  );
}

function PrimaryMarketContext({
  match,
  selection,
  darkMode,
  canSeeAdvancedData,
  dcOdds,
}) {
  if (!selection || !canSeeAdvancedData) return null;

  const mkt = selection.market;
  let title = "";
  let options = [];

  if (mkt === "1X2") {
    title = "1X2 Market";
    options = [
      { label: "1", prob: pct(match.homeWin), odds: match.homeOdds },
      { label: "X", prob: pct(match.draw), odds: match.drawOdds },
      { label: "2", prob: pct(match.awayWin), odds: match.awayOdds },
    ];
  } else if (mkt === "Double Chance") {
    title = "Double Chance";
    options = [
      {
        label: "1X",
        prob: pct(match.homeWin) + pct(match.draw),
        odds: dcOdds?.h1x,
      },
      {
        label: "12",
        prob: pct(match.homeWin) + pct(match.awayWin),
        odds: dcOdds?.h12,
      },
      {
        label: "X2",
        prob: pct(match.draw) + pct(match.awayWin),
        odds: dcOdds?.hx2,
      },
    ];
  } else if (mkt === "Over 2.5" || mkt === "Under 2.5") {
    title = "Over / Under 2.5";
    options = [
      { label: "Over", prob: pct(match.ov25), odds: match.o25Odds },
      { label: "Under", prob: pct(match.un25), odds: match.u25Odds },
    ];
  } else if (mkt === "BTTS") {
    title = "Both Teams to Score";
    options = [
      { label: "Yes", prob: pct(match.gg), odds: match.bttsYesOdds },
      { label: "No", prob: pct(match.ng), odds: match.bttsNoOdds },
    ];
  } else if (mkt === "Over 1.5" || mkt === "Under 1.5") {
    title = "Over / Under 1.5";
    const o15p = match.ov15 || avg(match.hgsOver15, match.agsOver15);
    options = [
      { label: "Over", prob: pct(o15p), odds: match.o15Odds },
      { label: "Under", prob: 100 - pct(o15p), odds: match.u15Odds },
    ];
  } else if (mkt === "Over 3.5" || mkt === "Under 3.5") {
    title = "Over / Under 3.5";
    options = [
      { label: "Over", prob: pct(match.ov35), odds: match.o35Odds },
      { label: "Under", prob: pct(match.un35), odds: match.u35Odds },
    ];
  } else {
    return null;
  }

  if (!options.some((o) => Number(o.odds) > 1)) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 flex flex-col justify-center",
        darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
      )}
    >
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider mb-3 text-center",
          darkMode ? "text-blue-400" : "text-blue-600"
        )}
      >
        {title}
      </div>
      <div
        className={cn(
          "grid gap-2",
          options.length === 3 ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        {options.map((opt, i) => (
          <div
            key={i}
            className={cn(
              "text-center",
              i > 0 && "border-l dark:border-white/10 pl-2"
            )}
          >
            <div
              className={cn(
                "text-[9px] font-black uppercase tracking-widest opacity-60 mb-1"
              )}
            >
              {opt.label}
            </div>
            <div className="text-sm font-black tabular-nums">
              {Number(opt.odds) > 1 ? Number(opt.odds).toFixed(2) : "—"}
            </div>
            {Number(opt.odds) > 1 && (
              <InlineEdgeVisualizer
                prob={opt.prob}
                odds={opt.odds}
                darkMode={darkMode}
                compact
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================================================
  INLINE Betslip Modal (Strictly Typed & Guarded)
============================================================================= */
function BetslipMarketModal({
  open,
  darkMode,
  matchName,
  match,
  hasKickoffPassed,
  onClose,
  onConfirm,
  recommended,
}) {
  const MARKETS = [
    { key: "1X2", label: "1X2", options: ["Home", "Draw", "Away"] },
    {
      key: "Double Chance",
      label: "Double Chance",
      options: ["Home or Draw", "Home or Away", "Draw or Away"],
    },
    { key: "BTTS", label: "BTTS", options: ["Yes", "No"] },
    { key: "Over 1.5", label: "Over 1.5", options: ["Yes", "No"] },
    { key: "Over 2.5", label: "Over 2.5", options: ["Yes", "No"] },
    { key: "Over 3.5", label: "Over 3.5", options: ["Yes", "No"] },
    { key: "Correct Score", label: "Correct Score", options: [] },
  ];

  // Fix: Evaluate boolean directly if passed as a function or boolean
  const kickoffPassed =
    typeof hasKickoffPassed === "function"
      ? hasKickoffPassed(match)
      : hasKickoffPassed;
  const [mounted, setMounted] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(
    recommended?.market || "1X2"
  );
  const [selectedOption, setSelectedOption] = useState(
    recommended?.option || ""
  );
  const [correctScore, setCorrectScore] = useState("");

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setSelectedMarket(recommended?.market || "1X2");
      setSelectedOption(recommended?.option || "");
      setCorrectScore("");
    }
  }, [open, recommended]);

  useEffect(() => {
    if (!open) return;
    const { overflow, overscrollBehavior } = document.body.style;
    const { overflow: htmlOverflow, overscrollBehavior: htmlOverscroll } =
      document.documentElement.style;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = overflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overscrollBehavior = overscrollBehavior;
      document.documentElement.style.overscrollBehavior = htmlOverscroll;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const currentMarket = useMemo(
    () => MARKETS.find((m) => m.key === selectedMarket),
    [selectedMarket]
  );
  const isCorrectScore = selectedMarket === "Correct Score";
  const canConfirm = useMemo(() => {
    if (kickoffPassed) return false;
    return isCorrectScore
      ? correctScore.trim().length > 0
      : selectedOption.trim().length > 0;
  }, [kickoffPassed, isCorrectScore, selectedOption, correctScore]);

  const handleConfirm = (e) => {
    e.preventDefault();
    if (canConfirm) {
      onConfirm?.(
        selectedMarket,
        isCorrectScore ? correctScore.trim() : selectedOption.trim()
      );
      onClose?.();
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div className="min-h-full flex items-start sm:items-center justify-center px-3 pt-4 pb-28 sm:px-4 sm:pt-6 sm:pb-32">
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-xl rounded-3xl border shadow-2xl max-h-[calc(100dvh-8rem)] sm:max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain",
              darkMode
                ? "border-white/10 bg-gradient-to-b from-gray-950 to-gray-950/70 text-white"
                : "border-gray-200 bg-white text-gray-900"
            )}
          >
            <div
              className={cn(
                "sticky top-0 z-10 flex items-start justify-between gap-3 p-4 border-b backdrop-blur",
                darkMode
                  ? "border-white/10 bg-gray-950/90"
                  : "border-gray-200 bg-white/95"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center ring-1",
                      darkMode
                        ? "bg-white/5 ring-white/10"
                        : "bg-white ring-gray-200"
                    )}
                  >
                    <Sparkles
                      className={cn(
                        "h-5 w-5",
                        darkMode ? "text-amber-300" : "text-amber-600"
                      )}
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold">Add to BetSlip</h3>
                    <p
                      className={cn(
                        "text-xs mt-0.5 truncate",
                        darkMode ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      {matchName || "Selected match"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button" // 🔥 Explicit Type
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
                className={cn(
                  "p-2 rounded-2xl border transition active:scale-[0.99]",
                  darkMode
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <div
                  className={cn(
                    "text-xs font-bold mb-2",
                    darkMode ? "text-gray-300" : "text-gray-600"
                  )}
                >
                  Market
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MARKETS.map((m) => {
                    const active = selectedMarket === m.key;
                    const isRec = recommended?.market === m.key;
                    return (
                      <button
                        type="button" // 🔥 Explicit Type
                        key={m.key}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedMarket(m.key);
                          setSelectedOption("");
                          setCorrectScore("");
                        }}
                        className={cn(
                          "text-xs font-extrabold px-3 py-2 rounded-2xl border transition text-left active:scale-[0.99]",
                          active
                            ? darkMode
                              ? "border-blue-500/50 bg-blue-500/15 text-blue-200"
                              : "border-blue-200 bg-blue-50 text-blue-700"
                            : darkMode
                            ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
                            : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800",
                          isRec && !active
                            ? darkMode
                              ? "ring-1 ring-amber-400/20"
                              : "ring-1 ring-amber-300/50"
                            : ""
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{m.label}</span>
                          {isRec && (
                            <span
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border",
                                darkMode
                                  ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                                  : "border-amber-200 bg-amber-50 text-amber-800"
                              )}
                            >
                              Suggested
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div
                  className={cn(
                    "text-xs font-bold mb-2",
                    darkMode ? "text-gray-300" : "text-gray-600"
                  )}
                >
                  Option
                </div>
                {isCorrectScore ? (
                  <input
                    value={correctScore}
                    onChange={(e) => setCorrectScore(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirm(e);
                      }
                    }}
                    placeholder="e.g. 1-0"
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border text-sm font-semibold outline-none",
                      darkMode
                        ? "border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                        : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-400"
                    )}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {(currentMarket?.options || []).map((opt) => {
                      const active = selectedOption === opt;
                      return (
                        <button
                          type="button" // 🔥 Explicit Type
                          key={opt}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedOption(opt);
                          }}
                          className={cn(
                            "text-xs font-extrabold px-3 py-2 rounded-2xl border transition active:scale-[0.99]",
                            active
                              ? darkMode
                                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : darkMode
                              ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
                              : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div
              className={cn(
                "sticky bottom-0 p-4 border-t flex items-center justify-end gap-2 backdrop-blur",
                darkMode
                  ? "border-white/10 bg-gray-950/90"
                  : "border-gray-200 bg-white/95"
              )}
            >
              <button
                type="button" // 🔥 Explicit Type
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
                className={cn(
                  "px-4 py-2 rounded-2xl text-sm font-extrabold border transition active:scale-[0.99]",
                  darkMode
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-100"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                )}
              >
                Cancel
              </button>
              <button
                type="button" // 🔥 Explicit Type
                onClick={handleConfirm}
                disabled={kickoffPassed || !canConfirm}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-white transition active:scale-[0.99]",
                  kickoffPassed
                    ? "bg-gray-400 opacity-50 cursor-not-allowed filter blur-[1.2px]"
                    : canConfirm
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    : "bg-gray-400 opacity-60 cursor-not-allowed"
                )}
              >
                <Plus size={16} /> Add to BetSlip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function VisualFormGuide({ formStr }) {
  if (!formStr) return <span className="text-gray-500 text-xs">—</span>;
  const matches = String(formStr)
    .toUpperCase()
    .replace(/[^WDL]/g, "")
    .split("")
    .slice(-5);
  const colors = {
    W: "bg-emerald-500 shadow-emerald-500/20",
    D: "bg-amber-400 shadow-amber-400/20",
    L: "bg-rose-500 shadow-rose-500/20",
  };
  return (
    <div className="flex items-center gap-1">
      {matches.map((result, i) => (
        <div
          key={i}
          title={result === "W" ? "Win" : result === "D" ? "Draw" : "Loss"}
          className={cn(
            "w-2.5 h-3.5 rounded-[3px] shadow-sm",
            colors[result] || "bg-gray-400"
          )}
        />
      ))}
    </div>
  );
}

function ValueEdgeVisualizer({ modelProb, odds, darkMode }) {
  if (!modelProb || !odds || odds <= 1) return null;
  const impliedProb = (1 / odds) * 100;
  const edge = modelProb - impliedProb;
  if (edge <= 0) return null;

  return (
    <div
      className={cn(
        "mt-4 pt-4 border-t w-full",
        darkMode ? "border-white/10" : "border-gray-200"
      )}
    >
      <div className="flex justify-between items-end mb-2">
        <div
          className={cn(
            "text-[11px] font-bold",
            darkMode ? "text-gray-400" : "text-gray-500"
          )}
        >
          Implied (Bookie):{" "}
          <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
            {impliedProb.toFixed(1)}%
          </span>
        </div>
        <div
          className={cn(
            "text-[11px] font-extrabold flex items-center gap-1.5",
            darkMode ? "text-emerald-400" : "text-emerald-600"
          )}
        >
          <span>Model: {modelProb.toFixed(1)}%</span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-[4px] text-[9px] uppercase tracking-wider",
              darkMode
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            +{edge.toFixed(1)}% Edge
          </span>
        </div>
      </div>
      <div
        className={cn(
          "relative h-1.5 w-full rounded-full overflow-hidden",
          darkMode ? "bg-gray-800" : "bg-gray-200"
        )}
      >
        <div
          className={cn(
            "absolute top-0 left-0 h-full z-10 rounded-full transition-all duration-500",
            darkMode ? "bg-gray-500" : "bg-gray-400"
          )}
          style={{ width: `${impliedProb}%` }}
        />
        <div
          className="absolute top-0 h-full bg-emerald-500 z-20 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-500"
          style={{ left: `${impliedProb}%`, width: `${edge}%` }}
        />
      </div>
    </div>
  );
}

function ConfidenceRing({ value, label, darkMode, isLocked }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const safeValue = isLocked ? 0 : clamp(toNum(value));
  const offset = circumference - (safeValue / 100) * circumference;
  const color = isLocked
    ? darkMode
      ? "text-gray-700"
      : "text-gray-300"
    : safeValue >= 75
    ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
    : safeValue >= 60
    ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
    : "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        <svg className="transform -rotate-90 w-[84px] h-[84px]">
          <circle
            cx="42"
            cy="42"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className={cn(darkMode ? "text-white/5" : "text-gray-100")}
          />
          <circle
            cx="42"
            cy="42"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn(color, "transition-all duration-1000 ease-out")}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          {isLocked ? (
            <Lock
              size={18}
              className={darkMode ? "text-gray-500" : "text-gray-400"}
            />
          ) : (
            <>
              <span
                className={cn(
                  "text-lg font-black tracking-tighter leading-none",
                  color.split(" ")[0]
                )}
              >
                {safeValue}
              </span>
              <span
                className={cn(
                  "text-[8px] font-bold uppercase mt-0.5",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                Score
              </span>
            </>
          )}
        </div>
      </div>
      <span
        className={cn(
          "mt-1 text-[10px] font-extrabold uppercase tracking-widest",
          darkMode ? "text-gray-400" : "text-gray-500"
        )}
      >
        {label}
      </span>
    </div>
  );
}

/* =============================================================================
  LIVE STEAM ENGINE (Line Movement Tracker)
============================================================================= */
export function LiveSteamIndicator({ matchName, selection, darkMode }) {
  const { data: oddsHistory = [] } = useLiveOddsArchive();

  const stats = useMemo(() => {
    if (!oddsHistory.length || !selection || !matchName) return null;

    const matchStr = String(matchName).toLowerCase();
    const matchRows = oddsHistory.filter((row) => {
      const home = String(row["Home Team"] || "").toLowerCase();
      const away = String(row["Away Team"] || "").toLowerCase();
      if (!home || !away) return false;
      return matchStr.includes(home) || matchStr.includes(away);
    });

    if (matchRows.length < 2) return null;

    matchRows.sort(
      (a, b) => new Date(a["Time Checked"]) - new Date(b["Time Checked"])
    );
    const oldest = matchRows[0];
    const newest = matchRows[matchRows.length - 1];

    let colName = "";
    if (selection.market === "1X2") {
      if (selection.option === "Home") colName = "Home Odds";
      if (selection.option === "Draw") colName = "Draw Odds";
      if (selection.option === "Away") colName = "Away Odds";
    } else if (selection.market === "Over 2.5") colName = "O2.5";
    else if (selection.market === "Under 2.5") colName = "U2.5";

    if (!colName) return null;

    const openOdds = Number(oldest[colName]);
    const currentOdds = Number(newest[colName]);

    if (!openOdds || !currentOdds || openOdds <= 1 || currentOdds <= 1)
      return null;

    const diff = currentOdds - openOdds;
    const percentChange = (diff / openOdds) * 100;

    const isSteam = percentChange <= -5.0;
    const isDrifting = percentChange >= 5.0;

    if (percentChange === 0) return null;

    return { openOdds, currentOdds, percentChange, isSteam, isDrifting };
  }, [oddsHistory, matchName, selection]);

  if (!stats) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 mt-3 rounded-xl border w-full transition-all duration-500 animate-in fade-in",
        darkMode ? "bg-black/40 border-white/10" : "bg-gray-50 border-gray-200",
        stats.isSteam &&
          (darkMode
            ? "border-rose-500/50 bg-rose-500/10"
            : "border-rose-500/30 bg-rose-50")
      )}
    >
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-black/20 shrink-0">
        {stats.isSteam ? (
          <>
            <span className="absolute inset-0 rounded-lg bg-rose-500 animate-ping opacity-20"></span>
            <TrendingDown size={16} className="text-rose-500" />
          </>
        ) : stats.isDrifting ? (
          <TrendingUp size={16} className="text-gray-400" />
        ) : (
          <Activity size={16} className="text-blue-400" />
        )}
      </div>

      <div className="flex-1 flex items-center justify-between min-w-0">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-60">
            Line Movement
            {stats.isSteam && (
              <span className="text-rose-500 flex items-center gap-1">
                <AlertTriangle size={10} /> STEAM
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-xs font-medium opacity-50 line-through"
              title="Opening Line"
            >
              {stats.openOdds.toFixed(2)}
            </span>
            <span className="text-sm font-black" title="Current Line">
              {stats.currentOdds.toFixed(2)}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "px-2 py-1 rounded-md text-[10px] font-black tabular-nums whitespace-nowrap",
            stats.isSteam
              ? "bg-rose-500/20 text-rose-500"
              : stats.isDrifting
              ? "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400"
              : "text-blue-500 bg-blue-500/10"
          )}
        >
          {stats.percentChange > 0 ? "+" : ""}
          {stats.percentChange.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
  Main MatchCard Component
============================================================================= */
export default function MatchCard({
  match,
  darkMode,
  hasKickoffPassed,
  convictionTier,
  convictionStrength,
}) {
  const [showComparison, setShowComparison] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showBetslipModal, setShowBetslipModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const cardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const { data: archiveData = [] } = useMlArchive();
  const { data: user } = useUser();
  const {
    isAdmin,
    isPremium,
    isSilver,
    loading: permissionsLoading,
  } = useUserPermissions();

  const { data: oddsHistory = [] } = useLiveOddsArchive();

  const mlStats = useMemo(() => {
    if (!archiveData.length || !match?.chance || !match?.rating || !match?.pick) {
      return { winRate: null, sampleSize: 0, label: "—", totalWins: 0 };
    }

    const matchChance = Number(match.chance);
    const matchRating = Number(match.rating);
    const normalizedMatchChance = matchChance <= 1 && matchChance > 0 ? matchChance * 100 : matchChance;
    const normalizedMatchRating = matchRating <= 1 && matchRating > 0 ? matchRating * 100 : matchRating;

    const dbMarket = getDbMarketName(match.pick);

    // 1. First, search +/- 5 range of this match's chance and rating (for the same market)
    let matchedRows = archiveData.filter((row: any) => {
      const chance = Number(row.chance || 0);
      const rating = Number(row.rating || 0);
      const market = String(row.market || "").toUpperCase();
      const result = String(row.result || "").toUpperCase().trim();

      const normalizedChance = chance <= 1 && chance > 0 ? chance * 100 : chance;
      const normalizedRating = rating <= 1 && rating > 0 ? rating * 100 : rating;

      const chanceDiff = Math.abs(normalizedChance - normalizedMatchChance);
      const ratingDiff = Math.abs(normalizedRating - normalizedMatchRating);

      return (
        chanceDiff <= 5 &&
        ratingDiff <= 5 &&
        market === dbMarket &&
        (result === "W" || result === "L")
      );
    });

    // 2. Fallback: "at least" this chance & rating (for same market)
    if (matchedRows.length < 15) {
      matchedRows = archiveData.filter((row: any) => {
        const chance = Number(row.chance || 0);
        const rating = Number(row.rating || 0);
        const market = String(row.market || "").toUpperCase();
        const result = String(row.result || "").toUpperCase().trim();

        const normalizedChance = chance <= 1 && chance > 0 ? chance * 100 : chance;
        const normalizedRating = rating <= 1 && rating > 0 ? rating * 100 : rating;

        return (
          normalizedChance >= normalizedMatchChance &&
          normalizedRating >= normalizedMatchRating &&
          market === dbMarket &&
          (result === "W" || result === "L")
        );
      });
    }

    // 3. Fallback: "at least" this chance & rating (across ALL markets)
    if (matchedRows.length < 10) {
      matchedRows = archiveData.filter((row: any) => {
        const chance = Number(row.chance || 0);
        const rating = Number(row.rating || 0);
        const result = String(row.result || "").toUpperCase().trim();

        const normalizedChance = chance <= 1 && chance > 0 ? chance * 100 : chance;
        const normalizedRating = rating <= 1 && rating > 0 ? rating * 100 : rating;

        return (
          normalizedChance >= normalizedMatchChance &&
          normalizedRating >= normalizedMatchRating &&
          (result === "W" || result === "L")
        );
      });
    }

    const total = matchedRows.length;
    if (total === 0) return { winRate: null, sampleSize: 0, label: "—", totalWins: 0 };

    const wins = matchedRows.filter((r: any) => String(r.result || "").toUpperCase().trim() === "W").length;
    const rate = (wins / total) * 100;

    return {
      winRate: rate,
      sampleSize: total,
      totalWins: wins,
      label: `${rate.toFixed(1)}% (${wins}/${total})`,
    };
  }, [archiveData, match?.chance, match?.rating, match?.pick]);

  const live1X2 = useMemo(() => {
    if (!oddsHistory.length || !match?.match) return null;
    const matchStr = String(match.match).toLowerCase();
    const matchRows = oddsHistory.filter((row) => {
      const home = String(row["Home Team"] || "").toLowerCase();
      const away = String(row["Away Team"] || "").toLowerCase();
      if (!home || !away) return false;
      return matchStr.includes(home) || matchStr.includes(away);
    });
    if (!matchRows.length) return null;

    matchRows.sort(
      (a, b) => new Date(a["Time Checked"]) - new Date(b["Time Checked"])
    );
    const newest = matchRows[matchRows.length - 1];

    const h = Number(newest["Home Odds"]);
    const d = Number(newest["Draw Odds"]);
    const a = Number(newest["Away Odds"]);

    if (h > 1 && d > 1 && a > 1) {
      return { home: h, draw: d, away: a };
    }
    return null;
  }, [oddsHistory, match?.match]);

  const odds1X2 = useMemo(
    () => ({
      home: live1X2?.home || Number(match?.homeOdds) || 0,
      draw: live1X2?.draw || Number(match?.drawOdds) || 0,
      away: live1X2?.away || Number(match?.awayOdds) || 0,
      isLive: !!live1X2,
    }),
    [live1X2, match]
  );

  const canSeeAdvancedData = isAdmin || isPremium || isSilver;
  const canSeeAiInsight = isAdmin || isPremium || isSilver;
  const canSeePredictedScore = canSeeAdvancedData;
  const isPro = canSeeAiInsight;

  const ratingPercentage = useMemo(() => {
    const r = toNum(match?.rating);
    return r > 100 ? r / 100 : r;
  }, [match?.rating]);
  const band = useMemo(
    () => getRatingBand(ratingPercentage),
    [ratingPercentage]
  );
  const ratingColor = useMemo(
    () => getRatingColor(ratingPercentage, darkMode),
    [ratingPercentage, darkMode]
  );
  const chance = pct(match?.chance);
  const pickText = safeStr(match?.pick) || safeStr(match?.options) || "";
  const marketText =
    match?.market || match?.marketLabel || match?.tipMarket || "";
  const rawPredictedScore = match?.cScore || match?.predictedScore || "—";
  const predictedScore = canSeePredictedScore
    ? rawPredictedScore
    : "🔒 Silver+";

  const vipScore = useMemo(
    () => Math.round(chance * 0.6 + ratingPercentage * 0.4),
    [chance, ratingPercentage]
  );
  const valueTag = useMemo(() => {
    if (vipScore >= 80) return "Value";
    if (vipScore >= 70) return "Solid";
    return "Edge";
  }, [vipScore]);

  const pickStrength = useMemo(() => {
    if (!canSeeAdvancedData) return null;
    return getPickStrength({
      chance,
      rating: Math.round(ratingPercentage),
      flag: match?.flag,
    });
  }, [isPro, chance, ratingPercentage, match?.flag]);

  const recommended = useMemo(() => {
    if (!canSeeAdvancedData) return null;
    return getRecommendedMarket(match);
  }, [isPro, match]);
  const fallbackSelection = useMemo(
    () => normalizePickDescriptor(pickText),
    [pickText]
  );
  const activeSelection = recommended || fallbackSelection;

  const pickOdds = useMemo(() => {
    const odds = getOddsForRecommendation(match, activeSelection, pickText);
    if (!odds || Number(odds) <= 1) return null;
    return Number(odds);
  }, [match, activeSelection, pickText]);

  const valueEdge = useMemo(() => {
    if (!pickOdds || !activeSelection) return null;
    const modelProb = resolveProbabilityForSelection(
      match,
      activeSelection.market,
      activeSelection.option
    );
    if (!modelProb) return null;
    return calculateValueEdge(modelProb, pickOdds);
  }, [match, pickOdds, activeSelection]);

  const isSystemMatch = useMemo(() => {
    if (!canSeeAdvancedData || !pickOdds || valueEdge === null) return false;
    const modelProb = resolveProbabilityForSelection(
      match,
      activeSelection?.market,
      activeSelection?.option
    );
    return valueEdge >= 5.0 && modelProb >= 60 && ratingPercentage >= 65;
  }, [
    canSeeAdvancedData,
    pickOdds,
    valueEdge,
    match,
    activeSelection,
    ratingPercentage,
  ]);

  const historicalStats = useMemo(() => {
    if (!archiveData.length || !activeSelection) return null;

    let wins = 0;
    let total = 0;
    const targetMarket = (activeSelection.market || "").toUpperCase();

    archiveData.forEach((row) => {
      const rowMarket = String(row["Algorithm_Pick"] || "").toUpperCase();
      const rowChance = Number(row["Model_Chance"] || 0);
      const resultStr = String(row["FT_Result"] || "").toUpperCase();

      if (!resultStr) return;

      if (
        rowMarket.includes(targetMarket) &&
        Math.abs(rowChance - chance) <= 10
      ) {
        const isWin =
          resultStr === "W" || resultStr === "WON" || resultStr === "WIN";
        const isLoss =
          resultStr === "L" || resultStr === "LOST" || resultStr === "LOSS";

        if (isWin || isLoss) {
          total++;
          if (isWin) wins++;
        }
      }
    });

    if (total < 5) return null;

    return {
      winRate: ((wins / total) * 100).toFixed(1),
      total,
      wins,
    };
  }, [archiveData, activeSelection, chance]);

  const bandPillKind =
    band === "High" ? "success" : band === "Medium" ? "info" : "danger";
  const { isMatchInBetslip, canAddMore } = useBetslipStore();
  const matchKey = String(match?.match || match?.fixture || "").trim();
  const isInBetslip = matchKey ? isMatchInBetslip(matchKey) : false;
  const canAddMoreSafe = useCallback(
    () =>
      typeof canAddMore === "function"
        ? canAddMore()
        : typeof canAddMore === "boolean"
        ? canAddMore
        : true,
    [canAddMore]
  );

  const kickoffPassed =
    typeof hasKickoffPassed === "function" ? hasKickoffPassed(match) : false;

  const {
    data: guestUsage,
    refetch: refetchGuestUsage,
    isLoading: guestUsageLoading,
  } = useQuery({
    queryKey: ["guestComparisons"],
    queryFn: async () => {
      const response = await fetch("/api/guest-comparisons");
      if (!response.ok) throw new Error("Failed to fetch guest usage");
      return response.json();
    },
    enabled: !user,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const {
    data: userComparisonUsage,
    refetch: refetchUserComparisons,
    isLoading: userComparisonLoading,
  } = useQuery({
    queryKey: ["userComparisons"],
    queryFn: async () => {
      const response = await fetch("/api/user-comparisons");
      if (!response.ok)
        throw new Error("Failed to fetch user comparison usage");
      return response.json();
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const comparisonUsage = user ? userComparisonUsage : guestUsage;
  const comparisonLoading = user ? userComparisonLoading : guestUsageLoading;

  const canUseComparison = useMemo(() => {
    if (comparisonLoading) return false;
    if (!comparisonUsage) return false;
    if (comparisonUsage?.isUnlimited) return true;
    return !!comparisonUsage?.canUse;
  }, [comparisonLoading, comparisonUsage]);

  const handleAddToBetslip = useCallback(
    (e) => {
      e.preventDefault();
      if (!user || kickoffPassed || isInBetslip || !canAddMoreSafe()) return;
      setShowBetslipModal(true);
    },
    [user, kickoffPassed, isInBetslip, canAddMoreSafe]
  );

  const handleConfirmBetslip = useCallback(
    (selectedMarket, selectedOption) => {
      const market = String(selectedMarket || "").trim();
      const option = String(selectedOption || "").trim();
      if (!market || !option) return;
      const store = useBetslipStore.getState();
      const computedOdds =
        typeof store?.computeOddsForSelection === "function"
          ? store.computeOddsForSelection(match, market, option)
          : null;
      const payload = {
        ...match,
        match: match?.match || match?.match_name || match?.matchName,
        league: match?.fullLeague || match?.league || "",
        selectedMarket: market,
        selectedOption: option,
        odds: computedOdds ?? match?.odds ?? null,
      };
      try {
        store.addMatch?.(payload);
        setShowBetslipModal(false);
      } catch (e) {
        alert("Could not add match to BetSlip.");
      }
    },
    [match]
  );

  const handleShare = async (e) => {
    e.preventDefault();
    if (!canSeeAdvancedData) {
      alert(
        "🔒 Premium Feature: Upgrade to Pro to share elite VIP slips and unlock exact market odds!"
      );
      window.dispatchEvent(new CustomEvent("futurebet:trigger-premium"));
      return;
    }

    if (!cardRef.current) return;
    setIsSharing(true);

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: darkMode ? "#0a0a0a" : "#ffffff",
      });

      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `FutureBet-${match?.match || "Pick"}.png`.replace(/\s+/g, '-');

      // Attempt native share if supported (mobile/some desktop)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileName, { type: "image/png" });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "FutureBet VIP Pick",
              text: `Check out this VIP pick for ${match?.fullLeague || match?.league}!`,
              files: [file],
            });
            return;
          }
        } catch (shareError) {
          console.error("Native share failed, falling back to download", shareError);
        }
      }

      // Fallback: Download the image
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to generate share image", err);
      alert("Failed to create shareable image. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleComparisonClick = useCallback(
    async (e) => {
      e.preventDefault();
      if (comparisonLoading || !canUseComparison) return;
      try {
        const endpoint = user
          ? "/api/user-comparisons"
          : "/api/guest-comparisons";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchData: match }),
        });
        const data = await response.json();
        if (!response.ok) {
          alert(data.error || "Failed to use comparison feature");
          return;
        }
        setShowComparison(true);
        if (user) await refetchUserComparisons();
        else await refetchGuestUsage();
      } catch (e) {
        console.error(e);
        alert("Error accessing comparison feature");
      }
    },
    [
      comparisonLoading,
      canUseComparison,
      user,
      match,
      refetchUserComparisons,
      refetchGuestUsage,
    ]
  );

  const riskLine = useMemo(() => {
    if (!canSeeAdvancedData) return "🔒 Silver+ shows deeper risk context.";
    if (pickStrength?.label === "Strong")
      return "Low volatility: strong alignment.";
    if (pickStrength?.label === "Good")
      return "Medium volatility: stake smart.";
    return "Higher volatility: avoid over-staking.";
  }, [isPro, pickStrength]);

  const userRole = isAdmin
    ? "admin"
    : isPremium
    ? "premium"
    : isSilver
    ? "silver"
    : "free";
  const [intelligence, setIntelligence] = useState(null);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const aiCardKey = useMemo(
    () =>
      String(
        match?.match ||
          match?.fixture ||
          `${match?.date || ""}-${match?.time || ""}-${match?.pick || ""}`
      ).trim(),
    [match?.match, match?.fixture, match?.date, match?.time, match?.pick]
  );
  const intelligenceSelectionKey = useMemo(() => {
    if (activeSelection)
      return [
        safeStr(activeSelection.market),
        safeStr(activeSelection.option),
        safeStr(activeSelection.label),
      ].join("|");
    return safeStr(match?.pick || match?.GUIDE || pickText);
  }, [
    activeSelection?.market,
    activeSelection?.option,
    activeSelection?.label,
    match?.pick,
    match?.GUIDE,
    pickText,
  ]);
  const intelligenceKey = useMemo(
    () =>
      [
        safeStr(match?.match || match?.fixture),
        intelligenceSelectionKey,
        toNum(match?.rating),
        pct(match?.chance),
        userRole,
      ].join("|"),
    [
      match?.match,
      match?.fixture,
      intelligenceSelectionKey,
      match?.rating,
      match?.chance,
      userRole,
    ]
  );

  const handleFindSimilar = useCallback(
    (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("futurebet:open-auto-pick", {
          detail: {
            targetLeague: match?.fullLeague || match?.league,
            targetMarket: recommended?.market || "1X2",
          },
        })
      );
    },
    [match, recommended]
  );

  const handleToggleIntelligence = useCallback(
    async (e) => {
      e.preventDefault();
      setShowDetails(false);
      setShowGuide(false);
      if (!canSeeAiInsight) {
        setShowIntelligence((prev) => !prev);
        return;
      }
      if (showIntelligence) {
        setShowIntelligence(false);
        return;
      }
      window.dispatchEvent(
        new CustomEvent("futurebet:open-ai-insight", {
          detail: { key: aiCardKey },
        })
      );
      setShowIntelligence(true);
      if (intelligence) return;
      try {
        setIsLoadingIntelligence(true);
        
        // Track usage and check limits
        const limitCheck = await fetch("/api/ai-usage", { method: "POST" });
        const limitData = await limitCheck.json();
        
        if (!limitCheck.ok) {
          alert(limitData.error || "Daily AI Insight limit reached.");
          setShowIntelligence(false);
          return;
        }

        const { computeIntelligence } = await import(
          "@/utils/intelligenceEngine"
        );
        const result = computeIntelligence(
          match,
          userRole,
          activeSelection || pickText
        );
        setIntelligence(result);
      } catch (e) {
        console.error(e);
        alert("Unable to generate AI insight right now.");
      } finally {
        setIsLoadingIntelligence(false);
      }
    },
    [
      showIntelligence,
      intelligence,
      match,
      userRole,
      canSeeAiInsight,
      activeSelection,
      pickText,
      aiCardKey,
    ]
  );

  useEffect(() => {
    setIntelligence(null);
    setIsLoadingIntelligence(false);
  }, [intelligenceKey]);
  useEffect(() => {
    const handleOpenAiInsight = (event) => {
      const openedKey = event?.detail?.key;
      if (!openedKey || openedKey === aiCardKey) return;
      setShowIntelligence(false);
    };
    window.addEventListener("futurebet:open-ai-insight", handleOpenAiInsight);
    return () => {
      window.removeEventListener(
        "futurebet:open-ai-insight",
        handleOpenAiInsight
      );
    };
  }, [aiCardKey]);

  const dcOdds = getDoubleChanceOdds(match);

  return (
    <>
      {showBetslipModal ? (
        <BetslipMarketModal
          open={showBetslipModal}
          darkMode={darkMode}
          matchName={match?.match}
          match={match}
          hasKickoffPassed={kickoffPassed}
          onClose={() => setShowBetslipModal(false)}
          onConfirm={handleConfirmBetslip}
          recommended={recommended}
        />
      ) : null}

      <Card
        darkMode={darkMode}
        accent={ratingColor}
        isSystemMatch={isSystemMatch}
      >
        <div ref={cardRef} className="relative flex flex-col gap-3">
          {isSystemMatch && (
            <div
              className={cn(
                "absolute -top-4 sm:-top-5 -left-4 sm:-left-5 -right-4 sm:-right-5 px-4 py-2 border-b flex items-center justify-between z-10",
                darkMode
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                  : "bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-500 text-amber-950"
              )}
            >
              <div className="flex items-center gap-2">
                <Target
                  size={16}
                  className={darkMode ? "text-amber-400" : "text-amber-900"}
                />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                  +EV SYSTEM MATCH DETECTED
                </span>
              </div>
              <span className="text-xs font-black">Value Play</span>
            </div>
          )}

          <div
            className={cn(
              "flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3",
              isSystemMatch && "mt-8"
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={pill(darkMode, bandPillKind)}>
                  <Sparkles size={14} />
                  {band} band
                </span>
                <span className={pill(darkMode, "default")}>
                  <Timer size={14} />
                  {safeStr(match?.date) || "—"} • {safeStr(match?.time) || "—"}
                </span>
                {canSeeAdvancedData && pickStrength ? (
                  <span className={pill(darkMode, pickStrength.kind)}>
                    <ShieldAlert size={14} />
                    Strength: {pickStrength.label}
                  </span>
                ) : null}
                {convictionTier && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${getConvictionColor(
                      convictionTier
                    )}`}
                  >
                    Conviction: {convictionTier} ({convictionStrength}%)
                  </span>
                )}
                {!user ? (
                  <span className={pill(darkMode, "premium")}>
                    Sign in for BetSlip
                  </span>
                ) : null}
              </div>

              {(() => {
                const rawMatchStr = String(
                  match?.match || match?.fixture || ""
                );
                const parts = rawMatchStr.includes(" - ")
                  ? rawMatchStr.split(" - ")
                  : rawMatchStr.split("-");
                const hTeam = (parts[0] || "Home").trim();
                const aTeam = (parts[1] || "Away").trim();
                return (
                  <div className="mb-4 mt-2">
                    <div className="flex justify-center mb-3">
                      <span
                        className={cn(
                          "text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm",
                          darkMode
                            ? "bg-white/5 border-white/10 text-gray-400"
                            : "bg-white border-gray-200 text-gray-500"
                        )}
                      >
                        {safeStr(match?.fullLeague) ||
                          safeStr(match?.league) ||
                          "League"}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-between p-4 sm:p-5 rounded-[24px] border shadow-sm relative overflow-hidden",
                        darkMode
                          ? "bg-gradient-to-b from-white/[0.05] to-transparent border-white/10"
                          : "bg-gradient-to-b from-gray-50 to-white border-gray-200"
                      )}
                    >
                      {isSystemMatch && (
                        <div
                          className={cn(
                            "absolute inset-0 pointer-events-none opacity-[0.05]",
                            darkMode ? "bg-amber-400" : "bg-amber-500"
                          )}
                        />
                      )}
                      <div className="flex flex-col items-center gap-2.5 flex-1 w-[40%] relative z-10">
                        <span
                          className={cn(
                            "text-sm sm:text-base font-black text-center leading-tight line-clamp-2",
                            darkMode ? "text-white" : "text-gray-900"
                          )}
                        >
                          {hTeam}
                        </span>
                        <VisualFormGuide
                          formStr={match?.hForm || match?.form?.homeStr}
                        />
                      </div>
                      <div className="flex flex-col items-center justify-center shrink-0 px-2 relative z-10">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black italic shadow-inner ring-4",
                            darkMode
                              ? "bg-gray-900 ring-gray-800 text-gray-500"
                              : "bg-gray-100 ring-white text-gray-400"
                          )}
                        >
                          VS
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2.5 flex-1 w-[40%] relative z-10">
                        <span
                          className={cn(
                            "text-sm sm:text-base font-black text-center leading-tight line-clamp-2",
                            darkMode ? "text-white" : "text-gray-900"
                          )}
                        >
                          {aTeam}
                        </span>
                        <VisualFormGuide
                          formStr={match?.aForm || match?.form?.awayStr}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div
                className={cn(
                  "mt-3 rounded-[24px] border p-4 sm:p-5 transition-all shadow-sm",
                  darkMode
                    ? "border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent"
                    : "border-gray-200 bg-white"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                  <div className="min-w-0 w-full">
                    {/* === 1. RESTORED PRIMARY PICK === */}
                    <div
                      className={cn(
                        "text-[11px] font-extrabold opacity-80 uppercase tracking-widest",
                        darkMode ? "text-blue-400" : "text-blue-600"
                      )}
                    >
                      Primary AI Pick
                    </div>
                    <div className="mt-1 text-base sm:text-lg font-black truncate flex items-center flex-wrap gap-2">
                      <span
                        className={cn(
                          darkMode ? "text-white" : "text-gray-900"
                        )}
                      >
                        {(valueTag === "Value" || valueTag === "Solid") &&
                        !canSeeAdvancedData ? (
                          <span className="flex items-center gap-1.5">
                            {recommended?.market ||
                              marketText ||
                              "Match Market"}{" "}
                            •
                            <span className="blur-[4px] select-none opacity-50">
                              Hidden
                            </span>
                            <span
                              className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                              onClick={() =>
                                alert(
                                  "🔒 Upgrade to Pro to unlock our highest value AI predictions!"
                                )
                              }
                            >
                              <Lock size={10} /> Unlock Pick
                            </span>
                          </span>
                        ) : recommended ? (
                          formatSelectionLabel(recommended)
                        ) : pickText ? (
                          `${pickText}${marketText ? ` • ${marketText}` : ""}`
                        ) : (
                          "—"
                        )}
                      </span>

                      {/* RESTORED @ ODDS */}
                      {pickOdds ? (
                        canSeeAdvancedData ? (
                          <span className={`ml-1 ${getEdgeColor(valueEdge)}`}>
                            @{Number(pickOdds).toFixed(2)}
                          </span>
                        ) : (
                          <span
                            className="ml-1 inline-flex items-center gap-1 cursor-pointer"
                            onClick={() =>
                              alert(
                                "🔒 Upgrade to Pro to see exact market odds!"
                              )
                            }
                          >
                            <span className="blur-[4px] select-none opacity-50">
                              @1.95
                            </span>
                            <span className="text-[10px] bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Lock size={10} /> Pro
                            </span>
                          </span>
                        )
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={pill(darkMode, "violet")}>
                        VIP {vipScore} • {valueTag}
                      </span>
                      {recommended && recommended.prob > 0 ? (
                        <span className={pill(darkMode, "info")}>
                          Suggested: {Math.round(recommended.prob)}% Conf
                        </span>
                      ) : null}
                      {kickoffPassed ? (
                        <span className={pill(darkMode, "danger")}>
                          Kickoff passed
                        </span>
                      ) : null}

                      {pickOdds &&
                        valueEdge !== null &&
                        (canSeeAdvancedData ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                              darkMode
                                ? "bg-white/5 border-white/10"
                                : "bg-gray-50 border-gray-200",
                              getEdgeColor(valueEdge)
                            )}
                          >
                            🔥 {valueEdge > 0 ? "+" : ""}
                            {valueEdge}% Value Edge
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-500 cursor-pointer"
                            onClick={() =>
                              alert(
                                "🔒 Upgrade to Pro to see exact Value Edge percentages!"
                              )
                            }
                          >
                            🔥 Value Edge Detected{" "}
                            <Lock size={12} className="ml-0.5" />
                          </span>
                        ))}
                    </div>

                    {/* === 2. VALUE EDGE VISUALIZER === */}
                    {canSeeAdvancedData && (
                      <ValueEdgeVisualizer
                        modelProb={
                          activeSelection
                            ? resolveProbabilityForSelection(
                                match,
                                activeSelection.market,
                                activeSelection.option
                              )
                            : null
                        }
                        odds={pickOdds}
                        darkMode={darkMode}
                      />
                    )}

                    {/* === 3. NEW 1X2 MARKET GRID (Placed beneath the edge) === */}
                    <div
                      className={cn(
                        "mt-6 pt-5 border-t",
                        darkMode ? "border-white/10" : "border-gray-200"
                      )}
                    >
                      <div
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest opacity-80 mb-3 flex items-center",
                          darkMode ? "text-gray-300" : "text-gray-600"
                        )}
                      >
                        1X2 Market Context
                        {odds1X2?.isLive && (
                          <span className="text-emerald-500 animate-pulse ml-2 text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>{" "}
                            LIVE
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div
                          className={cn(
                            "rounded-2xl border p-2 flex flex-col items-center justify-center transition-all",
                            darkMode
                              ? "bg-white/[0.02] border-white/10"
                              : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5",
                              darkMode ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            1
                          </span>
                          {canSeeAdvancedData ? (
                            <span
                              className={cn(
                                "text-sm sm:text-base font-black tabular-nums tracking-tight",
                                darkMode ? "text-white" : "text-gray-900"
                              )}
                            >
                              {odds1X2?.home > 0
                                ? odds1X2.home.toFixed(2)
                                : "—"}
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1 cursor-pointer mt-0.5"
                              onClick={() =>
                                alert(
                                  "🔒 Upgrade to Pro to see exact live odds!"
                                )
                              }
                            >
                              <span className="text-sm font-black blur-[4px] opacity-40 select-none">
                                2.15
                              </span>
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "rounded-2xl border p-2 flex flex-col items-center justify-center transition-all",
                            darkMode
                              ? "bg-white/[0.02] border-white/10"
                              : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5",
                              darkMode ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            X
                          </span>
                          {canSeeAdvancedData ? (
                            <span
                              className={cn(
                                "text-sm sm:text-base font-black tabular-nums tracking-tight",
                                darkMode ? "text-white" : "text-gray-900"
                              )}
                            >
                              {odds1X2?.draw > 0
                                ? odds1X2.draw.toFixed(2)
                                : "—"}
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1 cursor-pointer mt-0.5"
                              onClick={() =>
                                alert(
                                  "🔒 Upgrade to Pro to see exact live odds!"
                                )
                              }
                            >
                              <span className="text-sm font-black blur-[4px] opacity-40 select-none">
                                3.40
                              </span>
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "rounded-2xl border p-2 flex flex-col items-center justify-center transition-all",
                            darkMode
                              ? "bg-white/[0.02] border-white/10"
                              : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5",
                              darkMode ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            2
                          </span>
                          {canSeeAdvancedData ? (
                            <span
                              className={cn(
                                "text-sm sm:text-base font-black tabular-nums tracking-tight",
                                darkMode ? "text-white" : "text-gray-900"
                              )}
                            >
                              {odds1X2?.away > 0
                                ? odds1X2.away.toFixed(2)
                                : "—"}
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1 cursor-pointer mt-0.5"
                              onClick={() =>
                                alert(
                                  "🔒 Upgrade to Pro to see exact live odds!"
                                )
                              }
                            >
                              <span className="text-sm font-black blur-[4px] opacity-40 select-none">
                                3.10
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* === 4. LIVE STEAM & HISTORICAL STATS === */}
                    {canSeeAdvancedData && activeSelection && (
                      <LiveSteamIndicator
                        matchName={match?.match}
                        selection={activeSelection}
                        darkMode={darkMode}
                      />
                    )}

                    {canSeeAdvancedData && historicalStats && (
                      <div
                        className={cn(
                          "mt-4 rounded-xl border p-3 flex items-center justify-between transition-all",
                          darkMode
                            ? "bg-blue-500/10 border-blue-500/20"
                            : "bg-blue-50 border-blue-200"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "p-1.5 rounded-md",
                              darkMode ? "bg-blue-500/20" : "bg-white shadow-sm"
                            )}
                          >
                            <Database
                              size={14}
                              className={
                                darkMode ? "text-blue-400" : "text-blue-600"
                              }
                            />
                          </div>
                          <div>
                            <div
                              className={cn(
                                "text-[10px] font-extrabold uppercase tracking-widest",
                                darkMode
                                  ? "text-blue-300/70"
                                  : "text-blue-600/70"
                              )}
                            >
                              Historical Profile Match
                            </div>
                            <div
                              className={cn(
                                "text-xs font-bold",
                                darkMode ? "text-blue-100" : "text-blue-900"
                              )}
                            >
                              Based on {historicalStats.total} similar matches
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div
                            className={cn(
                              "text-lg font-black tracking-tight",
                              historicalStats.winRate >= 60
                                ? "text-emerald-500"
                                : "text-amber-500"
                            )}
                          >
                            {historicalStats.winRate}%
                          </div>
                          <div
                            className={cn(
                              "text-[9px] font-extrabold uppercase tracking-widest",
                              darkMode ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            Hit Rate
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* === 5. CONFIDENCE RINGS (Right Side) === */}
                  <div className="sm:min-w-[140px] flex sm:flex-col items-center justify-start gap-4 sm:gap-6 pt-2 sm:pt-0 shrink-0">
                    <ConfidenceRing
                      value={chance}
                      label="Chance"
                      darkMode={darkMode}
                      isLocked={false}
                    />
                    <ConfidenceRing
                      value={ratingPercentage}
                      label="Rating"
                      darkMode={darkMode}
                      isLocked={!canSeeAdvancedData}
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-4 pt-3 border-t text-[11px]",
                    darkMode
                      ? "border-white/5 text-gray-400"
                      : "border-gray-100 text-gray-500"
                  )}
                >
                  {riskLine}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    {user ? (
                      <button
                        type="button"
                        onClick={handleAddToBetslip}
                        disabled={
                          kickoffPassed || isInBetslip || !canAddMoreSafe()
                        }
                        className={cn(
                          "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black text-white transition active:scale-[0.99]",
                          kickoffPassed
                            ? "bg-gray-400 opacity-50 cursor-not-allowed pointer-events-none"
                            : isInBetslip
                            ? "bg-emerald-600 opacity-90 cursor-not-allowed"
                            : canAddMoreSafe()
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700"
                            : "bg-gray-400 opacity-60 cursor-not-allowed"
                        )}
                      >
                        {isInBetslip ? <Check size={18} /> : <Plus size={18} />}{" "}
                        {isInBetslip ? "Added" : "BetSlip"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black text-white bg-gray-400 opacity-60 cursor-not-allowed"
                      >
                        <Lock size={18} /> Sign in
                      </button>
                    )}

                    {!permissionsLoading && (
                      <button
                        type="button"
                        onClick={handleToggleIntelligence}
                        className={cn(
                          "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition active:scale-[0.99]",
                          canSeeAiInsight
                            ? darkMode
                              ? "bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30 hover:bg-fuchsia-500/20"
                              : "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-100"
                            : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 border border-transparent"
                        )}
                      >
                        {canSeeAiInsight ? (
                          <Brain size={18} />
                        ) : (
                          <Lock size={18} />
                        )}
                        <span>AI Insight</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowMoreMenu(!showMoreMenu);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border transition active:scale-[0.99] flex items-center justify-center shrink-0",
                      darkMode
                        ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100",
                      showMoreMenu && (darkMode ? "bg-white/15" : "bg-gray-200")
                    )}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {showMoreMenu && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in slide-in-from-top-2 fade-in duration-200 mt-2">
                    <button
                      type="button"
                      onClick={handleFindSimilar}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition active:scale-[0.98]",
                        darkMode
                          ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <Sparkles size={14} /> Similar
                    </button>
                    <button
                      type="button"
                      onClick={handleComparisonClick}
                      disabled={comparisonLoading || !canUseComparison}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition active:scale-[0.98]",
                        darkMode
                          ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
                        (comparisonLoading || !canUseComparison) &&
                          "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <BarChart3 size={14} /> Compare
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={isSharing}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition active:scale-[0.98]",
                        darkMode
                          ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
                        isSharing && "opacity-50 cursor-wait"
                      )}
                    >
                      <Share2 size={14} /> {isSharing ? "Generating..." : copied ? "Copied!" : "Share"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowDetails(!showDetails);
                        setShowMoreMenu(false);
                        setShowIntelligence(false);
                      }}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition active:scale-[0.98]",
                        darkMode
                          ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
                        showDetails &&
                          (darkMode ? "bg-white/15" : "bg-gray-100")
                      )}
                    >
                      <ChevronDown
                        size={14}
                        className={
                          showDetails
                            ? "rotate-180 transition-transform"
                            : "transition-transform"
                        }
                      />{" "}
                      Details
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 🔥 RIGHT COLUMN: 6 Stats Grid + New Dynamic Market Context Box */}
            <div className="w-full lg:max-w-[340px] flex flex-col gap-3 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <SmallStat
                  k="Predicted score"
                  v={
                    canSeeAdvancedData ? (
                      predictedScore
                    ) : (
                      <span className="flex items-center gap-1.5 cursor-pointer text-amber-500 text-sm w-full">
                        <span className="blur-[4px] opacity-60 select-none text-gray-400">
                          2-1
                        </span>
                        <Lock size={12} />
                      </span>
                    )
                  }
                  darkMode={darkMode}
                />
                <SmallStat
                  k="ML Pick"
                  v={
                    canSeeAdvancedData ? (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Brain size={12} /> {match?.pick || "—"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 cursor-pointer text-amber-500 text-sm w-full">
                        <Lock size={12} />
                      </span>
                    )
                  }
                  darkMode={darkMode}
                />
                <SmallStat
                  k="Hist. Win Rate"
                  v={
                    (isAdmin || isPremium || isSilver) ? (
                      mlStats.winRate !== null ? (
                        <span className="text-emerald-500 font-extrabold">{mlStats.label}</span>
                      ) : (
                        "—"
                      )
                    ) : (
                      <span className="flex items-center gap-1.5 cursor-pointer text-amber-500 text-sm w-full" onClick={() => window.location.href = "#"}>
                        <Lock size={12} />
                      </span>
                    )
                  }
                  darkMode={darkMode}
                />
                <SmallStat
                  k="Draw %"
                  v={`${pct(match?.draw)}%`}
                  darkMode={darkMode}
                />
                <SmallStat
                  k="Home %"
                  v={`${pct(match?.homeWin)}%`}
                  darkMode={darkMode}
                />
                <SmallStat
                  k="Away %"
                  v={`${pct(match?.awayWin)}%`}
                  darkMode={darkMode}
                />
                <SmallStat
                  k="League"
                  v={safeStr(match?.fullLeague || match?.league) || "—"}
                  darkMode={darkMode}
                  className="col-span-2 text-xs"
                />
              </div>

              {/* 🔥 NEW DYNAMIC MARKET CONTEXT */}
              <PrimaryMarketContext
                match={match}
                selection={activeSelection}
                darkMode={darkMode}
                canSeeAdvancedData={canSeeAdvancedData}
                dcOdds={dcOdds}
              />
            </div>
          </div>

          {showDetails && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Section
                  darkMode={darkMode}
                  title="Match Goals & Probabilities"
                  icon={
                    <Sparkles
                      className={cn(
                        "h-4 w-4",
                        darkMode ? "text-emerald-300" : "text-emerald-600"
                      )}
                    />
                  }
                >
                  <div className="space-y-3">
                    <Meter
                      darkMode={darkMode}
                      label="Over 1.5"
                      value={
                        match?.ov15 ||
                        avg(match?.hgsOver15, match?.agsOver15) ||
                        75
                      }
                      colorClass="from-blue-400 to-cyan-300"
                    />
                    <Meter
                      darkMode={darkMode}
                      label="Over 2.5"
                      value={match?.ov25}
                      colorClass="from-blue-500 to-cyan-400"
                    />

                    <Meter
                      darkMode={darkMode}
                      label="BTTS (Yes)"
                      value={match?.gg}
                      colorClass="from-emerald-500 to-lime-400"
                    />
                    <Meter
                      darkMode={darkMode}
                      label="BTTS (No)"
                      value={match?.ng}
                      colorClass="from-rose-500 to-orange-400"
                    />
                  </div>
                </Section>

                <Section
                  darkMode={darkMode}
                  title="Market Edge Hub"
                  icon={
                    <BarChart3
                      className={cn(
                        "h-4 w-4",
                        darkMode ? "text-blue-300" : "text-blue-600"
                      )}
                    />
                  }
                >
                  {canSeeAdvancedData ? (
                    <div className="space-y-3">
                      {/* 1X2 MARKETS */}
                      {match?.homeOdds ? (
                        <div
                          className={cn(
                            "rounded-2xl border p-3",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div
                            className={cn(
                              "text-[11px] font-bold uppercase tracking-wider mb-2",
                              darkMode ? "text-blue-400" : "text-blue-600"
                            )}
                          >
                            1X2 Market Odds
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Home
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.homeOdds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.homeWin)}
                                odds={match.homeOdds}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="text-center border-l border-r dark:border-white/10">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Draw
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.drawOdds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.draw)}
                                odds={match.drawOdds}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Away
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.awayOdds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.awayWin)}
                                odds={match.awayOdds}
                                darkMode={darkMode}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* DOUBLE CHANCE MARKETS */}
                      {dcOdds.h1x ? (
                        <div
                          className={cn(
                            "rounded-2xl border p-3",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div
                            className={cn(
                              "text-[11px] font-bold uppercase tracking-wider mb-2",
                              darkMode ? "text-purple-400" : "text-purple-600"
                            )}
                          >
                            Double Chance Odds
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                1X
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {dcOdds.h1x}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.homeWin) + pct(match.draw)}
                                odds={dcOdds.h1x}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="text-center border-l border-r dark:border-white/10">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                12
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {dcOdds.h12}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.homeWin) + pct(match.awayWin)}
                                odds={dcOdds.h12}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                X2
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {dcOdds.hx2}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.draw) + pct(match.awayWin)}
                                odds={dcOdds.hx2}
                                darkMode={darkMode}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* OVER/UNDER 2.5 MARKETS */}
                      {match?.o25Odds ? (
                        <div
                          className={cn(
                            "rounded-2xl border p-3",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div
                            className={cn(
                              "text-[11px] font-bold uppercase tracking-wider mb-2",
                              darkMode ? "text-amber-400" : "text-amber-600"
                            )}
                          >
                            Over / Under 2.5
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Over
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.o25Odds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.ov25)}
                                odds={match.o25Odds}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="text-center border-l dark:border-white/10">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Under
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.u25Odds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.un25)}
                                odds={match.u25Odds}
                                darkMode={darkMode}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* OVER/UNDER 1.5 MARKETS */}
                      {match?.o15Odds ? (
                        <div
                          className={cn(
                            "rounded-2xl border p-3",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div
                            className={cn(
                              "text-[11px] font-bold uppercase tracking-wider mb-2",
                              darkMode ? "text-orange-400" : "text-orange-600"
                            )}
                          >
                            Over / Under 1.5
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Over
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.o15Odds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={
                                  match.ov15 ||
                                  avg(match?.hgsOver15, match?.agsOver15) ||
                                  75
                                }
                                odds={match.o15Odds}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="text-center border-l dark:border-white/10">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Under
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.u15Odds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={
                                  match.un15 ||
                                  100 -
                                    avg(match?.hgsOver15, match?.agsOver15) ||
                                  25
                                }
                                odds={match.u15Odds}
                                darkMode={darkMode}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* OVER/UNDER 3.5 MARKETS */}
                      {match?.o35Odds ? (
                        <div
                          className={cn(
                            "rounded-2xl border p-3",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div
                            className={cn(
                              "text-[11px] font-bold uppercase tracking-wider mb-2",
                              darkMode ? "text-red-400" : "text-red-600"
                            )}
                          >
                            Over / Under 3.5
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Over
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.o35Odds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.ov35)}
                                odds={match.o35Odds}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="text-center border-l dark:border-white/10">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Under
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.u35Odds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.un35)}
                                odds={match.u35Odds}
                                darkMode={darkMode}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* BTTS MARKETS */}
                      {match?.bttsYesOdds ? (
                        <div
                          className={cn(
                            "rounded-2xl border p-3",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div
                            className={cn(
                              "text-[11px] font-bold uppercase tracking-wider mb-2",
                              darkMode ? "text-fuchsia-400" : "text-fuchsia-600"
                            )}
                          >
                            Both Teams To Score
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                Yes
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.bttsYesOdds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.gg)}
                                odds={match.bttsYesOdds}
                                darkMode={darkMode}
                              />
                            </div>
                            <div className="text-center border-l dark:border-white/10">
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest opacity-60 mb-1"
                                )}
                              >
                                No
                              </div>
                              <div className="text-sm font-black tabular-nums">
                                {Number(match.bttsNoOdds).toFixed(2)}
                              </div>
                              <InlineEdgeVisualizer
                                prob={pct(match.ng)}
                                odds={match.bttsNoOdds}
                                darkMode={darkMode}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "text-sm",
                        darkMode ? "text-gray-300" : "text-gray-600"
                      )}
                    >
                      🔒 Silver+ users see deeper market context and exact value
                      edge calculations here.
                    </div>
                  )}
                </Section>
              </div>
            </div>
          )}

          {showIntelligence && (
            <div className="mt-4">
              <Section
                darkMode={darkMode}
                title="AI Intelligence"
                icon={
                  <Brain
                    className={cn(
                      "h-4 w-4",
                      darkMode ? "text-fuchsia-300" : "text-fuchsia-600"
                    )}
                  />
                }
              >
                {isLoadingIntelligence && !intelligence ? (
                  <div
                    className={cn(
                      "rounded-2xl border p-4 text-sm font-semibold",
                      darkMode
                        ? "border-white/10 bg-white/5 text-gray-200"
                        : "border-gray-200 bg-white text-gray-700"
                    )}
                  >
                    Generating advanced AI insight...
                  </div>
                ) : intelligence ? (
                  <div className="relative">
                    {!canSeeAiInsight && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl backdrop-blur-md bg-black/40">
                        <div className="text-center px-6">
                          <Lock className="mx-auto mb-2 h-6 w-6 text-yellow-400" />
                          <div className="text-sm font-extrabold text-white">
                            Premium AI Intelligence Locked
                          </div>
                          <div className="mt-1 text-xs text-gray-300">
                            Upgrade to unlock full tactical, market and risk
                            breakdown.
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-bold">
                          Betting Recommendation
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="rounded-xl border p-2 text-center bg-green-500/10 border-green-400/30">
                            <div className="text-[10px] opacity-70">Market</div>
                            <div className="text-sm font-extrabold">
                              {intelligence?.recommendation?.market || "—"}
                            </div>
                          </div>
                          <div className="rounded-xl border p-2 text-center bg-blue-500/10 border-blue-400/30">
                            <div className="text-[10px] opacity-70">
                              Selection
                            </div>
                            <div className="text-sm font-extrabold">
                              {intelligence?.recommendation?.selection || "—"}
                            </div>
                          </div>
                          <div className="rounded-xl border p-2 text-center bg-purple-500/10 border-purple-400/30">
                            <div className="text-[10px] opacity-70">
                              Confidence
                            </div>
                            <div className="text-sm font-extrabold">
                              {intelligence?.recommendation?.confidence ?? "—"}
                              {intelligence?.recommendation?.confidence !==
                              undefined
                                ? "%"
                                : ""}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="rounded-xl border p-2 text-center bg-indigo-500/10 border-indigo-400/30">
                            <div className="text-[10px] opacity-70">
                              Stake Tier
                            </div>
                            <div className="text-sm font-extrabold">
                              {intelligence?.recommendation?.stakeTier || "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          !canSeeAiInsight && "blur-sm pointer-events-none"
                        )}
                      >
                        <div className="space-y-4">
                          {pickOdds && valueEdge !== null && valueEdge > 5 && (
                            <div className="relative">
                              <div className="rounded-2xl border p-3 bg-green-500/10 border-green-400/30">
                                <div className="flex items-center gap-2 text-sm font-extrabold text-green-500">
                                  🔥 Market Value Detected
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                                  <div className="rounded-lg border p-2 text-center bg-white/5">
                                    <div className="text-[10px] opacity-70">
                                      Model
                                    </div>
                                    <div className="font-bold">
                                      {intelligence?.recommendation
                                        ?.confidence ?? "—"}
                                      {intelligence?.recommendation
                                        ?.confidence !== undefined
                                        ? "%"
                                        : ""}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border p-2 text-center bg-white/5">
                                    <div className="text-[10px] opacity-70">
                                      Market
                                    </div>
                                    <div className="font-bold">
                                      {pickOdds
                                        ? `${Math.round((1 / pickOdds) * 100)}%`
                                        : "—"}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border p-2 text-center bg-white/5">
                                    <div className="text-[10px] opacity-70">
                                      Edge
                                    </div>
                                    <div className="font-bold text-green-500">
                                      {intelligence?.recommendation
                                        ?.expectedValue !== undefined
                                        ? `+${intelligence.recommendation.expectedValue}%`
                                        : "—"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="rounded-xl border p-2 text-center bg-blue-500/10 border-blue-400/30">
                              <div className="text-[10px] opacity-70">
                                Model Trust
                              </div>
                              <div className="text-sm font-extrabold">
                                {intelligence?.modelTrust ?? "—"}
                                {intelligence?.modelTrust !== undefined
                                  ? "%"
                                  : ""}
                              </div>
                            </div>
                            <div className="rounded-xl border p-2 text-center bg-purple-500/10 border-purple-400/30">
                              <div className="text-[10px] opacity-70">
                                Edge Tier
                              </div>
                              <div className="text-sm font-extrabold">
                                {intelligence?.edgeTier || "—"}
                              </div>
                            </div>
                            <div className="rounded-xl border p-2 text-center bg-orange-500/10 border-orange-400/30">
                              <div className="text-[10px] opacity-70">
                                Volatility
                              </div>
                              <div className="text-sm font-extrabold">
                                {intelligence?.volatility || "—"}
                              </div>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "rounded-2xl border p-3 text-sm font-extrabold",
                              intelligence?.confidence === "Elite"
                                ? darkMode
                                  ? "border-yellow-400/40 bg-yellow-500/10 text-yellow-300"
                                  : "border-yellow-300 bg-yellow-50 text-yellow-700"
                                : intelligence?.confidence === "High"
                                ? darkMode
                                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : darkMode
                                ? "border-blue-400/30 bg-blue-500/10 text-blue-300"
                                : "border-blue-200 bg-blue-50 text-blue-700"
                            )}
                          >
                            {intelligence?.confidence || "—"} Confidence •{" "}
                            {intelligence?.primaryEdge || "—"}
                          </div>
                          <InsightBlock
                            title="Match Overview"
                            darkMode={darkMode}
                          >
                            {intelligence?.narratives?.overview || "—"}
                          </InsightBlock>
                          <InsightBlock
                            title="Tactical & Statistical Edge"
                            darkMode={darkMode}
                          >
                            {intelligence?.narratives?.tactical || "—"}
                          </InsightBlock>
                          <InsightBlock
                            title="Market Alignment"
                            darkMode={darkMode}
                          >
                            {intelligence?.narratives?.marketAlignment || "—"}
                          </InsightBlock>
                          <InsightBlock
                            title="Goal Environment Projection"
                            darkMode={darkMode}
                          >
                            {intelligence?.narratives?.goalProjection || "—"}
                          </InsightBlock>
                          <InsightBlock
                            title="Risk Exposure Report"
                            darkMode={darkMode}
                          >
                            {intelligence?.narratives?.riskReport || "—"}
                          </InsightBlock>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "rounded-2xl border p-4 text-sm",
                      darkMode
                        ? "border-white/10 bg-white/5 text-gray-300"
                        : "border-gray-200 bg-white text-gray-600"
                    )}
                  >
                    No AI intelligence available for this match yet.
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </Card>

      {showComparison ? (
        <TeamComparisonModal
          match={match}
          onClose={() => setShowComparison(false)}
          darkMode={darkMode}
        />
      ) : null}
    </>
  );
}