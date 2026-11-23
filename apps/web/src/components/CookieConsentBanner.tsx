"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "futurebet_data_cookie_consent_v1";

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (!consent) {
        // Show banner after brief delay
        const timer = setTimeout(() => setShowBanner(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {}
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "essential_only");
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <aside
      aria-label="Cookie and Data Protection Consent"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-500"
    >
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl text-slate-800 dark:text-slate-200 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Cookie size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                Privacy & Cookie Notice
              </h3>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                NDPA 2023 & GDPR Compliant
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEssentialOnly}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          FutureBet uses cookies and encrypted session tokens to power AI analytics, secure authentication, and remember your dashboard settings. We do not sell your personal data.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
          <Link
            href="/privacy"
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Read Privacy Policy
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
