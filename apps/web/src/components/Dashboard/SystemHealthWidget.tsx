"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Activity } from "lucide-react";

export default function SystemHealthWidget({ darkMode }: { darkMode: boolean }) {
  const [staleLeagues, setStaleLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health/stale-leagues')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.staleLeagues) {
          setStaleLeagues(data.staleLeagues);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const hasStale = staleLeagues.length > 0;

  return (
    <div className="flex flex-col justify-center min-w-[100px] border-l border-slate-200 dark:border-white/10 pl-4 sm:pl-8">
      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
        Stats Health
      </div>
      <div className="flex items-center gap-3">
        <div
          className={\`h-10 w-10 rounded-2xl flex items-center justify-center shadow-inner \${
            hasStale 
              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" 
              : darkMode 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-emerald-50 text-emerald-600 border border-emerald-200"
          }\`}
        >
          {hasStale ? <AlertCircle size={20} className="animate-pulse" /> : <CheckCircle2 size={20} />}
        </div>
        <div className="flex flex-col">
          <span className={\`text-lg font-black leading-none tracking-tight \${darkMode ? "text-white" : "text-slate-900"}\`}>
            {hasStale ? \`\${staleLeagues.length} Outdated\` : "100% Synced"}
          </span>
          <span className={\`text-[11px] font-bold mt-1 \${hasStale ? "text-rose-500" : "text-slate-500"}\`}>
            {hasStale ? "Stats > 3 days old" : "All leagues up to date"}
          </span>
        </div>
      </div>

      {hasStale && (
        <div className="mt-3 max-w-[250px]">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Affected Leagues:</div>
          <div className={\`text-[11px] font-medium max-h-[60px] overflow-y-auto \${darkMode ? "text-slate-400" : "text-slate-600"}\`}>
            {staleLeagues.map((l, i) => (
              <div key={i} className="truncate" title={\`\${l.country} - \${l.league}\`}>
                • {l.country}: {l.league}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
