// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Ticket,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Search,
  Bot,
} from "lucide-react";
import { toast } from "sonner";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const BOOKIES = [
  {
    id: "SPORTYBET",
    name: "SportyBet",
    color: "bg-red-600",
    text: "text-red-500",
    border: "border-red-500/30",
    badge: "Sporty",
    webUrl: "https://www.sportybet.com/ng/m/sports/football",
  },
  {
    id: "BET9JA",
    name: "Bet9ja",
    color: "bg-emerald-600",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    badge: "Bet9ja",
    webUrl: "https://sports.bet9ja.com",
  },
  {
    id: "1XBET",
    name: "1xBet",
    color: "bg-sky-600",
    text: "text-sky-500",
    border: "border-sky-500/30",
    badge: "1xBet",
    webUrl: "https://1xbet.ng/en/line/football",
  },
  {
    id: "BETKING",
    name: "BetKing",
    color: "bg-blue-600",
    text: "text-blue-500",
    border: "border-blue-500/30",
    badge: "BetKing",
    webUrl: "https://www.betking.com/sports/football",
  },
  {
    id: "BETWAY",
    name: "Betway",
    color: "bg-zinc-800",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
    badge: "Betway",
    webUrl: "https://www.betway.com.ng/sport/soccer",
  },
];

export default function BookingCodeModal({
  open,
  onClose,
  matches = [],
  initialBookmaker = "SPORTYBET",
  darkMode = true,
  stake = 0,
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedBookie, setSelectedBookie] = useState(initialBookmaker);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Anti-jump body scroll lock
  useEffect(() => {
    if (!open) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [open]);

  // Sync initial bookmaker when opened
  useEffect(() => {
    if (open) {
      setSelectedBookie(initialBookmaker || "SPORTYBET");
      fetchBookingCode(initialBookmaker || "SPORTYBET");
    }
  }, [open, initialBookmaker, matches]);

  const fetchBookingCode = async (bookieId) => {
    if (!matches || matches.length === 0) return;
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/booking-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matches,
          bookmaker: bookieId,
          stake,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate booking code");
      setBookingData(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not generate booking code");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBookie = (bookieId) => {
    setSelectedBookie(bookieId);
    fetchBookingCode(bookieId);
  };

  const handleCopyCode = async () => {
    const code = bookingData?.bookingCode || bookingData?.ticketId;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Ticket ID ${code} copied!`, {
        description: `Ready to reference or share.`,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      toast.error("Failed to copy code to clipboard");
    }
  };

  const handleCopyFastSlip = async () => {
    const textToCopy = bookingData?.fastSlipText || bookingData?.shareText;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Fast-Bet Slip copied to clipboard!", {
        description: `Ready to stake on ${currentBookieConfig.name}.`,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy slip text");
    }
  };

  const handleOpenConverter = () => {
    if (bookingData?.shareText) {
      navigator.clipboard?.writeText?.(bookingData.shareText);
    }
    toast.info("Opening @ConvertBetBot on Telegram...", {
      description: "Slip copied to clipboard. Paste into the bot to get a native code.",
    });
    window.open("https://t.me/ConvertBetBot", "_blank", "noopener,noreferrer");
  };

  const handleCopyShareText = async () => {
    if (!bookingData?.shareText) return;
    try {
      await navigator.clipboard.writeText(bookingData.shareText);
      toast.success("Complete slip text copied to clipboard!");
    } catch {
      toast.error("Failed to copy share text");
    }
  };

  const handleShareWhatsApp = () => {
    if (!bookingData?.shareText) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(bookingData.shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = () => {
    if (!bookingData?.shareText) return;
    const url = `https://t.me/share/url?url=${encodeURIComponent("https://futurebet.com.ng")}&text=${encodeURIComponent(bookingData.shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!mounted || !open) return null;

  const currentBookieConfig = BOOKIES.find((b) => b.id === selectedBookie) || BOOKIES[0];
  const displayMatches = bookingData?.matches || matches || [];

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-200 z-10 flex flex-col max-h-[90vh]",
          darkMode
            ? "bg-[#0b1120] border-slate-800 text-white"
            : "bg-white border-gray-200 text-gray-900"
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Ticket size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                1-Click Booking & Bet Router
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Router
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Load your AI ticket directly into {currentBookieConfig.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Bookmaker Selector Tabs */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/20 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Select Target Bookmaker:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {BOOKIES.map((b) => {
              const active = b.id === selectedBookie;
              return (
                <button
                  key={b.id}
                  onClick={() => handleSelectBookie(b.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border flex items-center gap-2",
                    active
                      ? `${b.color} text-white shadow-lg border-white/20 scale-[1.02]`
                      : darkMode
                      ? "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-white"
                      : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-white/80" />
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-grow">
          {/* Main Booking Code Display Card */}
          <div
            className={cn(
              "rounded-2xl p-5 border relative overflow-hidden text-center transition-all",
              darkMode
                ? "bg-gradient-to-b from-slate-900/90 to-slate-900/50 border-slate-800"
                : "bg-slate-50 border-slate-200"
            )}
          >
            {/* Top Info Row */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-semibold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                Formatted for {currentBookieConfig.name}
              </span>
              <span>
                {displayMatches.length} Matches • {bookingData?.totalOdds || 0}x Total Odds
              </span>
            </div>

            {/* Code Box */}
            <div className="py-2 flex flex-col items-center justify-center">
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-emerald-400 text-sm font-bold animate-pulse">
                  <RefreshCw size={18} className="animate-spin" />
                  Routing {currentBookieConfig.name} Slip...
                </div>
              ) : (
                <>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    FutureBet AI Ticket ID
                  </div>
                  <div
                    onClick={handleCopyCode}
                    className="cursor-pointer group flex items-center gap-3 bg-black/40 hover:bg-black/60 border border-emerald-500/40 hover:border-emerald-400 px-6 py-2.5 rounded-2xl transition-all shadow-inner"
                    title="Click to copy ticket ID"
                  >
                    <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-emerald-400 group-hover:scale-105 transition-transform">
                      {bookingData?.bookingCode || "FB-TICKET"}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {copied ? (
                      <span className="text-emerald-400 font-bold">✓ Fast slip copied to clipboard!</span>
                    ) : (
                      "Click above or use buttons below to stake"
                    )}
                  </p>
                </>
              )}
            </div>

            {/* Staking Guide Notice */}
            <div className="mt-3 text-left rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-[11px] text-blue-200/90 flex items-start gap-2.5">
              <Sparkles size={15} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">How to Stake:</span> Official bookmaker codes are issued inside each bookmaker's system. Click <span className="font-bold text-emerald-300">Copy Fast Slip</span> to follow your selections, use <span className="font-bold text-white">Open {currentBookieConfig.name}</span> to place them, or use the <span className="font-bold text-sky-300">Telegram Bet Converter</span> to generate a native bookmaker code.
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/60">
              <button
                onClick={handleCopyFastSlip}
                disabled={loading}
                className="py-3 px-3 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                title="Copy all selections formatted for quick staking"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Slip Copied!" : "Copy Fast Slip"}
              </button>

              <a
                href={bookingData?.webUrl || currentBookieConfig.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-1.5 border border-slate-700 transition-all active:scale-[0.98]"
              >
                <ExternalLink size={14} />
                Open {currentBookieConfig.name}
              </a>

              <button
                onClick={handleOpenConverter}
                className="py-3 px-3 rounded-xl text-xs font-black bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                title="Convert this slip via @ConvertBetBot on Telegram"
              >
                <Bot size={14} />
                Telegram Bot
              </button>
            </div>
          </div>

          {/* Social Viral Share Section */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Viral Share & Export:</span>
              <button
                onClick={handleCopyShareText}
                className="text-emerald-400 hover:text-emerald-300 text-[10px] lowercase flex items-center gap-1 font-bold"
              >
                <Copy size={11} /> copy full text
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <Share2 size={13} />
                WhatsApp
              </button>
              <button
                onClick={handleShareTelegram}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <Share2 size={13} />
                Telegram
              </button>
            </div>
          </div>

          {/* Included Selections Preview with 1-Click Match Search */}
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Matches on this Slip ({displayMatches.length}):</span>
              <span className="text-[10px] text-slate-500">Click 'Find' to view on {currentBookieConfig.name}</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {displayMatches.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="truncate flex-1">
                    <div className="font-bold text-white truncate">{m.match}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {m.league || "Football"} {m.time ? `• ${m.time}` : ""} {m.date ? `• ${m.date}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-emerald-400 font-black text-xs">
                        {m.selectedMarket}: {m.selectedOption}
                      </div>
                      {Number(m.odds) > 1 && (
                        <div className="text-[10px] text-slate-400 font-bold">
                          @{Number(m.odds).toFixed(2)}
                        </div>
                      )}
                    </div>
                    {m.bookieSearchUrl && (
                      <a
                        href={m.bookieSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        title={`Search ${m.match} on ${currentBookieConfig.name}`}
                      >
                        <Search size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 text-center shrink-0">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
            <Sparkles size={13} className="text-emerald-400" />
            Fast-Bet Router delivers instant slip translation for all major Nigerian bookmakers.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
