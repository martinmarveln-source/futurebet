"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Globe2, ChevronRight, Activity, Trophy } from "lucide-react";
import { cn } from "@/utils/matchUtils";

interface CountryData {
  country: string;
  leagues: string[];
}

export default function StatsHub() {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("/api/stats/countries");
        const json = await res.json();
        if (json.success) {
          setCountries(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch countries", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
              <Activity className="w-8 h-8 text-blue-500" />
              Stats Hub
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-2xl">
              Explore comprehensive football statistics, league analytics, and advanced team profiles for betting insights.
            </p>
          </div>
        </div>

        {/* Countries Explorer */}
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
            <Globe2 className="w-5 h-5 text-indigo-400" />
            Countries & Leagues
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {countries.map((c) => (
                <div 
                  key={c.country} 
                  className={cn(
                    "border border-slate-800 rounded-xl overflow-hidden transition-all duration-300",
                    expandedCountry === c.country ? "bg-slate-800/50 shadow-lg" : "bg-slate-900 hover:bg-slate-800/80 hover:border-slate-700"
                  )}
                >
                  <button
                    onClick={() => setExpandedCountry(expandedCountry === c.country ? null : c.country)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-medium text-slate-200">{c.country}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      {c.leagues.length} {c.leagues.length === 1 ? 'League' : 'Leagues'}
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform",
                        expandedCountry === c.country ? "rotate-90 text-blue-400" : ""
                      )} />
                    </span>
                  </button>
                  
                  {expandedCountry === c.country && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/50">
                      <div className="flex flex-col gap-2 mt-2">
                        {c.leagues.map(league => (
                          <Link
                            key={league}
                            href={`/stats/league/${encodeURIComponent(league)}?country=${encodeURIComponent(c.country)}`}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 hover:bg-blue-900/20 hover:text-blue-300 transition-colors border border-transparent hover:border-blue-900/50 group"
                          >
                            <Trophy className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                            <span className="text-sm font-medium">{league}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {countries.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500">
                  No stats data available right now.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
