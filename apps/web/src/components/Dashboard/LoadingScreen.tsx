// @ts-nocheck
import { Activity } from "lucide-react";

/* -----------------------------
   Small UI helper
------------------------------ */
function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export default function LoadingScreen({ darkMode }) {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-700",
        darkMode ? "bg-[#030614]" : "bg-slate-50"
      )}
    >
      {/* Ambient Cinematic Background Glows */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-[120px] opacity-40 animate-pulse duration-1000",
          darkMode ? "bg-blue-600/30" : "bg-blue-400/30"
        )}
      />
      <div
        className={cn(
          "absolute top-1/3 left-1/3 h-[300px] w-[300px] rounded-full blur-[90px] opacity-30 animate-pulse",
          darkMode ? "bg-emerald-600/20" : "bg-emerald-400/20"
        )}
        style={{ animationDuration: "3s" }}
      />

      {/* Grid Overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none",
          "bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]"
        )}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* High-Tech Dual Radar Spinner */}
        <div className="relative h-24 w-24 mb-8 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border-t-2 border-r-2 border-blue-500 animate-spin"
            style={{ animationDuration: "1.5s" }}
          />
          <div
            className="absolute inset-2 rounded-full border-b-2 border-l-2 border-emerald-400 animate-spin"
            style={{ animationDuration: "2s", animationDirection: "reverse" }}
          />
          <div
            className="absolute inset-5 rounded-full border-t-2 border-l-2 border-fuchsia-500 animate-spin"
            style={{ animationDuration: "3s" }}
          />

          {/* Core Icon */}
          <Activity
            className={cn(
              "h-6 w-6 animate-pulse",
              darkMode ? "text-blue-400" : "text-blue-600"
            )}
          />
        </div>

        {/* Telemetry Text */}
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.3em]",
              darkMode ? "text-emerald-400" : "text-emerald-600"
            )}
          >
            System Boot Sequence
          </span>
        </div>

        <h1
          className={cn(
            "text-2xl sm:text-3xl font-black uppercase tracking-widest",
            darkMode
              ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
              : "text-gray-900"
          )}
        >
          Initializing
        </h1>

        {/* Indeterminate Tech Progress Bar */}
        <div
          className={cn(
            "mt-8 w-64 h-1 rounded-full overflow-hidden relative",
            darkMode ? "bg-white/10" : "bg-gray-200"
          )}
        >
          <div
            className="absolute top-0 bottom-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[spin_2s_linear_infinite]"
            style={{
              animationName: "progressSweep",
              animationDuration: "1.5s",
              animationIterationCount: "infinite",
            }}
          />
        </div>

        <style jsx>{`
          @keyframes progressSweep {
            0% { left: -50%; }
            100% { left: 150%; }
          }
        `}</style>
      </div>
    </div>
  );
}