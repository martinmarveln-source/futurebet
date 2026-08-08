// @ts-nocheck
import React, { useMemo, useState, useCallback, useEffect } from "react";
import TeamComparisonModal from "@/components/Dashboard/TeamComparisonModal";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  RefreshCw,
  Lock,
  Info,
  CircleHelp,
  Sparkles,
  BarChart3,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Trophy,
  Wifi,
  WifiOff,
  Clock3,
  TriangleAlert,
} from "lucide-react";
import useUserPermissions from "@/hooks/useUserPermissions";
import useBetslipStore from "@/store/betslipStore";

/* =====================================================================================
  VIP: chance% -> odds helpers
===================================================================================== */

const clampProb = (p) => Math.max(1, Math.min(99, Number(p) || 0));

const oddsFromProbPercent = (p) => {
  const prob = clampProb(p) / 100;
  const odds = 1 / prob;
  return Number.isFinite(odds) ? Number(odds.toFixed(2)) : null;
};

const deriveVipOdds = (p) => {
  const prob =
    Number(p?.chance) || Number(p?.confidence) || Number(p?.vipScore) || 0;
  if (!prob) return null;
  return oddsFromProbPercent(prob);
};

const valueTag = (vipScore = 0) => {
  const v = Number(vipScore) || 0;
  if (v >= 80) return "Value";
  if (v >= 70) return "Solid";
  return "Edge";
};

/* =====================================================================================
  Kickoff helpers
===================================================================================== */

const monthMap = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const parseKickoffDateTime = (m) => {
  const ts = Number(m?.kickoffTs || m?.kickoffAt || 0);
  if (Number.isFinite(ts) && ts > 0) {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const rawDate = String(m?.date || "").trim();
  const rawTime = String(m?.time || "").trim();
  if (!rawDate) return null;

  const [hh, mm, ss] = (
    rawTime ? (rawTime.length === 5 ? `${rawTime}:00` : rawTime) : "00:00:00"
  )
    .split(":")
    .map((x) => Number(x || 0));

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [Y, M, D] = rawDate.split("-").map(Number);
    const d = new Date(Y, (M || 1) - 1, D || 1, hh || 0, mm || 0, ss || 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m2 = rawDate.match(/^(\d{1,2})-([A-Za-z]{3})$/);
  if (m2) {
    const day = Number(m2[1]);
    const mon = String(m2[2] || "").toLowerCase();
    const month = monthMap[mon];
    if (month === undefined) return null;

    const now = new Date();
    const y = now.getFullYear();
    const d0 = new Date(y, month, day, hh || 0, mm || 0, ss || 0);
    if (Number.isNaN(d0.getTime())) return null;

    const diffDays = (d0.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < -14) {
      const d1 = new Date(y + 1, month, day, hh || 0, mm || 0, ss || 0);
      return Number.isNaN(d1.getTime()) ? d0 : d1;
    }
    return d0;
  }

  return null;
};

const hasKickoffPassedLocal = (m) => {
  const kickoff = parseKickoffDateTime(m);
  if (!kickoff) return false;
  return Date.now() >= kickoff.getTime();
};

/* =====================================================================================
  UI Helpers
===================================================================================== */

const cn = (...c) => c.filter(Boolean).join(" ");
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));

const pct = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace("%", "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function Card({ children, darkMode, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-3xl border shadow-sm overflow-hidden",
        darkMode
          ? "border-white/10 bg-gradient-to-b from-gray-950/80 to-gray-950/50 text-gray-100"
          : "border-gray-200 bg-white text-gray-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, darkMode, right }) {
  return (
    <div
      className={cn(
        "px-5 py-4 border-b",
        darkMode
          ? "border-white/10 bg-white/[0.03]"
          : "border-gray-200 bg-gray-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold truncate">
            {title}
          </h2>
          {subtitle ? (
            <p
              className={cn(
                "text-sm mt-0.5",
                darkMode ? "text-gray-300" : "text-gray-600",
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

function SoftButton({ children, darkMode, className = "", ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
        "active:scale-[0.99]",
        darkMode
          ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-100"
          : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800",
        props.disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white transition",
        "active:scale-[0.99]",
        props.disabled
          ? "bg-gray-400 opacity-60 cursor-not-allowed"
          : "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ProgressBar({
  value,
  darkMode,
  colorClass = "bg-blue-600",
  trackClass,
}) {
  const w = clamp(Math.round(Number.isFinite(value) ? value : 0));
  const track = trackClass
    ? trackClass
    : darkMode
      ? "bg-white/10"
      : "bg-gray-200";

  return (
    <div
      className={cn(
        "h-2.5 rounded-full overflow-hidden ring-1",
        darkMode ? "ring-white/10" : "ring-gray-200",
        track,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          colorClass,
        )}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function Pill({ children, darkMode, tone = "gray" }) {
  const light = {
    gray: "bg-gray-100 text-gray-700",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-800",
  };

  const dark = {
    gray: "bg-white/5 text-gray-200",
    yellow: "bg-yellow-500/15 text-yellow-200",
    blue: "bg-blue-500/15 text-blue-200",
    green: "bg-emerald-500/15 text-emerald-200",
    red: "bg-red-500/15 text-red-200",
    purple: "bg-purple-500/15 text-purple-200",
  };

  const map = darkMode ? dark : light;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide",
        "shadow-sm transition hover:shadow-md",
        map[tone] || map.gray,
      )}
    >
      {children}
    </span>
  );
}

function StatTile({ label, value, hint, darkMode, barValue, barColor }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "text-xs font-semibold",
            darkMode ? "text-gray-300" : "text-gray-600",
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "text-sm font-extrabold",
            darkMode ? "text-white" : "text-gray-900",
          )}
        >
          {value}
        </div>
      </div>

      {typeof barValue === "number" ? (
        <div className="mt-3">
          <ProgressBar
            darkMode={darkMode}
            value={barValue}
            colorClass={barColor || "bg-blue-600"}
          />
        </div>
      ) : null}

      {hint ? (
        <div
          className={cn(
            "mt-2 text-[11px]",
            darkMode ? "text-gray-400" : "text-gray-500",
          )}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function FormChip({ ch, darkMode }) {
  const c = String(ch || "").toUpperCase();
  const cls =
    c === "W"
      ? darkMode
        ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"
        : "bg-emerald-600 text-white border-emerald-700"
      : c === "D"
        ? darkMode
          ? "bg-white/8 text-gray-100 border-white/10"
          : "bg-gray-600 text-white border-gray-700"
        : c === "L"
          ? darkMode
            ? "bg-red-500/20 text-red-200 border-red-500/30"
            : "bg-red-600 text-white border-red-700"
          : darkMode
            ? "bg-white/5 text-gray-200 border-white/10"
            : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-extrabold border",
        cls,
      )}
    >
      {c || "—"}
    </span>
  );
}

function GradeBadge({ label, grade, darkMode }) {
  const g = String(grade || "").toUpperCase();
  const tone =
    g === "A"
      ? "green"
      : g === "B"
        ? "blue"
        : g === "C"
          ? "yellow"
          : g === "D"
            ? "gray"
            : "red";

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "text-[11px]",
          darkMode ? "text-gray-400" : "text-gray-500",
        )}
      >
        {label}
      </span>
      <Pill darkMode={darkMode} tone={tone}>
        {g || "—"}
      </Pill>
    </span>
  );
}

function SkeletonBlock({ darkMode, className = "" }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl",
        darkMode ? "bg-white/8" : "bg-gray-200",
        className,
      )}
    />
  );
}

function VipPickCardSkeleton({ darkMode }) {
  return (
    <Card darkMode={darkMode}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              <SkeletonBlock darkMode={darkMode} className="h-6 w-16" />
              <SkeletonBlock darkMode={darkMode} className="h-6 w-16" />
              <SkeletonBlock darkMode={darkMode} className="h-6 w-20" />
            </div>
            <SkeletonBlock darkMode={darkMode} className="h-5 w-3/4" />
            <SkeletonBlock darkMode={darkMode} className="h-4 w-1/2 mt-3" />
            <SkeletonBlock darkMode={darkMode} className="h-4 w-2/3 mt-3" />
          </div>

          <div className="flex gap-2">
            <SkeletonBlock darkMode={darkMode} className="h-10 w-10" />
            <SkeletonBlock darkMode={darkMode} className="h-10 w-24" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <SkeletonBlock darkMode={darkMode} className="h-24 w-full" />
          <SkeletonBlock darkMode={darkMode} className="h-24 w-full" />
          <SkeletonBlock darkMode={darkMode} className="h-24 w-full" />
        </div>
      </div>
    </Card>
  );
}

function NoticeBanner({ notice, darkMode, onClose }) {
  if (!notice?.message) return null;

  const toneMap = {
    success: darkMode
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: darkMode
      ? "border-red-500/20 bg-red-500/10 text-red-100"
      : "border-red-200 bg-red-50 text-red-800",
    warn: darkMode
      ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-100"
      : "border-yellow-200 bg-yellow-50 text-yellow-800",
    info: darkMode
      ? "border-white/10 bg-white/5 text-gray-100"
      : "border-gray-200 bg-white text-gray-800",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm flex items-start justify-between gap-3",
        toneMap[notice.type] || toneMap.info,
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        {notice.type === "error" || notice.type === "warn" ? (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        ) : (
          <Info size={16} className="mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">{notice.message}</div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={cn(
          "text-xs font-semibold opacity-80 hover:opacity-100",
          darkMode ? "text-gray-200" : "text-gray-700",
        )}
      >
        Dismiss
      </button>
    </div>
  );
}

/* =====================================================================================
  Network + storage helpers
===================================================================================== */

const VIP_CACHE_KEY = "vip-picks-cache-v2";

function getSavedVipData() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(VIP_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveVipData(payload) {
  if (typeof window === "undefined" || !payload) return;

  try {
    window.localStorage.setItem(VIP_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function getPreferLiteMode() {
  if (typeof navigator === "undefined") return false;

  const c =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  if (!c) return false;

  if (c.saveData) return true;

  const t = String(c.effectiveType || "").toLowerCase();
  return t === "slow-2g" || t === "2g" || t === "3g";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function formatUpdatedAt(v) {
  if (!v) return "—";

  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/* =====================================================================================
  Memoized Card
===================================================================================== */

const VipPickCard = React.memo(function VipPickCard({
  p,
  darkMode,
  expanded,
  onToggle,
  onCompare,
  onAdd,
  disabled,
  kickoffPassed,
  alreadyAdded,
  msRating,
  maxMatches,
  compareDisabled,
}) {
  const chance = p.chance;
  const rating = p.rating;
  const vipScore = p.vipScore;

  return (
    <Card darkMode={darkMode}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Pill
                darkMode={darkMode}
                tone={
                  p.valueLabel === "Value"
                    ? "green"
                    : p.valueLabel === "Solid"
                      ? "blue"
                      : "gray"
                }
              >
                {p.valueLabel}
              </Pill>

              <Pill darkMode={darkMode} tone="yellow">
                VIP {Math.round(p.vipScore)}
              </Pill>

              <Pill darkMode={darkMode} tone="gray">
                Fair {p.fairOdds ? p.fairOdds.toFixed(2) : "—"}
              </Pill>

              <Pill darkMode={darkMode} tone="purple">
                {p.market || "VIP"}
              </Pill>

              {kickoffPassed ? (
                <Pill darkMode={darkMode} tone="red">
                  <Lock size={12} />
                  Locked
                </Pill>
              ) : null}
            </div>

            <div className="text-[15px] sm:text-[16px] font-extrabold truncate">
              {p.match || "—"}
            </div>

            <div
              className={cn(
                "text-[11px] sm:text-xs mt-1",
                darkMode ? "text-gray-300" : "text-gray-600",
              )}
            >
              {p.league || "League unavailable"}
              {p.date ? ` • ${p.date}` : ""}
              {p.time ? ` • ${p.time}` : ""}
            </div>

            <div
              className={cn(
                "mt-2 text-sm",
                darkMode ? "text-gray-200" : "text-gray-700",
              )}
            >
              Pick: <b>{p.pickLabel || "—"}</b>{" "}
              <span
                className={cn(
                  "mx-1",
                  darkMode ? "text-gray-600" : "text-gray-400",
                )}
              >
                •
              </span>
              Score: <b>{p.predictedScore || "—"}</b>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="hidden sm:block">
              <Pill darkMode={darkMode} tone="green">
                Market rating {Math.round(msRating)}%
              </Pill>
            </div>

            <div className="flex items-center gap-2">
              <SoftButton
                darkMode={darkMode}
                onClick={() => onCompare(p)}
                disabled={compareDisabled}
                title={
                  compareDisabled
                    ? "Comparison data unavailable"
                    : "Compare teams"
                }
              >
                <BarChart3 size={16} />
              </SoftButton>

              <PrimaryButton
                onClick={() => onAdd(p.raw)}
                disabled={disabled}
                title={
                  kickoffPassed
                    ? "Kickoff time passed"
                    : alreadyAdded
                      ? "Already in BetSlip"
                      : `Add to Betslip (max ${maxMatches || 20})`
                }
                className={cn(
                  kickoffPassed &&
                    "pointer-events-none grayscale blur-[1.1px] opacity-55",
                  alreadyAdded &&
                    !kickoffPassed &&
                    "bg-emerald-600 hover:from-emerald-600 hover:to-emerald-600",
                )}
              >
                {kickoffPassed ? (
                  <>
                    <Lock size={16} />
                    Locked
                  </>
                ) : alreadyAdded ? (
                  <>
                    <Check size={16} />
                    Added
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add
                  </>
                )}
              </PrimaryButton>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatTile
            darkMode={darkMode}
            label="Chance (computed)"
            value={`${Math.round(chance)}%`}
            barValue={chance}
            barColor="bg-gradient-to-r from-yellow-500 to-amber-500"
            hint="Computed probability of selected market."
          />
          <StatTile
            darkMode={darkMode}
            label="Rating (model)"
            value={`${Math.round(rating)}%`}
            barValue={rating}
            barColor="bg-gradient-to-r from-blue-600 to-indigo-600"
            hint="Stability & quality score."
          />
          <StatTile
            darkMode={darkMode}
            label="VIP score"
            value={Math.round(vipScore)}
            barValue={vipScore}
            barColor="bg-gradient-to-r from-purple-600 to-fuchsia-600"
            hint="Composite rank from chance + rating."
          />
        </div>

        <div className="mt-4 flex justify-end">
          <SoftButton darkMode={darkMode} onClick={onToggle}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? "Hide details" : "Show details"}
          </SoftButton>
        </div>
      </div>

      {expanded && (
        <div
          className={cn(
            "border-t p-5",
            darkMode
              ? "border-white/10 bg-black/20"
              : "border-gray-200 bg-gray-50",
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className={cn(
                "rounded-2xl border p-4",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Home form</div>
                <GradeBadge
                  darkMode={darkMode}
                  label="Grade"
                  grade={p.homeGrade}
                />
              </div>

              {p.hasFormData ? (
                <div className="mt-3 flex items-center gap-1">
                  {(p.homeStr || "-----")
                    .slice(0, 5)
                    .split("")
                    .map((c, i) => (
                      <FormChip key={i} ch={c} darkMode={darkMode} />
                    ))}
                </div>
              ) : (
                <div
                  className={cn(
                    "mt-3 text-xs",
                    darkMode ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  No home form data provided.
                </div>
              )}
            </div>

            <div
              className={cn(
                "rounded-2xl border p-4",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Away form</div>
                <GradeBadge
                  darkMode={darkMode}
                  label="Grade"
                  grade={p.awayGrade}
                />
              </div>

              {p.hasFormData ? (
                <div className="mt-3 flex items-center gap-1">
                  {(p.awayStr || "-----")
                    .slice(0, 5)
                    .split("")
                    .map((c, i) => (
                      <FormChip key={i} ch={c} darkMode={darkMode} />
                    ))}
                </div>
              ) : (
                <div
                  className={cn(
                    "mt-3 text-xs",
                    darkMode ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  No away form data provided.
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              "mt-4 rounded-2xl border p-4",
              darkMode
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  Market signal confirmation
                </div>
                <div
                  className={cn(
                    "text-[11px] mt-0.5",
                    darkMode ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  Uses market-specific columns when available.
                </div>
              </div>

              <Pill darkMode={darkMode} tone="purple">
                Market rating {Math.round(msRating)}%
              </Pill>
            </div>

            {p.hasMarketSignal ? (
              <>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Home</span>
                      <span>{Math.round(p.msHome)}%</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar
                        darkMode={darkMode}
                        value={p.msHome}
                        colorClass="bg-gradient-to-r from-emerald-500 to-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Away</span>
                      <span>{Math.round(p.msAway)}%</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar
                        darkMode={darkMode}
                        value={p.msAway}
                        colorClass="bg-gradient-to-r from-rose-500 to-red-600"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-3 text-[11px]",
                    darkMode ? "text-gray-400" : "text-gray-500",
                  )}
                >
                  Low confirmation means market-specific stats don’t strongly
                  align with the computed pick.
                </div>
              </>
            ) : (
              <div
                className={cn(
                  "mt-4 text-sm",
                  darkMode ? "text-gray-300" : "text-gray-600",
                )}
              >
                Extra market confirmation is not available for this pick.
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
});

/* =====================================================================================
  VIP Component
===================================================================================== */

export default function VipPick({ darkMode = false }) {
  const hasKickoffPassed = hasKickoffPassedLocal;

  const { isAdmin, isPremium } = useUserPermissions();
  const isPro = Boolean(isAdmin || isPremium);

  const addMatch = useBetslipStore((s) => s.addMatch);
  const isMatchInBetslip = useBetslipStore((s) => s.isMatchInBetslip);
  const canAddMore = useBetslipStore((s) => s.canAddMore);
  const maxMatches = useBetslipStore((s) => s.maxMatches);

  const [comparePick, setComparePick] = useState(null);
  const [sortKey, setSortKey] = useState("vip");
  const [showGuide, setShowGuide] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [savedData, setSavedData] = useState(null);
  const [preferLite, setPreferLite] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setComparePick(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setSavedData(getSavedVipData());
    setPreferLite(getPreferLiteMode());

    if (typeof navigator === "undefined") return undefined;

    const c =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (!c || !c.addEventListener) return undefined;

    const onChange = () => setPreferLite(getPreferLiteMode());
    c.addEventListener("change", onChange);

    return () => {
      c.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(t);
  }, [notice]);

  const showNotice = useCallback((message, type = "info") => {
    setNotice({ message, type });
  }, []);

  const { data, isLoading, error, refetch, isRefetching, isFetching } =
    useQuery({
      queryKey: [
        "vip-picks",
        preferLite ? "lite" : "full",
        isPro ? "pro" : "locked",
      ],
      enabled: isPro,
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, err) => {
        const msg = String(err?.message || "");
        if (/401|403|404/.test(msg)) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1200 * attempt, 3000),
      queryFn: async () => {
        const qs = new URLSearchParams({
          premium: "1",
          limit: "14",
        });

        //if (preferLite) qs.set("lite", "1");

        const res = await fetchWithTimeout(
          `/api/vip-pick/daily-generate?${qs.toString()}`,
          {
            headers: {
              accept: "application/json",
            },
          },
          preferLite ? 8000 : 11000,
        );

        if (!res.ok) {
          let txt = "";
          try {
            txt = await res.text();
          } catch {
            txt = "";
          }
          throw new Error(txt || `Failed to fetch VIP picks (${res.status})`);
        }

        return res.json();
      },
    });

  useEffect(() => {
    if (data && isPro) {
      saveVipData(data);
      setSavedData(data);
    }
  }, [data, isPro]);

  const effectiveData = data || savedData;
  const usingSavedFallback = !data && !!savedData;
  const meta = effectiveData?.meta || {};
  const generatedAt = meta.generatedAt;
  const isStale = Boolean(meta.stale);
  const compactMode = Boolean(meta.compact || preferLite);

  const thresholds = useMemo(() => {
    return {
      minChance: Number(meta.minChance ?? 65),
      minRating: Number(meta.minRating ?? 58),
      minRecents: Number(meta.minRecents ?? 0),
    };
  }, [meta]);

  const betslipFull = !canAddMore();

  const handleAddVipToBetslip = useCallback(
    (p) => {
      if (!p?.match) {
        showNotice("This pick is missing a match label.", "warn");
        return;
      }

      if (hasKickoffPassed(p)) {
        showNotice("Kickoff already passed. This match is locked.", "warn");
        return;
      }

      if (isMatchInBetslip(p.match)) {
        showNotice("This match is already in your Betslip.", "info");
        return;
      }

      if (!canAddMore()) {
        showNotice(
          `Betslip is full. Max ${maxMatches || 20} matches allowed.`,
          "warn",
        );
        return;
      }

      const ok = addMatch({
        ...p,
        match: p.match,
        fullLeague: p.fullLeague || p.league || "",
        selectedMarket: p.market || "VIP",
        selectedOption: p.pickLabel || "VIP Pick",
        odds: deriveVipOdds(p),
      });

      if (!ok) {
        showNotice(
          `Could not add match. Max ${maxMatches || 20} matches allowed.`,
          "error",
        );
        return;
      }

      showNotice("Added to Betslip.", "success");
    },
    [
      addMatch,
      canAddMore,
      hasKickoffPassed,
      isMatchInBetslip,
      maxMatches,
      showNotice,
    ],
  );

  const picks = useMemo(() => {
    const arr = Array.isArray(effectiveData?.picks) ? effectiveData.picks : [];
    const sorted = [...arr].sort((a, b) => {
      const ca = pct(a?.chance ?? a?.confidence);
      const cb = pct(b?.chance ?? b?.confidence);
      const ra = pct(a?.rating);
      const rb = pct(b?.rating);
      const va = pct(a?.vipScore) || Math.round(ca * 0.55 + ra * 0.45);
      const vb = pct(b?.vipScore) || Math.round(cb * 0.55 + rb * 0.45);

      if (sortKey === "chance") return cb - ca;
      if (sortKey === "rating") return rb - ra;
      return vb - va;
    });

    return sorted;
  }, [effectiveData, sortKey]);

  const picksVM = useMemo(() => {
    return picks.map((p, idx) => {
      const chance = pct(p?.chance ?? p?.confidence);
      const rating = pct(p?.rating);
      const vipScore =
        pct(p?.vipScore) || Math.round(chance * 0.55 + rating * 0.45);
      const fairOdds = oddsFromProbPercent(chance);
      const valueLabel = valueTag(vipScore);
      const matchLabel = String(p?.match || "").trim();

      const splitTeams = (label) => {
        if (!label) return ["", ""];

        if (label.includes(" vs ")) return label.split(" vs ");
        if (label.includes(" VS ")) return label.split(" VS ");
        if (label.includes(" v ")) return label.split(" v ");
        if (label.includes(" - ")) return label.split(" - ");

        return [p?.homeTeam || p?.home || "", p?.awayTeam || p?.away || ""];
      };

      const [homeTeamRaw, awayTeamRaw] = splitTeams(matchLabel);
      const homeTeam = String(
        homeTeamRaw || p?.homeTeam || p?.home || "",
      ).trim();
      const awayTeam = String(
        awayTeamRaw || p?.awayTeam || p?.away || "",
      ).trim();

      const form = p?.form || {};
      const homeStr = String(
        form.homeStr ?? p?.homeStr ?? p?.homeForm ?? "",
      ).trim();
      const awayStr = String(
        form.awayStr ?? p?.awayStr ?? p?.awayForm ?? "",
      ).trim();
      const homeGrade = form.homeGrade ?? p?.homeGrade ?? "";
      const awayGrade = form.awayGrade ?? p?.awayGrade ?? "";

      const ms = p?.marketSignal || {};
      const msHome = pct(ms.marketHomeForm ?? p?.marketHomeForm);
      const msAway = pct(ms.marketAwayForm ?? p?.marketAwayForm);
      const msRating = pct(ms.marketRating ?? p?.marketRating ?? chance);

      const kickoffPassed = hasKickoffPassed(p);
      const alreadyAdded = Boolean(p?.match && isMatchInBetslip(p.match));

      const compareDisabled = !matchLabel || !homeTeam || !awayTeam;
      const hasFormData = Boolean(homeStr || awayStr || homeGrade || awayGrade);
      const hasMarketSignal = Boolean(
        msHome || msAway || msRating !== chance
          ? true
          : Boolean(p?.marketSignal),
      );

      return {
        id: p.id || `vip-${idx}`,
        raw: p,
        match:
          p.match || (homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : ""),
        homeTeam,
        awayTeam,
        home: homeTeam,
        away: awayTeam,
        homeTeamName: homeTeam,
        awayTeamName: awayTeam,
        league: p.league,
        fullLeague: p.fullLeague || p.league || "",
        date: p.date,
        time: p.time,
        market: p.market,
        pickLabel: p.pickLabel,
        predictedScore: p.predictedScore,
        chance,
        rating,
        vipScore,
        homeStr,
        awayStr,
        homeGrade,
        awayGrade,
        msHome,
        msAway,
        msRating,
        kickoffPassed,
        alreadyAdded,
        fairOdds,
        valueLabel,
        compareDisabled,
        hasFormData,
        hasMarketSignal,
      };
    });
  }, [picks, isMatchInBetslip, hasKickoffPassed]);

  const vipSummary = useMemo(() => {
    const count = picksVM.length;

    const avgChance = count
      ? Math.round(
          picksVM.reduce((a, p) => a + (Number(p.chance) || 0), 0) / count,
        )
      : 0;

    const avgRating = count
      ? Math.round(
          picksVM.reduce((a, p) => a + (Number(p.rating) || 0), 0) / count,
        )
      : 0;

    const top = count ? picksVM[0] : null;

    return { count, avgChance, avgRating, top };
  }, [picksVM]);

  const onToggleExpanded = useCallback((id) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  const onCompare = useCallback(
    (p) => {
      const matchLabel = String(p?.match || p?.raw?.match || "").trim();

      const splitTeams = (label = "") => {
        const s = String(label || "").trim();

        if (s.includes(" - ")) return s.split(" - ").map((x) => x.trim());
        if (s.includes(" vs ")) return s.split(" vs ").map((x) => x.trim());
        if (s.includes(" VS ")) return s.split(" VS ").map((x) => x.trim());
        if (s.includes(" v ")) return s.split(" v ").map((x) => x.trim());

        return ["", ""];
      };

      const [parsedHome, parsedAway] = splitTeams(matchLabel);

      const homeTeam = String(
        p?.homeTeam || p?.home || p?.homeTeamName || parsedHome || "",
      ).trim();

      const awayTeam = String(
        p?.awayTeam || p?.away || p?.awayTeamName || parsedAway || "",
      ).trim();

      const fullLeague = String(
        p?.fullLeague ||
          p?.league ||
          p?.raw?.fullLeague ||
          p?.raw?.league ||
          "",
      ).trim();

      const [countryPartRaw, leaguePartRaw] = fullLeague
        .split("•")
        .map((x) => String(x || "").trim());

      const country = String(
        p?.country || p?.raw?.country || countryPartRaw || "",
      ).trim();

      const leagueName = String(
        p?.leagueName ||
          p?.raw?.leagueName ||
          leaguePartRaw ||
          fullLeague ||
          "",
      ).trim();

      const normalizedMatch =
        matchLabel || (homeTeam && awayTeam ? `${homeTeam} - ${awayTeam}` : "");

      if (!normalizedMatch || !homeTeam || !awayTeam || !leagueName) {
        showNotice("Comparison data unavailable for this VIP pick.", "warn");
        return;
      }

      setComparePick({
        ...(p?.raw || {}),
        ...p,
        match: normalizedMatch,
        homeTeam,
        awayTeam,
        home: homeTeam,
        away: awayTeam,
        homeTeamName: homeTeam,
        awayTeamName: awayTeam,
        country,
        league: leagueName,
        fullLeague:
          fullLeague ||
          (country && leagueName ? `${country} • ${leagueName}` : leagueName),
      });
    },
    [showNotice],
  );

  const onAdd = useCallback(
    (p) => handleAddVipToBetslip(p),
    [handleAddVipToBetslip],
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Hard gate UI only after hooks are safely called
  if (!isPro) {
    return (
      <div className="space-y-4">
        <NoticeBanner
          notice={notice}
          darkMode={darkMode}
          onClose={() => setNotice(null)}
        />

        <Card darkMode={darkMode}>
          <div
            className={cn(
              "p-5",
              darkMode
                ? "bg-gradient-to-r from-yellow-500/10 to-transparent"
                : "bg-gradient-to-r from-yellow-50 to-white",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center border",
                    darkMode
                      ? "bg-yellow-500/10 border-yellow-500/20"
                      : "bg-yellow-100 border-yellow-200",
                  )}
                >
                  <Crown
                    className={cn(
                      darkMode ? "text-yellow-200" : "text-yellow-700",
                    )}
                    size={18}
                  />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold">
                    VIP Picks (Today)
                  </h2>
                  <p
                    className={cn(
                      "text-sm",
                      darkMode ? "text-gray-300" : "text-gray-600",
                    )}
                  >
                    Premium-only high-signal picks for disciplined betting and
                    advanced match selection.
                  </p>
                </div>
              </div>

              <Pill darkMode={darkMode} tone="yellow">
                <Lock size={14} />
                Premium
              </Pill>
            </div>

            <div
              className={cn(
                "mt-4 rounded-2xl border p-4",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white",
              )}
            >
              <div className="flex items-center gap-2">
                <Lock
                  size={16}
                  className={cn(darkMode ? "text-gray-200" : "text-gray-800")}
                />
                <h3 className="font-semibold">Premium content</h3>
              </div>

              <p
                className={cn(
                  "mt-1 text-sm",
                  darkMode ? "text-gray-300" : "text-gray-600",
                )}
              >
                Upgrade to unlock VIP picks, market confirmation, compare tools,
                and premium betslip workflow.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill darkMode={darkMode} tone="purple">
                  <Sparkles size={14} /> VIP filters + ranking
                </Pill>
                <Pill darkMode={darkMode} tone="blue">
                  <BarChart3 size={14} /> Compare teams
                </Pill>
                <Pill darkMode={darkMode} tone="green">
                  <Trophy size={14} /> Highest-signal only
                </Pill>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading && !effectiveData) {
    return (
      <div className="space-y-4">
        <NoticeBanner
          notice={notice}
          darkMode={darkMode}
          onClose={() => setNotice(null)}
        />

        <Card darkMode={darkMode}>
          <SectionHeader
            darkMode={darkMode}
            title="VIP Picks (Today)"
            subtitle="Loading premium picks…"
            right={
              <Pill darkMode={darkMode} tone="blue">
                {preferLite ? <WifiOff size={12} /> : <Wifi size={12} />}
                {preferLite ? "Lite mode" : "Premium"}
              </Pill>
            }
          />
          <div className="p-4 space-y-4">
            <VipPickCardSkeleton darkMode={darkMode} />
            <VipPickCardSkeleton darkMode={darkMode} />
            <VipPickCardSkeleton darkMode={darkMode} />
          </div>
        </Card>
      </div>
    );
  }

  if (error && !effectiveData) {
    return (
      <div className="space-y-4">
        <NoticeBanner
          notice={notice}
          darkMode={darkMode}
          onClose={() => setNotice(null)}
        />

        <Card darkMode={darkMode}>
          <div className="p-6">
            <div className="text-rose-500 font-semibold">
              Failed to load VIP picks
            </div>

            <div
              className={cn(
                "text-sm mt-1",
                darkMode ? "text-gray-300" : "text-gray-600",
              )}
            >
              {String(error?.message || "")}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton onClick={onRefresh}>
                <RefreshCw size={16} />
                Retry
              </PrimaryButton>

              <SoftButton
                darkMode={darkMode}
                onClick={() => {
                  const cached = getSavedVipData();
                  if (cached) {
                    setSavedData(cached);
                    showNotice("Loaded last saved VIP data.", "info");
                  } else {
                    showNotice("No saved VIP data found.", "warn");
                  }
                }}
              >
                <Clock3 size={16} />
                Use saved data
              </SoftButton>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comparePick && (
        <TeamComparisonModal
          match={comparePick}
          onClose={() => setComparePick(null)}
          darkMode={darkMode}
        />
      )}

      <NoticeBanner
        notice={notice}
        darkMode={darkMode}
        onClose={() => setNotice(null)}
      />

      <Card darkMode={darkMode}>
        <div
          className={cn(
            "p-5",
            darkMode
              ? "bg-gradient-to-r from-yellow-500/10 to-transparent"
              : "bg-gradient-to-r from-yellow-50 to-white",
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center border",
                  darkMode
                    ? "bg-yellow-500/10 border-yellow-500/20"
                    : "bg-yellow-100 border-yellow-200",
                )}
              >
                <Crown
                  className={cn(
                    darkMode ? "text-yellow-200" : "text-yellow-700",
                  )}
                  size={18}
                />
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-extrabold">
                  VIP Picks (Today)
                </h2>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                  <div
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm",
                      darkMode
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-amber-50 border-amber-300 text-amber-700"
                    )}
                  >
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500/20 text-[9px] shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                      🎯
                    </span>
                    Chance ≥ {thresholds.minChance}% &bull; Rating ≥ {thresholds.minRating}%
                  </div>

                  <div
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm",
                      darkMode
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-blue-50 border-blue-300 text-blue-700"
                    )}
                  >
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500/20 text-[9px] shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                      🤖
                    </span>
                    Poisson xG Computed
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
              <div
                className={cn(
                  "inline-flex rounded-xl border overflow-hidden",
                  darkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSortKey("vip")}
                  className={cn(
                    "px-3 py-2 text-xs font-semibold transition",
                    sortKey === "vip"
                      ? darkMode
                        ? "bg-white/10 text-white"
                        : "bg-gray-900 text-white"
                      : darkMode
                        ? "text-gray-200 hover:bg-white/10"
                        : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  VIP
                </button>

                <button
                  type="button"
                  onClick={() => setSortKey("chance")}
                  className={cn(
                    "px-3 py-2 text-xs font-semibold transition",
                    sortKey === "chance"
                      ? "bg-yellow-500 text-white"
                      : darkMode
                        ? "text-gray-200 hover:bg-white/10"
                        : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  Chance
                </button>

                <button
                  type="button"
                  onClick={() => setSortKey("rating")}
                  className={cn(
                    "px-3 py-2 text-xs font-semibold transition",
                    sortKey === "rating"
                      ? "bg-blue-600 text-white"
                      : darkMode
                        ? "text-gray-200 hover:bg-white/10"
                        : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  Rating
                </button>
              </div>

              <SoftButton
                darkMode={darkMode}
                onClick={() => setShowGuide((s) => !s)}
                title="Open VIP guide"
              >
                <CircleHelp size={18} />
                {showGuide ? "Hide guide" : "Guide"}
              </SoftButton>

              <SoftButton
                darkMode={darkMode}
                onClick={onRefresh}
                disabled={isRefetching}
                title="Refresh VIP workspace"
              >
                <RefreshCw
                  size={18}
                  className={isRefetching ? "animate-spin" : ""}
                />
              </SoftButton>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Pill darkMode={darkMode} tone={preferLite ? "blue" : "green"}>
              {preferLite ? <WifiOff size={12} /> : <Wifi size={12} />}
              {preferLite ? "Slow network mode" : "Standard premium mode"}
            </Pill>

            {compactMode ? (
              <Pill darkMode={darkMode} tone="gray">
                Lite payload
              </Pill>
            ) : null}

            {isStale ? (
              <Pill darkMode={darkMode} tone="yellow">
                <Clock3 size={12} />
                Stale cache
              </Pill>
            ) : null}

            {usingSavedFallback ? (
              <Pill darkMode={darkMode} tone="yellow">
                <Clock3 size={12} />
                Using saved data
              </Pill>
            ) : null}

            {generatedAt ? (
              <Pill darkMode={darkMode} tone="gray">
                Last updated {formatUpdatedAt(generatedAt)}
              </Pill>
            ) : null}

            {isFetching && !isRefetching ? (
              <Pill darkMode={darkMode} tone="blue">
                Refreshing…
              </Pill>
            ) : null}
          </div>

          {showGuide && (
            <div
              className={cn(
                "mt-4 rounded-2xl border p-4",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white",
              )}
            >
              <div className="flex items-center gap-2">
                <CircleHelp
                  size={16}
                  className={cn(darkMode ? "text-gray-100" : "text-gray-900")}
                />
                <h3 className="font-semibold">VIP Guide</h3>
              </div>

              <div
                className={cn(
                  "mt-2 text-sm space-y-2 leading-7",
                  darkMode ? "text-gray-200" : "text-gray-700",
                )}
              >
                <p>
                  <b>Pick Label</b> is the final market selection chosen for the
                  VIP card.
                </p>
                <p>
                  <b>Predicted score</b> is the most likely scoreline produced
                  from the model’s score projection.
                </p>
                <p>
                  <b>Chance</b> is the computed probability for the selected
                  market outcome.
                </p>
                <p>
                  <b>Rating</b> is the model quality and stability score for the
                  pick.
                </p>
                <p>
                  <b>VIP score</b> is the ranking score used to sort stronger
                  opportunities after filtering.
                </p>
                <p>
                  <b>Fair odds</b> are derived from probability using
                  <b> 1 / probability</b> after converting percentage chance to
                  decimal probability.
                </p>
                <p>
                  <b>Value / Solid / Edge</b> are VIP labels based on VIP score:
                  stronger scores receive stronger tags.
                </p>
                <p>
                  <b>Market rating</b> measures how strongly market-specific
                  stats support the selected pick.
                </p>
                <p>
                  <b>Home form</b> and <b>Away form</b> summarize recent
                  results, while <b>Grade</b> gives a simple quality label for
                  that form.
                </p>
                <p>
                  <b>Lite payload</b> means a lighter data mode was used,
                  usually to help slower networks.
                </p>
                <p>
                  <b>Stale cache</b> means saved data is being shown because the
                  latest refresh is older than normal.
                </p>
                <p>
                  <b>Using saved data</b> means the page is showing the last
                  stored VIP result when a fresh fetch is unavailable.
                </p>
              </div>
            </div>
          )}

          <div
            className={cn(
              "mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2",
              darkMode ? "text-gray-200" : "text-gray-800",
            )}
          >
            <div
              className={cn(
                "rounded-2xl border px-3 py-2",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white",
              )}
            >
              <div
                className={cn(
                  "text-[11px]",
                  darkMode ? "text-gray-400" : "text-gray-500",
                )}
              >
                Picks
              </div>
              <div className="text-sm font-extrabold">{vipSummary.count}</div>
            </div>

            <div
              className={cn(
                "rounded-2xl border px-3 py-2",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white",
              )}
            >
              <div
                className={cn(
                  "text-[11px]",
                  darkMode ? "text-gray-400" : "text-gray-500",
                )}
              >
                Avg chance
              </div>
              <div className="text-sm font-extrabold">
                {vipSummary.avgChance}%
              </div>
            </div>

            <div
              className={cn(
                "rounded-2xl border px-3 py-2",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white",
              )}
            >
              <div
                className={cn(
                  "text-[11px]",
                  darkMode ? "text-gray-400" : "text-gray-500",
                )}
              >
                Avg rating
              </div>
              <div className="text-sm font-extrabold">
                {vipSummary.avgRating}%
              </div>
            </div>

            <div
              className={cn(
                "rounded-2xl border px-3 py-2",
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white",
              )}
            >
              <div
                className={cn(
                  "text-[11px]",
                  darkMode ? "text-gray-400" : "text-gray-500",
                )}
              >
                Top pick
              </div>
              <div className="text-sm font-extrabold truncate">
                {vipSummary.top?.match ? vipSummary.top.match : "—"}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {picksVM.length === 0 ? (
        <Card darkMode={darkMode}>
          <div className="p-6">
            <div className="font-semibold">
              No high-signal VIP picks available
            </div>
            <p
              className={cn(
                "mt-1 text-sm",
                darkMode ? "text-gray-300" : "text-gray-600",
              )}
            >
              Low-edge or thin-data matches are excluded to preserve quality.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {picksVM.map((p) => {
            const disabled = p.kickoffPassed || p.alreadyAdded || betslipFull;

            return (
              <VipPickCard
                key={p.id}
                p={p}
                darkMode={darkMode}
                expanded={expandedId === p.id}
                onToggle={() => onToggleExpanded(p.id)}
                onCompare={onCompare}
                onAdd={onAdd}
                disabled={disabled}
                kickoffPassed={p.kickoffPassed}
                alreadyAdded={p.alreadyAdded}
                msRating={p.msRating}
                maxMatches={maxMatches}
                compareDisabled={p.compareDisabled}
              />
            );
          })}
        </div>
      )}

      <div
        className={cn(
          "text-xs px-1 flex flex-wrap items-center gap-2",
          darkMode ? "text-gray-400" : "text-gray-500",
        )}
      >
        <span>VIP list refreshes on demand</span>
        <span>•</span>
        <span>Auto-expire at midnight</span>
        {usingSavedFallback || isStale ? (
          <>
            <span>•</span>
            <span>Showing cached/saved fallback</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
