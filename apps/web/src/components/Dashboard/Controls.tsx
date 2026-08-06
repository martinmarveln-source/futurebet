// @ts-nocheck
"use client";

import { useMemo, useState, useEffect } from "react";
import {
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
  Search,
  Lock,
  CircleHelp,
} from "lucide-react";
/* -----------------------------
   Small UI helper
------------------------------ */
function cn(...c) {
  return c.filter(Boolean).join(" ");
}
/* -----------------------------
   Small reusable multi-select (UPGRADED GLASS MATRIX)
------------------------------ */
function MultiSelectPopover({
  label,
  items,
  selected,
  onChange,
  darkMode,
  placeholder = "Search…",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => String(x).toLowerCase().includes(s));
  }, [items, q]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleItem = (value) => {
    if (selectedSet.has(value)) onChange(selected.filter((x) => x !== value));
    else onChange([...selected, value]);
  };

  const selectAll = () => onChange([...items]);
  const clearAll = () => onChange([]);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border text-xs font-bold transition-all active:scale-[0.99]",
          darkMode
            ? "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
            : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm"
        )}
      >
        <span className="opacity-80 uppercase tracking-widest text-[10px]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-black",
              darkMode
                ? "bg-blue-500/20 text-blue-300"
                : "bg-blue-100 text-blue-700"
            )}
          >
            {selected.length}
          </span>
          <ChevronDown size={14} className="opacity-50" />
        </div>
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-[320px] max-w-[85vw] rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200",
            darkMode
              ? "bg-gray-950/90 border-white/10 text-gray-100"
              : "bg-white/95 border-gray-200 text-gray-900"
          )}
        >
          <div
            className={cn(
              "p-4 border-b",
              darkMode ? "border-white/10" : "border-gray-100"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-xs font-black uppercase tracking-widest text-blue-500">
                {label}
              </div>
              <button
                onClick={() => setOpen(false)}
                className={cn(
                  "p-1.5 rounded-xl transition",
                  darkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
              >
                <X size={14} />
              </button>
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                className={cn(
                  "w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all",
                  darkMode
                    ? "bg-black/50 border-white/10 placeholder:text-gray-600 focus:border-blue-500/50"
                    : "bg-gray-50 border-transparent placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
                )}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition",
                  darkMode
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition",
                  darkMode
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-[260px] overflow-auto p-2 custom-scrollbar">
            {filtered.length ? (
              filtered.map((item) => {
                const isOn = selectedSet.has(item);
                return (
                  <button
                    key={String(item)}
                    type="button"
                    onClick={() => toggleItem(item)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition",
                      darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"
                    )}
                  >
                    <span className="text-left break-words">{item}</span>
                    <span
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        isOn
                          ? darkMode
                            ? "bg-blue-500 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            : "bg-blue-500 border-blue-600 text-white shadow-sm"
                          : darkMode
                          ? "border-gray-700 bg-black/20"
                          : "border-gray-300 bg-gray-50"
                      )}
                    >
                      {isOn && <Check size={12} />}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs opacity-50 font-semibold">
                No results found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -----------------------------
   Clean Date selector (UPGRADED GLASS MATRIX)
------------------------------ */
function DateRangePopover({
  darkMode,
  dateRange,
  setDateRange,
  disabled,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const pad2 = (n) => String(n).padStart(2, "0");
  const toISO = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromISO = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const startOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const today = startOfDay(new Date());

  const getThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
    );
    const sunday = endOfDay(
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
    );
    return { from: monday, to: sunday };
  };

  const label = (() => {
    const from = dateRange?.from;
    const to = dateRange?.to;
    if (from && to) return `${toISO(from)} → ${toISO(to)}`;
    if (from && !to) return `${toISO(from)}`;
    return "Select date";
  })();

  const apply = (from, to) => {
    setDateRange?.({ from, to });
    setOpen(false);
  };

  const [customFrom, setCustomFrom] = useState(() =>
    toISO(dateRange?.from || today)
  );
  const [customTo, setCustomTo] = useState(() => toISO(dateRange?.to || today));

  useEffect(() => {
    if (dateRange?.from) setCustomFrom(toISO(dateRange.from));
    if (dateRange?.to) setCustomTo(toISO(dateRange.to));
  }, [dateRange?.from, dateRange?.to]);

  const chipBtn = (active, onClick, text) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2.5 rounded-xl text-xs font-bold border transition text-left",
        active
          ? darkMode
            ? "bg-blue-500/20 border-blue-500/40 text-blue-200"
            : "bg-blue-50 border-blue-200 text-blue-700"
          : darkMode
          ? "bg-white/5 border-white/10 hover:bg-white/10"
          : "bg-white border-gray-200 hover:bg-gray-50"
      )}
    >
      {text}
    </button>
  );

  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border text-xs font-bold transition-all active:scale-[0.99]",
          disabled
            ? darkMode
              ? "bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed"
              : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
            : darkMode
            ? "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
            : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm"
        )}
        title={disabled ? "Silver+ required" : "Open date filter"}
      >
        <span className="opacity-80 uppercase tracking-widest text-[10px]">
          Date
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-black",
              darkMode
                ? "bg-blue-500/20 text-blue-300"
                : "bg-blue-100 text-blue-700"
            )}
          >
            {label}
          </span>
          {disabled ? (
            <Lock size={14} className="opacity-50" />
          ) : (
            <ChevronDown size={14} className="opacity-50" />
          )}
        </div>
      </button>

      {!disabled && open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-[360px] max-w-[90vw] rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200",
            darkMode
              ? "bg-gray-950/90 border-white/10 text-gray-100"
              : "bg-white/95 border-gray-200 text-gray-900"
          )}
        >
          <div
            className={cn(
              "p-4 border-b",
              darkMode ? "border-white/10" : "border-gray-100"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-xs font-black uppercase tracking-widest text-blue-500">
                Date Range
              </div>
              <button
                onClick={() => setOpen(false)}
                className={cn(
                  "p-1.5 rounded-xl transition",
                  darkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
              >
                <X size={14} />
              </button>
            </div>
            <div
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}
            >
              Use presets or custom range
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {chipBtn(
              isSameDay(dateRange?.from, today) &&
                isSameDay(dateRange?.to, endOfDay(today)),
              () => apply(startOfDay(today), endOfDay(today)),
              "Today"
            )}
            {chipBtn(
              false,
              () => {
                const d = startOfDay(
                  new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate() + 1
                  )
                );
                apply(d, endOfDay(d));
              },
              "Tomorrow"
            )}
            {chipBtn(
              false,
              () => {
                const from = startOfDay(today);
                const to = endOfDay(
                  new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate() + 2
                  )
                );
                apply(from, to);
              },
              "Next 3 days"
            )}
            {chipBtn(
              false,
              () => {
                const from = startOfDay(today);
                const to = endOfDay(
                  new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate() + 6
                  )
                );
                apply(from, to);
              },
              "Next 7 days"
            )}
            {chipBtn(
              false,
              () => {
                const { from, to } = getThisWeek();
                apply(from, to);
              },
              "This week"
            )}
            {chipBtn(false, () => apply(startOfDay(today), null), "Single day")}
          </div>
          <div
            className={cn(
              "p-4 border-t",
              darkMode ? "border-white/10" : "border-gray-100"
            )}
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
              Custom range
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest mb-1 block",
                    darkMode ? "text-gray-400" : "text-gray-500"
                  )}
                >
                  From
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all",
                    darkMode
                      ? "bg-black/50 border-white/10 focus:border-blue-500/50"
                      : "bg-gray-50 border-transparent focus:border-blue-400 focus:bg-white"
                  )}
                />
              </div>
              <div>
                <label
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest mb-1 block",
                    darkMode ? "text-gray-400" : "text-gray-500"
                  )}
                >
                  To
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all",
                    darkMode
                      ? "bg-black/50 border-white/10 focus:border-blue-500/50"
                      : "bg-gray-50 border-transparent focus:border-blue-400 focus:bg-white"
                  )}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const f = fromISO(customFrom);
                  const t = fromISO(customTo);
                  if (!f || !t) return;
                  apply(startOfDay(f), endOfDay(t));
                }}
                className="flex-1 py-3 rounded-xl text-xs font-black border border-transparent bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99]"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => apply(startOfDay(today), endOfDay(today))}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-black border transition-all active:scale-[0.99]",
                  darkMode
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                )}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -----------------------------
   Controls
------------------------------ */
export default function Controls({
  matchesLoading,
  refetch,
  chanceThreshold,
  setChanceThreshold,
  ratingThreshold,
  setRatingThreshold,
  darkMode,
  hasFilterAccess,
  filterPanelProps,
  sortBy,
  setSortBy,
  isPro, // Premium/Admin from dashboard; Silver is unlocked here through hasFilterAccess
}) {
  const [showGuide, setShowGuide] = useState(false);
  const uniqueLeagues = filterPanelProps?.uniqueLeagues || [];
  const selectedLeagues = filterPanelProps?.selectedLeagues || [];
  const setSelectedLeagues = filterPanelProps?.setSelectedLeagues || (() => {});
  const selectedMarkets = filterPanelProps?.selectedMarkets || [];
  const setSelectedMarkets = filterPanelProps?.setSelectedMarkets || (() => {});

  // Access rule: Silver, Premium, and Admin can use advanced controls
  const canUseAdvancedControls = !!(isPro || hasFilterAccess);

  useEffect(() => {
    if (!canUseAdvancedControls && sortBy !== "date") {
      setSortBy?.("date");
    }
  }, [canUseAdvancedControls, sortBy, setSortBy]);

  // OPTIONAL: force date range to today for non-pro (uncomment if you want hard restriction)
  // useEffect(() => {
  //   if (!isPro && filterPanelProps?.setDateRange) {
  //     const d = new Date();
  //     const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  //     const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  //     filterPanelProps.setDateRange({ from: start, to: end });
  //   }
  // }, [isPro, filterPanelProps]);

  // market keys (your internal filter keys)
  const marketOptions = [
    "homeWin",
    "draw",
    "awayWin",
    "gg",
    "ng",
    "ov25",
    "un25",
  ];

  const marketLabel = (k) => {
    if (k === "homeWin") return "1X2 — Home";
    if (k === "draw") return "1X2 — Draw";
    if (k === "awayWin") return "1X2 — Away";
    if (k === "gg") return "BTTS — Yes";
    if (k === "ng") return "BTTS — No";
    if (k === "ov25") return "Over 2.5";
    if (k === "un25") return "Under 2.5";
    return k;
  };

  const marketItems = useMemo(
    () => marketOptions.map((k) => marketLabel(k)),
    []
  );

  const selectedMarketLabels = useMemo(
    () => selectedMarkets.map((k) => marketLabel(k)),
    [selectedMarkets]
  );

  const setSelectedMarketLabels = (labels) => {
    const keys = labels
      .map((lbl) => marketOptions.find((k) => marketLabel(k) === lbl) || null)
      .filter(Boolean);
    setSelectedMarkets(keys);
  };

  const cardCls = `rounded-2xl border p-4 ${
    darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
  }`;

  const sliderCls = "w-full accent-blue-600";
  const controlSlotCls = "w-full lg:min-w-[190px] xl:min-w-[220px]";
  const canUseThresholds = canUseAdvancedControls;

  const proSortOptions = useMemo(
    () => [
      { value: "date", label: "Sort by Date" },
      { value: "league", label: "Sort by League" },
      { value: "homeWin", label: "Sort by Home Win" },
      { value: "draw", label: "Sort by Draw" },
      { value: "awayWin", label: "Sort by Away Win" },
      { value: "gg", label: "Sort by BTTS" },
      { value: "ov25", label: "Sort by Over 2.5" },
      { value: "cs", label: "Sort by CS" },
      { value: "histWinRate", label: "Sort by Hist. Win Rate" },
    ],
    []
  );

  const basicSortOptions = useMemo(
    () => [{ value: "date", label: "Sort by Date" }],
    []
  );

  return (
    <div
      className={cn(
        "relative rounded-[32px] p-5 sm:p-7 border shadow-2xl transition-all",
        darkMode
          ? "bg-gray-950/50 border-white/10 backdrop-blur-2xl"
          : "bg-white/90 border-gray-200 backdrop-blur-2xl"
      )}
    >
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* === UPGRADE 3: LIVE TELEMETRY HEADER === */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 xl:gap-6 relative z-10 mb-6">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner ring-1",
              darkMode
                ? "bg-blue-500/10 text-blue-400 ring-blue-500/30"
                : "bg-blue-50 text-blue-600 ring-blue-200"
            )}
          >
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-[0.3em]",
                  darkMode ? "text-emerald-400" : "text-emerald-600"
                )}
              >
                Algorithm Parameters
              </span>
            </div>
            <div
              className={cn(
                "text-xl sm:text-2xl font-black tracking-tight",
                darkMode ? "text-white" : "text-slate-900"
              )}
            >
              Explore Controls
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl text-xs font-bold border transition active:scale-[0.99]",
              darkMode
                ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            )}
            title="Open controls guide"
          >
            <CircleHelp size={16} /> {showGuide ? "Hide Guide" : "Guide"}
          </button>

          <select
            aria-label="Sort matches by"
            value={canUseAdvancedControls ? sortBy || "date" : "date"}
            onChange={(e) =>
              canUseAdvancedControls && setSortBy?.(e.target.value)
            }
            disabled={!canUseAdvancedControls}
            className={cn(
              "min-w-[160px] px-4 py-3 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-all",
              darkMode
                ? "bg-black/50 border-white/10 text-white focus:border-blue-500/50"
                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-400 focus:bg-white",
              !canUseAdvancedControls ? "opacity-50 cursor-not-allowed" : ""
            )}
            title={
              !canUseAdvancedControls ? "Silver+ required" : "Select sort order"
            }
          >
            {(canUseAdvancedControls ? proSortOptions : basicSortOptions).map(
              (o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              )
            )}
          </select>

          <button
            onClick={() => refetch?.()}
            disabled={matchesLoading}
            className={cn(
              "inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition active:scale-[0.99] shadow-lg",
              darkMode
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
            )}
          >
            <RefreshCw
              size={16}
              className={matchesLoading ? "animate-spin" : ""}
            />{" "}
            Refresh
          </button>
        </div>
      </div>

      {/* === UPGRADE 1: GLASS MATRIX FILTER BAR === */}
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-2.5 rounded-[24px] border relative z-40",
          darkMode
            ? "bg-black/20 border-white/5"
            : "bg-gray-100/50 border-gray-200"
        )}
      >
        <DateRangePopover
          darkMode={darkMode}
          dateRange={filterPanelProps?.dateRange}
          setDateRange={filterPanelProps?.setDateRange}
          disabled={!canUseAdvancedControls}
          className="w-full"
        />
        <MultiSelectPopover
          label="Leagues"
          items={uniqueLeagues}
          selected={selectedLeagues}
          onChange={setSelectedLeagues}
          darkMode={darkMode}
          placeholder="Search leagues…"
          className="w-full"
        />
        <MultiSelectPopover
          label="Markets"
          items={marketItems}
          selected={selectedMarketLabels}
          onChange={setSelectedMarketLabels}
          darkMode={darkMode}
          placeholder="Search markets…"
          className="w-full"
        />
      </div>

      {showGuide && (
        <div
          className={cn(
            "mt-5 rounded-3xl border p-6 text-xs sm:text-sm leading-loose font-medium animate-in slide-in-from-top-4 duration-300 relative z-10 shadow-inner",
            darkMode
              ? "bg-black/40 border-white/10 text-gray-300"
              : "bg-gray-50 border-gray-200 text-gray-600"
          )}
        >
          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 mb-4 flex items-center gap-2">
            <CircleHelp size={14} /> Controls Guide
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <p>
              <b className={darkMode ? "text-white" : "text-gray-900"}>Sort</b>{" "}
              changes the order in which matches are displayed.
            </p>
            <p>
              <b className={darkMode ? "text-white" : "text-gray-900"}>Date</b>{" "}
              limits results to a selected day or custom date range.
            </p>
            <p>
              <b className={darkMode ? "text-white" : "text-gray-900"}>
                Leagues
              </b>{" "}
              lets you show only matches from selected competitions.
            </p>
            <p>
              <b className={darkMode ? "text-white" : "text-gray-900"}>
                Markets
              </b>{" "}
              filters matches by prediction type (1X2, BTTS, etc).
            </p>
            <p>
              <b className={darkMode ? "text-white" : "text-gray-900"}>
                Chance threshold
              </b>{" "}
              is the minimum model probability required.
            </p>
            <p>
              <b className={darkMode ? "text-white" : "text-gray-900"}>
                Rating threshold
              </b>{" "}
              is the minimum quality score required.
            </p>
          </div>
          <div
            className={cn(
              "mt-5 pt-4 border-t italic font-bold",
              darkMode
                ? "border-white/10 text-gray-400"
                : "border-gray-200 text-gray-500"
            )}
          >
            Tip: Narrow by date, leagues, and markets first, then raise
            thresholds for a more selective match list.
          </div>
        </div>
      )}

      {/* === UPGRADE 2: NEON RANGE SLIDERS === */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6 relative z-10">
        {/* Chance Threshold */}
        <div
          className={cn(
            "rounded-[28px] border p-6 relative overflow-hidden transition-all",
            darkMode
              ? "bg-white/[0.02] border-white/5 hover:border-white/10"
              : "bg-white border-gray-200 shadow-sm hover:shadow-md"
          )}
        >
          {darkMode && (
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />
          )}

          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500 mb-1.5">
                Chance Threshold
              </div>
              <div
                className={cn(
                  "text-xs font-semibold",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                Minimum algorithm probability required.
              </div>
            </div>
            <div
              className={cn(
                "text-4xl font-black tabular-nums tracking-tighter leading-none",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              {chanceThreshold}
              <span className="text-xl text-gray-500 ml-0.5">%</span>
            </div>
          </div>

          <div className="relative group pt-2 pb-1">
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-full pointer-events-none transition-all",
                darkMode
                  ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                  : "bg-blue-500"
              )}
              style={{ width: `${chanceThreshold}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={chanceThreshold}
              onChange={(e) => setChanceThreshold?.(Number(e.target.value))}
              disabled={!canUseThresholds}
              className={cn(
                "w-full appearance-none bg-transparent h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 relative z-10",
                darkMode
                  ? "[&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                  : "[&::-webkit-slider-runnable-track]:bg-gray-100 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-lg",
                !canUseThresholds ? "opacity-50 cursor-not-allowed" : ""
              )}
            />
          </div>

          {!canUseThresholds && (
            <div className="mt-4 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-1.5 bg-rose-500/10 w-fit px-3 py-1.5 rounded-lg border border-rose-500/20">
              <Lock size={12} /> Silver+ Required
            </div>
          )}
        </div>

        {/* Rating Threshold */}
        <div
          className={cn(
            "rounded-[28px] border p-6 relative overflow-hidden transition-all",
            darkMode
              ? "bg-white/[0.02] border-white/5 hover:border-white/10"
              : "bg-white border-gray-200 shadow-sm hover:shadow-md"
          )}
        >
          {darkMode && (
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />
          )}

          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-1.5">
                Rating Threshold
              </div>
              <div
                className={cn(
                  "text-xs font-semibold",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                Minimum quality/edge score required.
              </div>
            </div>
            <div
              className={cn(
                "text-4xl font-black tabular-nums tracking-tighter leading-none",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              {ratingThreshold}
              <span className="text-xl text-gray-500 ml-0.5">%</span>
            </div>
          </div>

          <div className="relative group pt-2 pb-1">
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-full pointer-events-none transition-all",
                darkMode
                  ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                  : "bg-amber-500"
              )}
              style={{ width: `${ratingThreshold}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={ratingThreshold}
              onChange={(e) => setRatingThreshold?.(Number(e.target.value))}
              disabled={!canUseThresholds}
              className={cn(
                "w-full appearance-none bg-transparent h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 relative z-10",
                darkMode
                  ? "[&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                  : "[&::-webkit-slider-runnable-track]:bg-gray-100 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-lg",
                !canUseThresholds ? "opacity-50 cursor-not-allowed" : ""
              )}
            />
          </div>

          {!canUseThresholds && (
            <div className="mt-4 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-1.5 bg-rose-500/10 w-fit px-3 py-1.5 rounded-lg border border-rose-500/20">
              <Lock size={12} /> Silver+ Required
            </div>
          )}
        </div>
      </div>
    </div>
  );
}