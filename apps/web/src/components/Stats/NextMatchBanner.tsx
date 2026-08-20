// @ts-nocheck
"use client";

import React from "react";
import Link from "next/link";
import { Zap, Calendar, Clock, MapPin, ChevronRight } from "lucide-react";

interface NextMatchData {
  match_date: string;
  match_time: string;
  home_team: string;
  away_team: string;
  opponent: string;
  venue: "Home" | "Away";
  label: string;
  urgency: "today" | "tomorrow" | "soon" | "upcoming";
  league: string;
  country: string;
}

interface NextMatchBannerProps {
  data: NextMatchData | null;
  loading?: boolean;
  team: string;
}

const urgencyStyles = {
  today: {
    border: "border-emerald-500/50",
    bg: "bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  tomorrow: {
    border: "border-amber-500/50",
    bg: "bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    dot: "bg-amber-400",
  },
  soon: {
    border: "border-blue-500/50",
    bg: "bg-blue-500/10",
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    dot: "bg-blue-400",
  },
  upcoming: {
    border: "border-slate-600/50",
    bg: "bg-slate-800/50",
    badge: "bg-slate-700/60 text-slate-300 border border-slate-600/30",
    dot: "bg-slate-400",
  },
};

const venueBadge = {
  Home: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  Away: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function NextMatchBanner({ data, loading, team }: NextMatchBannerProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 mb-6 animate-pulse">
        <div className="h-4 w-32 bg-slate-800 rounded mb-3" />
        <div className="h-6 w-64 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const styles = urgencyStyles[data.urgency] || urgencyStyles.upcoming;
  const encodedMatch = encodeURIComponent(`${data.home_team} - ${data.away_team}`);
  const predictionHref = `/stats/league/${encodeURIComponent(data.league)}?country=${encodeURIComponent(data.country)}`;

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4 mb-6`}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`} />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            Next Match
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${venueBadge[data.venue]}`}>
            <MapPin className="w-2.5 h-2.5 inline mr-1" />
            {data.venue}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles.badge}`}>
            {data.label}
          </span>
        </div>
      </div>

      {/* Match details */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Home team */}
          <span className={`font-bold text-base sm:text-lg ${data.home_team.toLowerCase().trim() === team.toLowerCase().trim() ? "text-white" : "text-slate-300"}`}>
            {data.home_team}
          </span>
          <span className="text-slate-600 font-light text-sm">vs</span>
          {/* Away team */}
          <span className={`font-bold text-base sm:text-lg ${data.away_team.toLowerCase().trim() === team.toLowerCase().trim() ? "text-white" : "text-slate-300"}`}>
            {data.away_team}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(data.match_date)}
          </span>
          {data.match_time && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {data.match_time}
            </span>
          )}
          <Link
            href={predictionHref}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors text-xs"
          >
            League Table
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
