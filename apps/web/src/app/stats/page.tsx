// @ts-nocheck
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Globe2, ChevronRight, ChevronLeft, Activity, Trophy, Search, X,
  Shield, TrendingUp, ChevronDown, ChevronUp, SlidersHorizontal,
} from "lucide-react";

const cn = (...c: any[]) => c.filter(Boolean).join(" ");

interface LeagueInfo {
  league: string;
  teamCount: number;
  overview?: { goals_per_game?: any; btts_percent?: any; over_25_percent?: any };
}
interface CountryData {
  country: string;
  leagues: LeagueInfo[];
}
interface SearchResult {
  type: "league" | "team";
  label: string;
  league?: string;
  country?: string;
  href: string;
}

type SortBy = "alpha" | "leagues" | "teams";
type MarketFilter = "all" | "today" | "high_o25" | "high_btts";

const TOP_LEAGUE_NAMES = [
  { country: "England", league: "Premier League", label: "Premier League" },
  { country: "Spain", league: "LaLiga", label: "La Liga" },
  { country: "Germany", league: "Bundesliga", label: "Bundesliga" },
  { country: "Italy", league: "Serie A", label: "Serie A" },
  { country: "France", league: "Ligue 1", label: "Ligue 1" },
  { country: "England", league: "Championship", label: "Championship" },
  { country: "Netherlands", league: "Eredivisie", label: "Eredivisie" },
  { country: "Portugal", league: "Liga Portugal", label: "Liga Portugal" },
];

export default function StatsHub() {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [teamEntries, setTeamEntries] = useState<SearchResult[]>([]);
  const [todayCountByCountry, setTodayCountByCountry] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("alpha");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");
  const [filterCountry, setFilterCountry] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [countriesRes, matchesRes] = await Promise.all([
          fetch("/api/stats/countries"),
          fetch("/api/matches").catch(() => null),
        ]);
        const json = await countriesRes.json();
        if (json.success) setCountries(json.data);

        if (matchesRes && matchesRes.ok) {
          const mJson = await matchesRes.json();
          const pool = Array.isArray(mJson?.matches) ? mJson.matches : [];
          const todayISO = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Africa/Lagos",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date());

          const seenTeams = new Set<string>();
          const teamsList: SearchResult[] = [];
          const todayMap: Record<string, number> = {};

          for (const m of pool) {
            const c = String(m.country || m.Country || "").trim();
            const l = String(m.league || m.fullLeague || "").trim();
            const d = String(m.dateISO || m.dateRaw || m.date || "").slice(0, 10);
            if (c && d === todayISO) {
              todayMap[c.toLowerCase()] = (todayMap[c.toLowerCase()] || 0) + 1;
            }
            for (const t of [m.homeTeam, m.awayTeam]) {
              const name = String(t || "").trim();
              if (!name) continue;
              const k = `${name.toLowerCase()}|${l.toLowerCase()}`;
              if (seenTeams.has(k)) continue;
              seenTeams.add(k);
              teamsList.push({
                type: "team",
                label: name,
                league: l,
                country: c,
                href: `/stats/team/${encodeURIComponent(name)}?league=${encodeURIComponent(l)}&country=${encodeURIComponent(c)}`,
              });
            }
          }
          setTeamEntries(teamsList);
          setTodayCountByCountry(todayMap);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Build search index (leagues + teams)
  const searchIndex = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    for (const c of countries) {
      for (const l of c.leagues) {
        results.push({
          type: "league",
          label: l.league,
          league: l.league,
          country: c.country,
          href: `/stats/league/${encodeURIComponent(l.league)}?country=${encodeURIComponent(c.country)}`,
        });
      }
    }
    return [...results, ...teamEntries];
  }, [countries, teamEntries]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    const q = search.toLowerCase();
    const matches = searchIndex.filter((r) =>
      r.label.toLowerCase().includes(q) || r.country?.toLowerCase().includes(q) || r.league?.toLowerCase().includes(q)
    ).slice(0, 10);
    setSearchResults(matches);
    setSearchOpen(matches.length > 0);
  }, [search, searchIndex]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sortedCountries = useMemo(() => {
    let list = filterCountry
      ? countries.filter((c) => c.country === filterCountry)
      : countries;

    if (marketFilter === "today") {
      list = list.filter((c) => (todayCountByCountry[c.country.toLowerCase()] || 0) > 0);
    } else if (marketFilter === "high_o25") {
      list = list.filter((c) => c.leagues.some((l) => Number(l.overview?.over_25_percent || 0) >= 55));
    } else if (marketFilter === "high_btts") {
      list = list.filter((c) => c.leagues.some((l) => Number(l.overview?.btts_percent || 0) >= 55));
    }

    if (sortBy === "alpha") list = [...list].sort((a, b) => a.country.localeCompare(b.country));
    else if (sortBy === "leagues") list = [...list].sort((a, b) => b.leagues.length - a.leagues.length);
    else if (sortBy === "teams") list = [...list].sort((a, b) => {
      const ta = a.leagues.reduce((s, l) => s + (l.teamCount ?? 0), 0);
      const tb = b.leagues.reduce((s, l) => s + (l.teamCount ?? 0), 0);
      return tb - ta;
    });
    return list;
  }, [countries, sortBy, filterCountry, marketFilter, todayCountByCountry]);

  const totalLeagues = countries.reduce((s, c) => s + c.leagues.length, 0);
  const totalTeams = countries.reduce((s, c) => s + c.leagues.reduce((ls, l) => ls + (l.teamCount ?? 0), 0), 0);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Top Navigation Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-800 pb-px">
          <Link href="/stats" className="px-4 py-2 border-b-2 border-blue-500 text-blue-400 font-bold text-sm">
            Browse Leagues
          </Link>
          <Link href="/stats/insights" className="px-4 py-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200 font-bold text-sm flex items-center gap-1.5 transition-colors">
            <Trophy className="w-4 h-4" />
            Premium Market Insights
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-white">
              <Activity className="w-8 h-8 text-blue-500" />
              Stats Hub
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              {totalLeagues} leagues · {totalTeams} teams · full betting market analytics
            </p>
          </div>
          {/* Summary pills */}
          <div className="flex gap-2 flex-wrap">
            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              {countries.length} Countries
            </span>
            <span className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-full">
              {totalLeagues} Leagues
            </span>
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              {totalTeams} Teams
            </span>
          </div>
        </div>

        {/* Popular / Top Leagues Quick-Jump Strip */}
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Popular Leagues
          </div>
          <div className="flex flex-wrap gap-2">
            {TOP_LEAGUE_NAMES.map((item) => (
              <Link
                key={`${item.country}-${item.league}`}
                href={`/stats/league/${encodeURIComponent(item.league)}?country=${encodeURIComponent(item.country)}`}
                className="px-3 py-1.5 rounded-lg bg-[#0f172a] border border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/10 text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
              >
                <span className="text-slate-400">{item.country}</span>
                <span className="text-slate-600">•</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Global Search */}
        <div ref={searchRef} className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            placeholder="Search countries, leagues or teams…"
            className="w-full pl-10 pr-10 py-3 bg-[#0f172a] border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(""); setSearchOpen(false); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search dropdown */}
          {searchOpen && (
            <div className="absolute z-50 w-full mt-1.5 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              {searchResults.map((r, i) => (
                <Link
                  key={i}
                  href={r.href}
                  onClick={() => { setSearch(""); setSearchOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 last:border-0"
                >
                  {r.type === "league"
                    ? <Trophy className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    : <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-200 truncate">{r.label}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {r.country}{r.type === "team" && r.league ? ` • ${r.league}` : ""}
                    </div>
                  </div>
                  <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase",
                    r.type === "league"
                      ? "text-blue-300 border-blue-500/30 bg-blue-500/10"
                      : "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                  )}>
                    {r.type}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Filter / Sort bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Betting DNA Market Filters */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5 flex-wrap">
            {([
              ["all", "All Leagues"],
              ["today", "Playing Today"],
              ["high_o25", "High O2.5 (55%+)"],
              ["high_btts", "BTTS Hotspots (55%+)"],
            ] as [MarketFilter, string][]).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setMarketFilter(val)}
                className={cn("px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all",
                  marketFilter === val ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
            {([["alpha", "A–Z"], ["leagues", "Most Leagues"], ["teams", "Most Teams"]] as [SortBy, string][]).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={cn("px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all",
                  sortBy === val ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {lbl}
              </button>
            ))}
          </div>

          {filterCountry && (
            <button onClick={() => setFilterCountry("")} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-slate-700 px-2.5 py-1.5 rounded-lg">
              <X className="w-3 h-3" />
              {filterCountry}
            </button>
          )}
        </div>

        {/* Countries Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedCountries.map((c) => {
              const totalTeamsInCountry = c.leagues.reduce((s, l) => s + (l.teamCount ?? 0), 0);
              const isExpanded = expandedCountry === c.country;
              return (
                <div
                  key={c.country}
                  className={cn(
                    "border rounded-xl overflow-hidden transition-all duration-200",
                    isExpanded ? "border-slate-600 bg-slate-800/30 shadow-lg" : "border-slate-800 bg-[#0f172a] hover:border-slate-700 hover:bg-slate-800/20"
                  )}
                >
                  {/* Country header */}
                  <button
                    onClick={() => setExpandedCountry(isExpanded ? null : c.country)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Globe2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 text-sm">{c.country}</span>
                          {(todayCountByCountry[c.country.toLowerCase()] || 0) > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                              {todayCountByCountry[c.country.toLowerCase()]} Today
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500">{c.leagues.length} {c.leagues.length === 1 ? "league" : "leagues"}</span>
                          <span className="text-[10px] text-slate-600">·</span>
                          <span className="text-[10px] text-slate-500">{totalTeamsInCountry} teams</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-500" />
                      : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {/* Leagues list */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                      {c.leagues.map((l) => (
                        <Link
                          key={l.league}
                          href={`/stats/league/${encodeURIComponent(l.league)}?country=${encodeURIComponent(c.country)}`}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Trophy className="w-3.5 h-3.5 text-blue-400/80 group-hover:text-blue-400 shrink-0 transition-colors" />
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">{l.league}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {/* League quick pills */}
                            {typeof l.overview?.btts_percent === 'number' && !isNaN(l.overview.btts_percent) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                                BTTS {l.overview.btts_percent}%
                              </span>
                            )}
                            {typeof l.overview?.over_25_percent === 'number' && !isNaN(l.overview.over_25_percent) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                                O2.5 {l.overview.over_25_percent}%
                              </span>
                            )}
                            {l.teamCount != null && (
                              <span className="text-[10px] text-slate-500">{l.teamCount} teams</span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {sortedCountries.length === 0 && (
              <div className="col-span-3 text-center py-16 text-slate-500">No countries found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
