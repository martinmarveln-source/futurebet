"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import { Trophy, Plus, Check, X, ChevronLeft, Target, Shield, Home, AlertCircle, BarChart3, ArrowDown, ArrowUp, Activity, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PremiumOverlay from "../../../components/Stats/PremiumOverlay";
import useBetslipStore from "../../../store/betslipStore";

function getMarketSelection(secKey: string): { market: string; option: string } | null {
  switch (secKey) {
    case "btts": return { market: "BTTS", option: "Yes" };
    case "nbtts": return { market: "BTTS", option: "No" };
    case "o15": return { market: "O/U 1.5", option: "Over" };
    case "u15": return { market: "O/U 1.5", option: "Under" };
    case "o25": return { market: "O/U 2.5", option: "Over" };
    case "u25": return { market: "O/U 2.5", option: "Under" };
    case "o35": return { market: "O/U 3.5", option: "Over" };
    case "u35": return { market: "O/U 3.5", option: "Under" };
    case "o45": return { market: "O/U 4.5", option: "Over" };
    case "u45": return { market: "O/U 4.5", option: "Under" };
    case "bestHome": return { market: "1X2", option: "Home Win" };
    case "bestAway": return { market: "1X2", option: "Away Win" };
    case "homeDraw": return { market: "1X2", option: "Draw" };
    case "awayDraw": return { market: "1X2", option: "Draw" };
    case "worstHome": return { market: "1X2", option: "Away Win" };
    case "worstAway": return { market: "1X2", option: "Home Win" };
    default: return null;
  }
}

export default function InsightsPage() {
  const { matches: betslipMatches, addMatch, removeMatch, clearAll, maxMatches } = useBetslipStore();
  const [mounted, setMounted] = useState(false);
  const [showSelectedTray, setShowSelectedTray] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeBetslipMatches = mounted ? betslipMatches : [];

  const getMatchName = (item: any) =>
    item.isHome ? `${item.team} vs ${item.nextOpponent}` : `${item.nextOpponent} vs ${item.team}`;

  const findInBetslip = (matchName: string) => {
    const key = matchName.trim().toLowerCase();
    return activeBetslipMatches.find((m: any) => String(m.match || "").trim().toLowerCase() === key);
  };

  const handleToggleBetslip = (item: any, secKey: string) => {
    const selection = getMarketSelection(secKey);
    if (!selection) return;

    const matchName = getMatchName(item);
    const existing = findInBetslip(matchName);

    if (existing) {
      removeMatch(matchName);
      toast.info(`Removed ${matchName} from Betslip`);
      return;
    }

    if (activeBetslipMatches.length >= maxMatches) {
      toast.error(`Betslip limit reached (max ${maxMatches} matches)`);
      return;
    }

    const m = {
      match: matchName,
      league: item.league,
      country: item.country,
      date: item.nextDate,
      selectedMarket: selection.market,
      selectedOption: selection.option,
      odds: Number(item.odds),
      chance: item.prediction,
      rating: item.confidence
    };

    const added = addMatch(m);
    if (added) {
      toast.success(`Added ${matchName} (${selection.market}: ${selection.option})`, {
        action: {
          label: "Remove",
          onClick: () => {
            removeMatch(matchName);
            toast.info(`Removed ${matchName} from Betslip`);
          },
        },
      });
    } else {
      toast.error(`Could not add ${matchName} to Betslip`);
    }
  };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [minGames, setMinGames] = useState(8);
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [split, setSplit] = useState("overall"); // overall, home, away
  const [viewType, setViewType] = useState("team"); // team, league
  const [isLocked, setIsLocked] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minPrediction, setMinPrediction] = useState(0);
  const [minConfidence, setMinConfidence] = useState(0);
  const [minOdds, setMinOdds] = useState(0);

  useEffect(() => {
    setLoading(true);
    setIsLocked(false);
    
    const params = new URLSearchParams({
      minGames: minGames.toString(),
      split
    });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (minPrediction > 0) params.append("minPrediction", minPrediction.toString());
    if (minConfidence > 0) params.append("minConfidence", minConfidence.toString());
    if (minOdds > 0) params.append("minOdds", minOdds.toString());

    fetch(`/api/stats/insights?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else if (json.error === "premium_required") {
          setIsLocked(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [minGames, split, startDate, endDate, minPrediction, minConfidence, viewType, minOdds]);

  const sections = [
    { key: "btts", title: "Best BTTS", icon: Target, color: "text-emerald-400" },
    { key: "nbtts", title: "Best N-BTTS", icon: Shield, color: "text-sky-400" },
    { key: "o15", title: "Best Over 1.5", icon: ArrowUp, color: "text-emerald-400" },
    { key: "u15", title: "Best Under 1.5", icon: ArrowDown, color: "text-rose-400" },
    { key: "o25", title: "Best Over 2.5", icon: ArrowUp, color: "text-emerald-400" },
    { key: "u25", title: "Best Under 2.5", icon: ArrowDown, color: "text-rose-400" },
    { key: "o35", title: "Best Over 3.5", icon: ArrowUp, color: "text-emerald-500" },
    { key: "u35", title: "Best Under 3.5", icon: ArrowDown, color: "text-rose-500" },
    { key: "o45", title: "Best Over 4.5", icon: ArrowUp, color: "text-emerald-500" },
    { key: "u45", title: "Best Under 4.5", icon: ArrowDown, color: "text-rose-500" },
    { key: "hgsO15", title: "Home Scored Over 1.5", icon: Target, color: "text-blue-400" },
    { key: "hgcO15", title: "Home Conceded Over 1.5", icon: AlertCircle, color: "text-rose-400" },
    { key: "agsO15", title: "Away Scored Over 1.5", icon: Target, color: "text-indigo-400" },
    { key: "agcO15", title: "Away Conceded Over 1.5", icon: AlertCircle, color: "text-rose-400" },
    { key: "nfts", title: "Highest Not Failed to Score", icon: Target, color: "text-blue-400" },
    { key: "fts", title: "Highest Failed to Score", icon: AlertCircle, color: "text-slate-300" },
    { key: "cleanSheet", title: "Best Clean Sheet", icon: Shield, color: "text-indigo-400" },
    { key: "bestHome", title: "Strongest Home", icon: Home, color: "text-emerald-400" },
    { key: "worstHome", title: "Worst Home", icon: Home, color: "text-rose-500" },
    { key: "bestAway", title: "Strongest Away", icon: Globe, color: "text-emerald-400" },
    { key: "worstAway", title: "Worst Away", icon: Globe, color: "text-rose-500" },
    { key: "homeDraw", title: "Highest Home Draw", icon: Activity, color: "text-slate-300" },
    { key: "awayDraw", title: "Highest Away Draw", icon: Activity, color: "text-slate-300" },
  ];

  const currentData = viewType === 'team' ? data?.team : data?.league;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {activeBetslipMatches.length > 0 && (
            <button
              onClick={() => setShowSelectedTray((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Betslip: {activeBetslipMatches.length} / {maxMatches} selected</span>
            </button>
          )}
        </div>

        {showSelectedTray && activeBetslipMatches.length > 0 && (
          <div className="mb-6 bg-[#0f172a] border border-emerald-500/25 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Selected Matches ({activeBetslipMatches.length})
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    clearAll();
                    setShowSelectedTray(false);
                    toast.info("Cleared all selections from Betslip");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
                <button
                  onClick={() => setShowSelectedTray(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  aria-label="Close selected matches tray"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeBetslipMatches.map((m: any) => (
                <div
                  key={m.match}
                  className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <span className="font-semibold text-white">{m.match}</span>
                  {m.selectedMarket && (
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {m.selectedMarket}{m.selectedOption ? ` • ${m.selectedOption}` : ""}
                    </span>
                  )}
                  {m.odds ? (
                    <span className="text-[11px] text-slate-400 font-mono">@{Number(m.odds).toFixed(2)}</span>
                  ) : null}
                  <button
                    onClick={() => {
                      removeMatch(m.match);
                      toast.info(`Removed ${m.match} from Betslip`);
                    }}
                    className="text-slate-400 hover:text-red-400 p-0.5 rounded hover:bg-red-500/10 transition-colors"
                    title={`Remove ${m.match}`}
                    aria-label={`Remove ${m.match} from Betslip`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Navigation Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-800 pb-px">
          <Link href="/stats" className="px-4 py-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200 font-bold text-sm">
            Browse Leagues
          </Link>
          <Link href="/stats/insights" className="px-4 py-2 border-b-2 border-blue-500 text-blue-400 font-bold text-sm flex items-center gap-1.5 transition-colors">
            <Trophy className="w-4 h-4" />
            Premium Market Insights
          </Link>
        </div>

        <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-white">
              <Activity className="w-8 h-8 text-blue-500" />
              Global Stats Hub
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              The top 1% market insights globally. Filter by minimum games played, split, and entity type.
            </p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Type Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setViewType('team')}
                className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewType === 'team' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Team Performance
              </button>
              <button 
                onClick={() => setViewType('league')}
                className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewType === 'league' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                League Performance
              </button>
            </div>

            {/* Split Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button onClick={() => setSplit('overall')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${split === 'overall' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Overall</button>
              <button onClick={() => setSplit('home')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${split === 'home' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Home</button>
              <button onClick={() => setSplit('away')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${split === 'away' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Away</button>
            </div>

            {/* Min Odds Filter */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 pl-3">
              <span className="text-xs font-bold text-slate-400">Min Odds:</span>
              <select 
                value={minOdds}
                onChange={(e) => setMinOdds(Number(e.target.value))}
                className="bg-transparent text-white text-xs font-bold appearance-none cursor-pointer focus:outline-none"
              >
                <option value={0} className="bg-slate-900">Any</option>
                <option value={1.01} className="bg-slate-900">Has Odds</option>
                <option value={1.20} className="bg-slate-900">1.20+</option>
                <option value={1.50} className="bg-slate-900">1.50+</option>
                <option value={1.80} className="bg-slate-900">1.80+</option>
                <option value={2.00} className="bg-slate-900">2.00+</option>
              </select>
            </div>

            {/* Min Games Filter */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <select 
                value={minGames} 
                onChange={(e) => setMinGames(Number(e.target.value))}
                className="bg-transparent text-white text-sm focus:outline-none font-bold appearance-none cursor-pointer"
              >
                {[4, 5, 8, 10, 15, 20].map(num => (
                  <option key={num} value={num} className="bg-slate-900">Min {num} Matches</option>
                ))}
              </select>
            </div>

            {/* Next Match Date Filter */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
              <span className="text-xs font-bold text-slate-400">Next Match:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-800 border-none text-xs text-white rounded p-1 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-slate-800 border-none text-xs text-white rounded p-1 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            {/* Upcoming Only Toggle */}
            {viewType === "team" && (
              <button
                type="button"
                onClick={() => setUpcomingOnly((v) => !v)}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                  upcomingOnly
                    ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Hide teams with no upcoming fixture or expired dates"
              >
                {upcomingOnly ? "✓ Upcoming Fixtures Only" : "Show All Teams"}
              </button>
            )}

            {/* Prediction Filter */}
            {viewType === 'team' && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-slate-400">Prediction:</span>
                <select 
                  value={minPrediction} 
                  onChange={(e) => setMinPrediction(Number(e.target.value))}
                  className="bg-transparent text-white text-sm focus:outline-none font-bold appearance-none cursor-pointer"
                >
                  <option value={0} className="bg-slate-900">Any %</option>
                  {[60, 70, 80, 90].map(num => (
                    <option key={num} value={num} className="bg-slate-900">{num}%+</option>
                  ))}
                </select>
              </div>
            )}

            {/* Confidence Filter */}
            {viewType === 'team' && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-slate-400">Confidence:</span>
                <select 
                  value={minConfidence} 
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="bg-transparent text-white text-sm focus:outline-none font-bold appearance-none cursor-pointer"
                >
                  <option value={0} className="bg-slate-900">Any</option>
                  {[50, 60, 70, 80].map(num => (
                    <option key={num} value={num} className="bg-slate-900">{num}+</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <div className="relative min-h-[400px]">
          {isLocked && <PremiumOverlay message="Premium Insights Locked" />}
          
          <div className={`grid gap-6 ${viewType === 'team' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'} ${isLocked ? 'opacity-20 pointer-events-none filter blur-[2px]' : ''}`}>
            {sections.map(sec => {
              const Icon = sec.icon;
              const todayISO = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Africa/Lagos",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date());
              const rawItems = isLocked
                ? Array(5).fill({ team: 'Locked Team', league: 'Locked League', country: 'Locked', value: 100 })
                : currentData?.[sec.key];
              const items = (!isLocked && viewType === 'team' && upcomingOnly && Array.isArray(rawItems))
                ? rawItems.filter((it: any) => it.nextOpponent && (!it.nextDate || String(it.nextDate).slice(0, 10) >= todayISO))
                : rawItems;
              if (!items || items.length === 0) return null;
            
            return (
              <div key={sec.key} className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-5 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`p-2 rounded-lg bg-slate-900/80 border border-slate-800`}>
                    <Icon className={`w-5 h-5 ${sec.color}`} />
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight">{sec.title}</h2>
                </div>
                <div className="flex-grow overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                        <th className="py-2 px-2 font-semibold">SN</th>
                        <th className="py-2 px-2 font-semibold min-w-[150px]">{viewType === 'team' ? 'Team' : 'League'}</th>
                        <th className="py-2 px-2 font-semibold text-center">GP</th>
                        <th className="py-2 px-2 font-semibold text-center">%</th>
                        {viewType === 'team' && (
                          <>
                            <th className="py-2 px-2 font-semibold min-w-[90px]">Next Match</th>
                            <th className="py-2 px-2 font-semibold min-w-[120px]">Against</th>
                            <th className="py-2 px-2 font-semibold text-center">Prediction</th>
                            <th className="py-2 px-2 font-semibold text-center">Confidence</th>
                            <th className="py-2 px-2 font-semibold text-center">Odds</th>
                            <th className="py-2 px-2 font-semibold text-center">Trend</th>
                            <th className="py-2 px-2 font-semibold text-center w-10">Slip</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {items.map((item: any, idx: number) => {
                        const hasNextMatch = viewType === 'team' && item.nextOpponent;

                        // Format date — now comes as "YYYY-MM-DD" straight from sheet
                        let matchDateStr = "-";
                        if (hasNextMatch && item.nextDate) {
                          try {
                            // Parse as UTC to avoid timezone shift
                            const [y, m, d] = item.nextDate.split('-').map(Number);
                            const dt = new Date(Date.UTC(y, m - 1, d));
                            matchDateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } catch (_) {}
                        }

                        // H / A venue badge
                        const venueBadge = hasNextMatch
                          ? (item.isHome
                              ? <span className="ml-1 text-[9px] font-black text-emerald-300 bg-emerald-500/15 px-1 py-0.5 rounded">H</span>
                              : <span className="ml-1 text-[9px] font-black text-sky-300 bg-sky-500/15 px-1 py-0.5 rounded">A</span>)
                          : null;

                        // Confidence badge colour
                        const conf = item.confidence;
                        const confColor = conf == null ? "" :
                          conf >= 80 ? "text-emerald-300 bg-emerald-500/15" :
                          conf >= 60 ? "text-blue-300 bg-blue-500/15" :
                                       "text-rose-300 bg-rose-500/15";

                        const val = Math.round(item.value);
                        const selectionConfig = getMarketSelection(sec.key);
                        const matchName = hasNextMatch ? getMatchName(item) : "";
                        const existingPick = hasNextMatch ? findInBetslip(matchName) : null;
                        const isSelected = Boolean(existingPick);
                        const isSameMarket = Boolean(
                          existingPick &&
                          selectionConfig &&
                          existingPick.selectedMarket === selectionConfig.market &&
                          existingPick.selectedOption === selectionConfig.option
                        );

                        return (
                          <tr key={idx} className={`transition-colors group ${isSelected ? "bg-emerald-500/[0.06] hover:bg-emerald-500/[0.1]" : "hover:bg-slate-800/30"}`}>
                            <td className="py-2.5 px-2 text-xs font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-2">
                              {viewType === 'team' ? (
                                <Link href={`/stats/team/${encodeURIComponent(item.team)}?league=${encodeURIComponent(item.league)}&country=${encodeURIComponent(item.country)}`} className="block truncate hover:text-blue-400">
                                  <div className="font-bold text-white text-[13px]">{item.team}</div>
                                  <div className="text-[9px] text-slate-500 uppercase tracking-wider truncate">{item.country} | {item.league}</div>
                                </Link>
                              ) : (
                                <Link href={`/stats/league/${encodeURIComponent(item.league)}?country=${encodeURIComponent(item.country)}`} className="block truncate hover:text-blue-400">
                                  <div className="font-bold text-white text-[13px]">{item.league}</div>
                                  <div className="text-[9px] text-slate-500 uppercase tracking-wider truncate">{item.country}</div>
                                </Link>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center text-[12px] text-slate-300 font-medium">
                              {item.gp ? `${Math.round((item.value / 100) * item.gp)}/${item.gp}` : '-'}
                            </td>
                            <td className={`py-2.5 px-2 text-center text-[12px] font-black ${sec.color}`}>
                              {val}%
                            </td>

                            {viewType === 'team' && (
                              <>
                                <td className="py-2.5 px-2 text-[11px] text-slate-400 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-0.5">
                                    {matchDateStr !== '-' ? matchDateStr : '-'}
                                    {venueBadge}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-[12px] text-slate-300 truncate max-w-[120px]" title={item.nextOpponent}>
                                  {hasNextMatch ? item.nextOpponent : '-'}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  {hasNextMatch && item.prediction !== null && !isNaN(item.prediction) ? (
                                    <span className="text-blue-400 text-[11px] font-bold bg-blue-500/10 px-1.5 py-0.5 rounded inline-block min-w-[36px]">
                                      {Math.round(item.prediction)}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  {hasNextMatch && conf != null ? (
                                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded inline-block min-w-[36px] ${confColor}`}>
                                      {conf}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  {hasNextMatch && item.odds !== null && Number(item.odds) > 0 ? (
                                    <span className="text-emerald-400 text-[11px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block min-w-[36px]">
                                      {Number(item.odds).toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                                {/* Trend Sparkline */}
                                <td className="py-2.5 px-2 text-center">
                                  {Array.isArray(item.trend) && item.trend.length >= 2 ? (
                                    <div className="w-12 h-6 inline-block align-middle" title="Recent form trend">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={item.trend.map((v: number, i: number) => ({ i, v }))}>
                                          <Line
                                            type="monotone"
                                            dataKey="v"
                                            stroke={item.trend[item.trend.length - 1] > item.trend[0] ? '#10b981' : '#f43f5e'}
                                            strokeWidth={1.5}
                                            dot={false}
                                          />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-right">
                                  {hasNextMatch && selectionConfig && item.odds !== null && Number(item.odds) > 0 && (
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleToggleBetslip(item, sec.key); }}
                                      className={`group/btn inline-flex items-center justify-center p-1.5 rounded-lg transition-all border ${
                                        isSelected
                                          ? isSameMarket
                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40"
                                            : "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40"
                                          : "text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700"
                                      }`}
                                      title={
                                        isSelected
                                          ? isSameMarket
                                            ? "Selected — Click to remove from Betslip"
                                            : `In Betslip (${existingPick.selectedMarket}: ${existingPick.selectedOption}) — Click to remove`
                                          : "Add to Betslip"
                                      }
                                      aria-label={isSelected ? `Remove ${matchName} from Betslip` : `Add ${matchName} to Betslip`}
                                    >
                                      {isSelected ? (
                                        <>
                                          <Check size={14} className="group-hover/btn:hidden" />
                                          <X size={14} className="hidden group-hover/btn:block" />
                                        </>
                                      ) : (
                                        <Plus size={14} />
                                      )}
                                    </button>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
