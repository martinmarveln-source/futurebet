// @ts-nocheck
"use client";

import React from "react";
import { createPortal } from "react-dom";
import useUser from "@/utils/useUser";
import useUserPermissions from "@/hooks/useUserPermissions";
import {
  X,
  ArrowLeft,
  Sparkles,
  Gauge,
  Target,
  Swords,
  CheckCircle2,
  Lock,
  Copy,
  BarChart3,
  List,
  History,
  Shield,
  BookOpen,
  Share2,
  Terminal,
} from "lucide-react";
import UpgradeButton from "./UpgradeButton";
const PLAN_ORDER = {
  free: 0,
  silver: 1,
  premium: 2,
  admin: 3,
};

function normalizePlan(value = "") {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (["free", "silver", "premium", "admin"].includes(v)) return v;
  return "free";
}

function resolveUserPlan({
  user = {},
  isPremium = false,
  isSilver = false,
} = {}) {
  const rawPlan = String(user?.plan || "").trim();
  if (rawPlan) return normalizePlan(rawPlan);

  const role = normalizePlan(user?.user_role ?? user?.role);
  const subscription = normalizePlan(user?.subscription_status);

  if (role === "admin") return "admin";
  if (subscription === "premium" || role === "premium" || isPremium)
    return "premium";
  if (subscription === "silver" || role === "silver" || isSilver)
    return "silver";

  return "free";
}

const FEATURE_MINIMUM_PLAN = {
  overview: "free",
  stats: "free",
  recent: "silver",
  h2h: "silver",
  intelligence: "premium",
};

function hasFeatureAccess(plan = "free", feature = "overview") {
  const normalizedPlan = normalizePlan(plan);
  const requiredPlan = FEATURE_MINIMUM_PLAN[feature] || "premium";

  if (normalizedPlan === "admin") return true;

  return PLAN_ORDER[normalizedPlan] >= PLAN_ORDER[requiredPlan];
}

function getFeatureAccessMeta(feature = "overview") {
  const meta = {
    recent: {
      title: "Recent Form",
      requiredPlan: "silver",
      ctaLabel: "Upgrade to Silver",
      description:
        "Unlock recent form, last 5 matches, and stronger momentum context.",
    },
    h2h: {
      title: "Head-to-Head",
      requiredPlan: "silver",
      ctaLabel: "Upgrade to Silver",
      description:
        "Unlock recent meetings, goal trends, and BTTS / Over 2.5 patterns.",
    },
    intelligence: {
      title: "Premium Intelligence",
      requiredPlan: "premium",
      ctaLabel: "Upgrade to Premium",
      description:
        "Unlock the AI-style match breakdown, Monte Carlo simulation, fair odds, and stake guidance.",
    },
  };

  return (
    meta[feature] || {
      title: "Premium Content",
      requiredPlan: "premium",
      ctaLabel: "Upgrade",
      description: "Unlock this premium feature.",
    }
  );
}
const TEAM_COMPARISON_MODAL_GUIDE = [
  {
    key: "overview",
    title: "Overview",
    access: "Free+",
    description:
      "Quick matchup summary, form snapshot, league position, and structural read before diving deeper.",
  },
  {
    key: "stats",
    title: "Stats",
    access: "Free+",
    description:
      "Side-by-side statistical comparison such as PPG, goals scored, goals conceded, BTTS %, Over 2.5 %, clean sheets, and failed-to-score rates.",
  },
  {
    key: "recent",
    title: "Recent",
    access: "Silver+",
    description:
      "Last matches for both teams to measure momentum, short-term form, and whether a side is currently stable or inconsistent.",
  },
  {
    key: "h2h",
    title: "H2H",
    access: "Silver+",
    description:
      "Recent meetings between both teams, including scorelines and quick BTTS / Over 2.5 pattern clues.",
  },
  {
    key: "intelligence",
    title: "Intelligence",
    access: "Premium+",
    description:
      "Premium AI-style breakdown with outcome probabilities, fair odds, simulation insights, risk flags, and stake guidance.",
  },
];

const TEAM_COMPARISON_MODAL_GLOSSARY = [
  {
    term: "PPG",
    meaning:
      "Points Per Game. Higher values usually reflect stronger league performance.",
  },
  {
    term: "BTTS %",
    meaning:
      "Both Teams To Score pattern rate. Higher values suggest both sides often find the net.",
  },
  {
    term: "Over 2.5 %",
    meaning: "How often matches finish with 3 or more total goals.",
  },
  {
    term: "Clean Sheet %",
    meaning: "How often a team avoids conceding.",
  },
  {
    term: "Failed To Score %",
    meaning: "How often a team does not score.",
  },
];
/* =====================================================================================
  Premium + Fast UI Toolkit (JSX-only)
===================================================================================== */

const cx = (...classes) => classes.filter(Boolean).join(" ");

const Divider = ({ darkMode }) => (
  <div
    className={cx("h-px w-full", darkMode ? "bg-white/10" : "bg-gray-200")}
  />
);

const SectionHeader = React.memo(function SectionHeader({
  title,
  subtitle,
  darkMode,
  right,
}) {
  return (
    <div
      className={cx(
        "px-4 py-3 border-b",
        darkMode
          ? "border-white/10 bg-white/[0.03]"
          : "border-gray-200 bg-gray-50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <h4
            className={cx(
              "font-semibold",
              darkMode ? "text-white" : "text-gray-900"
            )}
          >
            {title}
          </h4>
          {subtitle ? (
            <p
              className={cx(
                "text-xs",
                darkMode ? "text-white/60" : "text-gray-600"
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
});

const CardShell = ({ children, darkMode, className = "" }) => (
  <div
    className={cx(
      "rounded-2xl border overflow-hidden shadow-sm",
      darkMode ? "border-white/10 bg-black/30" : "border-gray-200 bg-white",
      className
    )}
  >
    {children}
  </div>
);

const Pill = ({ children, tone = "neutral", darkMode, className = "" }) => {
  const tones = {
    neutral: darkMode
      ? "bg-white/10 text-white border-white/10"
      : "bg-gray-100 text-gray-800 border-gray-200",
    blue: darkMode
      ? "bg-blue-500/15 text-blue-100 border-blue-400/20"
      : "bg-blue-50 text-blue-800 border-blue-200",
    green: darkMode
      ? "bg-emerald-500/15 text-emerald-100 border-emerald-400/20"
      : "bg-emerald-50 text-emerald-800 border-emerald-200",
    yellow: darkMode
      ? "bg-amber-500/15 text-amber-100 border-amber-400/20"
      : "bg-amber-50 text-amber-800 border-amber-200",
    red: darkMode
      ? "bg-rose-500/15 text-rose-100 border-rose-400/20"
      : "bg-rose-50 text-rose-800 border-rose-200",
    purple: darkMode
      ? "bg-violet-500/15 text-violet-100 border-violet-400/20"
      : "bg-violet-50 text-violet-800 border-violet-200",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
        tones[tone] || tones.neutral,
        className
      )}
    >
      {children}
    </span>
  );
};

const PrimaryButton = ({ className = "", ...props }) => (
  <button
    {...props}
    className={cx(
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold",
      "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm",
      "hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
      className
    )}
  />
);

const SecondaryButton = ({ darkMode, className = "", ...props }) => (
  <button
    {...props}
    className={cx(
      "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold text-sm",
      darkMode
        ? "bg-white/8 text-white ring-1 ring-white/10 hover:bg-white/12"
        : "bg-white text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50",
      "active:scale-[0.99] transition",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
      className
    )}
  />
);

/* =====================================================================================
  Access Control (blur overlay)
===================================================================================== */

const BlurredSection = ({
  user = {},
  feature = "overview",
  children,
  upgradeUrl,
  learnMoreUrl,
  hardLock = false,
}) => {
  const plan = resolveUserPlan({ user });
  const hasAccess = hasFeatureAccess(plan, feature);
  const meta = getFeatureAccessMeta(feature);
  const finalLearnMoreUrl = learnMoreUrl;

  const open = (url) => {
    if (typeof window === "undefined" || !url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const lockedCard = (
    <div className="relative z-40 pointer-events-auto w-full max-w-md mx-4">
      <div className="rounded-2xl bg-white/95 ring-1 ring-black/5 shadow-xl p-5 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
          <Lock className="h-5 w-5" />
        </div>

        <p className="text-base font-semibold text-gray-900">
          {meta.ctaLabel} to unlock {meta.title}
        </p>

        <p className="mt-1 text-xs text-gray-600">{meta.description}</p>

        <div className="mt-2">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">
            Required plan: {meta.requiredPlan}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <UpgradeButton 
            plan={feature === "recent" || feature === "h2h" ? "silver" : "premium"}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            {meta.ctaLabel}
          </UpgradeButton>

          <SecondaryButton
            darkMode={false}
            onClick={(e) => {
              e.stopPropagation();
              open(finalLearnMoreUrl);
            }}
          >
            Learn more
          </SecondaryButton>
        </div>
      </div>
    </div>
  );

  if (!hasAccess && hardLock) {
    return (
      <div className="relative min-h-[240px] flex items-center justify-center rounded-2xl">
        <div className="absolute inset-0 rounded-2xl bg-black/25 backdrop-blur-[2px]" />
        {lockedCard}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={cx(hasAccess ? "" : "filter blur-sm pointer-events-none")}
      >
        {children}
      </div>

      {!hasAccess && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          onClick={() => open(finalUpgradeUrl)}
          role="button"
          tabIndex={0}
        >
          <div className="absolute inset-0 rounded-2xl bg-black/25 backdrop-blur-[2px]" />
          {lockedCard}
        </div>
      )}
    </div>
  );
};

/* =====================================================================================
  Tables
===================================================================================== */

const StatRow = React.memo(function StatRow({
  label,
  homeValue,
  awayValue,
  isPercentage = false,
  isGood = null,
  darkMode,
}) {
  const formatValue = (value) => {
    if (value === null || value === undefined) return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    if (isPercentage) {
      const percent = num > 1 ? num : num * 100;
      return `${Math.round(percent)}%`;
    }
    return num.toFixed(2);
  };

  const valA = Number(homeValue) || 0;
  const valB = Number(awayValue) || 0;
  const total = Math.abs(valA) + Math.abs(valB) || 1;

  const pctA = (Math.abs(valA) / total) * 100;
  const pctB = (Math.abs(valB) / total) * 100;

  let aWins = false;
  let bWins = false;
  if (isGood === "higher") {
    aWins = valA > valB;
    bWins = valB > valA;
  } else if (isGood === "lower") {
    aWins = valA < valB;
    bWins = valB < valA;
  }

  return (
    <div className="py-3">
      <div className="flex justify-between items-end mb-1.5 px-1">
        <div
          className={cx(
            "text-sm font-bold tabular-nums",
            aWins
              ? darkMode
                ? "text-blue-400"
                : "text-blue-600"
              : darkMode
              ? "text-white/60"
              : "text-gray-500"
          )}
        >
          {formatValue(homeValue)}
        </div>
        <div
          className={cx(
            "text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-center mx-2",
            darkMode ? "text-gray-500" : "text-gray-400"
          )}
        >
          {label}
        </div>
        <div
          className={cx(
            "text-sm font-bold tabular-nums",
            bWins
              ? darkMode
                ? "text-rose-400"
                : "text-rose-600"
              : darkMode
              ? "text-white/60"
              : "text-gray-500"
          )}
        >
          {formatValue(awayValue)}
        </div>
      </div>

      <div
        className={cx(
          "flex h-2.5 w-full rounded-full overflow-hidden shadow-inner",
          darkMode ? "bg-white/5" : "bg-gray-100"
        )}
      >
        <div
          className={cx(
            "h-full transition-all duration-1000 ease-out",
            aWins ? "bg-blue-500" : "bg-blue-500/30"
          )}
          style={{ width: `${pctA}%` }}
        />
        <div
          className={cx("w-1 z-10", darkMode ? "bg-[#0f172a]" : "bg-white")}
        />
        <div
          className={cx(
            "h-full transition-all duration-1000 ease-out",
            bWins ? "bg-rose-500" : "bg-rose-500/30"
          )}
          style={{ width: `${pctB}%` }}
        />
      </div>
    </div>
  );
});

const FormIndicator = React.memo(function FormIndicator({ form, ppg }) {
  const getFormColor = (result) => {
    switch (String(result || "").toUpperCase()) {
      case "W":
        return "bg-emerald-600 text-white";
      case "D":
        return "bg-amber-500 text-black";
      case "L":
        return "bg-rose-600 text-white";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  const getPPGColor = (ppgVal) => {
    const value = Number(ppgVal) || 0;
    if (value >= 2) return "bg-emerald-600 text-white";
    if (value >= 1) return "bg-amber-500 text-black";
    return "bg-rose-600 text-white";
  };

  const formArray = form ? String(form).split("").slice(-5) : [];

  return (
    <div className="flex items-center justify-center space-x-1">
      {formArray.map((result, index) => (
        <div
          key={index}
          className={cx(
            "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
            getFormColor(result)
          )}
        >
          {result}
        </div>
      ))}
      <div
        className={cx(
          "ml-2 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums",
          getPPGColor(ppg)
        )}
      >
        {Number.isFinite(Number(ppg)) ? Number(ppg).toFixed(2) : "0.00"}
      </div>
    </div>
  );
});

/* ---------- Parsing helpers (Recent matches + H2H) ---------- */

/* --- EA SPORTS POWER BAR ENGINE --- */
const PowerBar = React.memo(function PowerBar({
  label,
  homeVal,
  awayVal,
  maxVal,
  reverse = false,
  darkMode,
  homeTeam,
  awayTeam,
}) {
  const h = Number(homeVal) || 0;
  const a = Number(awayVal) || 0;
  const m = Number(maxVal) || Math.max(h, a, 1) * 1.2; // Add 20% headroom

  const hPct = clamp((h / m) * 100, 0, 100);
  const aPct = clamp((a / m) * 100, 0, 100);

  const hWins = reverse ? h < a : h > a;
  const aWins = reverse ? a < h : a > h;

  return (
    <div className="flex items-center gap-3 w-full my-2">
      {/* Home Side */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <div
          className={cx(
            "text-xs font-black tabular-nums",
            hWins
              ? "text-blue-500"
              : darkMode
              ? "text-white/50"
              : "text-gray-400"
          )}
        >
          {h.toFixed(2)}
        </div>
        <div
          className={cx(
            "h-2.5 rounded-l-full overflow-hidden w-full max-w-[120px] flex justify-end bg-black/5 dark:bg-white/5"
          )}
        >
          <div
            className={cx(
              "h-full transition-all duration-1000 ease-out rounded-l-full",
              hWins
                ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                : "bg-blue-500/30"
            )}
            style={{ width: `${hPct}%` }}
          />
        </div>
      </div>

      {/* Center Label */}
      <div
        className={cx(
          "w-20 shrink-0 text-[9px] font-black uppercase tracking-widest text-center",
          darkMode ? "text-gray-500" : "text-gray-400"
        )}
      >
        {label}
      </div>

      {/* Away Side */}
      <div className="flex-1 flex items-center justify-start gap-2">
        <div
          className={cx(
            "h-2.5 rounded-r-full overflow-hidden w-full max-w-[120px] flex justify-start bg-black/5 dark:bg-white/5"
          )}
        >
          <div
            className={cx(
              "h-full transition-all duration-1000 ease-out rounded-r-full",
              aWins
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                : "bg-rose-500/30"
            )}
            style={{ width: `${aPct}%` }}
          />
        </div>
        <div
          className={cx(
            "text-xs font-black tabular-nums",
            aWins
              ? "text-rose-500"
              : darkMode
              ? "text-white/50"
              : "text-gray-400"
          )}
        >
          {a.toFixed(2)}
        </div>
      </div>
    </div>
  );
});
/* --- END POWER BAR ENGINE --- */
const parseRecentMatches = (recentData, targetTeam) => {
  if (!recentData || typeof recentData !== "string") return [];
  const target = (targetTeam || "").toLowerCase();

  return recentData
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((m) => {
      const dateMatch = m.match(/^(\d{4}-\d{2}-\d{2})/);
      const matchDate = dateMatch ? dateMatch[1] : " ";

      const matchWithoutDate = m.replace(/^(\d{4}-\d{2}-\d{2})\s*/, "").trim();
      const [homePart, awayAndScore] = matchWithoutDate
        .split(" - ")
        .map((s) => s.trim());
      if (!homePart || !awayAndScore) return null;

      const scoreMatch = awayAndScore.match(/(\d+)\s*[:\-]\s*(\d+)/);
      if (!scoreMatch) return null;

      const homeTeamParsed = homePart;
      const awayTeamParsed = awayAndScore.replace(scoreMatch[0], "").trim();

      const homeScore = parseInt(scoreMatch[1], 10);
      const awayScore = parseInt(scoreMatch[2], 10);

      const isTargetHome = homeTeamParsed.toLowerCase().includes(target);
      const isTargetAway = awayTeamParsed.toLowerCase().includes(target);

      let outcome = "D";
      if (homeScore !== awayScore) {
        if (isTargetHome) outcome = homeScore > awayScore ? "W" : "L";
        else if (isTargetAway) outcome = awayScore > homeScore ? "W" : "L";
        else outcome = homeScore > awayScore ? "W" : "L";
      }

      return {
        date: matchDate,
        homeTeam: homeTeamParsed,
        awayTeam: awayTeamParsed,
        score: `${homeScore}-${awayScore}`,
        outcome,
        isTargetHome,
        isTargetAway,
      };
    })
    .filter(Boolean);
};

const parseH2HMatchesSimple = (raw) => {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((item) => {
      const dateMatch = item.match(/^(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : "";

      const rest = item.replace(/^(\d{4}-\d{2}-\d{2})\s*/, "").trim();
      const scoreMatch = rest.match(/(\d+)\s*[:\-]\s*(\d+)/);
      if (!scoreMatch) return null;

      const homeScore = parseInt(scoreMatch[1], 10);
      const awayScore = parseInt(scoreMatch[2], 10);
      const score = `${homeScore}-${awayScore}`;

      const teamsPart = rest.replace(scoreMatch[0], "").trim();
      let teamParts = teamsPart.split(" - ");
      if (teamParts.length !== 2)
        teamParts = teamsPart.split("-").map((s) => s.trim());

      const homeTeam = (teamParts[0] || "").trim();
      const awayTeam = (teamParts[1] || "").trim();

      return {
        date,
        homeTeam,
        awayTeam,
        score,
        over2: homeScore + awayScore > 2 ? "🟢 Y" : "🟡 N",
        btts: homeScore > 0 && awayScore > 0 ? "🟢 Y" : "🟡 N",
      };
    })
    .filter(Boolean);
};

/* =====================================================================================
  Math / helpers
===================================================================================== */

function parsePercentOrNumber(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  if (s.includes("%")) {
    const n = Number(s.replace("%", "").replace(",", ".").trim());
    if (!Number.isFinite(n)) return null;
    return n / 100;
  }
  const cleaned = s.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* =====================================================================================
  Premium Intelligence Engine (client-side, fast)
  - Multi-model blend (Poisson + form momentum + H2H + strength proxy)
  - Monte Carlo simulation for robustness
  - Generates "what + why" recommendations + risk flags
===================================================================================== */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function pct(v) {
  // accepts 0..1 or 0..100-ish, returns 0..1
  const n = safeNum(v, 0);
  return n > 1 ? clamp(n / 100, 0, 1) : clamp(n, 0, 1);
}
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// seeded RNG (deterministic) so memoization works nicely and results don’t jump
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Poisson sampler (Knuth) — OK for small lambdas typical in football
function samplePoisson(lambda, rnd) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
}

function computeRecentSignals(recent = [], teamName = "") {
  // recent: [{ outcome, score "x-y", isTargetHome/isTargetAway, ...}]
  if (!Array.isArray(recent) || recent.length === 0) {
    return {
      games: 0,
      points: 0,
      ppg: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      over15: 0,
      over25: 0,
      btts: 0,
    };
  }

  let points = 0;
  let gf = 0;
  let ga = 0;
  let over15 = 0;
  let over25 = 0;
  let btts = 0;

  for (const m of recent) {
    const out = String(m.outcome || "D");
    if (out === "W") points += 3;
    else if (out === "D") points += 1;

    const parts = String(m.score || "0-0")
      .split("-")
      .map((x) => safeNum(x, 0));
    const hs = parts[0] ?? 0;
    const as = parts[1] ?? 0;

    // map to team perspective
    const isHome = !!m.isTargetHome;
    const isAway = !!m.isTargetAway;

    let teamFor = 0;
    let teamAgainst = 0;

    if (isHome) {
      teamFor = hs;
      teamAgainst = as;
    } else if (isAway) {
      teamFor = as;
      teamAgainst = hs;
    } else {
      // fallback: assume first team is target (best-effort)
      teamFor = hs;
      teamAgainst = as;
    }

    gf += teamFor;
    ga += teamAgainst;

    const total = hs + as;
    if (total >= 2) over15 += 1;
    if (total >= 3) over25 += 1;
    if (hs > 0 && as > 0) btts += 1;
  }

  const g = recent.length;
  return {
    games: g,
    points,
    ppg: g ? points / g : 0,
    goalsFor: gf,
    goalsAgainst: ga,
    over15: g ? over15 / g : 0,
    over25: g ? over25 / g : 0,
    btts: g ? btts / g : 0,
  };
}

function computeH2HSignals(h2hRows = []) {
  if (!Array.isArray(h2hRows) || h2hRows.length === 0) {
    return { games: 0, avgGoals: 0, over25: 0, btts: 0 };
  }
  let totalGoals = 0;
  let over25 = 0;
  let btts = 0;

  for (const r of h2hRows) {
    const [hs, as] = String(r.score || "0-0")
      .split("-")
      .map((x) => safeNum(x, 0));
    const tot = hs + as;
    totalGoals += tot;
    if (tot >= 3) over25 += 1;
    if (hs > 0 && as > 0) btts += 1;
  }

  const g = h2hRows.length;
  return {
    games: g,
    avgGoals: g ? totalGoals / g : 0,
    over25: g ? over25 / g : 0,
    btts: g ? btts / g : 0,
  };
}

function buildFairOdds(prob) {
  const p = clamp(prob || 0, 0.0001, 0.9999);
  return 1 / p;
}

function gradeConfidence(pEdge, dataQuality) {
  // pEdge: separation between top outcome and runner-up
  // dataQuality: 0..1
  const score = clamp(0.55 * pEdge + 0.45 * dataQuality, 0, 1);
  if (score >= 0.72) return { label: "High", tone: "green", score };
  if (score >= 0.52) return { label: "Medium", tone: "yellow", score };
  return { label: "Low", tone: "red", score };
}

function cappedKelly(prob, oddsDecimal, cap = 0.06) {
  // Kelly fraction = (bp - q) / b, where b = odds-1
  const p = clamp(prob || 0, 0, 1);
  const o = Math.max(1.01, oddsDecimal || 1.01);
  const b = o - 1;
  const q = 1 - p;
  const f = (b * p - q) / b;
  return clamp(f, 0, cap);
}

function runMonteCarlo({ lambdaH, lambdaA, n = 6000, seed = 42 }) {
  const rnd = mulberry32(seed);
  let homeWin = 0,
    draw = 0,
    awayWin = 0;
  let over15 = 0,
    over25 = 0,
    btts = 0;

  // scoreline distribution (top few)
  const scoreCount = new Map();

  for (let i = 0; i < n; i++) {
    const hg = samplePoisson(lambdaH, rnd);
    const ag = samplePoisson(lambdaA, rnd);

    if (hg > ag) homeWin++;
    else if (hg === ag) draw++;
    else awayWin++;

    const tot = hg + ag;
    if (tot >= 2) over15++;
    if (tot >= 3) over25++;
    if (hg > 0 && ag > 0) btts++;

    const key = `${hg}-${ag}`;
    scoreCount.set(key, (scoreCount.get(key) || 0) + 1);
  }

  const toProb = (x) => x / n;
  const topScores = Array.from(scoreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([score, c]) => ({ score, p: c / n }));

  return {
    probs: {
      home: toProb(homeWin),
      draw: toProb(draw),
      away: toProb(awayWin),
      over15: toProb(over15),
      over25: toProb(over25),
      btts: toProb(btts),
    },
    topScores,
  };
}

/* =====================================================================================
  Analyst Sentence Library + Narrative Builder (drop-in)
  - Deterministic (seeded) so text doesn't jump around per render
  - "Human" analyst voice, but still grounded in your computed report values
===================================================================================== */

// simple deterministic picker (uses your mulberry32)
function pickFrom(list, rnd) {
  if (!Array.isArray(list) || list.length === 0) return "";
  const idx = Math.floor(rnd() * list.length);
  return list[Math.max(0, Math.min(list.length - 1, idx))];
}

function pctStr(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function num2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(2);
}

function safeTeam(s) {
  return String(s || "").trim() || "Team";
}

// removes placeholder/invalid H2H rows like 1899-12-30 or empty teams
function sanitizeH2HRows(rows = []) {
  return (rows || []).filter((r) => {
    const date = String(r?.date || "");
    if (date.startsWith("1899-12-30")) return false;
    const home = String(r?.homeTeam || "").trim();
    const away = String(r?.awayTeam || "").trim();
    return home.length > 1 && away.length > 1;
  });
}

// quick recent summarizer (no extra data required)
function summarizeRecent(recentRows = [], teamName = "") {
  const t = safeTeam(teamName);
  const g = recentRows?.length || 0;
  if (!g)
    return { line: `${t} have no recent-match sample logged here.`, g: 0 };

  let W = 0,
    D = 0,
    L = 0,
    gf = 0,
    ga = 0,
    over25 = 0,
    btts = 0,
    cs = 0;

  for (const m of recentRows) {
    const out = String(m?.outcome || "D");
    if (out === "W") W++;
    else if (out === "L") L++;
    else D++;

    const [hs, as] = String(m?.score || "0-0")
      .split("-")
      .map((x) => safeNum(x, 0));

    // map to team perspective
    const isHome = !!m?.isTargetHome;
    const isAway = !!m?.isTargetAway;

    let teamFor = 0;
    let teamAgainst = 0;
    if (isHome) {
      teamFor = hs;
      teamAgainst = as;
    } else if (isAway) {
      teamFor = as;
      teamAgainst = hs;
    } else {
      teamFor = hs;
      teamAgainst = as;
    }

    gf += teamFor;
    ga += teamAgainst;

    const total = hs + as;
    if (total >= 3) over25++;
    if (hs > 0 && as > 0) btts++;
    if (teamAgainst === 0) cs++;
  }

  const avgGF = g ? gf / g : 0;
  const avgGA = g ? ga / g : 0;

  const bits = [];
  bits.push(`${W}W-${D}D-${L}L`);
  bits.push(`avg ${avgGF.toFixed(2)} scored`);
  bits.push(`${avgGA.toFixed(2)} conceded`);
  if (cs) bits.push(`${cs} clean sheet${cs > 1 ? "s" : ""}`);
  if (over25) bits.push(`${over25}/${g} over 2.5`);
  if (btts) bits.push(`${btts}/${g} BTTS`);

  return {
    line: `${t} last ${g}: ${bits.join(" • ")}.`,
    g,
    W,
    D,
    L,
    avgGF,
    avgGA,
    cs,
    over25Rate: g ? over25 / g : 0,
    bttsRate: g ? btts / g : 0,
  };
}

const ANALYST_LIBRARY = {
  overviewOpeners: [
    "On paper, {AWAY} carry the stronger baseline, but {HOME} at home can pull games into uncomfortable rhythms.",
    "This has the feel of a stylistic clash: {HOME} tend to trade chances, while {AWAY} look more built for control and efficiency.",
    "The table position tells one story ({homePos} vs {awayPos}), but the goal profile suggests the match state could swing quickly.",
    "{HOME}–{AWAY} reads like a matchup where one side wants tempo and chaos, and the other wants structure and control.",
  ],
  overviewScripts: [
    "The key battle is whether {HOME} can create volume chances, or whether {AWAY} win territory and keep the game on their terms.",
    "If {AWAY} get the first goal, they’re well set up to manage phases and squeeze the match. If {HOME} score first, it can open up fast.",
    "From a betting perspective, the most repeatable angle is usually the one that survives a messy game state.",
    "The data points to a clear lean, but the safest interpretation is to respect the match-state scenarios rather than forcing a single narrative.",
  ],
  overviewLeanClosers: [
    "Lean: {LEAN}, because the main failure mode here is {RISK}.",
    "Lean: {LEAN}. If it goes wrong, it’s usually via {RISK}.",
    "Lean: {LEAN} — it protects you against {RISK}.",
  ],

  statsBullets: {
    homeAtkVsAwayDef: [
      "{HOME} average {hGS} goals at home, but {AWAY} concede only {aGC} away — that’s a real clash between chance creation and defensive control.",
      "{HOME}'s home scoring ({hGS}) meets {AWAY}'s away concession ({aGC}). If {AWAY} keep their shape, {HOME} may have to be patient.",
      "The headline duel is {HOME} home attack ({hGS}) versus {AWAY} away defence ({aGC}). The away side’s structure is the stabiliser.",
    ],
    awayAtkVsHomeDef: [
      "{AWAY} average {aGS} away and {HOME} concede {hGC} at home — that combination usually produces away chances on the break and set pieces.",
      "Away chance generation looks reliable: {AWAY} at {aGS} away versus {HOME} allowing {hGC} at home.",
      "Even if it’s not dominant, {AWAY} should create enough: {aGS} away into {hGC} conceded by {HOME} at home.",
    ],
    goalEnvHigh: [
      "The goal environment leans open: model expects λ ≈ {lambdaT}. That usually means one early goal can flip the match into end-to-end phases.",
      "Totals profile is lively (λ ≈ {lambdaT}), so the game can swing quickly once the first goal lands.",
      "With λ ≈ {lambdaT} expected goals, this isn’t a match you want to overcomplicate — the ball should find the net often enough.",
    ],
    goalEnvMid: [
      "The totals picture is mixed: λ ≈ {lambdaT}. That’s not a pure goals match, so safer goal lines make more sense than aggressive ones.",
      "Goal expectation is moderate (λ ≈ {lambdaT}). The match state will matter more than usual.",
      "The model lands in the middle on totals (λ ≈ {lambdaT}), so it’s a spot for discipline rather than guessing a shootout.",
    ],
    goalEnvLow: [
      "This looks tighter by profile: λ ≈ {lambdaT}. Margins and timing matter — especially if the first goal is late.",
      "Low goal expectation (λ ≈ {lambdaT}) points to a match where patience wins and one moment can decide it.",
      "Totals lean controlled (λ ≈ {lambdaT}), which often drags the game toward cautious phases and fewer big swings.",
    ],
    reliability: [
      "Reliability check: {AWAY} show the steadier away profile (concede {aGC} away), while {HOME}'s home games are more variable (concede {hGC}).",
      "Repeatability matters: the side conceding less consistently tends to ‘travel’ better — here that leans toward {AWAY}.",
      "When you strip it down, the cleanest signal is defensive stability: {AWAY} concede {aGC} away compared to {HOME} conceding {hGC} at home.",
    ],
    marketTakeaway: [
      "Market takeaway: {TAKEAWAY} fits the most repeatable pattern in the data.",
      "Market takeaway: I’d rather back {TAKEAWAY} than force a high-variance straight outcome.",
      "Market takeaway: {TAKEAWAY} is the angle that survives more match states.",
    ],
  },

  recentFrames: [
    "Recent form is best used as a tilt — it can capture rhythm and confidence, but it’s still a small sample.",
    "Form matters, but keep it in its lane: it’s the ‘temperature check’, not the entire forecast.",
    "Momentum is useful, but don’t over-weight it — a few matches can distort the picture.",
  ],
  recentNetEffects: [
    "Net effect: this supports {SUPPORTS}, but the draw/variance scenario still exists.",
    "Net effect: it reinforces {SUPPORTS}, though you still want protection against a stubborn game state.",
    "Net effect: it leans toward {SUPPORTS}. Just remember recent data can be noisy.",
  ],

  h2hCautions: [
    "Head-to-head is context, not a driver — small samples can mislead.",
    "H2H can add flavour, but it shouldn’t override current-season indicators.",
    "Treat H2H as confirmation only: useful when it matches the profile, less useful when it doesn’t.",
  ],
  h2hNotes: [
    "From the valid meetings available, the goal pattern is {H2HPATTERN}.",
    "In the usable H2H sample, we see {H2HPATTERN}.",
    "The clean read from the valid H2H games is {H2HPATTERN}.",
  ],

  riskLabels: [
    {
      key: "draw",
      label: "Draw risk:",
      lines: [
        "Scoreline clustering and tight xG gaps often translate into long periods of stalemate.",
        "Even with a stronger side, these profiles can stall into a 1–1 / 0–0 type game state.",
        "If the favourite doesn’t score first, this can become a frustrating ‘control without separation’ match.",
      ],
    },
    {
      key: "volatility",
      label: "Volatility:",
      lines: [
        "A lively goal environment means one early goal can break your plan — protect with safer lines.",
        "When both teams can score, match state can swing quickly; avoid over-staking.",
        "Higher variance games punish straight outcomes; structure around coverage.",
      ],
    },
    {
      key: "thinRecent",
      label: "Data limits:",
      lines: [
        "Recent sample is thin here, so treat momentum as a light tilt.",
        "With limited recent matches logged, it’s harder to trust short-term trends.",
        "Small recent sample increases noise — don’t let it dominate your decision.",
      ],
    },
    {
      key: "thinH2H",
      label: "H2H reliability:",
      lines: [
        "H2H sample is limited and may not reflect current tactical reality.",
        "A small H2H set can overfit — treat it as supporting context only.",
        "Use H2H as confirmation, not a foundation.",
      ],
    },
    {
      key: "tightXg",
      label: "Tight game warning:",
      lines: [
        "Expected goals are very close — that’s where randomness bites hardest.",
        "This is a ‘small margins’ match by the numbers; a set-piece can decide it.",
        "Tight profiles mean higher upset/draw risk even when one side is better.",
      ],
    },
  ],

  riskCloser: [
    "Risk management: when the main failure mode is {FAIL}, structure your play to survive it (cover, safer lines, smaller stake).",
    "Risk management: protect against {FAIL} — that’s usually where good reads get punished.",
    "Risk management: if you respect {FAIL}, you’ll be staking like a pro, not like a gambler.",
  ],
};

function buildAnalystNarrative({
  seed = 42,
  match,
  homeTeam,
  awayTeam,
  report,
  homeRecentRows,
  awayRecentRows,
  parsedH2HRows,
}) {
  const rnd = mulberry32(seed);

  const HOME = safeTeam(homeTeam);
  const AWAY = safeTeam(awayTeam);

  const positions = String(match?.table || "").split("|");
  const homePos = positions[0] || "—";
  const awayPos = positions[1] || "—";

  // key values
  const hGS = num2(match?.hgs);
  const aGS = num2(match?.ags);
  const hGC = num2(match?.hgc);
  const aGC = num2(match?.agc);

  const lambdaT = num2(report?.lambdas?.total);
  const p1 = report?.probs?.home ?? 0;
  const px = report?.probs?.draw ?? 0;
  const p2 = report?.probs?.away ?? 0;

  // decide lean label (based on your recs[0])
  const leanMarket = String(
    report?.recs?.[0]?.market || "safer coverage"
  ).trim();

  // main risk (high-level)
  const mainRisk =
    px >= 0.28
      ? "a stubborn draw game state"
      : Math.abs(
          (report?.lambdas?.lambdaH ?? 0) - (report?.lambdas?.lambdaA ?? 0)
        ) < 0.15
      ? "a tight ‘small margins’ match"
      : report?.probs?.btts >= 0.58
      ? "volatility after an early goal"
      : "match-state swings";

  // totals bucket for stats line
  const total = Number(report?.lambdas?.total || 0);
  const totalBucket = total >= 3.0 ? "high" : total <= 2.2 ? "low" : "mid";

  // recent summaries
  const homeRec = summarizeRecent(homeRecentRows, HOME);
  const awayRec = summarizeRecent(awayRecentRows, AWAY);

  // supports what?
  const topOutcome = report?.ordered?.[0]?.label || "the top outcome";
  const supportsWhat =
    report?.conf?.label === "High"
      ? `a confident lean toward ${topOutcome}`
      : report?.ordered?.[0]?.key === "X"
      ? "a cautious, draw-aware approach"
      : `a lean toward ${topOutcome}, with protection`;

  // H2H summary
  const cleanH2H = sanitizeH2HRows(parsedH2HRows);
  const h2hGames = cleanH2H.length;
  const h2hSignals = computeH2HSignals(cleanH2H);
  const h2hPattern = !h2hGames
    ? "no reliable fixture sample in the table"
    : `avg goals ${h2hSignals.avgGoals.toFixed(2)} • BTTS ${Math.round(
        h2hSignals.btts * 100
      )}% • Over 2.5 ${Math.round(h2hSignals.over25 * 100)}%`;

  // build Overview paragraph
  const opener = pickFrom(ANALYST_LIBRARY.overviewOpeners, rnd);
  const scriptA = pickFrom(ANALYST_LIBRARY.overviewScripts, rnd);
  const scriptB = pickFrom(
    ANALYST_LIBRARY.overviewScripts.filter((x) => x !== scriptA),
    rnd
  );
  const closer = pickFrom(ANALYST_LIBRARY.overviewLeanClosers, rnd);

  const overview = [opener, scriptA, scriptB, closer]
    .join(" ")
    .replaceAll("{HOME}", HOME)
    .replaceAll("{AWAY}", AWAY)
    .replaceAll("{homePos}", homePos)
    .replaceAll("{awayPos}", awayPos)
    .replaceAll("{LEAN}", leanMarket)
    .replaceAll("{RISK}", mainRisk);

  // build Stats paragraph (4 bullets as sentences)
  const S = ANALYST_LIBRARY.statsBullets;

  const homeAtk = pickFrom(S.homeAtkVsAwayDef, rnd);
  const awayAtk = pickFrom(S.awayAtkVsHomeDef, rnd);

  const goalEnv =
    totalBucket === "high"
      ? pickFrom(S.goalEnvHigh, rnd)
      : totalBucket === "low"
      ? pickFrom(S.goalEnvLow, rnd)
      : pickFrom(S.goalEnvMid, rnd);

  const reliab = pickFrom(S.reliability, rnd);

  // takeaway decision:
  // if confidence isn't High => prefer safer coverage.
  const takeaway =
    report?.conf?.label === "High"
      ? report?.recs?.[0]?.market || "the primary outcome"
      : report?.recs?.[0]?.market || "Double Chance / safer lines";

  const takeawayLine = pickFrom(S.marketTakeaway, rnd);

  const stats = [homeAtk, awayAtk, goalEnv, reliab, takeawayLine]
    .join(" ")
    .replaceAll("{HOME}", HOME)
    .replaceAll("{AWAY}", AWAY)
    .replaceAll("{hGS}", hGS)
    .replaceAll("{aGS}", aGS)
    .replaceAll("{hGC}", hGC)
    .replaceAll("{aGC}", aGC)
    .replaceAll("{lambdaT}", lambdaT)
    .replaceAll("{TAKEAWAY}", String(takeaway));

  // build Recent paragraph
  const recentFrame = pickFrom(ANALYST_LIBRARY.recentFrames, rnd);
  const net = pickFrom(ANALYST_LIBRARY.recentNetEffects, rnd).replaceAll(
    "{SUPPORTS}",
    supportsWhat
  );

  const recent = [homeRec.line, awayRec.line, recentFrame, net].join(" ");

  // build H2H paragraph
  const h2hCaution = pickFrom(ANALYST_LIBRARY.h2hCautions, rnd);
  const h2hNote = pickFrom(ANALYST_LIBRARY.h2hNotes, rnd).replaceAll(
    "{H2HPATTERN}",
    h2hGames ? h2hPattern : "no usable sample"
  );

  const h2h = [
    h2hCaution,
    h2hGames
      ? `${h2hNote}`
      : "There isn’t a usable recent fixture sample here, so this section is informational only.",
    h2hGames && parsedH2HRows?.length !== cleanH2H.length
      ? "Note: placeholder/invalid rows were ignored."
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  // build Risk flags (2–4, deterministic)
  const riskKeys = [];

  // use your existing risk conditions + some extra nuance
  if ((report?.quality ?? 1) < 0.55) riskKeys.push("thinRecent"); // closest label
  if ((cleanH2H?.length || 0) < 2) riskKeys.push("thinH2H");

  const tight =
    Math.abs(
      (report?.lambdas?.lambdaH ?? 0) - (report?.lambdas?.lambdaA ?? 0)
    ) < 0.15;
  if (tight) riskKeys.push("tightXg");

  const drawish =
    (px ?? 0) >= 0.28 || String(report?.ordered?.[0]?.key) === "X";
  if (drawish) riskKeys.push("draw");

  const volatile =
    (report?.probs?.btts ?? 0) >= 0.58 ||
    (report?.probs?.over25 ?? 0) >= 0.58 ||
    totalBucket === "high";
  if (volatile) riskKeys.push("volatility");

  // ensure uniqueness and cap 4
  const uniq = Array.from(new Set(riskKeys)).slice(0, 4);

  const riskCards = uniq
    .map((k) => {
      const entry = ANALYST_LIBRARY.riskLabels.find((x) => x.key === k);
      if (!entry) return null;
      const line = pickFrom(entry.lines, rnd);
      return `${entry.label} ${line}`;
    })
    .filter(Boolean);

  const failMode = drawish
    ? "the draw"
    : tight
    ? "small margins"
    : volatile
    ? "match volatility after the first goal"
    : "variance";

  const riskClose = pickFrom(ANALYST_LIBRARY.riskCloser, rnd).replaceAll(
    "{FAIL}",
    failMode
  );

  return {
    overview,
    stats,
    recent,
    h2h,
    riskCards,
    riskClose,
    meta: {
      leanMarket,
      mainRisk,
      totalBucket,
      topOutcome,
      probs: { p1, px, p2 },
      h2hGames,
    },
  };
}

const normalizeTeam = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const PremiumIntelligenceReport = React.memo(
  function PremiumIntelligenceReport({
    match,
    homeTeam,
    awayTeam,
    homeRecent,
    awayRecent,
    parsedH2H,
    leagueTable,
    darkMode,
    Pill,
    Divider,
  }) {
    // ---- Signals (memoized) ----
    const report = React.useMemo(() => {
      // core stats
      const hPPG = safeNum(match.hppg, 0);
      const aPPG = safeNum(match.appg, 0);

      const hGS = safeNum(match.hgs, 0);
      const aGS = safeNum(match.ags, 0);
      const hGC = safeNum(match.hgc, 0);
      const aGC = safeNum(match.agc, 0);

      const hBTTS = pct(match.hBtts);
      const aBTTS = pct(match.aBtts);
      const hO25 = pct(match.hOv2);
      const aO25 = pct(match.aOv2);

      // recent form signals
      const hRec = computeRecentSignals(homeRecent, homeTeam);
      const aRec = computeRecentSignals(awayRecent, awayTeam);

      // H2H signals
      const h2h = computeH2HSignals(parsedH2H);

      // ---- Strength proxy (simple but effective) ----
      // Combine PPG + goal diff proxy to estimate relative strength
      const goalDiffProxy = hGS - hGC - (aGS - aGC); // >0 favors home
      const ppgDiff = hPPG - aPPG;

      // momentum (recent)
      const momentumDiff = (hRec.ppg || 0) - (aRec.ppg || 0);

      // data quality 0..1 (missing data reduces)
      const hasCore =
        Number.isFinite(hPPG) &&
        Number.isFinite(aPPG) &&
        Number.isFinite(hGS) &&
        Number.isFinite(aGS) &&
        Number.isFinite(hGC) &&
        Number.isFinite(aGC);
      const quality = clamp(
        (hasCore ? 0.55 : 0.25) +
          clamp((homeRecent?.length || 0) / 5, 0, 1) * 0.2 +
          clamp((awayRecent?.length || 0) / 5, 0, 1) * 0.2 +
          clamp((parsedH2H?.length || 0) / 5, 0, 1) * 0.05,
        0,
        1
      );

      // ---- Expected goals (blended) ----
      // Start from averages, then adjust using recent attack/defense and H2H goal environment
      // This stays bounded so it doesn't go crazy on small samples.
      const baseHome = clamp((hGS + aGC) / 2, 0.2, 3.2);
      const baseAway = clamp((aGS + hGC) / 2, 0.2, 3.2);

      const recentHomeAdj = clamp(
        (hRec.games ? hRec.goalsFor / hRec.games : baseHome) * 0.35 +
          baseHome * 0.65,
        0.2,
        3.5
      );
      const recentAwayAdj = clamp(
        (aRec.games ? aRec.goalsFor / aRec.games : baseAway) * 0.35 +
          baseAway * 0.65,
        0.2,
        3.5
      );

      const h2hEnv = h2h.games ? clamp(h2h.avgGoals / 2, 0.7, 1.6) : 1.0;

      // strength adjustment -> small nudge to expected goals
      const strength = sigmoid(
        ppgDiff / 0.65 + goalDiffProxy / 2.2 + momentumDiff / 0.6
      );
      const strengthNudge = (strength - 0.5) * 0.35; // [-0.175..+0.175]

      const lambdaH = clamp(
        recentHomeAdj * h2hEnv * (1 + strengthNudge),
        0.25,
        3.8
      );
      const lambdaA = clamp(
        recentAwayAdj * h2hEnv * (1 - strengthNudge),
        0.25,
        3.8
      );

      // ---- Monte Carlo ----
      const seed =
        Math.abs(
          ((String(match.match || "").length * 997 +
            safeNum(match.hppg, 0) * 1000) ^
            (safeNum(match.appg, 0) * 1000)) |
            0
        ) || 42;

      const sim = runMonteCarlo({ lambdaH, lambdaA, n: 6500, seed });

      // ---- Market blending (sheet stats + sim) ----
      // combine sim probs with sheet long-term stats when available
      const over25 = clamp(
        sim.probs.over25 * 0.65 + ((hO25 + aO25) / 2) * 0.35,
        0,
        1
      );
      const btts = clamp(
        sim.probs.btts * 0.6 + ((hBTTS + aBTTS) / 2) * 0.4,
        0,
        1
      );

      // 1X2 blending: sim is primary, with small form tilt
      const tilt = clamp(ppgDiff / 2.2 + momentumDiff / 1.8, -0.18, 0.18);
      const home = clamp(sim.probs.home + tilt * 0.6, 0.01, 0.97);
      const away = clamp(sim.probs.away - tilt * 0.6, 0.01, 0.97);
      const draw = clamp(1 - (home + away), 0.01, 0.5);
      const norm = home + draw + away;
      const p1 = home / norm;
      const px = draw / norm;
      const p2 = away / norm;

      const ordered = [
        { key: "1", label: "Home win (1X2)", p: p1, tone: "blue" },
        { key: "X", label: "Draw (1X2)", p: px, tone: "neutral" },
        { key: "2", label: "Away win (1X2)", p: p2, tone: "red" },
      ].sort((a, b) => b.p - a.p);

      const pEdge = ordered[0].p - ordered[1].p;

      // recommendations (rule-based, but backed by probs + rationale)
      const recs = [];
      const risks = [];

      // Risk flags
      if (quality < 0.55)
        risks.push("Low data quality: missing or thin stats/recent/H2H.");
      if ((parsedH2H?.length || 0) < 2)
        risks.push("Limited H2H sample: treat head-to-head lightly.");
      if ((homeRecent?.length || 0) < 3 || (awayRecent?.length || 0) < 3)
        risks.push("Limited recent form data: momentum signal may be noisy.");
      if (Math.abs(lambdaH - lambdaA) < 0.15 && ordered[0].key !== "X")
        risks.push(
          "Very tight expected goals: match may be higher variance than the pick suggests."
        );

      // Primary pick: prefer safer markets when edge is modest
      const conf = gradeConfidence(pEdge, quality);

      // Safer outcomes
      const pHomeOrDraw = clamp(p1 + px, 0, 1);
      const pAwayOrDraw = clamp(p2 + px, 0, 1);

      if (conf.label === "High") {
        recs.push({
          market: ordered[0].label,
          p: ordered[0].p,
          why: `Top outcome probability leads by ${(pEdge * 100).toFixed(
            0
          )} pts. Strength/form tilt supports this side.`,
          tags: ["Edge", "Outcome"],
        });
      } else {
        // double chance if not high confidence
        if (ordered[0].key === "1") {
          recs.push({
            market: "Home or Draw (Double Chance)",
            p: pHomeOrDraw,
            why: `Outcome edge is modest; Double Chance reduces variance while keeping ~${Math.round(
              pHomeOrDraw * 100
            )}% coverage.`,
            tags: ["Safer", "Outcome"],
          });
        } else if (ordered[0].key === "2") {
          recs.push({
            market: "Away or Draw (Double Chance)",
            p: pAwayOrDraw,
            why: `Outcome edge is modest; Double Chance reduces variance while keeping ~${Math.round(
              pAwayOrDraw * 100
            )}% coverage.`,
            tags: ["Safer", "Outcome"],
          });
        } else {
          recs.push({
            market: "Under 3.5 Goals (safer total)",
            p: clamp(1 - sim.probs.over25 * 0.55, 0.45, 0.9),
            why: "Draw-leaning profiles often correlate with tighter totals; use a wider line to reduce variance.",
            tags: ["Safer", "Totals"],
          });
        }
      }

      // Totals & BTTS
      if (over25 >= 0.58) {
        recs.push({
          market: "Over 2.5 Goals",
          p: over25,
          why: `Simulation + long-term rates indicate a goal environment. λ total ≈ ${(
            lambdaH + lambdaA
          ).toFixed(2)}.`,
          tags: ["Goals", "Totals"],
        });
      } else if (over25 <= 0.42) {
        recs.push({
          market: "Under 2.5 Goals",
          p: 1 - over25,
          why: `Total goals expectation looks modest. λ total ≈ ${(
            lambdaH + lambdaA
          ).toFixed(2)}.`,
          tags: ["Goals", "Totals"],
        });
      } else {
        recs.push({
          market: "Over 1.5 Goals (safer total)",
          p: sim.probs.over15,
          why: "Totals are moderate; Over 1.5 is the lower-variance angle.",
          tags: ["Safer", "Totals"],
        });
      }

      if (btts >= 0.56) {
        recs.push({
          market: "BTTS — Yes",
          p: btts,
          why: "Both sides show consistent scoring patterns and the sim supports both teams finding a goal.",
          tags: ["BTTS"],
        });
      } else if (btts <= 0.36) {
        recs.push({
          market: "BTTS — No",
          p: 1 - btts,
          why: "Clean-sheet/low-scoring profile: one side likely blanks the other.",
          tags: ["BTTS"],
        });
      }

      // Scoreline ideas (not a “pick”, just insight)
      const scoreIdeas = sim.topScores.map(
        (s) => `${s.score} (${Math.round(s.p * 100)}%)`
      );

      // stake sizing suggestion (ONLY if user has odds; we give fair odds + conservative fraction)
      // We'll show fair odds and a "max stake %" suggestion based on confidence.
      const primary = recs[0];
      const fair = buildFairOdds(primary.p);
      const stakeCap =
        conf.label === "High" ? 0.06 : conf.label === "Medium" ? 0.035 : 0.02;
      // ---- Analyst narrative (human-like, deterministic) ----
      const narrative = buildAnalystNarrative({
        seed,
        match,
        homeTeam,
        awayTeam,
        report: {
          quality,
          conf,
          lambdas: { lambdaH, lambdaA, total: lambdaH + lambdaA },
          probs: {
            home: p1,
            draw: px,
            away: p2,
            over15: sim.probs.over15,
            over25,
            btts,
          },
          ordered,
          recs,
        },
        homeRecentRows: homeRecent,
        awayRecentRows: awayRecent,
        parsedH2HRows: parsedH2H,
      });
      // ===== League Table Context (Edge & Motivation) =====
      let structuralEdge = null;
      let motivation = null;

      if (Array.isArray(leagueTable) && leagueTable?.length) {
        const normHome = normalizeTeam(homeTeam);
        const normAway = normalizeTeam(awayTeam);
        
        const homeRow = leagueTable.find((t) => {
          const nt = normalizeTeam(t.team);
          return nt.includes(normHome) || normHome.includes(nt);
        });

        const awayRow = leagueTable.find((t) => {
          const nt = normalizeTeam(t.team);
          return nt.includes(normAway) || normAway.includes(nt);
        });

        if (homeRow && awayRow) {
          // --- Structural Edge ---
          const homePPG = Number(homeRow.pts) / Number(homeRow.gp || 1);
          const awayPPG = Number(awayRow.pts) / Number(awayRow.gp || 1);

          structuralEdge = {
            homeRank: homeRow.sn,
            awayRank: awayRow.sn,
            homePPG: homePPG.toFixed(2),
            awayPPG: awayPPG.toFixed(2),
            homeGD: homeRow.gd,
            awayGD: awayRow.gd,
            edge:
              homePPG > awayPPG
                ? homeTeam
                : awayPPG > homePPG
                ? awayTeam
                : "Even",
          };

          // --- Motivation Engine ---
          const totalTeams = leagueTable.length;
          const homeRank = Number(homeRow.sn || 0);
          const awayRank = Number(awayRow.sn || 0);
          const relegationLine = totalTeams - 3;
          const titleLine = 3;

          const getMotivation = (rank) => {
            if (rank <= titleLine) return "Title Race";
            if (rank >= relegationLine) return "Relegation Fight";
            return "Mid Table";
          };

          motivation = {
            home: getMotivation(homeRank),
            away: getMotivation(awayRank),
          };
        }
      }
      return {
        quality,
        conf,
        lambdas: { lambdaH, lambdaA, total: lambdaH + lambdaA },
        probs: {
          home: p1,
          draw: px,
          away: p2,
          over15: sim.probs.over15,
          over25,
          btts,
        },
        ordered,
        recent: { h: hRec, a: aRec },
        h2h,
        recs,
        risks,
        structuralEdge,
        motivation,
        scoreIdeas,
        stakeGuide: { fairOdds: fair, maxFraction: stakeCap },
        narrative, // ✅ add this
      };
    }, [
      match,
      homeTeam,
      awayTeam,
      homeRecent,
      awayRecent,
      parsedH2H,
      leagueTable,
    ]);

    const lead = report.ordered?.[0] || { label: "—", p: 0 };
    const runner = report.ordered?.[1] || { label: "—", p: 0 };

    return (
      <div className="space-y-4">
        {/* Summary header */}
        <div
          className={cx(
            "rounded-2xl p-4 ring-1 shadow-sm",
            darkMode ? "bg-white/5 ring-white/10" : "bg-gray-50 ring-gray-200"
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles
                  className={cx(
                    "h-4 w-4",
                    darkMode ? "text-blue-200" : "text-blue-700"
                  )}
                />
                <p
                  className={cx(
                    "text-sm font-bold",
                    darkMode ? "text-white" : "text-gray-900"
                  )}
                >
                  Intelligence conclusion
                </p>
              </div>

              <p
                className={cx(
                  "mt-1 text-xs leading-relaxed",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                {lead.label} is the top outcome ({Math.round(lead.p * 100)}%)
                ahead of {runner.label} ({Math.round(runner.p * 100)}%). Goals
                model expects λ ≈ {report.lambdas.total.toFixed(2)} total.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill darkMode={darkMode} tone={report.conf.tone}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {report.conf.label} confidence
                </Pill>
                <Pill darkMode={darkMode} tone="neutral">
                  <Gauge className="h-3.5 w-3.5" />
                  Data quality {Math.round(report.quality * 100)}%
                </Pill>
                <Pill darkMode={darkMode} tone="blue">
                  <Target className="h-3.5 w-3.5" />
                  Edge +{Math.round((lead.p - runner.p) * 100)} pts
                </Pill>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={cx(
                  "text-xs",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                Fair odds (primary)
              </div>
              <div
                className={cx(
                  "text-xl font-bold tabular-nums",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {report.stakeGuide.fairOdds.toFixed(2)}
              </div>
              <div
                className={cx(
                  "text-[11px]",
                  darkMode ? "text-white/50" : "text-gray-500"
                )}
              >
                Suggested max stake:{" "}
                {(report.stakeGuide.maxFraction * 100).toFixed(1)}% bankroll
              </div>
            </div>
          </div>
        </div>

        {/* What to stake + Why */}
        <CardShell darkMode={darkMode}>
          <SectionHeader
            title="What to stake"
            subtitle="Priority markets + the reasoning behind them"
            darkMode={darkMode}
            right={
              <Pill darkMode={darkMode} tone="neutral">
                <span className="font-mono text-[10px]">Breakdown</span>
              </Pill>
            }
          />
          <div className="p-4 space-y-3">
            {report.recs.map((r, i) => (
              <div
                key={i}
                className={cx(
                  "rounded-2xl p-3 ring-1",
                  darkMode
                    ? "bg-white/5 ring-white/10"
                    : "bg-white ring-gray-200"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={cx(
                        "text-sm font-bold",
                        darkMode ? "text-white" : "text-gray-900"
                      )}
                    >
                      {i === 0 ? "Primary" : "Secondary"}: {r.market}
                    </div>
                    <div
                      className={cx(
                        "mt-1 text-xs",
                        darkMode ? "text-white/60" : "text-gray-600"
                      )}
                    >
                      {r.why}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.isArray(r.tags)
                        ? r.tags.map((t) => (
                            <Pill key={t} darkMode={darkMode} tone="neutral">
                              {t}
                            </Pill>
                          ))
                        : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={cx(
                        "text-xs",
                        darkMode ? "text-white/60" : "text-gray-600"
                      )}
                    >
                      Prob
                    </div>
                    <div
                      className={cx(
                        "text-lg font-bold tabular-nums",
                        darkMode ? "text-white" : "text-gray-900"
                      )}
                    >
                      {Math.round((r.p || 0) * 100)}%
                    </div>
                    <div
                      className={cx(
                        "text-[11px] tabular-nums",
                        darkMode ? "text-white/50" : "text-gray-500"
                      )}
                    >
                      Fair {buildFairOdds(r.p).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardShell>

        {/* Deep analysis sections */}
        <CardShell darkMode={darkMode}>
          <SectionHeader
            title="Why this conclusion"
            subtitle="Overview • Stats • Recent • H2H synthesized"
            darkMode={darkMode}
          />
          <div className="p-4 space-y-4">
            {/* Overview */}
            <div
              className={cx(
                "rounded-2xl p-3 ring-1",
                darkMode ? "bg-white/5 ring-white/10" : "bg-white ring-gray-200"
              )}
            >
              <div
                className={cx(
                  "text-sm font-bold",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                Overview
              </div>
              <div
                className={cx(
                  "mt-1 text-xs leading-relaxed",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                {report.narrative?.overview || "—"}
              </div>
            </div>

            {/* Stats */}
            <div
              className={cx(
                "rounded-2xl p-3 ring-1",
                darkMode ? "bg-white/5 ring-white/10" : "bg-white ring-gray-200"
              )}
            >
              <div
                className={cx(
                  "text-sm font-bold",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                Stats
              </div>
              <div
                className={cx(
                  "mt-1 text-xs leading-relaxed",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                {report.narrative?.stats || "—"}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Pill darkMode={darkMode} tone="blue">
                  Home {Math.round(report.probs.home * 100)}%
                </Pill>
                <Pill darkMode={darkMode} tone="neutral">
                  Draw {Math.round(report.probs.draw * 100)}%
                </Pill>
                <Pill darkMode={darkMode} tone="red">
                  Away {Math.round(report.probs.away * 100)}%
                </Pill>
                <Pill
                  darkMode={darkMode}
                  tone={report.probs.over25 >= 0.55 ? "green" : "yellow"}
                >
                  Over 2.5 {Math.round(report.probs.over25 * 100)}%
                </Pill>
                <Pill
                  darkMode={darkMode}
                  tone={report.probs.btts >= 0.55 ? "purple" : "yellow"}
                >
                  BTTS {Math.round(report.probs.btts * 100)}%
                </Pill>
              </div>
            </div>
            {report?.structuralEdge && (
              <div
                className={cx(
                  "rounded-2xl p-3 ring-1",
                  darkMode ? "bg-white/5 ring-white/10" : "bg-white ring-gray-200"
                )}
              >
                <div className="text-sm font-bold">Structural Edge</div>

                <div className="text-xs mt-1 leading-relaxed opacity-80">
                  {homeTeam} currently sit #{report?.structuralEdge?.homeRank}{" "}
                  in the table while {awayTeam} are positioned #
                  {report?.structuralEdge?.awayRank}.
                </div>

                <div className="text-xs leading-relaxed opacity-80">
                  The season performance gap is visible in their points-per-game
                  profile ({report?.structuralEdge?.homePPG} vs{" "}
                  {report?.structuralEdge?.awayPPG}), which reflects the overall
                  consistency difference between both sides.
                </div>

                <div className="text-xs leading-relaxed opacity-80">
                  Goal differential also reinforces this structural trend (
                  {report?.structuralEdge?.homeGD} vs{" "}
                  {report?.structuralEdge?.awayGD}), suggesting that one side
                  has maintained stronger balance across attack and defence
                  throughout the campaign.
                </div>

                <div className="text-xs leading-relaxed font-semibold mt-1">
                  Overall structural advantage: {report?.structuralEdge?.edge}.
                </div>
              </div>
            )}
            {report?.motivation && (
              <div
                className={cx(
                  "rounded-2xl p-3 ring-1",
                  darkMode ? "bg-white/5 ring-white/10" : "bg-white ring-gray-200"
                )}
              >
                <div className="text-sm font-bold">Motivation Context</div>

                <div className="text-xs mt-1 leading-relaxed opacity-80">
                  {homeTeam} enter this match with a{" "}
                  <b>{report?.motivation?.home}</b> context in the league table,
                  which often influences tactical approach, urgency and risk
                  tolerance during matches.
                </div>

                <div className="text-xs leading-relaxed opacity-80">
                  {awayTeam} are currently operating within a
                  <b> {report?.motivation?.away} </b> scenario, meaning their
                  strategic priorities may differ depending on league pressure
                  or security.
                </div>

                <div className="text-xs leading-relaxed opacity-80">
                  Situational motivation like this can affect tempo, defensive
                  structure and late-game behaviour — particularly when one side
                  is chasing objectives such as survival or European
                  qualification.
                </div>
              </div>
            )}
            {/* Recent */}
            <div
              className={cx(
                "rounded-2xl p-3 ring-1",
                darkMode ? "bg-white/5 ring-white/10" : "bg-white ring-gray-200"
              )}
            >
              <div
                className={cx(
                  "text-sm font-bold",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                Recent
              </div>
              <div
                className={cx(
                  "mt-1 text-xs leading-relaxed",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                {report.narrative?.recent || "—"}
              </div>
            </div>
            {/* Match State Dynamics */}

            <div
              className={cx(
                "rounded-2xl p-3 ring-1",
                darkMode ? "bg-white/5 ring-white/10" : "bg-white ring-gray-200"
              )}
            >
              <div
                className={cx(
                  "text-sm font-bold",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                Match State Dynamics
              </div>

              <div
                className={cx(
                  "mt-1 text-xs leading-relaxed",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                If {homeTeam} score first, the match is likely to move toward a
                controlled game state where the leading side can dictate tempo
                and force the opponent to take more attacking risks.
              </div>

              <div
                className={cx(
                  "mt-1 text-xs leading-relaxed",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                If {awayTeam} strike first, the tactical picture may shift
                toward transition phases and counter-attacking opportunities,
                increasing the likelihood of open play and higher goal
                volatility.
              </div>

              <div
                className={cx(
                  "mt-1 text-xs leading-relaxed",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                Game state is one of the strongest drivers of betting outcomes,
                particularly for totals and BTTS markets, as early goals often
                reshape tactical behaviour and match tempo.
              </div>
            </div>

            {/* H2H */}
            <div
              className={cx(
                "rounded-2xl p-3 ring-1",
                darkMode ? "bg-white/5 ring-white/10" : "bg-white ring-gray-200"
              )}
            >
              <div
                className={cx(
                  "text-sm font-bold",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                H2H
              </div>

              <div
                className={cx(
                  "mt-1 text-xs leading-relaxed",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                {report.narrative?.h2h || "—"}
              </div>
            </div>
          </div>
        </CardShell>

        {/* Simulation + scorelines */}
        <CardShell darkMode={darkMode}>
          <SectionHeader
            title="Simulation insights"
            subtitle="Monte Carlo scoreline sampling (fast)"
            darkMode={darkMode}
          />
          <div className="p-4">
            <div
              className={cx(
                "text-xs",
                darkMode ? "text-white/60" : "text-gray-600"
              )}
            >
              Most common scorelines:
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.scoreIdeas.length ? (
                report.scoreIdeas.map((s) => (
                  <Pill key={s} darkMode={darkMode} tone="neutral">
                    {s}
                  </Pill>
                ))
              ) : (
                <span
                  className={cx(
                    "text-xs",
                    darkMode ? "text-white/55" : "text-gray-500"
                  )}
                >
                  Not enough data.
                </span>
              )}
            </div>
          </div>
        </CardShell>

        <CardShell darkMode={darkMode}>
          <SectionHeader
            title="Risk flags"
            subtitle="What can go wrong (so users stake smarter)"
            darkMode={darkMode}
          />
          <div className="p-4 space-y-2">
            {/* Analyst-style risk cards (human, 2–4) */}
            {report.narrative?.riskCards?.length
              ? report.narrative.riskCards.map((txt, i) => (
                  <div
                    key={`a-${i}`}
                    className={cx(
                      "rounded-xl p-3 ring-1 text-sm",
                      darkMode
                        ? "bg-rose-500/10 ring-rose-400/20 text-rose-100"
                        : "bg-rose-50 ring-rose-200 text-rose-900"
                    )}
                  >
                    {txt}
                  </div>
                ))
              : null}

            {/* Your existing system risks (fallback / extra) */}
            {report.risks.length ? (
              report.risks.map((r, i) => (
                <div
                  key={`s-${i}`}
                  className={cx(
                    "rounded-xl p-3 ring-1 text-sm",
                    darkMode
                      ? "bg-white/5 ring-white/10 text-white/80"
                      : "bg-white ring-gray-200 text-gray-800"
                  )}
                >
                  {r}
                </div>
              ))
            ) : (
              <div
                className={cx(
                  "text-sm",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                No major red flags detected from the available data.
              </div>
            )}

            <Divider darkMode={darkMode} />

            <div
              className={cx(
                "text-[11px] leading-relaxed",
                darkMode ? "text-white/45" : "text-gray-500"
              )}
            >
              {report.narrative?.riskClose ||
                "Note: These probabilities are model-based, not guarantees. Always cross-check lineups/news and keep bankroll discipline."}
            </div>
          </div>
        </CardShell>
      </div>
    );
  }
);

/* =====================================================================================
  Main Modal (Compare v2)
===================================================================================== */

export default function TeamComparisonModal({
  match,
  onClose,
  darkMode = false,
  currentUser: propUser = {},
}) {
  const { data: userFromHook } = useUser();
  const { isAdmin, isPremium, isSilver } = useUserPermissions();

  const [mounted, setMounted] = React.useState(false);
  const [showCopyMenu, setShowCopyMenu] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close on ESC
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    html.style.overscrollBehavior = "none";

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      body.style.paddingRight = "";
      html.style.overscrollBehavior = "";

      window.scrollTo(0, scrollY);
    };
  }, []);

  // Stable merged user
  const mergedUser = React.useMemo(() => {
    const base = { ...(userFromHook || {}), ...(propUser || {}) };
    const plan = resolveUserPlan({ user: base, isPremium, isSilver });

    return {
      ...base,
      plan,
      subscription_status:
        base.subscription_status ||
        (plan === "premium"
          ? "premium"
          : plan === "silver"
          ? "silver"
          : "free"),
      user_role: base.user_role || (plan === "admin" ? "admin" : "free"),
    };
  }, [userFromHook, propUser, isPremium, isSilver]);
  const currentPlan = mergedUser?.plan || "free";

  const { homeTeam, awayTeam } = React.useMemo(() => {
    const parts = String(match.match || "").split(" - ");
    return {
      homeTeam: parts[0] || "Home Team",
      awayTeam: parts[1] || "Away Team",
    };
  }, [match.match]);
  const country = match.country || "";
  const league = match.league || "";

  const { homePos, awayPos } = React.useMemo(() => {
    const t = match.table;
    if (!t) return { homePos: null, awayPos: null };
    const positions = String(t).split("|");
    return { homePos: positions[0] || null, awayPos: positions[1] || null };
  }, [match.table]);

  const formatPercent = React.useCallback((value) => {
    if (value === null || value === undefined || value === "") return 0;
    const n = Number(value);
    if (Number.isNaN(n)) return 0;
    return n > 1 ? n : n * 100;
  }, []);

  const homeRecent = React.useMemo(
    () => parseRecentMatches(match.H_Recent || "", homeTeam),
    [match.H_Recent, homeTeam]
  );
  const awayRecent = React.useMemo(
    () => parseRecentMatches(match.A_Recent || "", awayTeam),
    [match.A_Recent, awayTeam]
  );

  const parsedH2H = React.useMemo(() => {
    const raw =
      match.H2H_Match ||
      match["H2H-Match"] ||
      match.BY ||
      match["H2H-Recent"] ||
      match["H2H_Recent"] ||
      "";
    return parseH2HMatchesSimple(String(raw));
  }, [match]);

  React.useEffect(() => {
    if (!country || !league) return;

    fetch(`/api/league-table?country=${country}&league=${league}`)
      .then((res) => res.json())
      .then((data) => setLeagueTable(data.table || []))
      .catch(() => setLeagueTable([]));
  }, [country, league]);

  // ✅ Tabs
  const [tab, setTab] = React.useState("overview");
  const [showGuide, setShowGuide] = React.useState(false);
  const [leagueTable, setLeagueTable] = React.useState([]);
  const tabs = React.useMemo(
    () => [
      {
        key: "overview",
        label: "Overview",
        icon: Target,
        requiredPlan: "free",
      },
      { key: "stats", label: "Stats", icon: BarChart3, requiredPlan: "free" },
      { key: "recent", label: "Recent", icon: List, requiredPlan: "silver" },
      { key: "h2h", label: "H2H", icon: History, requiredPlan: "silver" },
      {
        key: "intelligence",
        label: "Intelligence",
        icon: Shield,
        requiredPlan: "premium",
      },
    ],
    []
  );

  // ✅ Edge summary (RESTORED)
  const edges = React.useMemo(() => {
    const hPPG = safeNum(match.hppg, 0);
    const aPPG = safeNum(match.appg, 0);
    const hBTTS = formatPercent(match.hBtts);
    const aBTTS = formatPercent(match.aBtts);
    const hO25 = formatPercent(match.hOv2);
    const aO25 = formatPercent(match.aOv2);
    const hGS = safeNum(match.hgs, 0);
    const aGS = safeNum(match.ags, 0);
    const hGC = safeNum(match.hgc, 0);
    const aGC = safeNum(match.agc, 0);

    const pickLead = (a, b) => {
      if (!Number.isFinite(a) || !Number.isFinite(b))
        return { lead: "—", diff: 0 };
      if (a === b) return { lead: "Even", diff: 0 };
      return { lead: a > b ? homeTeam : awayTeam, diff: Math.abs(a - b) };
    };

    return [
      { label: "PPG", ...pickLead(hPPG, aPPG), tone: "blue" },
      { label: "Goals scored", ...pickLead(hGS, aGS), tone: "green" },
      {
        label: "Goals conceded (lower better)",
        ...pickLead(aGC, hGC),
        tone: "yellow",
      },
      { label: "BTTS %", ...pickLead(hBTTS, aBTTS), tone: "purple" },
      { label: "Over 2.5 %", ...pickLead(hO25, aO25), tone: "red" },
    ].slice(0, 4);
  }, [match, homeTeam, awayTeam, formatPercent]);

  // ✅ UPGRADE 3: DUAL-ACTION COPY SYSTEM
  const handleCopy = React.useCallback(
    async (type) => {
      setShowCopyMenu(false); // Close menu instantly
      const lines = [];

      const hPPG = safeNum(match.hppg, 0);
      const aPPG = safeNum(match.appg, 0);
      const hGS = safeNum(match.hgs, 0);
      const aGS = safeNum(match.ags, 0);
      const hGC = safeNum(match.hgc, 0);
      const aGC = safeNum(match.agc, 0);
      const hBTTS = Math.round(formatPercent(match.hBtts));
      const aBTTS = Math.round(formatPercent(match.aBtts));
      const hO25 = Math.round(formatPercent(match.hOv2));
      const aO25 = Math.round(formatPercent(match.aOv2));

      if (type === "social") {
        // 📱 CLEAN, EMOJI-FILLED VIP TELEGRAM FORMAT
        lines.push(`🔥 *VIP MATCH INSIGHT* 🔥`);
        lines.push("");
        lines.push(`⚽ ${homeTeam} vs ${awayTeam}`);
        if (match.fullLeague) lines.push(`🏆 ${match.fullLeague}`);
        if (match.time) lines.push(`🕒 Kickoff: ${match.time}`);
        lines.push("");
        lines.push(`📊 *QUICK STATS (Home vs Away)*`);
        lines.push(`📈 PPG: ${hPPG.toFixed(2)} vs ${aPPG.toFixed(2)}`);
        lines.push(`⚔️ Goals Avg: ${hGS.toFixed(1)} vs ${aGS.toFixed(1)}`);
        lines.push(`🛡️ Conceded: ${hGC.toFixed(1)} vs ${aGC.toFixed(1)}`);
        lines.push("");
        lines.push(`🎯 *KEY TRENDS*`);
        lines.push(`💥 BTTS %: ${hBTTS}% vs ${aBTTS}%`);
        lines.push(`🔥 Over 2.5 %: ${hO25}% vs ${aO25}%`);
        lines.push("");
        lines.push(`⚡ *FORM (Last 5)*`);
        lines.push(
          `🏠 ${homeTeam}: ${
            match.hForm
              ? String(match.hForm).split("").slice(-5).join(" ")
              : "N/A"
          }`
        );
        lines.push(
          `✈️ ${awayTeam}: ${
            match.aForm
              ? String(match.aForm).split("").slice(-5).join(" ")
              : "N/A"
          }`
        );
        lines.push("");
        lines.push(`🤖 Powered by FutureBet`);
      } else {
        // 🤖 RAW AI PROMPT DATA FORMAT (Keeps old complex structure)
        const hCS = Math.round(formatPercent(match.hcs));
        const aCS = Math.round(formatPercent(match.acs));
        const hFTS = Math.round(formatPercent(match.hfts));
        const aFTS = Math.round(formatPercent(match.afts));
        const hWin = safeNum(match.hWin, 0);
        const hDraw = safeNum(match.hDraw, 0);
        const hLost = safeNum(match.hLost, 0);
        const aWin = safeNum(match.aWin, 0);
        const aDraw = safeNum(match.aDraw, 0);
        const aLost = safeNum(match.aLost, 0);

        lines.push("=== MATCH DATA PACK FOR ADVANCED ANALYSIS ===");
        lines.push("");
        lines.push(`Fixture: ${homeTeam} vs ${awayTeam}`);
        if (match.fullLeague) lines.push(`League: ${match.fullLeague}`);
        if (match.date) lines.push(`Date: ${match.date}`);
        if (match.time) lines.push(`Kickoff: ${match.time}`);
        lines.push("");

        lines.push("=== LEAGUE CONTEXT ===");
        lines.push(
          `Table Position: ${homeTeam} ${homePos || "N/A"} | ${awayTeam} ${
            awayPos || "N/A"
          }`
        );
        lines.push("");

        lines.push("=== PERFORMANCE METRICS (HOME vs AWAY SPLIT) ===");
        lines.push(`PPG: ${hPPG.toFixed(2)} vs ${aPPG.toFixed(2)}`);
        lines.push(`Goals Scored Avg: ${hGS.toFixed(2)} vs ${aGS.toFixed(2)}`);
        lines.push(
          `Goals Conceded Avg: ${hGC.toFixed(2)} vs ${aGC.toFixed(2)}`
        );
        lines.push(
          `Goal Difference Proxy: ${(hGS - hGC).toFixed(2)} vs ${(
            aGS - aGC
          ).toFixed(2)}`
        );
        lines.push("");

        lines.push("=== OUTCOME DISTRIBUTION ===");
        lines.push(`${homeTeam} Home Record: ${hWin}W ${hDraw}D ${hLost}L`);
        lines.push(`${awayTeam} Away Record: ${aWin}W ${aDraw}D ${aLost}L`);
        lines.push("");

        lines.push("=== GOALS & MARKET PROFILE ===");
        lines.push(`BTTS %: ${hBTTS}% vs ${aBTTS}%`);
        lines.push(`Over 2.5 %: ${hO25}% vs ${aO25}%`);
        lines.push(`Clean Sheet %: ${hCS}% vs ${aCS}%`);
        lines.push(`Failed To Score %: ${hFTS}% vs ${aFTS}%`);
        lines.push("");

        lines.push("=== DERIVED MATCH ENVIRONMENT ===");
        lines.push(`Expected Total Goals Proxy: ${(hGS + aGS).toFixed(2)}`);
        lines.push(
          `Defensive Stability Gap: ${(aGC - hGC).toFixed(
            2
          )} (positive favors home defense)`
        );
        lines.push(
          `Momentum Indicator (PPG diff): ${(hPPG - aPPG).toFixed(2)}`
        );
        lines.push("");

        if (homeRecent.length || awayRecent.length) {
          lines.push("=== RECENT FORM SNAPSHOT (LAST 5) ===");
          const formatRecent = (arr, team) =>
            arr
              .map(
                (m) =>
                  `${m.date} | ${m.homeTeam} ${m.score} ${m.awayTeam} | Result:${m.outcome}`
              )
              .join(" ; ");
          if (homeRecent.length)
            lines.push(`${homeTeam}: ${formatRecent(homeRecent, homeTeam)}`);
          if (awayRecent.length)
            lines.push(`${awayTeam}: ${formatRecent(awayRecent, awayTeam)}`);
          lines.push("");
        }

        if (parsedH2H.length) {
          lines.push("=== HEAD TO HEAD (RECENT) ===");
          parsedH2H.slice(0, 6).forEach((m) => {
            lines.push(
              `${m.date} | ${m.homeTeam} ${m.score} ${m.awayTeam} | O2.5:${m.over2} | BTTS:${m.btts}`
            );
          });
          lines.push("");
        }

        lines.push("=== ANALYSIS REQUEST ===");
        lines.push(
          "Using the data above, perform a deep probabilistic breakdown including:"
        );
        lines.push("- 1X2 probability estimation");
        lines.push("- Over/Under 2.5 likelihood");
        lines.push("- BTTS probability");
        lines.push("- Most likely scorelines");
        lines.push("- Risk factors and match state scenarios");
        lines.push("- Value betting angle if market odds are mispriced");
        lines.push("");
        lines.push("Provide structured reasoning and quantified insights.");
      }

      try {
        await navigator.clipboard.writeText(lines.join("\n"));
        alert(
          type === "social"
            ? "✅ VIP Social format copied to clipboard!"
            : "✅ AI Data format copied to clipboard!"
        );
      } catch {
        alert("Copy failed on this device. Please copy manually.");
      }
    },
    [
      match,
      homeTeam,
      awayTeam,
      homePos,
      awayPos,
      homeRecent,
      awayRecent,
      parsedH2H,
      formatPercent,
    ]
  );

  const onBackdrop = React.useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose?.();
    },
    [onClose]
  );

  if (!match || !mounted || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={cx(
        "fixed inset-0 z-[99999] bg-black/55",
        "overflow-y-auto overscroll-none",
        "p-3 sm:p-6 flex items-start sm:items-center justify-center"
      )}
      onClick={onBackdrop}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className={cx(
          "relative w-full max-w-6xl my-auto",
          "max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]",
          "overflow-y-auto overscroll-contain rounded-3xl shadow-2xl ring-1",
          darkMode
            ? "bg-gradient-to-b from-gray-950/90 to-gray-950/70 text-white ring-white/10"
            : "bg-white text-gray-900 ring-black/10"
        )}
      >
        {/* Header */}
        <div
          className={cx(
            "sticky top-0 z-40 px-4 sm:px-5 py-4 border-b backdrop-blur-xl",
            darkMode
              ? "bg-gray-950/80 border-white/10"
              : "bg-white/90 border-gray-200"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">
                Compare Teams
              </h2>
              <p
                className={cx(
                  "text-xs mt-0.5 truncate",
                  darkMode ? "text-white/60" : "text-gray-600"
                )}
              >
                {match.match || `${homeTeam} vs ${awayTeam}`}{" "}
                {match.fullLeague ? `• ${match.fullLeague}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <SecondaryButton
                darkMode={darkMode}
                onClick={() => setShowGuide((prev) => !prev)}
                title={showGuide ? "Hide guide" : "Open guide"}
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {showGuide ? "Hide Guide" : "Guide"}
                </span>
              </SecondaryButton>

              {/* DUAL ACTION COPY DROPDOWN (PRO ONLY) */}
              {(isAdmin || isPremium) && (
                <div className="relative">
                  <SecondaryButton
                    darkMode={darkMode}
                    onClick={() => setShowCopyMenu((prev) => !prev)}
                    title="Copy options"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </SecondaryButton>

                  {showCopyMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowCopyMenu(false)}
                      />
                      <div
                        className={cx(
                          "absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200",
                          darkMode
                            ? "bg-gray-900 border-white/10"
                            : "bg-white border-gray-200"
                        )}
                      >
                        <button
                          onClick={() => handleCopy("social")}
                          className={cx(
                            "w-full text-left px-4 py-3 text-xs font-bold transition flex items-center gap-2",
                            darkMode
                              ? "text-white hover:bg-white/10"
                              : "text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          <Share2 className="h-4 w-4 text-emerald-500" />
                          Copy for Socials (VIP)
                        </button>
                        <div
                          className={cx(
                            "h-px w-full",
                            darkMode ? "bg-white/10" : "bg-gray-100"
                          )}
                        />
                        <button
                          onClick={() => handleCopy("ai")}
                          className={cx(
                            "w-full text-left px-4 py-3 text-[11px] font-bold transition flex items-center gap-2",
                            darkMode
                              ? "text-gray-400 hover:bg-white/5"
                              : "text-gray-500 hover:bg-gray-50"
                          )}
                        >
                          <Terminal className="h-4 w-4 opacity-70" />
                          Copy AI Prompt (Data)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={onClose}
                className={cx(
                  "p-2 rounded-xl transition",
                  darkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Clash of Titans Cinematic Header */}
        <div
          className={cx(
            "relative w-full rounded-[32px] p-6 my-4 mx-4 w-[calc(100%-2rem)] overflow-hidden shadow-sm border",
            darkMode
              ? "bg-gray-950 border-white/10"
              : "bg-white border-gray-200"
          )}
        >
          <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-500/10 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-rose-500/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex flex-col items-center gap-2 w-[40%]">
              <div
                className={cx(
                  "h-16 w-16 sm:h-20 sm:w-20 rounded-[1.25rem] flex items-center justify-center text-2xl sm:text-3xl font-black shadow-lg ring-4",
                  darkMode
                    ? "bg-gray-900 ring-blue-500/20 text-blue-400"
                    : "bg-gray-50 ring-blue-500/10 text-blue-600"
                )}
              >
                {String(homeTeam).charAt(0)}
              </div>
              <div
                className={cx(
                  "text-sm sm:text-base font-black text-center truncate w-full",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {homeTeam}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center w-[20%]">
              <div
                className={cx(
                  "text-[10px] font-black italic opacity-40 px-2 py-1 rounded-md",
                  darkMode ? "bg-white/10 text-white" : "bg-black/5 text-black"
                )}
              >
                VS
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 w-[40%]">
              <div
                className={cx(
                  "h-16 w-16 sm:h-20 sm:w-20 rounded-[1.25rem] flex items-center justify-center text-2xl sm:text-3xl font-black shadow-lg ring-4",
                  darkMode
                    ? "bg-gray-900 ring-rose-500/20 text-rose-400"
                    : "bg-gray-50 ring-rose-500/10 text-rose-600"
                )}
              >
                {String(awayTeam).charAt(0)}
              </div>
              <div
                className={cx(
                  "text-sm sm:text-base font-black text-center truncate w-full",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                {awayTeam}
              </div>
            </div>
          </div>

          <div className="mt-8 relative z-10">
            <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-widest mb-2 opacity-60">
              <span>{homeTeam} Edge</span>
              <span>{awayTeam} Edge</span>
            </div>
            <div
              className={cx(
                "flex h-3 w-full rounded-full overflow-hidden shadow-inner",
                darkMode ? "bg-white/5" : "bg-gray-100"
              )}
            >
              <div
                className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                style={{
                  width: `${formatPercent(match.homeWin || match.hWin || 33)}%`,
                }}
              />
              <div
                className={cx(
                  "h-full transition-all duration-1000 ease-out border-x",
                  darkMode
                    ? "bg-white/20 border-gray-900"
                    : "bg-gray-300 border-white"
                )}
                style={{ width: `${formatPercent(match.draw || 34)}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-1000 ease-out"
                style={{
                  width: `${formatPercent(match.awayWin || match.aWin || 33)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs font-black mt-2">
              <span className="text-blue-500">
                {Math.round(formatPercent(match.homeWin || match.hWin || 0))}%
              </span>
              <span className={darkMode ? "text-gray-500" : "text-gray-400"}>
                Draw {Math.round(formatPercent(match.draw || 0))}%
              </span>
              <span className="text-rose-500">
                {Math.round(formatPercent(match.awayWin || match.aWin || 0))}%
              </span>
            </div>
          </div>
        </div>

        {/* RESTORED EDGE SUMMARY PILLS */}
        <CardShell
          darkMode={darkMode}
          className="mx-4 mb-4 mt-2 w-[calc(100%-2rem)]"
        >
          <SectionHeader
            title="Edge Summary"
            subtitle="Quick take: who leads the key signals"
            darkMode={darkMode}
            right={
              <Pill darkMode={darkMode} tone="neutral">
                <Swords className="h-3.5 w-3.5" />
                Snapshot
              </Pill>
            }
          />
          <div className="p-4 flex flex-wrap gap-2">
            {edges.map((e, i) => (
              <Pill
                key={i}
                darkMode={darkMode}
                tone={
                  e.lead === "Even"
                    ? "neutral"
                    : e.lead === homeTeam
                    ? "blue"
                    : "red"
                }
              >
                <span className="font-semibold">{e.label}:</span>{" "}
                <span>{e.lead}</span>
                {e.diff ? (
                  <span className={cx("ml-1 font-mono")}>
                    +{e.diff.toFixed(2)}
                  </span>
                ) : null}
              </Pill>
            ))}
          </div>
        </CardShell>

        {/* --- UPGRADE 3: FLOATING GLASS DOCK TABS --- */}
        <div className="flex justify-center w-full sticky top-[72px] z-30 pt-2 pb-4 px-4">
          <div
            className={cx(
              "inline-flex items-center p-1.5 rounded-full shadow-lg border backdrop-blur-xl overflow-x-auto custom-scrollbar max-w-full",
              darkMode
                ? "bg-black/40 border-white/10"
                : "bg-white/80 border-gray-200"
            )}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              const tabUnlocked = hasFeatureAccess(currentPlan, t.key);

              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cx(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black transition-all duration-300 whitespace-nowrap",
                    active
                      ? darkMode
                        ? "text-white"
                        : "text-gray-900"
                      : darkMode
                      ? "text-gray-500 hover:text-gray-300"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {active && (
                    <div
                      className={cx(
                        "absolute inset-0 rounded-full shadow-inner",
                        darkMode
                          ? "bg-white/10 border border-white/5"
                          : "bg-gray-100 border border-gray-200"
                      )}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon
                      className={cx(
                        "h-4 w-4",
                        active
                          ? darkMode
                            ? "text-blue-400"
                            : "text-blue-600"
                          : ""
                      )}
                    />
                    <span className="hidden sm:inline">{t.label}</span>
                    {!tabUnlocked && (
                      <Lock className="h-3 w-3 ml-1 opacity-50" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-5">
          {showGuide && (
            <CardShell darkMode={darkMode}>
              <SectionHeader
                title="Compare Guide"
                subtitle="What each tab means, what plan unlocks it, and how to read the key stats"
                darkMode={darkMode}
                right={
                  <Pill darkMode={darkMode} tone="blue">
                    <BookOpen className="h-3.5 w-3.5" /> Beginner Help
                  </Pill>
                }
              />
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {TEAM_COMPARISON_MODAL_GUIDE.map((item) => {
                    const tone =
                      item.access === "Premium+"
                        ? "purple"
                        : item.access === "Silver+"
                        ? "yellow"
                        : "blue";
                    return (
                      <div
                        key={item.key}
                        className={cx(
                          "rounded-2xl p-3 ring-1",
                          darkMode
                            ? "bg-white/5 ring-white/10"
                            : "bg-white ring-gray-200"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={cx(
                                "text-sm font-bold",
                                darkMode ? "text-white" : "text-gray-900"
                              )}
                            >
                              {item.title}
                            </div>
                            <p
                              className={cx(
                                "mt-1 text-xs leading-relaxed",
                                darkMode ? "text-white/60" : "text-gray-600"
                              )}
                            >
                              {item.description}
                            </p>
                          </div>
                          <Pill darkMode={darkMode} tone={tone}>
                            {item.access}
                          </Pill>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardShell>
          )}

          {/* --- OVERVIEW TAB --- */}
          {tab === "overview" && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {/* UPGRADE 1: EA SPORTS BARS */}
              <CardShell
                darkMode={darkMode}
                className="overflow-hidden border-0 bg-transparent shadow-none"
              >
                <div
                  className={cx(
                    "rounded-[32px] p-6 sm:p-8 border shadow-2xl relative overflow-hidden",
                    darkMode
                      ? "bg-gradient-to-b from-gray-900 to-black border-white/10"
                      : "bg-gradient-to-b from-gray-50 to-white border-gray-200"
                  )}
                >
                  <div className="absolute top-0 left-1/4 w-1/2 h-full bg-blue-500/5 blur-[100px] pointer-events-none" />
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <Swords
                        className={cx(
                          "h-6 w-6",
                          darkMode ? "text-yellow-400" : "text-yellow-500"
                        )}
                      />
                      <h3 className="text-xl font-black uppercase tracking-widest">
                        Tale of the Tape
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <PowerBar
                      label="Attack Power (GS)"
                      homeVal={match.hgs}
                      awayVal={match.ags}
                      maxVal={3.5}
                      darkMode={darkMode}
                    />
                    <PowerBar
                      label="Defense (GC)"
                      homeVal={match.hgc}
                      awayVal={match.agc}
                      maxVal={3.5}
                      reverse={true}
                      darkMode={darkMode}
                    />
                    <PowerBar
                      label="Momentum (PPG)"
                      homeVal={match.hppg}
                      awayVal={match.appg}
                      maxVal={3.0}
                      darkMode={darkMode}
                    />
                    <PowerBar
                      label="Over 2.5 %"
                      homeVal={formatPercent(match.hOv2)}
                      awayVal={formatPercent(match.aOv2)}
                      maxVal={100}
                      darkMode={darkMode}
                    />
                    <PowerBar
                      label="BTTS %"
                      homeVal={formatPercent(match.hBtts)}
                      awayVal={formatPercent(match.aBtts)}
                      maxVal={100}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              </CardShell>

              {/* RESTORED: FORM & PPG WIDGETS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CardShell darkMode={darkMode}>
                  <SectionHeader
                    title="Form & PPG"
                    subtitle="Home last 5 + PPG"
                    darkMode={darkMode}
                  />
                  <div className="p-4">
                    <FormIndicator form={match.hForm} ppg={match.hppg} />
                  </div>
                </CardShell>
                <CardShell darkMode={darkMode}>
                  <SectionHeader
                    title="Form & PPG"
                    subtitle="Away last 5 + PPG"
                    darkMode={darkMode}
                  />
                  <div className="p-4">
                    <FormIndicator form={match.aForm} ppg={match.appg} />
                  </div>
                </CardShell>
              </div>

              {/* RESTORED: LEAGUE TABLE */}
              <CardShell darkMode={darkMode}>
                <SectionHeader
                  title="League Table"
                  subtitle={league ? `${league} standings` : "League standings"}
                  darkMode={darkMode}
                />
                <div className="p-4 overflow-x-auto">
                  {leagueTable && leagueTable.length ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left border-b">
                          <th>#</th>
                          <th>Team</th>
                          <th>GP</th>
                          <th>W</th>
                          <th>D</th>
                          <th>L</th>
                          <th>GS</th>
                          <th>GC</th>
                          <th>GD</th>
                          <th>PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leagueTable.map((t, i) => {
                          const rank = t.sn || i + 1;
                          return (
                            <tr
                              key={i}
                              className={
                                (() => {
                                  const nt = normalizeTeam(t.team);
                                  const nh = normalizeTeam(homeTeam);
                                  const na = normalizeTeam(awayTeam);
                                  return (nt.includes(nh) || nh.includes(nt)) || (nt.includes(na) || na.includes(nt))
                                    ? "bg-blue-500/10 font-semibold"
                                    : "";
                                })()
                              }
                            >
                              <td className="font-bold">
                                {rank <= 4
                                  ? "🟢 "
                                  : rank > leagueTable.length - 3
                                  ? "🔴 "
                                  : ""}
                                {rank}
                              </td>
                              <td>{String(t.team).replace(/"/g, "")}</td>
                              <td>{t.gp}</td>
                              <td>{t.win}</td>
                              <td>{t.draw}</td>
                              <td>{t.lost}</td>
                              <td>{t.gs}</td>
                              <td>{t.gc}</td>
                              <td>{t.gd}</td>
                              <td className="font-bold">{t.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm opacity-60">
                      League table not available
                    </div>
                  )}
                </div>
              </CardShell>
            </div>
          )}

          {/* --- UPGRADE 2: STATS TAB (WITH ALL RESTORED METRICS) --- */}
          {tab === "stats" && (
            <CardShell
              darkMode={darkMode}
              className="animate-in fade-in duration-500 border-0 shadow-none bg-transparent"
            >
              <div
                className={cx(
                  "rounded-[32px] p-2 sm:p-4 border shadow-2xl relative overflow-hidden backdrop-blur-3xl",
                  darkMode
                    ? "bg-black/60 border-white/10"
                    : "bg-white/80 border-gray-200"
                )}
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

                <SectionHeader
                  title="Deep Statistical Scan"
                  subtitle="Season-long performance metrics"
                  darkMode={darkMode}
                  right={
                    <Pill darkMode={darkMode} tone="blue">
                      <BarChart3 className="h-3.5 w-3.5" /> Full Data
                    </Pill>
                  }
                />

                <div className="p-4 flex flex-col gap-6">
                  {/* Team Headers */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10 px-2">
                    <div className="flex items-center gap-2 w-1/3 justify-start">
                      <div className="h-4 w-4 rounded bg-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 truncate">
                        {homeTeam}
                      </span>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 w-1/3 text-center">
                      Metric
                    </div>
                    <div className="flex items-center gap-2 w-1/3 justify-end">
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 truncate">
                        {awayTeam}
                      </span>
                      <div className="h-4 w-4 rounded bg-rose-500" />
                    </div>
                  </div>

                  {/* Top Stats Block */}
                  <div className="space-y-1">
                    {(() => {
                      const hTotal =
                        safeNum(match.hWin, 0) +
                        safeNum(match.hDraw, 0) +
                        safeNum(match.hLost, 0);
                      const aTotal =
                        safeNum(match.aWin, 0) +
                        safeNum(match.aDraw, 0) +
                        safeNum(match.aLost, 0);
                      const hWinPct = hTotal
                        ? safeNum(match.hWin, 0) / hTotal
                        : 0;
                      const hDrawPct = hTotal
                        ? safeNum(match.hDraw, 0) / hTotal
                        : 0;
                      const hLossPct = hTotal
                        ? safeNum(match.hLost, 0) / hTotal
                        : 0;
                      const aWinPct = aTotal
                        ? safeNum(match.aWin, 0) / aTotal
                        : 0;
                      const aDrawPct = aTotal
                        ? safeNum(match.aDraw, 0) / aTotal
                        : 0;
                      const aLossPct = aTotal
                        ? safeNum(match.aLost, 0) / aTotal
                        : 0;

                      return (
                        <>
                          <StatRow
                            darkMode={darkMode}
                            label="Win %"
                            homeValue={formatPercent(hWinPct)}
                            awayValue={formatPercent(aWinPct)}
                            isPercentage
                            isGood="higher"
                          />
                          <StatRow
                            darkMode={darkMode}
                            label="Draw %"
                            homeValue={formatPercent(hDrawPct)}
                            awayValue={formatPercent(aDrawPct)}
                            isPercentage
                          />
                          <StatRow
                            darkMode={darkMode}
                            label="Loss %"
                            homeValue={formatPercent(hLossPct)}
                            awayValue={formatPercent(aLossPct)}
                            isPercentage
                            isGood="lower"
                          />
                        </>
                      );
                    })()}
                  </div>

                  {/* Restored Stats Block */}
                  <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-1">
                    <StatRow
                      darkMode={darkMode}
                      label="PPG"
                      homeValue={match.hppg}
                      awayValue={match.appg}
                      isGood="higher"
                    />

                    <div
                      className={cx(
                        "mt-3 mb-2",
                        darkMode ? "text-white/60" : "text-gray-500"
                      )}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-center w-full">
                        Goals Environment
                      </div>
                    </div>

                    {(() => {
                      const homeAvgGoals =
                        safeNum(match.hgs, 0) + safeNum(match.hgc, 0);
                      const awayAvgGoals =
                        safeNum(match.ags, 0) + safeNum(match.agc, 0);
                      return (
                        <StatRow
                          darkMode={darkMode}
                          label="AVG Exp"
                          homeValue={homeAvgGoals}
                          awayValue={awayAvgGoals}
                          isGood="higher"
                        />
                      );
                    })()}

                    <StatRow
                      darkMode={darkMode}
                      label="Goals Scored"
                      homeValue={match.hgs}
                      awayValue={match.ags}
                      isGood="higher"
                    />
                    <StatRow
                      darkMode={darkMode}
                      label="Goals Conceded"
                      homeValue={match.hgc}
                      awayValue={match.agc}
                      isGood="lower"
                    />
                    <StatRow
                      darkMode={darkMode}
                      label="BTTS %"
                      homeValue={formatPercent(match.hBtts)}
                      awayValue={formatPercent(match.aBtts)}
                      isPercentage
                    />
                    <StatRow
                      darkMode={darkMode}
                      label="Over 2.5 %"
                      homeValue={formatPercent(match.hOv2)}
                      awayValue={formatPercent(match.aOv2)}
                      isPercentage
                    />
                    <StatRow
                      darkMode={darkMode}
                      label="Clean Sheets %"
                      homeValue={formatPercent(match.hcs)}
                      awayValue={formatPercent(match.acs)}
                      isPercentage
                      isGood="higher"
                    />
                    <StatRow
                      darkMode={darkMode}
                      label="Failed to Score %"
                      homeValue={formatPercent(match.hfts)}
                      awayValue={formatPercent(match.afts)}
                      isPercentage
                      isGood="lower"
                    />
                    <StatRow
                      darkMode={darkMode}
                      label="Over 1.5 Scored %"
                      homeValue={formatPercent(match.hgsOver15)}
                      awayValue={formatPercent(match.agsOver15)}
                      isPercentage
                      isGood="higher"
                    />
                    <StatRow
                      darkMode={darkMode}
                      label="Over 1.5 Conceded %"
                      homeValue={formatPercent(match.hgcOver15)}
                      awayValue={formatPercent(match.agcOver15)}
                      isPercentage
                      isGood="lower"
                    />
                  </div>
                </div>
              </div>
            </CardShell>
          )}

          {tab === "recent" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
              <BlurredSection user={mergedUser} feature="recent">
                <CardShell darkMode={darkMode}>
                  <SectionHeader
                    title={`Recent Form — ${homeTeam}`}
                    subtitle="Last 5 matches"
                    darkMode={darkMode}
                  />
                  <div className="p-4 space-y-2">
                    {homeRecent.length ? (
                      homeRecent.map((m, i) => (
                        <div
                          key={i}
                          className={cx(
                            "rounded-xl p-3 border",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div
                                className={cx(
                                  "text-xs",
                                  darkMode ? "text-white/55" : "text-gray-500"
                                )}
                              >
                                {m.date}
                              </div>
                              <div
                                className={cx(
                                  "text-sm font-semibold truncate",
                                  darkMode ? "text-white" : "text-gray-900"
                                )}
                              >
                                {m.homeTeam} — {m.awayTeam}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cx(
                                  "text-xs font-mono font-semibold",
                                  darkMode ? "text-white" : "text-gray-900"
                                )}
                              >
                                {m.score}
                              </span>
                              <span
                                className={cx(
                                  "w-8 h-8 rounded-xl grid place-items-center text-xs font-bold",
                                  m.outcome === "W"
                                    ? "bg-emerald-600 text-white"
                                    : m.outcome === "D"
                                    ? "bg-amber-500 text-black"
                                    : "bg-rose-600 text-white"
                                )}
                              >
                                {m.outcome}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        className={cx(
                          "py-10 text-center text-sm",
                          darkMode ? "text-white/60" : "text-gray-500"
                        )}
                      >
                        No recent matches available.
                      </div>
                    )}
                  </div>
                </CardShell>
              </BlurredSection>

              <BlurredSection user={mergedUser} feature="recent">
                <CardShell darkMode={darkMode}>
                  <SectionHeader
                    title={`Recent Form — ${awayTeam}`}
                    subtitle="Last 5 matches"
                    darkMode={darkMode}
                  />
                  <div className="p-4 space-y-2">
                    {awayRecent.length ? (
                      awayRecent.map((m, i) => (
                        <div
                          key={i}
                          className={cx(
                            "rounded-xl p-3 border",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div
                                className={cx(
                                  "text-xs",
                                  darkMode ? "text-white/55" : "text-gray-500"
                                )}
                              >
                                {m.date}
                              </div>
                              <div
                                className={cx(
                                  "text-sm font-semibold truncate",
                                  darkMode ? "text-white" : "text-gray-900"
                                )}
                              >
                                {m.homeTeam} — {m.awayTeam}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cx(
                                  "text-xs font-mono font-semibold",
                                  darkMode ? "text-white" : "text-gray-900"
                                )}
                              >
                                {m.score}
                              </span>
                              <span
                                className={cx(
                                  "w-8 h-8 rounded-xl grid place-items-center text-xs font-bold",
                                  m.outcome === "W"
                                    ? "bg-emerald-600 text-white"
                                    : m.outcome === "D"
                                    ? "bg-amber-500 text-black"
                                    : "bg-rose-600 text-white"
                                )}
                              >
                                {m.outcome}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        className={cx(
                          "py-10 text-center text-sm",
                          darkMode ? "text-white/60" : "text-gray-500"
                        )}
                      >
                        No recent matches available.
                      </div>
                    )}
                  </div>
                </CardShell>
              </BlurredSection>
            </div>
          )}

          {tab === "h2h" && (
            <BlurredSection user={mergedUser} feature="h2h">
              <CardShell
                darkMode={darkMode}
                className="animate-in fade-in duration-500"
              >
                <SectionHeader
                  title="Head-to-Head"
                  subtitle="Recent meetings (parsed from sheet)"
                  darkMode={darkMode}
                  right={
                    <Pill darkMode={darkMode} tone="neutral">
                      <History className="h-3.5 w-3.5" /> {parsedH2H.length}{" "}
                      matches
                    </Pill>
                  }
                />
                <div className="p-4">
                  {parsedH2H.length ? (
                    <div className="space-y-2">
                      {parsedH2H.slice(0, 10).map((r, i) => (
                        <div
                          key={i}
                          className={cx(
                            "rounded-xl p-3 border flex items-start justify-between gap-3",
                            darkMode
                              ? "border-white/10 bg-white/5"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          <div className="min-w-0">
                            <div
                              className={cx(
                                "text-xs",
                                darkMode ? "text-white/55" : "text-gray-500"
                              )}
                            >
                              {r.date || " "}
                            </div>
                            <div
                              className={cx(
                                "text-sm font-semibold truncate",
                                darkMode ? "text-white" : "text-gray-900"
                              )}
                            >
                              {r.homeTeam} — {r.awayTeam}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Pill
                                darkMode={darkMode}
                                tone={r.over2 === "🟢 Y" ? "green" : "yellow"}
                              >
                                {r.over2 === "🟢 Y" ? "Over 2.5" : "Under 2.5"}
                              </Pill>
                              <Pill
                                darkMode={darkMode}
                                tone={r.btts === "🟢 Y" ? "purple" : "yellow"}
                              >
                                {r.btts === "🟢 Y" ? "BTTS Yes" : "BTTS No"}
                              </Pill>
                            </div>
                          </div>
                          <div
                            className={cx(
                              "text-sm font-mono font-bold tabular-nums",
                              darkMode ? "text-white" : "text-gray-900"
                            )}
                          >
                            {r.score}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={cx(
                        "py-10 text-center text-sm",
                        darkMode ? "text-white/60" : "text-gray-500"
                      )}
                    >
                      No H2H matches available.
                    </div>
                  )}
                </div>
              </CardShell>
            </BlurredSection>
          )}

          {tab === "intelligence" && (
            <BlurredSection
              user={mergedUser}
              feature="intelligence"
              hardLock={true}
            >
              <CardShell
                darkMode={darkMode}
                className="animate-in fade-in duration-500"
              >
                <SectionHeader
                  title="Intelligence"
                  subtitle="Premium AI-style match breakdown: what to stake and why"
                  darkMode={darkMode}
                  right={
                    <Pill darkMode={darkMode} tone="blue">
                      <Sparkles className="h-3.5 w-3.5" /> Premium
                    </Pill>
                  }
                />
                <div className="p-4">
                  <PremiumIntelligenceReport
                    match={match}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    homeRecent={homeRecent}
                    awayRecent={awayRecent}
                    parsedH2H={parsedH2H}
                    leagueTable={leagueTable}
                    darkMode={darkMode}
                    Pill={Pill}
                    Divider={Divider}
                  />
                </div>
              </CardShell>
            </BlurredSection>
          )}
        </div>

        {/* Footer */}
        <div
          className={cx(
            "px-4 sm:px-5 py-4 pb-24 sm:pb-20 border-t",
            darkMode
              ? "border-white/10 bg-gray-950"
              : "border-gray-200 bg-white"
          )}
        >
          <PrimaryButton onClick={onClose} className="w-full">
            <ArrowLeft className="h-4 w-4" />
            Return to Match Overview
          </PrimaryButton>
        </div>
      </div>
    </div>,
    document.body
  );
}