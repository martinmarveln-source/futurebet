// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Shield,
  BellRing,
  Send,
  Clock,
  Filter,
  Zap,
  Lock,
} from "lucide-react";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const MARKET_OPTIONS = [
  { key: "homeWin", label: "Home Win" },
  { key: "draw",    label: "Draw" },
  { key: "awayWin", label: "Away Win" },
  { key: "gg",      label: "GG (Both Score)" },
  { key: "ng",      label: "NG (No Goal)" },
  { key: "ov25",    label: "Over 2.5" },
  { key: "un25",    label: "Under 2.5" },
];

export default function SettingsModal({
  show,
  onClose,
  darkMode,
  onSave,
  preferences,
  isLoading,
  isPremium = false, // passed from parent — true for Admin/Premium users
}) {
  // ── Telegram credentials ─────────────────────────────────────────────────
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [touched, setTouched] = useState(false);
  const [testStatus, setTestStatus] = useState("idle"); // idle|testing|success|error

  // ── Auto-alert settings ──────────────────────────────────────────────────
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertSendTime, setAlertSendTime] = useState("08:00");
  const [alertMinChance, setAlertMinChance] = useState(60);
  const [alertMinRating, setAlertMinRating] = useState(50);
  const [alertMinHistRate, setAlertMinHistRate] = useState(0);
  const [alertMarkets, setAlertMarkets] = useState(["homeWin", "draw", "awayWin"]);
  const [alertPickType, setAlertPickType] = useState("all");
  const [alertMaxMatches, setAlertMaxMatches] = useState(10);

  const tokenRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => tokenRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [show]);

  useEffect(() => {
    if (!preferences) return;
    setTelegramToken(preferences.telegram_bot_token || "");
    setTelegramChatId(preferences.telegram_chat_id || "");
    setAlertEnabled(preferences.alert_enabled ?? false);
    setAlertSendTime(preferences.alert_send_time ?? "08:00");
    setAlertMinChance(Number(preferences.alert_min_chance ?? 60));
    setAlertMinRating(Number(preferences.alert_min_rating ?? 50));
    setAlertMinHistRate(Number(preferences.alert_min_hist_rate ?? 0));
    setAlertMarkets(preferences.alert_markets ?? ["homeWin", "draw", "awayWin"]);
    setAlertPickType(preferences.alert_pick_type ?? "all");
    setAlertMaxMatches(Number(preferences.alert_max_matches ?? 10));
    setTouched(false);
    setTestStatus("idle");
  }, [preferences, show]);

  // ESC + focus trap
  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key !== "Tab") return;
      const root = document.getElementById("fb-settings-modal");
      if (!root) return;
      const focusables = root.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, onClose]);

  const isTokenValid = useMemo(() => {
    const v = telegramToken.trim();
    return v.length === 0 || /^[0-9]{6,}:[A-Za-z0-9_-]{20,}$/.test(v);
  }, [telegramToken]);

  const isChatIdValid = useMemo(() => {
    const v = telegramChatId.trim();
    return v.length === 0 || /^-?\d{4,}$/.test(v);
  }, [telegramChatId]);

  const canSave = useMemo(() => {
    const ok = isTokenValid && isChatIdValid;
    return ok;
  }, [isTokenValid, isChatIdValid]);

  const toggleMarket = (key: string) => {
    setAlertMarkets((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
    setTouched(true);
  };

  const handleSaveClick = () => {
    if (!isTokenValid || !isChatIdValid) return;
    onSave?.({
      telegram_bot_token: telegramToken.trim(),
      telegram_chat_id: telegramChatId.trim(),
      alert_enabled: alertEnabled,
      alert_send_time: alertSendTime,
      alert_min_chance: alertMinChance,
      alert_min_rating: alertMinRating,
      alert_min_hist_rate: alertMinHistRate,
      alert_markets: alertMarkets,
      alert_pick_type: alertPickType,
      alert_max_matches: alertMaxMatches,
    });
  };

  // Telegram test signal
  const handleTestSignal = async () => {
    if (!telegramToken.trim() || !telegramChatId.trim() || !isTokenValid || !isChatIdValid)
      return;
    setTestStatus("testing");
    const message = `
🚨 *FUTUREBET SYSTEM TEST* 🚨
━━━━━━━━━━━━━━━━━━
⚙️ _Your webhook integration is live._

The FutureBet AI engine is now authorized to push Elite Edge alerts directly to this device. 

Keep notifications on. When the algorithm detects a massive market mispricing, you will be the first to know.
━━━━━━━━━━━━━━━━━━
💰 *Command Center Active.*
    `;
    try {
      const response = await fetch("/api/user/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: telegramToken.trim(), chatId: telegramChatId.trim() }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTestStatus("success");
        setTimeout(() => setTestStatus("idle"), 3000);
      } else {
        setTestStatus("error");
        setTimeout(() => setTestStatus("idle"), 3000);
      }
    } catch {
      setTestStatus("error");
      setTimeout(() => setTestStatus("idle"), 3000);
    }
  };

  if (!show) return null;

  const tones = darkMode
    ? {
        overlay: "bg-black/60",
        card: "bg-gray-950 text-white border-gray-800",
        subtle: "text-gray-300",
        muted: "text-gray-400",
        input: "bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:border-blue-500/50",
        btn: "border-gray-800 bg-gray-900 hover:bg-gray-800 text-gray-100",
        primary: "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:opacity-60",
        hint: "border-blue-500/20 bg-blue-500/10 text-blue-200",
        ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
        warn: "border-amber-500/25 bg-amber-500/10 text-amber-200",
        section: "border-gray-800 bg-gray-900/60",
        toggle: "bg-blue-600",
        toggleOff: "bg-gray-700",
        sectionHeader: "text-gray-100",
        chip: "border-blue-500/40 bg-blue-500/20 text-blue-300",
        chipOff: "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600",
        slider: "accent-blue-500",
        lock: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      }
    : {
        overlay: "bg-black/50",
        card: "bg-white text-gray-900 border-gray-200",
        subtle: "text-gray-600",
        muted: "text-gray-500",
        input: "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50",
        btn: "border-gray-200 bg-white hover:bg-gray-50 text-gray-900",
        primary: "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-600 disabled:opacity-70",
        hint: "border-blue-200 bg-blue-50 text-blue-800",
        ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
        warn: "border-amber-200 bg-amber-50 text-amber-900",
        section: "border-gray-200 bg-gray-50",
        toggle: "bg-blue-600",
        toggleOff: "bg-gray-300",
        sectionHeader: "text-gray-800",
        chip: "border-blue-400 bg-blue-100 text-blue-700",
        chipOff: "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
        slider: "accent-blue-600",
        lock: "border-amber-200 bg-amber-50 text-amber-700",
      };

  return (
    <div
      className={cn("fixed inset-0 z-[70] flex items-center justify-center p-4", tones.overlay)}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        id="fb-settings-modal"
        className={cn(
          "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col",
          tones.card
        )}
        style={{ maxHeight: "90vh" }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className={cn("px-5 py-4 flex items-start justify-between gap-3 border-b shrink-0", darkMode ? "border-gray-800" : "border-gray-200")}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Shield size={18} className={darkMode ? "text-blue-300" : "text-blue-600"} />
              <h3 id="settings-title" className="text-base font-extrabold">Settings</h3>
            </div>
            <p className={cn("text-xs mt-1", tones.muted)}>
              Telegram credentials & auto-alert filters.
            </p>
          </div>
          <button onClick={onClose} className={cn("p-2 rounded-xl border transition", tones.btn)} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">

          {/* Privacy note */}
          <div className={cn("rounded-2xl border p-3 flex gap-3", tones.hint)}>
            <Shield size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-extrabold">Privacy note</div>
              <div className="text-xs leading-relaxed opacity-90">
                Keep your bot token private. If you rotate your token in BotFather, update it here.
              </div>
            </div>
          </div>

          {/* Bot Token */}
          <div className="space-y-2">
            <label className="block text-sm font-extrabold">Telegram Bot Token</label>
            <input
              ref={tokenRef}
              type="text"
              value={telegramToken}
              onChange={(e) => { setTelegramToken(e.target.value); setTouched(true); }}
              placeholder="123456789:AAxxxxxxxxxxxxxxxxxxxx"
              className={cn("w-full px-4 py-3 rounded-xl border outline-none transition", tones.input)}
              autoComplete="off"
              spellCheck={false}
            />
            {!isTokenValid ? (
              <div className={cn("text-xs flex items-center gap-2 rounded-xl border px-3 py-2", tones.warn)}>
                <AlertTriangle size={16} /> Token format looks wrong.
              </div>
            ) : telegramToken.trim().length > 0 ? (
              <div className={cn("text-xs flex items-center gap-2 rounded-xl border px-3 py-2", tones.ok)}>
                <CheckCircle2 size={16} /> Token looks valid.
              </div>
            ) : null}
          </div>

          {/* Chat ID */}
          <div className="space-y-2">
            <label className="block text-sm font-extrabold">Telegram Chat ID</label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => { setTelegramChatId(e.target.value); setTouched(true); }}
              placeholder="e.g. 123456789 or -1001234567890"
              className={cn("w-full px-4 py-3 rounded-xl border outline-none transition", tones.input)}
              autoComplete="off"
              inputMode="numeric"
            />
            {!isChatIdValid ? (
              <div className={cn("text-xs flex items-center gap-2 rounded-xl border px-3 py-2", tones.warn)}>
                <AlertTriangle size={16} /> Chat ID should be numeric.
              </div>
            ) : telegramChatId.trim().length > 0 ? (
              <div className={cn("text-xs flex items-center gap-2 rounded-xl border px-3 py-2", tones.ok)}>
                <CheckCircle2 size={16} /> Chat ID looks valid.
              </div>
            ) : null}
          </div>

          {/* ── Auto-Alerts Section ───────────────────────────────────── */}
          <div className={cn("rounded-2xl border p-4 space-y-4", tones.section)}>
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className={darkMode ? "text-amber-400" : "text-amber-500"} />
                <span className={cn("text-sm font-extrabold", tones.sectionHeader)}>
                  Auto-Alerts
                </span>
                {isPremium && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    PREMIUM
                  </span>
                )}
              </div>

              {/* Toggle */}
              {isPremium ? (
                <button
                  type="button"
                  onClick={() => { setAlertEnabled(!alertEnabled); setTouched(true); }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    alertEnabled ? tones.toggle : tones.toggleOff
                  )}
                  aria-label="Toggle auto-alerts"
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      alertEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              ) : (
                <Lock size={16} className={darkMode ? "text-gray-500" : "text-gray-400"} />
              )}
            </div>

            {/* Premium lock gate */}
            {!isPremium ? (
              <div className={cn("rounded-xl border px-4 py-3 flex items-center gap-3", tones.lock)}>
                <Lock size={16} className="shrink-0" />
                <div>
                  <p className="text-sm font-bold">Premium & Admin Only</p>
                  <p className="text-xs opacity-80">
                    Upgrade to Premium to enable automatic Telegram alerts with custom filters.
                  </p>
                </div>
              </div>
            ) : (
              <div className={cn("space-y-4", !alertEnabled && "opacity-50 pointer-events-none")}>

                {/* Send Time Slot */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold">
                    <Clock size={13} />
                    Alert Time Slot (UTC)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["10:00", "14:00", "16:00", "18:00"].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => { setAlertSendTime(slot); setTouched(true); }}
                        className={cn(
                          "py-2 rounded-xl border text-xs font-extrabold transition",
                          alertSendTime === slot ? tones.chip : tones.chipOff
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  <p className={cn("text-xs", tones.muted)}>
                    Alerts fire daily at your chosen slot (UTC). Pick the time closest to your local timezone.
                  </p>
                </div>

                {/* Confidence slider */}
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Filter size={13} /> Min Confidence
                    </span>
                    <span className={cn("font-extrabold", darkMode ? "text-blue-400" : "text-blue-600")}>
                      {alertMinChance}%
                    </span>
                  </label>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={alertMinChance}
                    onChange={(e) => { setAlertMinChance(Number(e.target.value)); setTouched(true); }}
                    className={cn("w-full h-2 rounded-full", tones.slider)}
                  />
                </div>

                {/* Rating slider */}
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-xs font-bold">
                    <span>Min Rating</span>
                    <span className={cn("font-extrabold", darkMode ? "text-blue-400" : "text-blue-600")}>
                      {alertMinRating}%
                    </span>
                  </label>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={alertMinRating}
                    onChange={(e) => { setAlertMinRating(Number(e.target.value)); setTouched(true); }}
                    className={cn("w-full h-2 rounded-full", tones.slider)}
                  />
                </div>

                {/* Hist Win Rate slider */}
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-xs font-bold">
                    <span>Min Hist. Win Rate</span>
                    <span className={cn("font-extrabold", darkMode ? "text-amber-400" : "text-amber-600")}>
                      {alertMinHistRate > 0 ? `${alertMinHistRate}%` : "Off"}
                    </span>
                  </label>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={alertMinHistRate}
                    onChange={(e) => { setAlertMinHistRate(Number(e.target.value)); setTouched(true); }}
                    className={cn("w-full h-2 rounded-full", tones.slider)}
                  />
                  <p className={cn("text-xs", tones.muted)}>
                    Set to 0 to disable this filter.
                  </p>
                </div>

                {/* Markets multi-select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold block">Markets to Include</label>
                  <div className="flex flex-wrap gap-2">
                    {MARKET_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleMarket(key)}
                        className={cn(
                          "text-xs font-bold px-3 py-1.5 rounded-full border transition",
                          alertMarkets.includes(key) ? tones.chip : tones.chipOff
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pick Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold block">Pick Type</label>
                  <div className="flex gap-3">
                    {[
                      { value: "all", label: "All matches" },
                      { value: "aligned_only", label: "✅ Aligned only" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setAlertPickType(value); setTouched(true); }}
                        className={cn(
                          "flex-1 text-xs font-bold py-2 px-3 rounded-xl border transition",
                          alertPickType === value ? tones.chip : tones.chipOff
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max matches */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold block">Max Matches per Alert</label>
                  <select
                    value={alertMaxMatches}
                    onChange={(e) => { setAlertMaxMatches(Number(e.target.value)); setTouched(true); }}
                    className={cn("w-32 px-3 py-2 rounded-xl border outline-none text-sm transition", tones.input)}
                  >
                    {[5, 10, 15, 20, 50].map((n) => (
                      <option key={n} value={n}>{n} matches</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className={cn("px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0", darkMode ? "border-gray-800" : "border-gray-200")}>
          <button
            onClick={handleTestSignal}
            disabled={!isTokenValid || !isChatIdValid || testStatus === "testing"}
            className={cn(
              "w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2",
              testStatus === "success"
                ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50 border"
                : testStatus === "error"
                ? "bg-rose-500/20 text-rose-500 border-rose-500/50 border"
                : darkMode
                ? "border border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                : "border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100",
              (!isTokenValid || !isChatIdValid) && "opacity-50 cursor-not-allowed border-gray-500 text-gray-500 bg-transparent"
            )}
          >
            {testStatus === "testing" ? "Pinging API..." : testStatus === "success" ? "Sent!" : testStatus === "error" ? "Failed" : <><BellRing size={16} /> Test Connection</>}
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={onClose}
              className={cn("w-full sm:w-auto px-4 py-2.5 rounded-xl border text-sm font-extrabold transition", tones.btn)}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              disabled={!canSave || isLoading}
              className={cn("w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-extrabold transition", tones.primary)}
            >
              {isLoading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}