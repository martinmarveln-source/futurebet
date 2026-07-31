// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Lock, RefreshCw, Sparkles, Database } from "lucide-react";
import MatchCard from "./MatchCard";
import useUser from "@/utils/useUser";
import useUserPermissions from "@/hooks/useUserPermissions";

/* -----------------------------
   Small UI helper
------------------------------ */
function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const UPGRADE_URL = "https://selar.com/8x155u0715";
const API_EXPORT_URL = "/api/matches";

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

function toDecimal(value) {
  const n = toNumber(value);
  return n > 1 ? n / 100 : n;
}

function kickoffTs(match) {
  const iso = String(match?.date || match?.isoDate || "").trim();
  const t = String(match?.time || "").trim();
  if (!iso) return 0;

  const time = t ? (t.length === 5 ? `${t}:00` : t) : "00:00:00";
  const d = new Date(`${iso}T${time}`);
  const ts = d.getTime();

  return Number.isFinite(ts) ? ts : 0;
}

function normalizeGuide(match) {
  return String(match?.GUIDE || match?.pick || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function getMarketBiasFromGuide(match) {
  const guide = normalizeGuide(match);

  if (["HOME WIN", "DRAW", "AWAY WIN"].includes(guide)) return "1X2";
  if (guide === "GG" || guide === "NG") return "BTTS";
  if (guide === "OV.2.5" || guide === "UN2.5") return "O/U 2.5";

  return "Unknown";
}

function getBiasStrength(match) {
  const guide = normalizeGuide(match);

  if (["HOME WIN", "DRAW", "AWAY WIN"].includes(guide)) {
    const values = [
      toDecimal(match?.homeWin),
      toDecimal(match?.draw),
      toDecimal(match?.awayWin),
    ].sort((a, b) => b - a);

    if (values.length < 2 || values[0] === 0) return 0;
    return +(((values[0] - values[1]) / values[0]) * 100).toFixed(1);
  }

  if (guide === "GG" || guide === "NG") {
    const yes = toDecimal(match?.gg);
    const no = toDecimal(match?.ng);
    if (!yes && !no) return 0;

    const highest = Math.max(yes, no);
    const second = Math.min(yes, no);
    if (!highest) return 0;

    return +(((highest - second) / highest) * 100).toFixed(1);
  }

  if (guide === "OV.2.5" || guide === "UN2.5") {
    const over = toDecimal(match?.ov25);
    const under = toDecimal(match?.un25);
    if (!over && !under) return 0;

    const highest = Math.max(over, under);
    const second = Math.min(over, under);
    if (!highest) return 0;

    return +(((highest - second) / highest) * 100).toFixed(1);
  }

  return 0;
}

function getConfidenceTier(rating) {
  const r = toDecimal(rating);
  if (r >= 0.8) return "A+";
  if (r >= 0.7) return "A";
  if (r >= 0.6) return "B+";
  if (r >= 0.5) return "B";
  return "C";
}

function getConvictionTier(match) {
  const strength = getBiasStrength(match);

  if (strength >= 80) return "Ultra";
  if (strength >= 60) return "Strong";
  if (strength >= 40) return "Moderate";
  if (strength >= 20) return "Weak";
  return "Low";
}

function getRiskLevel(match) {
  const bias = getMarketBiasFromGuide(match);
  let max = 0;

  if (bias === "1X2") {
    max = Math.max(
      toDecimal(match?.homeWin),
      toDecimal(match?.draw),
      toDecimal(match?.awayWin)
    );
  } else if (bias === "BTTS") {
    max = Math.max(toDecimal(match?.gg), toDecimal(match?.ng));
  } else if (bias === "O/U 2.5") {
    max = Math.max(toDecimal(match?.ov25), toDecimal(match?.un25));
  }

  if (max >= 0.65) return "Low";
  if (max >= 0.55) return "Medium";
  return "High";
}

function parseFilenameFromDisposition(disposition) {
  if (!disposition) return null;
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || null;
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `futurebet-export-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function deriveTier({ role, isPro, isPremium, isSilver }) {
  const safeRole = String(role || "")
    .toLowerCase()
    .trim();

  if (safeRole === "admin") return "admin";
  if (isPro || safeRole === "pro") return "pro";
  if (isPremium || safeRole === "premium") return "premium";
  if (isSilver || safeRole === "silver") return "silver";
  return "free";
}

function buildFallbackAccess(tier) {
  const unlimited = {
    allowed: true,
    unlimited: true,
    used: 0,
    limit: null,
    remaining: null,
  };
  const limited30 = {
    allowed: true,
    unlimited: false,
    used: 0,
    limit: 30,
    remaining: 30,
  };
  const none = {
    allowed: false,
    unlimited: false,
    used: 0,
    limit: 0,
    remaining: 0,
  };

  if (tier === "admin" || tier === "pro") {
    return {
      tier,
      basic: unlimited,
      pro: unlimited,
    };
  }

  if (tier === "premium") {
    return {
      tier,
      basic: limited30,
      pro: limited30,
    };
  }

  if (tier === "silver") {
    return {
      tier,
      basic: limited30,
      pro: none,
    };
  }

  return {
    tier: "free",
    basic: none,
    pro: none,
  };
}

function formatAccessText(access, lockedText = "Upgrade to unlock") {
  if (!access?.allowed) return lockedText;
  if (access?.unlimited) return "Unlimited downloads";
  if ((access?.remaining ?? 0) <= 0) {
    return `Monthly limit reached (${access?.used || 0}/${access?.limit || 0})`;
  }
  return `${access?.remaining}/${access?.limit} left this month`;
}

function mergeAccessUsage(prevAccess, type, headers) {
  if (!prevAccess) return prevAccess;

  const usedRaw = headers.get("X-Export-Used");
  const limitRaw = headers.get("X-Export-Limit");
  const remainingRaw = headers.get("X-Export-Remaining");

  const used = usedRaw === null ? prevAccess?.[type]?.used : Number(usedRaw);
  const unlimited = limitRaw === "unlimited";
  const limit =
    limitRaw === null || limitRaw === "unlimited"
      ? prevAccess?.[type]?.limit
      : Number(limitRaw);
  const remaining =
    remainingRaw === null || remainingRaw === "unlimited"
      ? prevAccess?.[type]?.remaining
      : Number(remainingRaw);

  return {
    ...prevAccess,
    [type]: {
      ...prevAccess[type],
      used: Number.isFinite(used) ? used : prevAccess?.[type]?.used ?? 0,
      limit: unlimited
        ? null
        : Number.isFinite(limit)
        ? limit
        : prevAccess?.[type]?.limit ?? 0,
      remaining: unlimited
        ? null
        : Number.isFinite(remaining)
        ? remaining
        : prevAccess?.[type]?.remaining ?? 0,
      unlimited,
    },
  };
}

export default function MatchesList({
  matchesLoading,
  matchesError,
  filteredMatches,
  matchesData,
  selectedDate,
  darkMode,
  hasKickoffPassed,
  sortBy,
  isPro,
}) {
  const [visibleMatches, setVisibleMatches] = useState(12);
  const [exportingType, setExportingType] = useState(null);
  const [exportFeedback, setExportFeedback] = useState({ type: "", text: "" });

  const { data: user } = useUser();
  const role = String(user?.user_role ?? user?.role ?? "")
    .toLowerCase()
    .trim();
  const { isPremium, isSilver } = useUserPermissions();

  const hookTier = deriveTier({ role, isPro, isPremium, isSilver });

  const [serverAccess, setServerAccess] = useState(
    matchesData?.exportAccess || buildFallbackAccess(hookTier)
  );

  useEffect(() => {
    setServerAccess(matchesData?.exportAccess || buildFallbackAccess(hookTier));
  }, [matchesData?.exportAccess, hookTier]);

  useEffect(() => {
    setVisibleMatches(12);
  }, [filteredMatches, selectedDate, sortBy]);

  const effectiveSort = !isPro ? "date" : sortBy || "date";

  const sortedMatches = useMemo(() => {
    const list = Array.isArray(filteredMatches) ? [...filteredMatches] : [];

    const byProbDesc = (key) => (a, b) =>
      toNumber(b?.[key]) - toNumber(a?.[key]);

    const byLeagueAsc = (a, b) =>
      String(a?.fullLeague || a?.league || "").localeCompare(
        String(b?.fullLeague || b?.league || ""),
        undefined,
        { sensitivity: "base" }
      );

    const byDateAsc = (a, b) => kickoffTs(a) - kickoffTs(b);

    const byCSDesc = (a, b) => {
      const aCS =
        toNumber(a?.modelCSPercent) || toNumber(a?.scorelineCSPercent);
      const bCS =
        toNumber(b?.modelCSPercent) || toNumber(b?.scorelineCSPercent);
      return bCS - aCS;
    };

    switch (effectiveSort) {
      case "league":
        list.sort(byLeagueAsc);
        break;
      case "homeWin":
        list.sort(byProbDesc("homeWin"));
        break;
      case "draw":
        list.sort(byProbDesc("draw"));
        break;
      case "awayWin":
        list.sort(byProbDesc("awayWin"));
        break;
      case "gg":
        list.sort(byProbDesc("gg"));
        break;
      case "ov25":
        list.sort(byProbDesc("ov25"));
        break;
      case "cs":
        list.sort(byCSDesc);
        break;
      case "date":
      default:
        list.sort(byDateAsc);
        break;
    }

    return list;
  }, [filteredMatches, effectiveSort]);

  const access = serverAccess || buildFallbackAccess(hookTier);
  const basicAccess = access?.basic || buildFallbackAccess(hookTier).basic;
  const proAccess = access?.pro || buildFallbackAccess(hookTier).pro;

  const handleUpgrade = useCallback(() => {
    window.open(UPGRADE_URL, "_blank", "noopener,noreferrer");
  }, []);

  const handleExport = useCallback(
    async (type) => {
      const selectedAccess = type === "basic" ? basicAccess : proAccess;

      if (!selectedAccess?.allowed) {
        handleUpgrade();
        return;
      }

      if (!selectedAccess?.unlimited && (selectedAccess?.remaining ?? 0) <= 0) {
        setExportFeedback({
          type: "error",
          text: `You have reached your monthly ${
            type === "basic" ? "Basic CSV" : "Premium Analytics CSV"
          } limit.`,
        });
        return;
      }

      if (!sortedMatches.length) {
        setExportFeedback({
          type: "error",
          text: "No matches available to export.",
        });
        return;
      }

      try {
        setExportingType(type);
        setExportFeedback({ type: "", text: "" });

        const response = await fetch(API_EXPORT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            matches: sortedMatches,
            selectedDate: selectedDate
              ? new Date(selectedDate).toISOString()
              : null,
            sortMode: effectiveSort,
          }),
        });

        if (!response.ok) {
          let message = "Export failed. Please try again.";
          try {
            const data = await response.json();
            if (data?.message) message = data.message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition");
        const filename =
          parseFilenameFromDisposition(disposition) ||
          (type === "basic"
            ? `futurebet-basic-${Date.now()}.csv`
            : `futurebet-premium-analytics-${Date.now()}.csv`);

        triggerBlobDownload(blob, filename);

        setServerAccess((prev) =>
          mergeAccessUsage(prev, type, response.headers)
        );

        setExportFeedback({
          type: "success",
          text:
            type === "basic"
              ? "Basic CSV downloaded successfully."
              : "Premium Analytics CSV downloaded successfully.",
        });
      } catch (error) {
        setExportFeedback({
          type: "error",
          text: error?.message || "Export failed.",
        });
      } finally {
        setExportingType(null);
      }
    },
    [
      basicAccess,
      proAccess,
      sortedMatches,
      selectedDate,
      effectiveSort,
      handleUpgrade,
    ]
  );

  const renderExportButton = ({
    type,
    accessConfig,
    allowedLabel,
    lockedLabel,
    icon,
    subtitle,
  }) => {
    const isLocked = !accessConfig?.allowed;
    const isExhausted =
      accessConfig?.allowed &&
      !accessConfig?.unlimited &&
      (accessConfig?.remaining ?? 0) <= 0;
    const isLoading = exportingType === type;
    const buttonLabel = type === "basic" ? "Basic CSV" : "Premium Analytics";
    const isBasic = type === "basic";

    const activeStyle = isBasic
      ? darkMode
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm"
      : darkMode
      ? "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
      : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm";

    const lockedStyle = darkMode
      ? "border-white/5 bg-gray-900/50 text-gray-500 cursor-not-allowed"
      : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed";

    if (isLocked) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleUpgrade();
          }}
          className={cn(
            "relative flex flex-col items-start px-5 py-3.5 rounded-2xl border transition-all min-w-[240px] flex-1",
            lockedStyle
          )}
          title={lockedLabel}
        >
          <span className="flex items-center gap-2 text-sm font-black tracking-tight mb-1">
            <Lock className="h-4 w-4 opacity-70" />
            {buttonLabel}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
            {lockedLabel}
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          handleExport(type);
        }}
        disabled={!sortedMatches.length || isLoading || isExhausted}
        className={cn(
          "relative overflow-hidden flex flex-col items-start px-5 py-3.5 rounded-2xl border transition-all active:scale-[0.99] min-w-[240px] flex-1 group",
          isExhausted ? lockedStyle : activeStyle,
          (!sortedMatches.length || isLoading || isExhausted) &&
            "opacity-70 cursor-not-allowed active:scale-100"
        )}
        title={allowedLabel}
      >
        {!isExhausted && !isLoading && (
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-500",
              isBasic
                ? "from-emerald-400 to-transparent"
                : "from-blue-400 to-transparent"
            )}
          />
        )}
        <span className="relative z-10 flex items-center gap-2 text-sm font-black tracking-tight mb-1">
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : icon}
          {buttonLabel}
        </span>
        <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest opacity-80">
          {isExhausted ? "Monthly limit reached" : subtitle}
        </span>
      </button>
    );
  };

  const renderContent = () => {
    if (matchesLoading) {
      return (
        <div className="py-16 text-center flex flex-col items-center justify-center">
          <Database
            className={cn(
              "h-10 w-10 animate-pulse mb-4",
              darkMode ? "text-blue-500/50" : "text-blue-500/80"
            )}
          />
          <p
            className={cn(
              "text-xs font-black uppercase tracking-widest",
              darkMode ? "text-gray-400" : "text-gray-500"
            )}
          >
            Extracting Matches...
          </p>
        </div>
      );
    }

    if (matchesError) {
      return (
        <div
          className={cn(
            "m-4 p-6 rounded-2xl border text-center",
            darkMode
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-red-50 border-red-200 text-red-600"
          )}
        >
          <p className="text-xs font-black uppercase tracking-widest mb-1">
            System Error
          </p>
          <p className="text-sm font-medium opacity-80">
            {matchesError.message}
          </p>
        </div>
      );
    }

    if (sortedMatches.length === 0) {
      return (
        <div className="py-16 text-center">
          <p
            className={cn(
              "text-sm font-bold opacity-60",
              darkMode ? "text-gray-300" : "text-gray-600"
            )}
          >
            {matchesData?.summary?.message ||
              "No matches found with current parameters."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5 mt-6 relative z-0">
        {sortedMatches.slice(0, visibleMatches).map((match, index) => (
          <MatchCard
            key={`${match.date}-${match.match}-${index}`}
            match={match}
            darkMode={darkMode}
            hasKickoffPassed={hasKickoffPassed}
            convictionTier={getConvictionTier(match)}
            convictionStrength={getBiasStrength(match)}
          />
        ))}

        {/* === UPGRADE 2: THE LOAD MORE PULSE BAR === */}
        {visibleMatches < sortedMatches.length && (
          <div className="pt-2 pb-8">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault(); // 🔥 Prevents jumping to top
                setVisibleMatches((v) => v + 12);
              }}
              className={cn(
                "w-full relative overflow-hidden group px-6 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-[0.99] border",
                darkMode
                  ? "bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/[0.06] hover:text-white"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-white hover:text-gray-900 shadow-sm"
              )}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Database size={14} className="opacity-70" /> Expand Data Feed
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full group-hover:animate-[progressSweep_1.5s_infinite_linear]" />
            </button>
            <style jsx>{`
              @keyframes progressSweep {
                0% { left: -100%; }
                100% { left: 100%; }
              }
            `}</style>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 relative w-full overflow-visible">
      {/* === UPGRADE 1: THE DATA VAULT CONTAINER === */}
      <div
        className={cn(
          // 🔥 FIX: Set z-10 to stay BEHIND the filter dropdowns (which are z-50)
          "relative z-10 overflow-hidden rounded-[32px] border p-5 sm:p-7 shadow-xl transition-all",
          darkMode
            ? "bg-gray-950/40 border-white/10 backdrop-blur-2xl"
            : "bg-white/80 border-gray-200 backdrop-blur-xl"
        )}
      >
        <div
          className={cn(
            "absolute top-0 left-0 w-full h-1 opacity-50",
            darkMode
              ? "bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"
              : "bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400"
          )}
        />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database
                className={cn(
                  "h-4 w-4",
                  darkMode ? "text-blue-400" : "text-blue-500"
                )}
              />
              <h2
                className={cn(
                  "text-lg sm:text-xl font-black tracking-tight",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                Data Vault Extraction
              </h2>
            </div>
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              Active Authorization:{" "}
              <span
                className={cn(
                  "ml-1 font-black",
                  darkMode ? "text-blue-400" : "text-blue-600"
                )}
              >
                {access?.tier || hookTier}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {renderExportButton({
              type: "basic",
              accessConfig: basicAccess,
              allowedLabel: formatAccessText(basicAccess),
              lockedLabel: "Upgrade to unlock Basic CSV",
              icon: <Download className="h-4 w-4" />,
              subtitle: basicAccess?.unlimited
                ? "Quick export • unlimited"
                : formatAccessText(basicAccess),
            })}

            {renderExportButton({
              type: "pro",
              accessConfig: proAccess,
              allowedLabel: formatAccessText(proAccess),
              lockedLabel: "Upgrade for Premium Analytics",
              icon: <Sparkles className="h-4 w-4" />,
              subtitle: proAccess?.unlimited
                ? "Shortlist • edge • fair odds"
                : proAccess?.allowed
                ? `Rich analytics • ${formatAccessText(proAccess)}`
                : "Upgrade for analytics",
            })}
          </div>
        </div>

        {/* Export Feedback Banner */}
        {exportFeedback?.text && (
          <div
            className={cn(
              "mt-5 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest border flex items-center justify-center animate-in fade-in slide-in-from-top-2 duration-300",
              exportFeedback.type === "error"
                ? darkMode
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-red-50 border-red-200 text-red-600"
                : darkMode
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            )}
          >
            {exportFeedback.text}
          </div>
        )}
      </div>

      {/* === UPGRADE 3: INFINITE VOID CONTAINER === */}
      <div className="relative z-0 w-full max-w-full">{renderContent()}</div>
    </div>
  );
}