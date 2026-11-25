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
  PlusCircle,
  Save,
  CheckCircle2,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { formatSlipMarketLabel, formatSlipLeague } from "@/utils/matchUtils";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const BOOKIES = [
  {
    id: "SPORTYBET",
    slug: "sportybet",
    name: "SportyBet",
    color: "bg-red-600",
    text: "text-red-500",
    border: "border-red-500/30",
    badge: "Sporty",
    webUrl: "https://www.sportybet.com/ng/m/sports/football",
    placeholder: "e.g. BC79KA",
  },
  {
    id: "BET9JA",
    slug: "bet9ja",
    name: "Bet9ja",
    color: "bg-emerald-600",
    text: "text-emerald-500",
    border: "border-emerald-500/30",
    badge: "Bet9ja",
    webUrl: "https://sports.bet9ja.com",
    placeholder: "e.g. 3KX7Q2M",
  },
  {
    id: "1XBET",
    slug: "1xbet",
    name: "1xBet",
    color: "bg-sky-600",
    text: "text-sky-500",
    border: "border-sky-500/30",
    badge: "1xBet",
    webUrl: "https://1xbet.ng/en/line/football",
    placeholder: "e.g. G89K1",
  },
  {
    id: "BETKING",
    slug: "betking",
    name: "BetKing",
    color: "bg-blue-600",
    text: "text-blue-500",
    border: "border-blue-500/30",
    badge: "BetKing",
    webUrl: "https://www.betking.com/sports/football",
    placeholder: "e.g. BK8910",
  },
  {
    id: "BETWAY",
    slug: "betway",
    name: "Betway",
    color: "bg-zinc-800",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
    badge: "Betway",
    webUrl: "https://www.betway.com.ng/sport/soccer",
    placeholder: "e.g. BW1245",
  },
];

export default function BookingCodeModal({
  open,
  onClose,
  matches = [],
  slipId = null,
  slipTitle = "FutureBet Curated Multi-Bet",
  initialBookmaker = "SPORTYBET",
  darkMode = true,
  stake = 1000,
  userTier = "free",
  onCodeUpdated = null,
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedBookie, setSelectedBookie] = useState(initialBookmaker);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Admin Code Attachment State
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  const canManageCodes = userTier === "admin" || userTier === "premium" || userTier === "pro";

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
      const bookie = initialBookmaker || "SPORTYBET";
      setSelectedBookie(bookie);
      fetchBookingCode(bookie);
    }
  }, [open, initialBookmaker, matches, slipId]);

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
          slipId,
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
    setShowAdminInput(false);
    setAdminCodeInput("");
    fetchBookingCode(bookieId);
  };

  const handleCopyCode = async () => {
    const code = bookingData?.bookingCode || bookingData?.ticketId;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Booking Code "${code}" copied!`, {
        description: `Ready to paste directly into ${currentBookieConfig.name}.`,
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
    const textToCopy = bookingData?.botConverterText || bookingData?.shareText;
    if (textToCopy) {
      navigator.clipboard?.writeText?.(textToCopy);
    }
    toast.success("Bot-formatted slip copied to clipboard!", {
      description: "Paste directly into @ConvertBetBot on Telegram.",
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

  const handleAttachNativeCode = async () => {
    const clean = adminCodeInput.trim().toUpperCase();
    if (!clean) {
      toast.error(`Please enter a valid ${currentBookieConfig.name} code`);
      return;
    }
    setSavingCode(true);
    try {
      const res = await fetch("/api/booking-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "attach_code",
          slipId: slipId || bookingData?.slipId,
          ticketId: bookingData?.ticketId,
          bookmaker: selectedBookie,
          nativeCode: clean,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save booking code");

      toast.success(resData.message || `Verified ${currentBookieConfig.name} code saved!`);
      setAdminCodeInput("");
      setShowAdminInput(false);
      await fetchBookingCode(selectedBookie);
      if (onCodeUpdated) onCodeUpdated(clean, selectedBookie);
    } catch (err) {
      toast.error(err.message || "Failed to attach booking code");
    } finally {
      setSavingCode(false);
    }
  };

  if (!mounted || !open) return null;

  const currentBookieConfig = BOOKIES.find((b) => b.id === selectedBookie) || BOOKIES[0];
  const displayMatches = bookingData?.matches || matches || [];
  const isVerified = Boolean(bookingData?.isVerifiedNative);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-200 z-10 flex flex-col max-h-[92vh]",
          darkMode
            ? "bg-[#0b1120] border-slate-800 text-white shadow-emerald-950/20"
            : "bg-white border-gray-200 text-gray-900 shadow-slate-300"
        )}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shadow-inner">
              <Ticket size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                1-Click Bookmaker Router
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Native Slip
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Load this AI slip directly into <span className="font-bold text-white">{currentBookieConfig.name}</span>
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
        <div className="p-3.5 sm:p-4 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Select Target Bookmaker:</span>
            {isVerified && (
              <span className="text-emerald-400 font-black text-[10px] flex items-center gap-1">
                <CheckCircle2 size={11} /> Verified Real Code Available
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {BOOKIES.map((b) => {
              const active = b.id === selectedBookie;
              const hasNative = Boolean(bookingData?.nativeCodes?.[b.slug]);
              return (
                <button
                  key={b.id}
                  onClick={() => handleSelectBookie(b.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border flex items-center gap-1.5",
                    active
                      ? `${b.color} text-white shadow-lg border-white/20 scale-[1.02]`
                      : darkMode
                      ? "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-white"
                      : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", active ? "bg-white" : "bg-slate-500")} />
                  {b.name}
                  {hasNative && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-grow">
          {/* Main Booking Code Display Card */}
          <div
            className={cn(
              "rounded-2xl p-5 border relative overflow-hidden text-center transition-all",
              isVerified
                ? "bg-gradient-to-b from-emerald-950/40 via-slate-900/90 to-slate-900/60 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                : darkMode
                ? "bg-gradient-to-b from-slate-900/90 to-slate-900/50 border-slate-800"
                : "bg-slate-50 border-slate-200"
            )}
          >
            {/* Top Status Badge */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-semibold">
              <span className="flex items-center gap-1.5">
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-black uppercase text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <CheckCircle2 size={12} /> Verified {currentBookieConfig.name} Code
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                    <AlertTriangle size={12} /> Native Code Pending
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400">
                {displayMatches.length} Picks • <span className="text-amber-400 font-bold">{bookingData?.totalOdds || 0}x</span> Odds
              </span>
            </div>

            {/* Code Box */}
            <div className="py-2 flex flex-col items-center justify-center">
              {loading ? (
                <div className="flex items-center gap-2 py-5 text-emerald-400 text-sm font-bold animate-pulse">
                  <RefreshCw size={18} className="animate-spin" />
                  Routing {currentBookieConfig.name} Booking Code...
                </div>
              ) : (
                <>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                    {isVerified
                      ? `Official ${currentBookieConfig.name} Booking Code`
                      : `FutureBet Ticket Reference Code`}
                  </div>

                  <div
                    onClick={handleCopyCode}
                    className={cn(
                      "cursor-pointer group flex items-center gap-3 border px-6 py-3 rounded-2xl transition-all shadow-inner",
                      isVerified
                        ? "bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-400 hover:border-emerald-300 shadow-emerald-500/10"
                        : "bg-black/50 hover:bg-black/70 border-slate-700 hover:border-slate-500"
                    )}
                    title={`Click to copy code`}
                  >
                    <span
                      className={cn(
                        "font-mono text-2xl sm:text-3xl font-black tracking-widest group-hover:scale-105 transition-transform",
                        isVerified ? "text-emerald-400" : "text-amber-300"
                      )}
                    >
                      {bookingData?.bookingCode || "FB-TICKET"}
                    </span>
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                        isVerified
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      )}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2.5">
                    {copied ? (
                      <span className="text-emerald-400 font-bold">✓ Code copied to clipboard!</span>
                    ) : isVerified ? (
                      <span className="text-emerald-400 font-bold">
                        Ready to load in {currentBookieConfig.name} App / Web
                      </span>
                    ) : (
                      "Click above to copy reference, or convert to native code below"
                    )}
                  </p>
                </>
              )}
            </div>

            {/* Admin Real Code Input Dropdown */}
            {canManageCodes && (
              <div className="mt-3 pt-3 border-t border-slate-800/60">
                {!showAdminInput ? (
                  <button
                    type="button"
                    onClick={() => setShowAdminInput(true)}
                    className="text-[10px] font-bold text-slate-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Settings size={12} />
                    <span>Attach / Update Real {currentBookieConfig.name} Code (Admin)</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/30 text-left space-y-2 animate-in fade-in duration-200">
                    <div className="text-[10px] font-black uppercase text-amber-400 flex items-center justify-between">
                      <span>Enter Official {currentBookieConfig.name} Code:</span>
                      <button
                        type="button"
                        onClick={() => setShowAdminInput(false)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={adminCodeInput}
                        onChange={(e) => setAdminCodeInput(e.target.value.toUpperCase())}
                        placeholder={currentBookieConfig.placeholder}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold uppercase text-white focus:border-amber-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAttachNativeCode}
                        disabled={savingCode || !adminCodeInput.trim()}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1 disabled:opacity-50"
                      >
                        {savingCode ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                        Save
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Placing/booking once on {currentBookieConfig.name} saves the genuine code permanently for all users.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Staking Guide Notice */}
            <div className="mt-3 text-left rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-[11px] text-blue-200/90 flex items-start gap-2.5">
              <Sparkles size={15} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                {isVerified ? (
                  <>
                    <span className="font-bold text-white">How to Stake:</span> Open the{" "}
                    <span className="font-bold text-white">{currentBookieConfig.name}</span> app or website, go to{" "}
                    <span className="font-bold text-emerald-300">"Load Bet / Booking Code"</span>, and paste{" "}
                    <span className="font-mono font-bold text-emerald-300">{bookingData?.bookingCode}</span>. All {displayMatches.length} matches will load automatically!
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white">How to Stake:</span> A verified native code hasn't been attached yet for this bookmaker. Click{" "}
                    <span className="font-bold text-sky-300">Telegram Bet Converter</span> to convert in 5 seconds via @ConvertBetBot, or click{" "}
                    <span className="font-bold text-emerald-300">Copy Fast Slip</span> to follow the selections directly.
                  </>
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/60">
              <button
                onClick={handleCopyCode}
                disabled={loading}
                className="py-3 px-3 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                title="Copy code"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Code Copied!" : "Copy Code"}
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
              <button
                onClick={handleCopyFastSlip}
                className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1"
              >
                <Copy size={11} /> Copy Fast Slip Text
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {displayMatches.map((m, idx) => {
                const formattedMarket = formatSlipMarketLabel(m.selectedMarket, m.selectedOption);
                const country = (m.country || m.Country || m.leagueCountry || "").trim();
                const rawLeague = (m.fullLeague || m.league || m.League || "").trim();
                const countryLeague = formatSlipLeague(country, rawLeague);

                let dateVal = String(m.dateRaw || m.date || m.dateISO || "").trim();
                if (dateVal.length > 10) dateVal = dateVal.slice(0, 10);

                let timeVal = String(m.time || m.match_time || m.kickoff_at || m.kickoff || "").trim();
                if (timeVal.includes("T")) {
                  timeVal = timeVal.split("T")[1].slice(0, 5);
                } else if (timeVal && timeVal.split(":").length >= 2) {
                  timeVal = timeVal.slice(0, 5);
                }

                const dateTimeStr = dateVal && timeVal ? `${dateVal} • ${timeVal}` : timeVal || dateVal || "";
                const oddsNum = Number(m.odds || m.homeOdds || 0);

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white truncate" title={m.match}>
                        {m.match}
                      </div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-slate-300 font-medium">{countryLeague}</span>
                        {dateTimeStr && <span>• {dateTimeStr}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-emerald-400 font-black text-xs uppercase px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          {formattedMarket}
                        </div>
                        {oddsNum > 1 && (
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                            @{oddsNum.toFixed(2)}
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
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 text-center shrink-0">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
            <Sparkles size={13} className="text-emerald-400" />
            Fast-Bet Router delivers real slip translation for SportyBet, Bet9ja & 1xBet.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
