// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Ticket,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
  Flame,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import useBetslipStore from "@/store/betslipStore";
import { formatSlipMarketLabel, formatSlipLeague } from "@/utils/matchUtils";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export function LoadBookingCodeModal({
  open,
  onClose,
  darkMode = true,
  initialCode = "",
  onOpenCardModal,
}) {
  const [mounted, setMounted] = useState(false);
  const [inputCode, setInputCode] = useState(initialCode || "");
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [copiedText, setCopiedText] = useState(false);

  const loadMatches = useBetslipStore((s) => s.loadMatches);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initialCode if provided
  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode.toUpperCase().trim());
      handleLookupCode(initialCode.toUpperCase().trim());
    }
  }, [initialCode]);

  // Load recent tickets from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && open) {
      try {
        const raw = localStorage.getItem("futurebet_client_tickets") || "[]";
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          setRecentTickets(list.slice(0, 8));
        }
      } catch (err) {
        console.warn("Could not read recent tickets:", err);
      }
    }
  }, [open]);

  // Anti-jump body scroll lock
  useEffect(() => {
    if (!open) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const handleLookupCode = async (codeToSearch) => {
    const code = (codeToSearch || inputCode || "").trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a ticket code (e.g. FB-2KU3R)");
      return;
    }

    setLoading(true);
    setTicketData(null);

    // 1. Try local cache first for instant response
    try {
      const raw = localStorage.getItem("futurebet_client_tickets") || "[]";
      const list = JSON.parse(raw);
      const localMatch = list.find(
        (t) => String(t.code || "").toUpperCase() === code
      );
      if (localMatch && Array.isArray(localMatch.matches) && localMatch.matches.length > 0) {
        setTicketData(localMatch);
        setLoading(false);
        return;
      }
    } catch (e) {}

    // 2. Fetch from backend API
    try {
      const res = await fetch(`/api/booking-code?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Ticket not found or expired.");
      }

      setTicketData(data);

      // Save to recent tickets in localStorage
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("futurebet_client_tickets") || "[]";
          const list = JSON.parse(raw);
          const exists = list.some((item) => item.code === (data.bookingCode || code));
          if (!exists) {
            const updated = [
              {
                code: data.bookingCode || code,
                matches: data.matches || [],
                totalOdds: data.totalOdds,
                matchCount: data.matchCount || data.matches?.length || 0,
                createdAt: data.createdAt || new Date().toISOString(),
              },
              ...list,
            ].slice(0, 30);
            localStorage.setItem("futurebet_client_tickets", JSON.stringify(updated));
            setRecentTickets(updated.slice(0, 8));
          }
        } catch (e) {}
      }

      toast.success(`Ticket ${code} verified!`, {
        description: `Found ${data.matches?.length || 0} selections.`,
      });
    } catch (err) {
      console.error("Lookup error:", err);
      toast.error("Booking Code Not Found", {
        description: err.message || "Please verify the ticket code and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const clean = text.trim().toUpperCase();
        if (clean) {
          setInputCode(clean);
          handleLookupCode(clean);
        }
      } else {
        toast.error("Clipboard paste not supported in this browser.");
      }
    } catch (e) {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const handleLoadIntoSlip = (replace = true) => {
    if (!ticketData || !ticketData.matches || !ticketData.matches.length) return;
    const count = loadMatches(
      ticketData.matches,
      `Ticket #${ticketData.bookingCode || ticketData.code || inputCode}`,
      replace
    );

    toast.success(
      replace
        ? `Loaded all ${count} matches into your BetSlip!`
        : `Merged ${count} new matches into your BetSlip!`,
      {
        description: `Total Accumulator: ${ticketData.totalOdds || "—"}x Odds`,
      }
    );
    onClose();
  };

  const handleCopyFastText = () => {
    if (!ticketData) return;
    const text =
      ticketData.shareText ||
      ticketData.fastSlipText ||
      `FutureBet Ticket #${ticketData.bookingCode || ticketData.code}\nTotal Odds: ${ticketData.totalOdds}x\nMatches:\n` +
        ticketData.matches
          .map(
            (m, i) =>
              `${i + 1}. ${m.match} - ${formatSlipMarketLabel(m.selectedMarket, m.selectedOption)} (@${m.odds})`
          )
          .join("\n");

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast.success("Fast-bet text copied to clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={cn(
          "w-full max-w-xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
          darkMode
            ? "bg-[#0b101b] border-white/10 text-white shadow-emerald-950/20"
            : "bg-white border-slate-200 text-slate-900 shadow-slate-300/40"
        )}
      >
        {/* HEADER */}
        <div
          className={cn(
            "p-4 sm:p-5 border-b flex items-center justify-between shrink-0",
            darkMode ? "border-white/10 bg-white/[0.02]" : "border-slate-100 bg-slate-50/80"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner",
                darkMode
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  : "bg-amber-100 border border-amber-200 text-amber-700"
              )}
            >
              <Ticket size={20} />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Reveal Complete Ticket
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  FB- Code Engine
                </span>
              </div>
              <p className={cn("text-xs font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
                Enter the booking code from any social Slip Card to unlock all selections.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              darkMode ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-200 text-slate-600"
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY CONTAINER */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-grow">
          {/* SEARCH INPUT BAR */}
          <div className="space-y-2">
            <label
              className={cn(
                "text-xs font-black uppercase tracking-wider flex items-center justify-between",
                darkMode ? "text-slate-300" : "text-slate-700"
              )}
            >
              <span>Ticket Reference Code</span>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
              >
                Paste from Clipboard
              </button>
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Ticket
                  size={16}
                  className={cn(
                    "absolute left-3.5 top-1/2 -translate-y-1/2",
                    darkMode ? "text-slate-500" : "text-slate-400"
                  )}
                />
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLookupCode();
                  }}
                  placeholder="e.g. FB-2KU3R or FB-SB12A"
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-mono font-bold tracking-wider uppercase border outline-none transition-all",
                    darkMode
                      ? "bg-white/[0.04] border-white/10 text-amber-300 focus:border-amber-400 placeholder:text-slate-600"
                      : "bg-slate-100 border-slate-200 text-amber-700 focus:border-amber-500 placeholder:text-slate-400"
                  )}
                />
              </div>

              <button
                onClick={() => handleLookupCode()}
                disabled={loading || !inputCode.trim()}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all active:scale-[0.98]",
                  loading || !inputCode.trim()
                    ? "opacity-50 cursor-not-allowed bg-slate-700 text-slate-400"
                    : darkMode
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-amber-500/20"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                )}
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                <span>Reveal</span>
              </button>
            </div>
          </div>

          {/* RECENT TICKETS CHIPS */}
          {recentTickets.length > 0 && !ticketData && (
            <div className="space-y-2 pt-1">
              <div
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                <Clock size={12} /> Recent Tickets on this Device
              </div>
              <div className="flex flex-wrap gap-2">
                {recentTickets.map((rec, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputCode(rec.code);
                      handleLookupCode(rec.code);
                    }}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5",
                      darkMode
                        ? "bg-white/[0.03] border-white/10 hover:border-amber-500/40 hover:bg-amber-500/10 text-slate-300"
                        : "bg-slate-100 border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700"
                    )}
                  >
                    <span className="font-mono text-amber-400 font-black">{rec.code}</span>
                    <span className="text-[10px] text-slate-400">
                      ({rec.matchCount || rec.matches?.length || 0} picks • {rec.totalOdds || "—"}x)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* REVEALED TICKET CARD */}
          {ticketData && (
            <div
              className={cn(
                "rounded-3xl border p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                darkMode
                  ? "bg-white/[0.03] border-emerald-500/30 shadow-lg shadow-emerald-950/30"
                  : "bg-slate-50 border-emerald-300 shadow-md"
              )}
            >
              {/* TICKET TOP SUMMARY */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-emerald-400">
                      Verified Slip Found
                    </div>
                    <div className="font-mono text-base font-black text-amber-300">
                      {ticketData.bookingCode || ticketData.code || inputCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400">Selections</div>
                    <div className="text-sm font-black">
                      {ticketData.matchCount || ticketData.matches?.length || 0} Matches
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400">Accumulator</div>
                    <div className="text-sm font-black text-emerald-400">
                      {ticketData.totalOdds || "—"}x Odds
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPLETE MATCHES LIST (ALL MATCHES REVEALED!) */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                <div
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest mb-1",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  Complete Selection Breakdown ({ticketData.matches?.length || 0} / {ticketData.matches?.length || 0})
                </div>

                {ticketData.matches?.map((m, idx) => {
                  const score = m.cScore || m.predictedScore || m.likelyCS || m.c_score;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all",
                        darkMode
                          ? "bg-black/30 border-white/10 hover:border-white/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-black shrink-0",
                            darkMode
                              ? "bg-white/5 text-slate-400"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {idx + 1}
                        </span>
                        {(() => {
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
                            <>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-black truncate" title={m.match}>{m.match}</div>
                                <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="text-slate-300 font-semibold">{countryLeague}</span>
                                  {dateTimeStr && <span>• {dateTimeStr}</span>}
                                  {score && (
                                    <span className="text-amber-400 font-bold">• Score {score}</span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div
                                  className={cn(
                                    "text-[11px] font-black uppercase px-2.5 py-1 rounded-xl border shadow-sm",
                                    darkMode
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  )}
                                >
                                  {formattedMarket}
                                </div>
                                {oddsNum > 1 && (
                                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                    @{oddsNum.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ACTIONS ROW */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleLoadIntoSlip(true)}
                  className="flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 size={16} />
                  <span>Load All {ticketData.matches?.length} Matches to BetSlip</span>
                </button>

                <button
                  onClick={() => handleLoadIntoSlip(false)}
                  className={cn(
                    "py-3 px-3.5 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                    darkMode
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                      : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                  )}
                  title="Keep existing selections and add these on top"
                >
                  <PlusCircle size={14} />
                  <span>Merge</span>
                </button>

                <button
                  onClick={handleCopyFastText}
                  className={cn(
                    "py-3 px-3.5 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                    darkMode
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                      : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                  )}
                  title="Copy formatted text to share on WhatsApp"
                >
                  {copiedText ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedText ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className={cn(
            "p-3.5 px-5 border-t flex items-center justify-between text-[11px] shrink-0",
            darkMode ? "border-white/10 bg-white/[0.01] text-slate-400" : "border-slate-100 bg-slate-50 text-slate-500"
          )}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>FutureBet Quantitative Syndicate Verification</span>
          </div>

          <button
            onClick={onClose}
            className={cn(
              "font-bold uppercase tracking-wider text-[10px] hover:underline",
              darkMode ? "text-slate-300" : "text-slate-700"
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
