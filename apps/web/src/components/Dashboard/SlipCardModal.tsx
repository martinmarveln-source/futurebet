// @ts-nocheck
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  Sparkles,
  Ticket,
  ShieldCheck,
  Smartphone,
  Square,
  Palette,
  RefreshCw,
  Eye,
  ListFilter,
} from "lucide-react";
import { toPng, toBlob } from "html-to-image";
import { toast } from "sonner";
import { formatSlipMarketLabel, formatSlipLeague } from "@/utils/matchUtils";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export function SlipCardModal({
  open,
  onClose,
  matches = [],
  totalOdds = 1,
  slipTitle = "",
  darkMode = true,
}) {
  const cardRef = useRef(null);
  const [aspectRatio, setAspectRatio] = useState("story"); // "story" (9:16) | "square" (1:1)
  const [theme, setTheme] = useState("gold"); // "cyber" | "gold" | "clean"
  const [displayMode, setDisplayMode] = useState("all"); // "all" | "featured"
  const [downloading, setDownloading] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [ticketRef, setTicketRef] = useState("");

  const validMatches = useMemo(() => (Array.isArray(matches) ? matches : []), [matches]);
  const displayOdds = Number(totalOdds || 1).toFixed(2);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Generate stable deterministic ticket code and register it
  useEffect(() => {
    if (!open || !validMatches.length) return;

    // Generate stable code from match names and selections
    const seed = validMatches
      .map((m) => `${m.match}:${m.selectedMarket}:${m.selectedOption}`)
      .sort()
      .join("|");
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const charPool = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const absVal = Math.abs(hash);
    let body = "";
    let temp = absVal;
    for (let i = 0; i < 5; i++) {
      body += charPool[temp % charPool.length];
      temp = Math.floor(temp / charPool.length);
    }
    const generatedCode = `FB-${body || "2KU3R"}`;
    setTicketRef(generatedCode);

    // Auto-register code with backend and localStorage
    const registerTicket = async () => {
      try {
        const res = await fetch("/api/booking-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matches: validMatches,
            code: generatedCode,
            ticketId: generatedCode,
            bookmaker: "SPORTYBET",
          }),
        });
        const data = await res.json();
        const finalCode = data?.bookingCode || generatedCode;
        setTicketRef(finalCode);

        // Store into localStorage client history
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("futurebet_client_tickets") || "[]";
            const list = JSON.parse(raw);
            const exists = list.some((item) => item.code === finalCode);
            if (!exists) {
              const updated = [
                {
                  code: finalCode,
                  matches: validMatches,
                  totalOdds: displayOdds,
                  matchCount: validMatches.length,
                  slipTitle,
                  createdAt: new Date().toISOString(),
                },
                ...list,
              ].slice(0, 30);
              localStorage.setItem("futurebet_client_tickets", JSON.stringify(updated));
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Could not register slip code:", err);
      }
    };

    registerTicket();
  }, [open, validMatches, displayOdds, slipTitle]);

  if (!open) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // High resolution export
      });
      const link = document.createElement("a");
      link.download = `futurebet-slip-${ticketRef || "ticket"}-${todayStr}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Slip card downloaded successfully!");
    } catch (err) {
      console.error("Card export error:", err);
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopiedImg(true);
        toast.success("Graphic slip copied to clipboard!", {
          description: "Paste it directly into WhatsApp, Twitter, or Telegram.",
        });
        setTimeout(() => setCopiedImg(false), 2500);
      } else {
        throw new Error("Clipboard API not supported for images");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not copy image directly. Use Download instead.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🔥 Check out my FutureBet AI Verified Slip (${validMatches.length} matches @ ${displayOdds}x total odds)!\n🎫 Ticket Code: ${ticketRef}\nUnlock all selections at https://futurebet.com.ng`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Determine matches to display on the card based on displayMode
  const maxFeaturedCount = aspectRatio === "story" ? 6 : 4;
  const matchesToRender =
    displayMode === "all"
      ? validMatches
      : validMatches.slice(0, maxFeaturedCount);

  const hasRemaining =
    displayMode === "featured" && validMatches.length > maxFeaturedCount;
  const remainingCount = validMatches.length - maxFeaturedCount;

  // Adaptive compactness: if rendering all matches (>6), make rows sleeker
  const isCompactRows = displayMode === "all" && matchesToRender.length > 6;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-200 z-10 flex flex-col max-h-[96vh]",
          darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                Viral Slip Card Studio
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  HD Graphic
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Share your AI predictions on WhatsApp Status, Twitter/X & Telegram
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

        {/* Toolbar: Aspect Ratio, Theme, & Match Display Mode */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/30 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Format Toggle */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setAspectRatio("story")}
              className={cn(
                "px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all",
                aspectRatio === "story"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Smartphone size={12} /> 9:16 Story
            </button>
            <button
              onClick={() => setAspectRatio("square")}
              className={cn(
                "px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all",
                aspectRatio === "square"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Square size={12} /> 1:1 Square
            </button>
          </div>

          {/* Theme Palette */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTheme("gold")}
              className={cn(
                "px-2 py-1 rounded-lg text-xs font-bold transition-all",
                theme === "gold" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
              )}
            >
              VIP Gold
            </button>
            <button
              onClick={() => setTheme("cyber")}
              className={cn(
                "px-2 py-1 rounded-lg text-xs font-bold transition-all",
                theme === "cyber" ? "bg-emerald-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
              )}
            >
              Cyber Neon
            </button>
            <button
              onClick={() => setTheme("clean")}
              className={cn(
                "px-2 py-1 rounded-lg text-xs font-bold transition-all",
                theme === "clean" ? "bg-slate-200 text-slate-900 font-black" : "text-slate-400 hover:text-white"
              )}
            >
              Clean Ice
            </button>
          </div>

          {/* MATCH DISPLAY TOGGLE: ALL MATCHES VS FEATURED */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDisplayMode("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all",
                displayMode === "all"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
              title="Show all selections directly on the card with adaptive sizing"
            >
              <Eye size={12} /> All ({validMatches.length})
            </button>
            <button
              onClick={() => setDisplayMode("featured")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all",
                displayMode === "featured"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
              title="Show top 6 picks with code reference"
            >
              <ListFilter size={12} /> Top 6
            </button>
          </div>
        </div>

        {/* Card Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow flex items-center justify-center bg-black/50">
          <div
            ref={cardRef}
            className={cn(
              "w-full transition-all duration-300 relative overflow-hidden flex flex-col justify-between p-5 sm:p-6 shadow-2xl rounded-3xl border",
              aspectRatio === "story" ? "max-w-[340px] min-h-[580px]" : "max-w-[400px] aspect-square min-h-[400px]",
              theme === "cyber"
                ? "bg-gradient-to-b from-[#0b1329] via-[#0f172a] to-[#050914] border-emerald-500/40 text-white shadow-[0_0_40px_rgba(16,185,129,0.15)]"
                : theme === "gold"
                ? "bg-gradient-to-b from-[#181308] via-[#0f0e0b] to-[#080705] border-amber-500/40 text-amber-100 shadow-[0_0_40px_rgba(245,158,11,0.15)]"
                : "bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-slate-700 text-white"
            )}
          >
            {/* Ambient Card Glow */}
            <div
              className={cn(
                "absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-30",
                theme === "cyber" ? "bg-emerald-500" : theme === "gold" ? "bg-amber-500" : "bg-blue-500"
              )}
            />

            {/* CARD TOP: BRAND & HEADER */}
            <div className="relative z-10 mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shadow-md",
                      theme === "cyber"
                        ? "bg-emerald-500 text-slate-950"
                        : theme === "gold"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-blue-500 text-white"
                    )}
                  >
                    <Ticket size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-black tracking-wider uppercase leading-none">
                      FutureBet <span className="text-emerald-400">AI</span>
                    </div>
                    <div className="text-[8px] font-bold tracking-widest text-slate-400 uppercase">
                      Quantitative Syndicate
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-widest",
                    theme === "cyber"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : theme === "gold"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                  )}
                >
                  Verified Slip
                </div>
              </div>

              {slipTitle && (
                <div className="text-xs font-bold text-slate-300 truncate mb-1">
                  ✨ {slipTitle}
                </div>
              )}
            </div>

            {/* CARD MIDDLE: MATCH SELECTIONS LIST */}
            <div
              className={cn(
                "relative z-10 flex-grow overflow-hidden my-1",
                isCompactRows ? "space-y-1.5" : "space-y-2"
              )}
            >
              {matchesToRender.map((m, idx) => {
                const score = m.cScore || m.predictedScore || m.likelyCS || m.c_score;
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
                    className={cn(
                      "rounded-xl border backdrop-blur-md flex items-center justify-between gap-2.5 text-left transition-all",
                      isCompactRows ? "p-1.5 px-2" : "p-2 px-2.5",
                      theme === "cyber"
                        ? "bg-white/[0.03] border-white/10"
                        : theme === "gold"
                        ? "bg-amber-500/[0.04] border-amber-500/20"
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "font-black tracking-tight leading-snug break-words",
                          isCompactRows ? "text-[10px]" : "text-[11px]"
                        )}
                        title={m.match}
                      >
                        {m.match}
                      </div>
                      <div
                        className={cn(
                          "text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 font-medium leading-none",
                          isCompactRows ? "text-[8px]" : "text-[9px]"
                        )}
                      >
                        <span className="text-slate-300 font-semibold">{countryLeague}</span>
                        {dateTimeStr && (
                          <span className="text-slate-400 font-medium">
                            • {dateTimeStr}
                          </span>
                        )}
                        {score && <span className="text-amber-400 font-bold">• Score {score}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end justify-center">
                      <div
                        className={cn(
                          "font-black uppercase rounded-lg border text-center shadow-xs tracking-wide",
                          isCompactRows ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5",
                          theme === "cyber"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : theme === "gold"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-blue-500/20 text-blue-200 border-blue-500/30"
                        )}
                      >
                        {formattedMarket}
                      </div>
                      {oddsNum > 1 && (
                        <div
                          className={cn(
                            "font-bold mt-0.5",
                            isCompactRows ? "text-[8px]" : "text-[9px]",
                            theme === "cyber"
                              ? "text-emerald-400/90"
                              : theme === "gold"
                              ? "text-amber-400/90"
                              : "text-blue-300"
                          )}
                        >
                          @{oddsNum.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* REMAINING PICKS BANNER (IF IN FEATURED MODE) */}
              {hasRemaining && (
                <div className="text-center p-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 mt-1 space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                    + {remainingCount} more picks in ticket
                  </div>
                  <div className="text-[8px] font-bold text-slate-400">
                    Enter code <span className="font-mono text-emerald-400 font-black">{ticketRef}</span> on futurebet.com.ng to unlock all {validMatches.length} selections
                  </div>
                </div>
              )}
            </div>

            {/* CARD BOTTOM: TOTAL ODDS & VERIFICATION BANNER */}
            <div className="relative z-10 pt-2 border-t border-white/10">
              <div
                className={cn(
                  "p-3 rounded-2xl flex items-center justify-between mb-2 shadow-inner",
                  theme === "cyber"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : theme === "gold"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "bg-blue-500/10 border border-blue-500/20 text-blue-300"
                )}
              >
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Combined Accumulator
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none mt-0.5">
                    {displayOdds}x Odds
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Slip Size
                  </div>
                  <div className="text-sm font-black mt-0.5">
                    {validMatches.length} Matches
                  </div>
                </div>
              </div>

              {/* Watermark & Clear Booking Code Reference */}
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 tracking-wider px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  futurebet.com.ng
                </span>
                <span className="font-mono text-amber-300 font-black bg-white/[0.06] px-2 py-0.5 rounded border border-white/10">
                  {ticketRef}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-semibold hidden sm:block">
            Ticket <span className="font-mono text-amber-400 font-bold">{ticketRef}</span> registered & ready to post
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyImage}
              disabled={downloading}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-[0.98]"
              title="Copy graphic image directly to clipboard"
            >
              {copiedImg ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedImg ? "Image Copied!" : "Copy Image"}
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
            >
              {downloading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Download PNG
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 rounded-xl text-xs font-black bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all"
              title="Share slip on WhatsApp"
            >
              <Share2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
