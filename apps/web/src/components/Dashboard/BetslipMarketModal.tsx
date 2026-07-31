// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Target } from "lucide-react";

// Small local generic fallback if your utils/matchUtils is missing cn()
function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export default function BetslipMarketModal({
  open,
  darkMode,
  matchName,
  initialMarket,
  initialOption,
  onClose,
  onConfirm,
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
    { key: "Over 4.5", label: "Over 4.5", options: ["Yes", "No"] },
    { key: "Correct Score", label: "Correct Score", options: [] },
  ];

  const [mounted, setMounted] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState("1X2");
  const [selectedOption, setSelectedOption] = useState("");
  const [correctScore, setCorrectScore] = useState("");

  // === Hydration Sync ===
  useEffect(() => {
    setMounted(true);
  }, []);

  // === The "Anti-Jump" Body Scroll Lock ===
  useEffect(() => {
    if (!open) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [open]);

  // === Memory Sync ===
  useEffect(() => {
    if (open) {
      setSelectedMarket(initialMarket || "1X2");
      setSelectedOption(initialOption || "");
      if (initialMarket === "Correct Score") {
        setCorrectScore(initialOption || "");
      } else {
        setCorrectScore("");
      }
    }
  }, [open, initialMarket, initialOption]);

  const currentMarket = useMemo(
    () => MARKETS.find((m) => m.key === selectedMarket),
    [selectedMarket]
  );

  const isCorrectScore = selectedMarket === "Correct Score";

  const canConfirm = useMemo(() => {
    if (isCorrectScore) return correctScore.trim().length > 0;
    return selectedOption.trim().length > 0;
  }, [isCorrectScore, selectedOption, correctScore]);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      selectedMarket,
      selectedOption: isCorrectScore ? correctScore.trim() : selectedOption,
    });
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      {/* Background Overlay - Guarded */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Container: Frosted Glass Shell */}
      <div
        className={cn(
          "relative w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300",
          darkMode
            ? "bg-gray-950/80 border-white/10 backdrop-blur-2xl text-white shadow-black/50"
            : "bg-white/90 border-gray-200 backdrop-blur-2xl text-gray-900"
        )}
      >
        {/* Ambient Top Glow */}
        <div
          className={cn(
            "absolute top-0 left-0 w-full h-1",
            darkMode
              ? "bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent"
              : "bg-gradient-to-r from-blue-400 via-emerald-400 to-transparent"
          )}
        />

        {/* Header */}
        <div
          className={cn(
            "flex items-start justify-between gap-4 p-5 sm:p-6 border-b shrink-0",
            darkMode
              ? "border-white/10 bg-white/[0.02]"
              : "border-gray-200 bg-gray-50/50"
          )}
        >
          <div className="min-w-0">
            <div
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5",
                darkMode ? "text-blue-400" : "text-blue-600"
              )}
            >
              <Target size={12} /> Market Routing
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight truncate">
              {matchName || "Select Match Market"}
            </h3>
          </div>

          <button
            type="button" // 🔥 Explicit type
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "p-2.5 rounded-full border transition-all active:scale-95 shrink-0",
              darkMode
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                : "border-gray-200 bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            )}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Market Selection */}
          <div>
            <div
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              1. Select Market{" "}
              <div
                className={cn(
                  "h-px flex-1",
                  darkMode ? "bg-white/5" : "bg-gray-200"
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {MARKETS.map((m) => {
                const active = selectedMarket === m.key;
                return (
                  <button
                    type="button" // 🔥 Explicit type
                    key={m.key}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedMarket(m.key);
                      // Only clear option if switching to a new market
                      if (selectedMarket !== m.key) {
                        setSelectedOption("");
                        setCorrectScore("");
                      }
                    }}
                    className={cn(
                      "relative text-xs sm:text-sm font-extrabold px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] text-left overflow-hidden",
                      active
                        ? darkMode
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                          : "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm"
                        : darkMode
                        ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-300"
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <span className="relative z-10">{m.label}</span>
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option Selection */}
          <div
            className={cn(
              "pt-2 animate-in fade-in duration-300",
              !selectedMarket && "opacity-50 pointer-events-none"
            )}
          >
            <div
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              2. Select Option{" "}
              <div
                className={cn(
                  "h-px flex-1",
                  darkMode ? "bg-white/5" : "bg-gray-200"
                )}
              />
            </div>

            {isCorrectScore ? (
              <input
                value={correctScore}
                onChange={(e) => setCorrectScore(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent "Enter" from triggering a background form submit
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                placeholder="e.g. 1-0 or 2-2"
                className={cn(
                  "w-full px-5 py-4 rounded-2xl border text-sm sm:text-base font-black outline-none transition-all text-center tracking-widest",
                  darkMode
                    ? "bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:shadow-sm"
                )}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {(currentMarket?.options || []).map((opt) => {
                  const active = selectedOption === opt;

                  // Maintain "Yes" and "No" for calculation, map visually
                  const isGoals =
                    selectedMarket.includes("Over") ||
                    selectedMarket.includes("Under");
                  const displayOpt = isGoals
                    ? opt === "Yes"
                      ? "Over"
                      : "Under"
                    : opt;

                  return (
                    <button
                      type="button" // 🔥 Explicit type
                      key={opt}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedOption(opt);
                      }}
                      className={cn(
                        "relative text-xs sm:text-sm font-extrabold px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98]",
                        active
                          ? darkMode
                            ? "border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                            : "border-blue-400 bg-blue-50 text-blue-700 shadow-sm"
                          : darkMode
                          ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-300"
                          : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      {displayOpt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={cn(
            "p-5 sm:p-6 border-t flex items-center justify-between gap-3 shrink-0",
            darkMode
              ? "border-white/10 bg-gray-950/90"
              : "border-gray-200 bg-white/95"
          )}
        >
          <div
            className={cn(
              "hidden sm:flex text-[10px] font-black uppercase tracking-widest",
              darkMode ? "text-gray-500" : "text-gray-400"
            )}
          >
            {canConfirm ? "Ready to route" : "Awaiting input"}
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <button
              type="button" // 🔥 Explicit type
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className={cn(
                "flex-1 sm:flex-none px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all active:scale-95",
                darkMode
                  ? "border-white/10 bg-transparent hover:bg-white/5 text-gray-300"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
              )}
            >
              Cancel
            </button>

            <button
              type="button" // 🔥 Explicit type
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={!canConfirm}
              className={cn(
                "flex-[2] sm:flex-none relative overflow-hidden px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] group flex items-center justify-center gap-2",
                canConfirm
                  ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] border border-transparent"
                  : "bg-gray-500/50 border border-transparent opacity-60 cursor-not-allowed"
              )}
            >
              {canConfirm && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[progressSweep_1.5s_infinite_linear]" />
              )}
              {canConfirm ? (
                <>
                  <Sparkles size={14} /> Update Slip
                </>
              ) : (
                "Select Option"
              )}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes progressSweep {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>,
    document.body
  );
}