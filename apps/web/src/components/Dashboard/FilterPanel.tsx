// @ts-nocheck
"use client";
import { FacebookIcon, YoutubeIcon } from "@/components/SocialIcons";

import React, {
  useMemo,
  useState,
  lazy,
  Suspense,
  useCallback,
  useEffect,
} from "react";
import useDashboard from "@/hooks/useDashboard";
import Header from "@/components/Dashboard/Header";
import LoadingScreen from "@/components/Dashboard/LoadingScreen";
import SettingsModal from "@/components/Dashboard/SettingsModal";
import StatsCards from "@/components/Dashboard/StatsCards";
import Controls from "@/components/Dashboard/Controls";
import MatchesList from "@/components/Dashboard/MatchesList";
import TeamComparisonModal from "@/components/Dashboard/TeamComparisonModal";
import {
  BarChart3,
  Crown,
  Ticket,
  Target,
  Compass,
  Check,
  Plus,
  Send,
  X,
  AlertTriangle,
  Sparkles,
  Zap,
} from "lucide-react";
import useBetslipStore from "@/store/betslipStore";
import useUserPermissions from "@/hooks/useUserPermissions";

/* =========================
   Small helpers
========================= */
function cn(...c) {
  return c.filter(Boolean).join(" ");
}

function SafeFallback({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300/60 px-4 py-5 text-sm opacity-70 dark:border-gray-700/60">
      {text}
    </div>
  );
}

/* =========================
   Toast
========================= */
function Toast({ toast, onClose, darkMode }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose?.(), toast?.ttl ?? 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const tone =
    toast.type === "success"
      ? darkMode
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100 shadow-[0_0_35px_rgba(16,185,129,0.18)]"
        : "border-emerald-200 bg-emerald-50 text-emerald-900"
      : toast.type === "warning"
        ? darkMode
          ? "border-amber-500/30 bg-amber-500/10 text-amber-100 shadow-[0_0_35px_rgba(245,158,11,0.18)]"
          : "border-amber-200 bg-amber-50 text-amber-900"
        : darkMode
          ? "border-rose-500/30 bg-rose-500/10 text-rose-100 shadow-[0_0_35px_rgba(244,63,94,0.18)]"
          : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <div className="fixed top-3 right-3 z-[80] w-[92vw] max-w-sm">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border px-4 py-3 shadow-2xl backdrop-blur-xl",
          darkMode ? "bg-gray-950/85" : "bg-white/92",
          tone,
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5" />

        <div className="relative flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-2xl border p-2",
              darkMode
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white",
            )}
          >
            {toast.type === "warning" ? (
              <AlertTriangle size={18} />
            ) : toast.type === "success" ? (
              <Check size={18} />
            ) : (
              <X size={18} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {toast.title ? (
              <div className="text-sm font-black tracking-tight">
                {toast.title}
              </div>
            ) : null}
            <div className="text-sm font-semibold leading-snug break-words opacity-95">
              {toast.message}
            </div>
          </div>

          <button
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-xl border p-2 transition",
              darkMode
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-gray-200 bg-white hover:bg-gray-50",
            )}
            aria-label="Close toast"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Smile Banner
========================= */
function SmileBanner({ darkMode, user, bestTodayCount, betslipCount, isPro }) {
  const headline = !user
    ? "Welcome, future winner ✨"
    : betslipCount > 0
      ? `Nice 👀 You’ve got ${betslipCount} pick${
          betslipCount > 1 ? "s" : ""
        } in your BetSlip`
      : bestTodayCount > 0
        ? `${bestTodayCount} sharp signals waiting for you`
        : "Fresh board. Fresh edge. Fresh smile.";

  const subline = isPro
    ? "Premium mode is active — enjoy the extra edge."
    : "Explore smart, compare quickly, and build something beautiful.";

  return (
    <section className="relative overflow-hidden rounded-[30px] p-[1px] bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-cyan-400/20">
      <div
        className={cn(
          "relative overflow-hidden rounded-[29px] border px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5",
          darkMode
            ? "border-white/10 bg-gray-950/80"
            : "border-white/70 bg-white/90 shadow-sm",
        )}
      >
        <div className="pointer-events-none absolute -top-10 -left-8 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400 p-3 shadow-[0_0_30px_rgba(251,191,36,0.35)]">
              <Sparkles className="text-white" size={18} />
            </div>

            <div>
              <div
                className={cn(
                  "text-base font-black tracking-tight sm:text-lg",
                  darkMode ? "text-white" : "text-gray-950",
                )}
              >
                {headline}
              </div>
              <div
                className={cn(
                  "mt-1 text-xs sm:text-sm",
                  darkMode ? "text-gray-300" : "text-gray-600",
                )}
              >
                {subline}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black sm:text-sm",
              darkMode
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-emerald-100 bg-emerald-50 text-emerald-800",
            )}
          >
            <Zap size={16} />
            Live signals ready
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================
   Home Pick Reasoning
========================= */
function getConfidenceLabel(match) {
  const chance = Number(match?.chance) || 0;
  const rating = Number(match?.rating) || 0;

  if (chance >= 80 && rating >= 70) return "High";
  if (chance >= 65 && rating >= 60) return "Medium";
  return "Experimental";
}

function generatePickReasons(match) {
  const m = match || {};
  const reasons = [];
  const confidenceLabel = getConfidenceLabel(m);

  const hppg = Number(m.hppg);
  const appg = Number(m.appg);
  if (Number.isFinite(hppg) && Number.isFinite(appg)) {
    const diff = hppg - appg;
    if (diff >= 0.5) {
      reasons.push(
        `Stronger home form (${hppg.toFixed(2)} vs ${appg.toFixed(2)} PPG)`,
      );
    }
  }

  const hgs = Number(m.hgs);
  const agc = Number(m.agc);
  const ags = Number(m.ags);
  const hgc = Number(m.hgc);

  if (
    Number.isFinite(hgs) &&
    Number.isFinite(agc) &&
    hgs >= 1.6 &&
    agc >= 1.4
  ) {
    reasons.push("Home attack vs weak away defense");
  }

  if (
    Number.isFinite(ags) &&
    Number.isFinite(hgc) &&
    ags >= 1.4 &&
    hgc >= 1.4
  ) {
    reasons.push("Away team likely to score");
  }

  const hBtts = Number(m.hBtts);
  const aBtts = Number(m.aBtts);
  if (
    Number.isFinite(hBtts) &&
    Number.isFinite(aBtts) &&
    hBtts >= 65 &&
    aBtts >= 60
  ) {
    reasons.push(`BTTS trend strong (${Math.round((hBtts + aBtts) / 2)}%)`);
  }

  const hOv2 = Number(m.hOv2);
  const aOv2 = Number(m.aOv2);
  if (
    Number.isFinite(hOv2) &&
    Number.isFinite(aOv2) &&
    hOv2 >= 60 &&
    aOv2 >= 55
  ) {
    reasons.push("High probability of over 2.5 goals");
  }

  if (m.flag === "✅" && (Number(m.chance) || 0) >= 75) {
    reasons.push(`Model confidence ${Math.round(Number(m.chance) || 0)}%`);
  }

  return { confidenceLabel, reasons: reasons.slice(0, 4) };
}

/* =========================
   Kickoff helpers
========================= */
function parseKickoffDateTime(m) {
  const iso = String(m?.date || m?.isoDate || "").trim();
  const t = String(m?.time || "").trim();
  if (!iso) return null;

  const time = t ? (t.length === 5 ? `${t}:00` : t) : "00:00:00";
  const d = new Date(`${iso}T${time}`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function hasKickoffPassed(m, bufferMs = 60 * 1000) {
  const kickoff = parseKickoffDateTime(m);
  if (!kickoff) return false;
  return Date.now() >= kickoff.getTime() + bufferMs;
}

/* =========================
   Lazy tabs + preload
========================= */
const VipPick = lazy(() => import("@/components/Dashboard/VipPick"));
const BetSlip = lazy(() => import("@/components/Dashboard/BetSlip"));
const PerformanceTracker = lazy(
  () => import("@/components/Dashboard/PerformanceTracker"),
);

const preloadVipPick = () => import("@/components/Dashboard/VipPick");
const preloadBetSlip = () => import("@/components/Dashboard/BetSlip");
const preloadPerformance = () =>
  import("@/components/Dashboard/PerformanceTracker");

/* =========================
   Social
========================= */
function SocialLinks({ darkMode }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] p-[1px] bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-cyan-400/20">
      <div
        className={cn(
          "relative rounded-[27px] border p-4 backdrop-blur-xl",
          darkMode
            ? "border-white/10 bg-gray-950/75"
            : "border-white/70 bg-white/90",
        )}
      >
        <div className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-0 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative mb-3 flex items-center gap-2">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 p-2 text-white shadow-lg">
            <Sparkles size={16} />
          </div>
          <h3 className="text-sm font-black tracking-tight">
            Join & Follow FutureBet
          </h3>
        </div>

        <div className="relative flex flex-wrap gap-3">
          <a
            href="https://www.facebook.com/futurebetprediction"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5",
              darkMode
                ? "border-blue-500/20 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25 shadow-[0_0_25px_rgba(59,130,246,0.12)]"
                : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100",
            )}
          >
            <FacebookIcon size={16} />
            Facebook
          </a>

          <a
            href="https://www.youtube.com/@FUTUERBET"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5",
              darkMode
                ? "border-red-500/20 bg-red-500/15 text-red-200 hover:bg-red-500/25 shadow-[0_0_25px_rgba(239,68,68,0.12)]"
                : "border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
            )}
          >
            <YoutubeIcon size={16} />
            YouTube
          </a>

          <a
            href="https://t.me/futurebetprediction"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5",
              darkMode
                ? "border-cyan-500/20 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 shadow-[0_0_25px_rgba(34,211,238,0.12)]"
                : "border-cyan-100 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
            )}
          >
            <Send size={16} />
            Telegram
          </a>
        </div>
      </div>
    </section>
  );
}

function StickySocialBar({ darkMode }) {
  return (
    <div className="fixed bottom-3 left-1/2 z-50 w-[95%] max-w-4xl -translate-x-1/2">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-cyan-400/30 p-[1px] shadow-2xl">
        <div
          className={cn(
            "relative flex flex-wrap items-center justify-between gap-3 rounded-[27px] border px-4 py-3 backdrop-blur-xl",
            darkMode
              ? "border-white/10 bg-gray-950/78"
              : "border-white/70 bg-white/88",
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5" />

          <span className="relative text-sm font-black tracking-tight opacity-95">
            Connect with FutureBet ✨
          </span>

          <div className="relative flex flex-wrap gap-2">
            <a
              href="https://www.facebook.com/futurebetprediction"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.25)]"
            >
              <FacebookIcon size={16} />
              Facebook
            </a>

            <a
              href="https://www.youtube.com/@FUTUERBET"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.25)]"
            >
              <YoutubeIcon size={16} />
              YouTube
            </a>

            <a
              href="https://t.me/futurebetprediction"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-700 shadow-[0_0_20px_rgba(8,145,178,0.25)]"
            >
              <Send size={16} />
              Join Telegram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Home UI pieces
========================= */
const HomePickRow = React.memo(function HomePickRow({
  m,
  idx,
  showDateInRows,
  darkMode,
  isPro,
  user,
  canAddMore,
  isMatchInBetslip,
  maxMatches,
  onAdd,
  onCompare,
}) {
  const { confidenceLabel, reasons } = generatePickReasons(m);

  const matchTitle = m?.match || `${m?.home || ""} - ${m?.away || ""}` || "";
  const league = m?.league || m?.fullLeague || "";
  const country = m?.country || "";
  const date = m?.date || "";
  const time = m?.time || "";

  const chance = Number(m?.chance ?? 0) || 0;
  const rating = Number(m?.rating ?? 0) || 0;

  const alreadyAdded = isMatchInBetslip(m?.match);
  const kickoffPassed = hasKickoffPassed(m);
  const canAdd =
    Boolean(user) && !alreadyAdded && canAddMore() && !kickoffPassed;

  const confidenceTone =
    confidenceLabel === "High"
      ? darkMode
        ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/25 shadow-[0_0_25px_rgba(16,185,129,0.12)]"
        : "bg-emerald-50 text-emerald-800 border-emerald-100"
      : confidenceLabel === "Medium"
        ? darkMode
          ? "bg-amber-500/15 text-amber-200 border-amber-500/25 shadow-[0_0_25px_rgba(245,158,11,0.12)]"
          : "bg-amber-50 text-amber-900 border-amber-100"
        : darkMode
          ? "bg-gray-800 text-gray-200 border-gray-700"
          : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="group relative">
      <div
        className={cn(
          "pointer-events-none absolute -inset-[1px] rounded-[24px] blur-xl opacity-0 transition duration-300 group-hover:opacity-100",
          confidenceLabel === "High"
            ? "bg-emerald-500/20"
            : confidenceLabel === "Medium"
              ? "bg-amber-500/20"
              : "bg-blue-500/10",
        )}
      />

      <div
        className={cn(
          "relative rounded-3xl border p-4 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5",
          darkMode
            ? "border-white/10 bg-gray-950/75 hover:bg-gray-950/90"
            : "border-gray-200 bg-white/95 hover:bg-white",
        )}
      >
        <div className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full bg-white/5 blur-2xl" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black tracking-tight sm:text-base">
              {matchTitle}
            </div>

            <div
              className={cn(
                "mt-1 text-xs",
                darkMode ? "text-gray-300" : "text-gray-600",
              )}
            >
              {showDateInRows && date ? `${date} • ` : ""}
              {country ? `${country} • ` : ""}
              {league}
              {time ? ` • ${time}` : ""}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-black",
                  confidenceTone,
                )}
              >
                {confidenceLabel} signal
              </span>

              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                  darkMode
                    ? "border-blue-500/25 bg-blue-500/10 text-blue-200"
                    : "border-blue-100 bg-blue-50 text-blue-800",
                )}
              >
                Chance {chance}%
              </span>

              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                  darkMode
                    ? "border-gray-700 bg-gray-900 text-gray-200"
                    : "border-gray-200 bg-gray-50 text-gray-800",
                )}
              >
                Rating {rating}%
              </span>

              {kickoffPassed ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-black",
                    darkMode
                      ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
                      : "border-rose-100 bg-rose-50 text-rose-800",
                  )}
                >
                  Kickoff passed
                </span>
              ) : null}
            </div>

            {isPro && reasons?.length ? (
              <ul
                className={cn(
                  "mt-3 list-disc list-inside space-y-1.5 text-xs",
                  darkMode ? "text-gray-200" : "text-gray-700",
                )}
              >
                {reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : !isPro ? (
              <p
                className={cn(
                  "mt-3 text-xs font-semibold",
                  darkMode ? "text-gray-400" : "text-gray-500",
                )}
              >
                🔒 Upgrade to Premium to unlock guide & reasons
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => onAdd(m)}
                disabled={!canAdd}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-black transition",
                  alreadyAdded
                    ? "cursor-default border-emerald-700 bg-emerald-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                    : !user
                      ? "cursor-not-allowed border-gray-400 bg-gray-400 text-white opacity-60"
                      : !canAddMore()
                        ? "cursor-not-allowed border-gray-400 bg-gray-400 text-white opacity-60"
                        : kickoffPassed
                          ? "cursor-not-allowed border-gray-400 bg-gray-400 text-white opacity-60"
                          : darkMode
                            ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                            : "border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                )}
                title={
                  !user
                    ? "Sign in to add picks"
                    : kickoffPassed
                      ? "Kickoff time passed"
                      : alreadyAdded
                        ? "Already in BetSlip"
                        : !canAddMore()
                          ? `Max ${maxMatches || 20} matches reached`
                          : "Add to BetSlip"
                }
              >
                {alreadyAdded ? (
                  <>
                    <Check size={14} /> Added
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Add to BetSlip
                  </>
                )}
              </button>

              <button
                onClick={() => onCompare(m)}
                className={cn(
                  "rounded-2xl border px-3.5 py-2.5 text-xs font-black transition",
                  darkMode
                    ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
                    : "border-indigo-100 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
                )}
              >
                Compare Teams
              </button>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-sm font-black">{chance}%</div>
            <div
              className={cn(
                "mt-1 text-xs",
                darkMode ? "text-gray-300" : "text-gray-600",
              )}
            >
              Rating {rating}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const HomeCard = React.memo(function HomeCard({
  title,
  subtitle,
  list,
  showDateInRows = false,
  darkMode,
  isPro,
  user,
  canAddMore,
  isMatchInBetslip,
  maxMatches,
  onExplore,
  onAdd,
  onCompare,
}) {
  const count = Array.isArray(list) ? list.length : 0;

  return (
    <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-white/10 via-blue-500/15 to-purple-500/15 p-[1px]">
      <div
        className={cn(
          "relative rounded-[29px] border p-4 backdrop-blur-xl",
          darkMode
            ? "border-white/10 bg-gray-950/72"
            : "border-white/70 bg-white/92 shadow-sm",
        )}
      >
        <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-0 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight sm:text-base">
                {title}
              </h2>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-black",
                  darkMode
                    ? "border-white/10 bg-white/5 text-gray-200"
                    : "border-gray-200 bg-gray-50 text-gray-700",
                )}
              >
                {count}
              </span>
            </div>

            <p
              className={cn(
                "mt-1 text-xs sm:text-sm",
                darkMode ? "text-gray-300" : "text-gray-600",
              )}
            >
              {subtitle}
            </p>
          </div>

          <button
            onClick={onExplore}
            className={cn(
              "rounded-2xl border px-3.5 py-2 text-xs font-black transition",
              darkMode
                ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
                : "border-indigo-100 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
            )}
          >
            Explore →
          </button>
        </div>

        <div className="relative mt-4 grid gap-3">
          {!count ? (
            <div
              className={cn(
                "rounded-3xl border p-6 text-center text-sm font-semibold",
                darkMode
                  ? "border-white/10 bg-gray-950/50 text-gray-300"
                  : "border-gray-200 bg-gray-50 text-gray-600",
              )}
            >
              No ✅ matches found. The board is warming up.
            </div>
          ) : (
            list.map((m, idx) => (
              <HomePickRow
                key={m?.sn ?? `${m?.match ?? "match"}-${idx}`}
                m={m}
                idx={idx}
                showDateInRows={showDateInRows}
                darkMode={darkMode}
                isPro={isPro}
                user={user}
                canAddMore={canAddMore}
                isMatchInBetslip={isMatchInBetslip}
                maxMatches={maxMatches}
                onAdd={onAdd}
                onCompare={onCompare}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
});

/* =========================
   Main
========================= */
export default function FutureBetDashboard() {
  const { addMatch, getMatchCount, isMatchInBetslip, canAddMore, maxMatches } =
    useBetslipStore();
  const betslipCount = getMatchCount();

  const { hasFeatureAccess, isAdmin, isPremium } = useUserPermissions();
  const isPro = Boolean(isAdmin || isPremium);

  const {
    user,
    userLoading,
    signOut,
    permissions,
    hasFilterAccess,
    darkMode,
    setDarkMode,
    activeTab,
    setActiveTab,
    selectedDate,
    dateRange,
    setDateRange,
    selectedLeagues,
    setSelectedLeagues,
    selectedMarkets,
    setSelectedMarkets,
    chanceThreshold,
    setChanceThreshold,
    ratingThreshold,
    setRatingThreshold,
    onlyAlignedPredictions,
    setOnlyAlignedPredictions,
    sortBy,
    setSortBy,
    showDatePicker,
    setShowDatePicker,
    showSettings,
    setShowSettings,
    matchesData,
    matchesLoading,
    matchesError,
    refetch,
    preferencesData,
    handleSaveSettings,
    savePreferencesMutation,
    filteredMatches,
    uniqueLeagues,
  } = useDashboard();

  const [compareMatch, setCompareMatch] = useState(null);
  const [toast, setToast] = useState(null);

  const pushToast = useCallback((next) => {
    setToast({
      type: next?.type || "error",
      title: next?.title,
      message: next?.message || "",
      ttl: next?.ttl ?? 3200,
    });
  }, []);

  useEffect(() => {
    if (!user && activeTab === "dashboard") setActiveTab("explore");
  }, [user, activeTab, setActiveTab]);

  const pad2 = (n) => String(n).padStart(2, "0");
  const toISODate = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const todayISO = useMemo(() => toISODate(new Date()), []);

  const getCurrentWeekRange = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }, []);

  const { monday, sunday } = useMemo(
    () => getCurrentWeekRange(),
    [getCurrentWeekRange],
  );

  const isInCurrentWeek = useCallback(
    (iso) => {
      if (!iso) return false;
      const d = new Date(`${iso}T00:00:00`);
      return d >= monday && d <= sunday;
    },
    [monday, sunday],
  );

  const getISODate = useCallback((m) => m?.date || "", []);
  const getMatchTitle = useCallback(
    (m) => m?.match || `${m?.home || ""} - ${m?.away || ""}` || "",
    [],
  );
  const getChance = useCallback((m) => Number(m?.chance ?? 0) || 0, []);
  const getRating = useCallback((m) => Number(m?.rating ?? 0) || 0, []);
  const getFlag = useCallback((m) => m?.flag || "", []);

  const isBestCandidate = useCallback((m) => getFlag(m) === "✅", [getFlag]);

  const bestSort = useCallback(
    (a, b) => {
      const r = getRating(b) - getRating(a);
      if (r !== 0) return r;
      return getChance(b) - getChance(a);
    },
    [getChance, getRating],
  );

  const rawMatches = useMemo(
    () => (Array.isArray(matchesData?.matches) ? matchesData.matches : []),
    [matchesData],
  );

  const bestToday = useMemo(() => {
    return rawMatches
      .filter(isBestCandidate)
      .filter((m) => getISODate(m) === todayISO)
      .sort(bestSort)
      .slice(0, 10);
  }, [rawMatches, isBestCandidate, getISODate, todayISO, bestSort]);

  const bestWeek = useMemo(() => {
    const seen = new Set();
    return rawMatches
      .filter(isBestCandidate)
      .filter((m) => isInCurrentWeek(getISODate(m)))
      .filter((m) => getISODate(m) !== todayISO)
      .sort(bestSort)
      .filter((m) => {
        const key = getMatchTitle(m);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }, [
    rawMatches,
    isBestCandidate,
    isInCurrentWeek,
    getISODate,
    todayISO,
    bestSort,
    getMatchTitle,
  ]);

  const filterPanelProps = useMemo(
    () => ({
      dateRange,
      setDateRange,
      selectedDate,
      showDatePicker,
      setShowDatePicker,
      uniqueLeagues,
      selectedLeagues,
      setSelectedLeagues,
      selectedMarkets,
      setSelectedMarkets,
      onlyAlignedPredictions,
      setOnlyAlignedPredictions,
    }),
    [
      dateRange,
      setDateRange,
      selectedDate,
      showDatePicker,
      setShowDatePicker,
      uniqueLeagues,
      selectedLeagues,
      setSelectedLeagues,
      selectedMarkets,
      setSelectedMarkets,
      onlyAlignedPredictions,
      setOnlyAlignedPredictions,
    ],
  );

  const handleAddFromHome = useCallback(
    (m) => {
      if (!user) {
        pushToast({
          type: "warning",
          title: "Sign in required",
          message: "Sign in to add picks to BetSlip.",
        });
        return;
      }

      if (isMatchInBetslip(m?.match)) {
        pushToast({
          type: "success",
          title: "Already added",
          message: "This match is already in your BetSlip.",
          ttl: 2200,
        });
        return;
      }

      if (hasKickoffPassed(m)) {
        pushToast({
          type: "warning",
          title: "Kickoff passed",
          message: "You can’t add this match because kickoff time has passed.",
        });
        return;
      }

      if (!canAddMore()) {
        pushToast({
          type: "warning",
          title: "BetSlip full",
          message: `BetSlip is full. Max ${maxMatches || 20} matches allowed.`,
        });
        return;
      }

      const ok = addMatch(m);
      if (!ok) {
        pushToast({
          type: "error",
          title: "Could not add",
          message: `Could not add match. Max ${
            maxMatches || 20
          } matches allowed.`,
        });
        return;
      }

      pushToast({
        type: "success",
        title: "Added to BetSlip",
        message: "Selection added successfully.",
        ttl: 2200,
      });
    },
    [user, isMatchInBetslip, canAddMore, maxMatches, addMatch, pushToast],
  );

  const tabPill = useCallback(
    (active, activeCls) =>
      cn(
        "relative flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-black whitespace-nowrap transition-all duration-200 sm:text-sm",
        active
          ? activeCls
          : darkMode
            ? "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.06] hover:text-white"
            : "border-gray-200 bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900",
      ),
    [darkMode],
  );

  if (userLoading) return <LoadingScreen darkMode={darkMode} />;

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-x-hidden",
        darkMode ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-[-8%] h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-40 right-[-6%] h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} darkMode={darkMode} />

      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        signOut={signOut}
        onShowSettings={() => setShowSettings(true)}
        userPermissions={permissions}
      />

      {compareMatch && (
        <TeamComparisonModal
          match={compareMatch}
          onClose={() => setCompareMatch(null)}
          darkMode={darkMode}
        />
      )}

      <div className="mx-auto max-w-7xl px-2 py-2 sm:px-4 sm:py-4">
        <div
          className={cn(
            "rounded-[28px] border p-2 shadow-sm backdrop-blur-xl",
            darkMode
              ? "border-white/10 bg-gray-950/65"
              : "border-white/70 bg-white/85",
          )}
        >
          <nav className="flex flex-wrap gap-2 overflow-x-auto scrollbar-hide">
            {user && (
              <button
                onClick={() => setActiveTab("dashboard")}
                className={tabPill(
                  activeTab === "dashboard",
                  darkMode
                    ? "border-blue-400/30 bg-blue-500/15 text-blue-200 shadow-[0_0_28px_rgba(59,130,246,0.16)]"
                    : "border-blue-200 bg-blue-50 text-blue-700",
                )}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Home</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("explore")}
              className={tabPill(
                activeTab === "explore",
                darkMode
                  ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-200 shadow-[0_0_28px_rgba(99,102,241,0.16)]"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700",
              )}
            >
              <Compass className="h-4 w-4" />
              <span>Explore</span>
            </button>

            <button
              onMouseEnter={preloadBetSlip}
              onClick={() => setActiveTab("betslip")}
              className={tabPill(
                activeTab === "betslip",
                darkMode
                  ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.16)]"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
            >
              <Ticket className="h-4 w-4" />
              <span>BetSlip</span>
              {betslipCount > 0 && (
                <span className="min-w-[18px] rounded-full bg-emerald-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-[0_0_18px_rgba(16,185,129,0.35)] sm:text-xs">
                  {betslipCount}
                </span>
              )}
            </button>

            <button
              onMouseEnter={preloadVipPick}
              onClick={() => setActiveTab("vip-pick")}
              className={tabPill(
                activeTab === "vip-pick",
                darkMode
                  ? "border-yellow-400/30 bg-yellow-500/15 text-yellow-200 shadow-[0_0_28px_rgba(234,179,8,0.16)]"
                  : "border-yellow-200 bg-yellow-50 text-yellow-700",
              )}
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">VIP PICK</span>
              <span className="sm:hidden">VIP</span>
              {(isPremium || isAdmin) && (
                <span className="rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-black text-white sm:text-xs">
                  <span className="hidden sm:inline">PREMIUM</span>
                  <span className="sm:hidden">PRO</span>
                </span>
              )}
            </button>

            {hasFeatureAccess("performance-tracker") && (
              <button
                onMouseEnter={preloadPerformance}
                onClick={() => setActiveTab("performance-tracker")}
                className={tabPill(
                  activeTab === "performance-tracker",
                  darkMode
                    ? "border-purple-400/30 bg-purple-500/15 text-purple-200 shadow-[0_0_28px_rgba(168,85,247,0.16)]"
                    : "border-purple-200 bg-purple-50 text-purple-700",
                )}
              >
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Perf</span>
                <span className="rounded-full bg-purple-500 px-1.5 py-0.5 text-[10px] font-black text-white sm:text-xs">
                  <span className="hidden sm:inline">PREMIUM</span>
                  <span className="sm:hidden">PRO</span>
                </span>
              </button>
            )}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-4 px-2 py-3 pb-36 sm:space-y-6 sm:px-4 sm:py-6">
        {activeTab === "dashboard" ? (
          <>
            <SmileBanner
              darkMode={darkMode}
              user={user}
              bestTodayCount={bestToday.length}
              betslipCount={betslipCount}
              isPro={isPro}
            />

            <StatsCards
              matchesData={matchesData}
              filteredMatches={filteredMatches}
              darkMode={darkMode}
            />

            <section className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <HomeCard
                title="Best Today"
                subtitle={todayISO}
                list={bestToday}
                darkMode={darkMode}
                isPro={isPro}
                user={user}
                canAddMore={canAddMore}
                isMatchInBetslip={isMatchInBetslip}
                maxMatches={maxMatches}
                onExplore={() => setActiveTab("explore")}
                onAdd={handleAddFromHome}
                onCompare={(m) => setCompareMatch(m)}
              />

              <HomeCard
                title="Best This Week"
                subtitle="Mon – Sun (current week)"
                list={bestWeek}
                showDateInRows
                darkMode={darkMode}
                isPro={isPro}
                user={user}
                canAddMore={canAddMore}
                isMatchInBetslip={isMatchInBetslip}
                maxMatches={maxMatches}
                onExplore={() => setActiveTab("explore")}
                onAdd={handleAddFromHome}
                onCompare={(m) => setCompareMatch(m)}
              />
            </section>

            <SocialLinks darkMode={darkMode} />
          </>
        ) : activeTab === "explore" ? (
          <>
            <SmileBanner
              darkMode={darkMode}
              user={user}
              bestTodayCount={filteredMatches?.length || 0}
              betslipCount={betslipCount}
              isPro={isPro}
            />

            <StatsCards
              matchesData={matchesData}
              filteredMatches={filteredMatches}
              darkMode={darkMode}
            />

            <div
              className={cn(
                "rounded-[28px] border px-3 py-2 shadow-sm backdrop-blur-xl",
                darkMode
                  ? "border-white/10 bg-gray-950/65"
                  : "border-white/70 bg-white/88",
              )}
            >
              <Controls
                matchesLoading={matchesLoading}
                refetch={refetch}
                showFilters={true}
                setShowFilters={() => {}}
                chanceThreshold={chanceThreshold}
                setChanceThreshold={setChanceThreshold}
                ratingThreshold={ratingThreshold}
                setRatingThreshold={setRatingThreshold}
                darkMode={darkMode}
                hasFilterAccess={hasFilterAccess}
                filterPanelProps={filterPanelProps}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </div>

            <MatchesList
              matchesLoading={matchesLoading}
              matchesError={matchesError}
              filteredMatches={filteredMatches}
              matchesData={matchesData}
              selectedDate={selectedDate}
              darkMode={darkMode}
              hasKickoffPassed={(m) => hasKickoffPassed(m)}
            />
          </>
        ) : activeTab === "betslip" ? (
          <Suspense fallback={<SafeFallback text="Loading BetSlip…" />}>
            <BetSlip darkMode={darkMode} />
          </Suspense>
        ) : activeTab === "vip-pick" ? (
          <Suspense fallback={<SafeFallback text="Loading VIP picks…" />}>
            <VipPick darkMode={darkMode} isPro={isAdmin || isPremium} />
          </Suspense>
        ) : activeTab === "performance-tracker" ? (
          <Suspense fallback={<SafeFallback text="Loading performance…" />}>
            <PerformanceTracker darkMode={darkMode} />
          </Suspense>
        ) : null}
      </main>

      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={darkMode}
        preferences={preferencesData}
        onSave={handleSaveSettings}
        isLoading={savePreferencesMutation?.isPending}
        isPremium={isAdmin || isPremium}
      />

      <StickySocialBar darkMode={darkMode} />
    </div>
  );
}
