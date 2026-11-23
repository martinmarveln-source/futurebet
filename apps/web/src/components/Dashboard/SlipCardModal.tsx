// @ts-nocheck
"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { toPng, toBlob } from "html-to-image";
import { toast } from "sonner";

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
  const [theme, setTheme] = useState("cyber"); // "cyber" | "gold" | "clean"
  const [downloading, setDownloading] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);

  if (!open) return null;

  const validMatches = Array.isArray(matches) ? matches : [];
  const displayOdds = Number(totalOdds || 1).toFixed(2);
  const todayStr = new Date().toISOString().slice(0, 10);
  const ticketRef = `FB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // High resolution export
      });
      const link = document.createElement("a");
      link.download = `futurebet-slip-${todayStr}.png`;
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
    const text = `🔥 Check out my FutureBet AI Verified Slip (${validMatches.length} matches @ ${displayOdds}x total odds)! Generated on https://futurebet.com.ng`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

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
          "relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-200 z-10 flex flex-col max-h-[95vh]",
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

        {/* Toolbar: Aspect Ratio & Theme Selector */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Format Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setAspectRatio("story")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all",
                aspectRatio === "story"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Smartphone size={13} /> 9:16 Story
            </button>
            <button
              onClick={() => setAspectRatio("square")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all",
                aspectRatio === "square"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Square size={13} /> 1:1 Square
            </button>
          </div>

          {/* Theme Palette */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTheme("cyber")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                theme === "cyber" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Cyber Neon
            </button>
            <button
              onClick={() => setTheme("gold")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                theme === "gold" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              )}
            >
              VIP Gold
            </button>
            <button
              onClick={() => setTheme("clean")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                theme === "clean" ? "bg-slate-200 text-slate-900" : "text-slate-400 hover:text-white"
              )}
            >
              Clean Ice
            </button>
          </div>
        </div>

        {/* Card Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow flex items-center justify-center bg-black/40">
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
            <div className="relative z-10 mb-3">
              <div className="flex items-center justify-between mb-2">
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
            <div className="relative z-10 space-y-2 flex-grow overflow-hidden my-2">
              {validMatches.slice(0, aspectRatio === "story" ? 6 : 4).map((m, idx) => {
                const score = m.cScore || m.predictedScore || m.likelyCS || m.c_score;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-2.5 rounded-xl border backdrop-blur-md flex items-center justify-between gap-2 text-left",
                      theme === "cyber"
                        ? "bg-white/[0.03] border-white/10"
                        : theme === "gold"
                        ? "bg-amber-500/[0.04] border-amber-500/20"
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="truncate flex-1">
                      <div className="text-[11px] font-black truncate">{m.match}</div>
                      <div className="text-[9px] text-slate-400 flex items-center gap-1.5 truncate">
                        <span>{m.league || "Football"}</span>
                        {score && <span className="text-amber-400 font-bold">• Score {score}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border",
                          theme === "cyber"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : theme === "gold"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-blue-500/20 text-blue-200 border-blue-500/30"
                        )}
                      >
                        {m.selectedMarket}: {m.selectedOption}
                      </div>
                      {Number(m.odds) > 1 && (
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                          @{Number(m.odds).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {validMatches.length > (aspectRatio === "story" ? 6 : 4) && (
                <div className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">
                  + {validMatches.length - (aspectRatio === "story" ? 6 : 4)} more picks in ticket
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

              {/* Watermark & Verification */}
              <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 tracking-wider">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={10} className="text-emerald-400" />
                  futurebet.com.ng
                </span>
                <span className="font-mono">{ticketRef}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-semibold hidden sm:block">
            Ready to post directly to your socials
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
