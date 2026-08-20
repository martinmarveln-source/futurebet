// @ts-nocheck
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Trophy, ChevronLeft, Activity, Shield, Search,
  ChevronUp, ChevronDown, ChevronsUpDown, Zap,
} from "lucide-react";

const cn = (...c: any[]) => c.filter(Boolean).join(" ");

function parse(v: any): number {
  const n = parseFloat(String(v ?? "0").replace(/%/, ""));
  return isNaN(n) ? 0 : n;
}

function heatCell(val: number): string {
  if (!val && val !== 0) return "";
  if (val >= 70) return "text-emerald-400 font-bold";
  if (val >= 55) return "text-lime-400 font-semibold";
  if (val >= 40) return "text-amber-400";
  return "text-red-400";
}

function NextMatchPill({ data }: { data?: { label: string; urgency: string } | null }) {
  if (!data) return <span className="text-slate-600 text-xs">—</span>;
  const styles: Record<string, string> = {
    today: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    tomorrow: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    soon: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    upcoming: "bg-slate-700/60 text-slate-300 border-slate-600/30",
  };
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", styles[data.urgency] ?? styles.upcoming)}>
      {data.label}
    </span>
  );
}

type View = "standard" | "goals" | "markets" | "homeaway";
type SortDir = "asc" | "desc" | null;

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30 inline ml-0.5" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3 h-3 inline ml-0.5 text-blue-400" />
    : <ChevronDown className="w-3 h-3 inline ml-0.5 text-blue-400" />;
}

function Th({
  children, field, sortField, sortDir, onSort, center = true,
}: {
  children: React.ReactNode; field: string; sortField: string; sortDir: SortDir;
  onSort: (f: string) => void; center?: boolean;
}) {
  return (
    <th
      className={cn("p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-nowrap", center && "text-center")}
      onClick={() => onSort(field)}
    >
      {children}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </th>
  );
}

function ZoneBorder({ pos, total }: { pos: number; total: number }) {
  if (pos <= 4) return "border-l-2 border-l-emerald-500";
  if (pos >= total - 2) return "border-l-2 border-l-red-500";
  return "border-l-2 border-l-transparent";
}

export default function LeaguePageInner({ params }: { params: Promise<{ leagueId: string }> }) {
  const [leagueId, setLeagueId] = useState<string>("");
  const searchParams = useSearchParams();
  const country = searchParams.get("country") || "";

  const [overview, setOverview] = useState<any>(null);
  const [table, setTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextMatches, setNextMatches] = useState<Record<string, any>>({});

  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("standard");
  const [sortField, setSortField] = useState("sn");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => { params.then((p) => setLeagueId(decodeURIComponent(p.leagueId))); }, [params]);

  useEffect(() => {
    if (!leagueId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ovRes, tableRes] = await Promise.all([
          fetch(`/api/stats/league/${encodeURIComponent(leagueId)}`),
          fetch(`/api/league-table?country=${encodeURIComponent(country)}&league=${encodeURIComponent(leagueId)}`),
        ]);
        const ovJson = await ovRes.json();
        const tableJson = await tableRes.json();
        if (ovJson.success) setOverview(ovJson.overview);
        if (tableJson.success) setTable(tableJson.table);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [leagueId, country]);

  useEffect(() => {
    if (!leagueId) return;
    const fetchNextMatches = async () => {
      try {
        const res = await fetch(`/api/stats/next-match?league=${encodeURIComponent(leagueId)}`);
        const json = await res.json();
        if (json.success && json.data) setNextMatches(json.data);
      } catch (_) {}
    };
    fetchNextMatches();
  }, [leagueId]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortField("sn");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const filteredTable = useMemo(() => {
    let rows = table.filter((r) =>
      !search || r.team?.toLowerCase().includes(search.toLowerCase())
    );
    if (sortField && sortDir) {
      rows = [...rows].sort((a, b) => {
        const av = parse(a[sortField] ?? a.market_stats?.[sortField]);
        const bv = parse(b[sortField] ?? b.market_stats?.[sortField]);
        return sortDir === "asc" ? av - bv : bv - av;
      });
    }
    return rows;
  }, [table, search, sortField, sortDir]);

  const overviewCards = [
    { label: "Goals/Game", value: overview?.goals_per_game, color: "text-white" },
    { label: "O1.5 %", value: overview?.over_15_percent != null ? `${overview.over_15_percent}%` : null, color: "text-emerald-400" },
    { label: "O2.5 %", value: overview?.over_25_percent != null ? `${overview.over_25_percent}%` : null, color: "text-blue-400" },
    { label: "BTTS %", value: overview?.btts_percent != null ? `${overview.btts_percent}%` : null, color: "text-amber-400" },
    { label: "CS %", value: overview?.clean_sheet_percent != null ? `${overview.clean_sheet_percent}%` : null, color: "text-purple-400" },
    { label: "FTS %", value: overview?.fts_percent != null ? `${overview.fts_percent}%` : null, color: "text-red-400" },
    { label: "Avg xG", value: overview?.avg_xg, color: "text-indigo-400" },
    { label: "Home Win %", value: overview?.home_win_percent != null ? `${overview.home_win_percent}%` : null, color: "text-teal-400" },
  ];

  const VIEW_LABELS: Record<View, string> = {
    standard: "Standard",
    goals: "Goals",
    markets: "Markets",
    homeaway: "Home/Away",
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        {/* Back */}
        <Link href="/stats" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Stats Hub
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 uppercase tracking-widest">
              <span>{country}</span>
              {country && <span>•</span>}
              <span>2026/27</span>
            </div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-white">
              <Trophy className="w-8 h-8 text-yellow-500" />
              {leagueId}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Overview cards */}
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {overviewCards.map((c) => (
                  c.value != null && (
                    <div key={c.label} className="bg-[#0f172a] rounded-xl p-3 border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">{c.label}</div>
                      <div className={cn("text-lg font-black", c.color)}>{c.value}</div>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Table card */}
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">

              {/* Table toolbar */}
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  League Table & Analytics
                  <span className="text-xs text-slate-500 font-normal ml-1">{filteredTable.length} teams</span>
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search team…"
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 w-40"
                    />
                  </div>
                  {/* View toggle */}
                  <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
                    {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all",
                          view === v ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {VIEW_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-500">
                      <th className="p-3 text-xs font-semibold uppercase tracking-wider w-10">#</th>
                      <th className="p-3 text-xs font-semibold uppercase tracking-wider">Team</th>

                      {view === "standard" && (
                        <>
                          <Th field="gp" sortField={sortField} sortDir={sortDir} onSort={handleSort}>PL</Th>
                          <Th field="win" sortField={sortField} sortDir={sortDir} onSort={handleSort}>W</Th>
                          <Th field="draw" sortField={sortField} sortDir={sortDir} onSort={handleSort}>D</Th>
                          <Th field="lost" sortField={sortField} sortDir={sortDir} onSort={handleSort}>L</Th>
                          <Th field="gd" sortField={sortField} sortDir={sortDir} onSort={handleSort}>GD</Th>
                          <Th field="pts" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Pts</Th>
                          <Th field="ppg" sortField={sortField} sortDir={sortDir} onSort={handleSort}>PPG</Th>
                          <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">
                            <span className="flex items-center gap-1 justify-center"><Zap className="w-3 h-3" /> Next</span>
                          </th>
                        </>
                      )}

                      {view === "goals" && (
                        <>
                          <Th field="gs" sortField={sortField} sortDir={sortDir} onSort={handleSort}>GS</Th>
                          <Th field="gc" sortField={sortField} sortDir={sortDir} onSort={handleSort}>GC</Th>
                          <Th field="gd" sortField={sortField} sortDir={sortDir} onSort={handleSort}>GD</Th>
                          <Th field="XG_ALL" sortField={sortField} sortDir={sortDir} onSort={handleSort}>xG</Th>
                          <Th field="XGA_ALL" sortField={sortField} sortDir={sortDir} onSort={handleSort}>xGA</Th>
                        </>
                      )}

                      {view === "markets" && (
                        <>
                          <Th field="O15_ALL" sortField={sortField} sortDir={sortDir} onSort={handleSort}>O1.5</Th>
                          <Th field="O25_ALL" sortField={sortField} sortDir={sortDir} onSort={handleSort}>O2.5</Th>
                          <Th field="O35_ALL" sortField={sortField} sortDir={sortDir} onSort={handleSort}>O3.5</Th>
                          <Th field="BTTS_ALL" sortField={sortField} sortDir={sortDir} onSort={handleSort}>BTTS</Th>
                          <Th field="CS_ALL" sortField={sortField} sortDir={sortDir} onSort={handleSort}>CS</Th>
                          <Th field="FTS_ALL" sortField={sortField} sortDir={sortDir} onSort={handleSort}>FTS</Th>
                          <Th field="Home_Win" sortField={sortField} sortDir={sortDir} onSort={handleSort}>HW%</Th>
                          <Th field="Away_Win" sortField={sortField} sortDir={sortDir} onSort={handleSort}>AW%</Th>
                        </>
                      )}

                      {view === "homeaway" && (
                        <>
                          <Th field="GP_HOME" sortField={sortField} sortDir={sortDir} onSort={handleSort}>H-GP</Th>
                          <Th field="Home_Win" sortField={sortField} sortDir={sortDir} onSort={handleSort}>H-W%</Th>
                          <Th field="HOME_DRAW" sortField={sortField} sortDir={sortDir} onSort={handleSort}>H-D%</Th>
                          <Th field="HOME_LOST" sortField={sortField} sortDir={sortDir} onSort={handleSort}>H-L%</Th>
                          <Th field="GP_AWAY" sortField={sortField} sortDir={sortDir} onSort={handleSort}>A-GP</Th>
                          <Th field="Away_Win" sortField={sortField} sortDir={sortDir} onSort={handleSort}>A-W%</Th>
                          <Th field="AWAY_DRAW" sortField={sortField} sortDir={sortDir} onSort={handleSort}>A-D%</Th>
                          <Th field="AWAY_LOST" sortField={sortField} sortDir={sortDir} onSort={handleSort}>A-L%</Th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/40">
                    {filteredTable.map((row, idx) => {
                      const pos = idx + 1;
                      const total = filteredTable.length;
                      const zoneCls = pos <= 4 ? "border-l-2 border-l-emerald-500" : pos >= total - 2 ? "border-l-2 border-l-red-500" : "border-l-2 border-l-transparent";
                      const ms = row.market_stats ?? {};
                      const nm = nextMatches[row.team?.toLowerCase().trim()];

                      return (
                        <tr key={row.id ?? idx} className={cn("hover:bg-slate-800/30 transition-colors group", zoneCls)}>
                          <td className="p-3 text-slate-500 text-xs font-semibold">{row.sn ?? pos}</td>
                          <td className="p-3">
                            <Link
                              href={`/stats/team/${encodeURIComponent(row.team)}?league=${encodeURIComponent(leagueId)}&country=${encodeURIComponent(country)}`}
                              className="text-white hover:text-blue-400 font-semibold transition-colors flex items-center gap-1.5 text-sm"
                            >
                              <Shield className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                              {row.team}
                            </Link>
                          </td>

                          {view === "standard" && (
                            <>
                              <td className="p-3 text-center text-slate-300">{row.gp ?? 0}</td>
                              <td className="p-3 text-center text-emerald-400 font-semibold">{row.win ?? 0}</td>
                              <td className="p-3 text-center text-slate-400">{row.draw ?? 0}</td>
                              <td className="p-3 text-center text-red-400">{row.lost ?? 0}</td>
                              <td className="p-3 text-center text-slate-300">{row.gd ?? 0}</td>
                              <td className="p-3 text-center font-black text-white">{row.pts ?? 0}</td>
                              <td className="p-3 text-center">
                                <span className={cn("text-xs font-bold", parse(row.ppg) >= 2 ? "text-emerald-400" : parse(row.ppg) >= 1.5 ? "text-amber-400" : "text-red-400")}>
                                  {row.ppg ?? "—"}
                                </span>
                              </td>
                              <td className="p-3 text-center"><NextMatchPill data={nm} /></td>
                            </>
                          )}

                          {view === "goals" && (
                            <>
                              <td className="p-3 text-center text-emerald-400 font-semibold">{row.gs ?? 0}</td>
                              <td className="p-3 text-center text-red-400">{row.gc ?? 0}</td>
                              <td className="p-3 text-center">{row.gd ?? 0}</td>
                              <td className="p-3 text-center text-indigo-400">{ms.XG_ALL ?? "—"}</td>
                              <td className="p-3 text-center text-orange-400">{ms.XGA_ALL ?? "—"}</td>
                            </>
                          )}

                          {view === "markets" && (
                            <>
                              {[
                                ms.O15_ALL, ms.O25_ALL, ms.O35_ALL,
                                ms.BTTS_ALL, ms.CS_ALL, ms.FTS_ALL,
                                ms.Home_Win, ms.Away_Win,
                              ].map((val, i) => (
                                <td key={i} className={cn("p-3 text-center text-xs", val != null ? heatCell(parse(val)) : "text-slate-600")}>
                                  {val != null ? `${Math.round(parse(val))}%` : "—"}
                                </td>
                              ))}
                            </>
                          )}

                          {view === "homeaway" && (
                            <>
                              <td className="p-3 text-center text-slate-300">{ms.GP_HOME ?? "—"}</td>
                              <td className={cn("p-3 text-center text-xs", ms.Home_Win != null ? heatCell(parse(ms.Home_Win)) : "text-slate-600")}>
                                {ms.Home_Win != null ? `${Math.round(parse(ms.Home_Win))}%` : "—"}
                              </td>
                              <td className="p-3 text-center text-amber-400 text-xs">{ms.HOME_DRAW != null ? `${Math.round(parse(ms.HOME_DRAW))}%` : "—"}</td>
                              <td className="p-3 text-center text-red-400 text-xs">{ms.HOME_LOST != null ? `${Math.round(parse(ms.HOME_LOST))}%` : "—"}</td>
                              <td className="p-3 text-center text-slate-300">{ms.GP_AWAY ?? "—"}</td>
                              <td className={cn("p-3 text-center text-xs", ms.Away_Win != null ? heatCell(parse(ms.Away_Win)) : "text-slate-600")}>
                                {ms.Away_Win != null ? `${Math.round(parse(ms.Away_Win))}%` : "—"}
                              </td>
                              <td className="p-3 text-center text-amber-400 text-xs">{ms.AWAY_DRAW != null ? `${Math.round(parse(ms.AWAY_DRAW))}%` : "—"}</td>
                              <td className="p-3 text-center text-red-400 text-xs">{ms.AWAY_LOST != null ? `${Math.round(parse(ms.AWAY_LOST))}%` : "—"}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}

                    {filteredTable.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-10 text-center text-slate-500 text-sm">
                          {search ? `No teams matching "${search}"` : "No table data available."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Top 4 zone</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Relegation zone</span>
                {view === "markets" && (
                  <>
                    <span className="text-emerald-400 font-semibold">≥70%</span>
                    <span className="text-amber-400 font-semibold">40–70%</span>
                    <span className="text-red-400 font-semibold">&lt;40%</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
