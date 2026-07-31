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
} from "lucide-react";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export default function SettingsModal({
  show,
  onClose,
  darkMode,
  onSave,
  preferences,
  isLoading,
}) {
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [touched, setTouched] = useState(false);
  const [testStatus, setTestStatus] = useState("idle"); // idle, testing, success, error

  const tokenRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    // Autofocus first input for speed
    const t = setTimeout(() => tokenRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [show]);

  useEffect(() => {
    if (!preferences) return;

    setTelegramToken(preferences.telegram_bot_token || "");
    setTelegramChatId(preferences.telegram_chat_id || "");
    setTouched(false);
    setTestStatus("idle");
  }, [preferences, show]);

  // Close on ESC + basic focus trap (good enough for modal UX)
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
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, onClose]);

  const isTokenValid = useMemo(() => {
    const v = telegramToken.trim();
    // Telegram bot token format is usually like: 123456789:AA...
    return v.length === 0 || /^[0-9]{6,}:[A-Za-z0-9_-]{20,}$/.test(v);
  }, [telegramToken]);

  const isChatIdValid = useMemo(() => {
    const v = telegramChatId.trim();
    // Chat ID often numeric, can be negative for groups
    return v.length === 0 || /^-?\d{4,}$/.test(v);
  }, [telegramChatId]);

  const canSave = useMemo(() => {
    // Allow saving empty to clear settings
    const ok = isTokenValid && isChatIdValid;
    const changed =
      telegramToken !== (preferences?.telegram_bot_token || "") ||
      telegramChatId !== (preferences?.telegram_chat_id || "");
    return ok && (changed || touched);
  }, [
    isTokenValid,
    isChatIdValid,
    telegramToken,
    telegramChatId,
    preferences,
    touched,
  ]);

  const handleSaveClick = () => {
    if (!isTokenValid || !isChatIdValid) return;

    onSave?.({
      telegram_bot_token: telegramToken.trim(),
      telegram_chat_id: telegramChatId.trim(),
    });
  };

  // --- 🔥 THE TELEGRAM WEBHOOK TESTER 🔥 ---
  const handleTestSignal = async () => {
    if (
      !telegramToken.trim() ||
      !telegramChatId.trim() ||
      !isTokenValid ||
      !isChatIdValid
    )
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
      const url = `https://api.telegram.org/bot${telegramToken.trim()}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId.trim(),
          text: message,
          parse_mode: "Markdown",
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setTestStatus("success");
        setTimeout(() => setTestStatus("idle"), 3000);
      } else {
        setTestStatus("error");
        console.error("TG API Error:", data);
        setTimeout(() => setTestStatus("idle"), 3000);
      }
    } catch (error) {
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
        input:
          "bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:border-blue-500/50",
        btn: "border-gray-800 bg-gray-900 hover:bg-gray-800 text-gray-100",
        primary:
          "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:opacity-60",
        hint: "border-blue-500/20 bg-blue-500/10 text-blue-200",
        ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
        warn: "border-amber-500/25 bg-amber-500/10 text-amber-200",
      }
    : {
        overlay: "bg-black/50",
        card: "bg-white text-gray-900 border-gray-200",
        subtle: "text-gray-600",
        muted: "text-gray-500",
        input:
          "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50",
        btn: "border-gray-200 bg-white hover:bg-gray-50 text-gray-900",
        primary:
          "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-600 disabled:opacity-70",
        hint: "border-blue-200 bg-blue-50 text-blue-800",
        ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
        warn: "border-amber-200 bg-amber-50 text-amber-900",
      };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-center justify-center p-4",
        tones.overlay
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        id="fb-settings-modal"
        className={cn(
          "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden",
          tones.card
        )}
      >
        <div
          className={cn(
            "px-5 py-4 flex items-start justify-between gap-3 border-b",
            darkMode ? "border-gray-800" : "border-gray-200"
          )}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Shield
                size={18}
                className={darkMode ? "text-blue-300" : "text-blue-600"}
              />
              <h3 id="settings-title" className="text-base font-extrabold">
                Settings
              </h3>
            </div>
            <p className={cn("text-xs mt-1", tones.muted)}>
              Telegram settings are stored in your account preferences.
            </p>
          </div>

          <button
            onClick={onClose}
            className={cn("p-2 rounded-xl border transition", tones.btn)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className={cn("rounded-2xl border p-3 flex gap-3", tones.hint)}>
            <div className="mt-0.5">
              <Shield size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold">Privacy note</div>
              <div className="text-xs leading-relaxed opacity-90">
                Keep your bot token private. If you rotate your token in
                BotFather, update it here.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-extrabold">
              Telegram Bot Token
            </label>
            <input
              ref={tokenRef}
              type="text"
              value={telegramToken}
              onChange={(e) => {
                setTelegramToken(e.target.value);
                setTouched(true);
              }}
              placeholder="123456789:AAxxxxxxxxxxxxxxxxxxxx"
              className={cn(
                "w-full px-4 py-3 rounded-xl border outline-none transition",
                tones.input
              )}
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />

            {!isTokenValid ? (
              <div
                className={cn(
                  "text-xs flex items-center gap-2 rounded-xl border px-3 py-2",
                  tones.warn
                )}
              >
                <AlertTriangle size={16} />
                Token format looks wrong.
              </div>
            ) : telegramToken.trim().length > 0 ? (
              <div
                className={cn(
                  "text-xs flex items-center gap-2 rounded-xl border px-3 py-2",
                  tones.ok
                )}
              >
                <CheckCircle2 size={16} />
                Token looks valid.
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-extrabold">
              Telegram Chat ID
            </label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => {
                setTelegramChatId(e.target.value);
                setTouched(true);
              }}
              placeholder="e.g. 123456789 or -1001234567890"
              className={cn(
                "w-full px-4 py-3 rounded-xl border outline-none transition",
                tones.input
              )}
              autoComplete="off"
              spellCheck={false}
              inputMode="numeric"
            />

            {!isChatIdValid ? (
              <div
                className={cn(
                  "text-xs flex items-center gap-2 rounded-xl border px-3 py-2",
                  tones.warn
                )}
              >
                <AlertTriangle size={16} />
                Chat ID should be numeric.
              </div>
            ) : telegramChatId.trim().length > 0 ? (
              <div
                className={cn(
                  "text-xs flex items-center gap-2 rounded-xl border px-3 py-2",
                  tones.ok
                )}
              >
                <CheckCircle2 size={16} />
                Chat ID looks valid.
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3",
            darkMode ? "border-gray-800" : "border-gray-200"
          )}
        >
          {/* 🔥 TEST SIGNAL BUTTON 🔥 */}
          <button
            onClick={handleTestSignal}
            disabled={
              !isTokenValid || !isChatIdValid || testStatus === "testing"
            }
            className={cn(
              "w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2",
              testStatus === "success"
                ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50 border"
                : testStatus === "error"
                ? "bg-rose-500/20 text-rose-500 border-rose-500/50 border"
                : darkMode
                ? "border border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                : "border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100",
              (!isTokenValid || !isChatIdValid) &&
                "opacity-50 cursor-not-allowed border-gray-500 text-gray-500 bg-transparent"
            )}
          >
            {testStatus === "testing" ? (
              "Pinging API..."
            ) : testStatus === "success" ? (
              "Sent!"
            ) : testStatus === "error" ? (
              "Failed"
            ) : (
              <>
                <BellRing size={16} /> Test Connection
              </>
            )}
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={onClose}
              className={cn(
                "w-full sm:w-auto px-4 py-2.5 rounded-xl border text-sm font-extrabold transition",
                tones.btn
              )}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              disabled={!canSave || isLoading}
              className={cn(
                "w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-extrabold transition",
                tones.primary
              )}
            >
              {isLoading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}