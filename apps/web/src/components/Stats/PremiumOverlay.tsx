import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

export default function PremiumOverlay({ message = "Unlock Premium Stats" }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-slate-950/60 backdrop-blur-[6px] rounded-xl border border-slate-800/50">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center transform transition-all hover:scale-105">
        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-amber-400" />
        </div>
        <h3 className="text-lg font-black text-white mb-2">{message}</h3>
        <p className="text-sm text-slate-400 mb-6">
          Upgrade to Premium to access AI betting verdicts, advanced market splits, xG intelligence, and global market insights.
        </p>
        <Link 
          href="/pricing" 
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-6 rounded-lg transition-colors w-full"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}
