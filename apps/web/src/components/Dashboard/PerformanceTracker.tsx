// @ts-nocheck
"use client";

import useBetslipStore from "@/store/betslipStore";
import useUserPermissions from "@/hooks/useUserPermissions";
import { 
  cn, 
  valueTagFromVip, 
  fairOddsFromChance, 
  formatNaira 
} from "@/utils/matchUtils";
import { useEffect, useMemo, useState } from "react";
import {
  Target,
  DollarSign,
  Plus,
  Trash2,
  BarChart3,
  Copy,
  Search,
  X,
  Ticket,
  Share2,
  ChevronDown,
  ChevronUp,
  Shield,
  CircleHelp,
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ---------------- THE CLV ODDS ENGINE ---------------- */
export function useLiveOddsArchive() {
  return useQuery({
    queryKey: ["live-odds-data-tracker"],
    queryFn: async () => {
      const SHEET_ID = "1vMva92Yesm1YiJeC8_1mBqb2KtTv31ByaCuJK2B9qeY";
      const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Odds2`;

      const response = await fetch(CSV_URL);
      if (!response.ok) return [];

      const csvText = await response.text();
      const rows = csvText.split("\n");
      if (rows.length < 2) return [];

      const headers = rows[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));
      const archiveData = [];

      for (let i = 1; i < rows.length; i++) {
        const rowText = rows[i].trim();
        if (!rowText) continue;
        const values = rowText.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let rowObj = {};
        headers.forEach((header, index) => {
          let val = values[index]
            ? values[index].trim().replace(/^"|"$/g, "")
            : null;
          rowObj[header] = val;
        });
        archiveData.push(rowObj);
      }
      return archiveData;
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}

/* ---------------- UTIL ---------------- */
const cx = (...c) => c.filter(Boolean).join(" ");

function isFinalStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "won" || s === "lost" || s === "void";
}

const DEFAULT_BANKROLL = 10000;
const DEFAULT_STAKE = 1000;

const LOCAL_ODDS_KEY = "futurebet_local_ticket_odds_v1";
const LOCAL_STAKE_KEY = "futurebet_local_ticket_stake_v1";
const LOCAL_WALLET_KEY = "futurebet_tracking_wallet_v1";
const LOCAL_RESET_KEY = "futurebet_tracker_last_reset_v1";

function safeUpper(s) {
  return String(s || "").toUpperCase();
}

function cleanId(s) {
  return String(s || "").trim();
}

function shortId(id) {
  const str = String(id || "").trim();
  if (str.length <= 16) return str;
  return `${str.slice(0, 10)}...${str.slice(-4)}`;
}

function toISODateOnly(d) {
  try {
    if (!d) return new Date().toISOString().split("T")[0];
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime()))
      return new Date().toISOString().split("T")[0];
    return dt.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

async function safeReadJson(res) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    return { ok: false, text };
  }
  const json = await res.json().catch(() => null);
  return { ok: true, json };
}

function parsePredictionToMarketOption(prediction) {
  const raw = String(prediction || "").trim();
  const parts = raw
    .split(" - ")
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 2)
    return { market: parts[0], option: parts.slice(1).join(" - ") };
  if (raw) return { market: raw, option: "" };
  return { market: "—", option: "—" };
}

function formatTimeFromKickoff(kickoff_at) {
  if (!kickoff_at) return "";
  try {
    const dt = new Date(kickoff_at);
    if (Number.isNaN(dt.getTime())) return "";
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

function formatSelectionMeta({ match_date, time, kickoff_at, ftScore }) {
  const dateISO = match_date ? toISODateOnly(match_date) : "";
  const t =
    String(time || "").trim() || formatTimeFromKickoff(kickoff_at) || "";
  const score = String(ftScore || "").trim();
  const parts = [];
  if (dateISO) parts.push(dateISO);
  if (t) parts.push(t);
  parts.push(`FT: ${score ? score : "—"}`);
  return parts.join(" • ");
}

function normalizeSelection(s) {
  const match = s?.match || s?.match_name || s?.matchName || "Match";
  const league = s?.league || "—";
  const prediction =
    s?.prediction ||
    (s?.selectedMarket && s?.selectedOption
      ? `${s.selectedMarket} - ${s.selectedOption}`
      : "");
  const status = s?.status || s?.result || "pending";
  const match_date = s?.match_date || s?.matchDate || s?.date || null;
  const kickoff_at = s?.kickoff_at || null;
  const time = s?.time || "";
  const ftScore = s?.ftScore || s?.actual_result || "";
  return {
    match,
    league,
    prediction,
    status,
    match_date,
    time,
    kickoff_at,
    ftScore,
    odds: s?.odds ?? s?.selection_odds ?? s?.selectionOdds ?? null,
  };
}

function computeTicketOddsExcludingVoid(selections = []) {
  let product = 1;
  let used = 0;
  for (const s of selections) {
    const st = String(s?.status || "pending").toLowerCase();
    if (st === "void") continue;
    const o = Number(s?.odds);
    if (Number.isFinite(o) && o > 0) {
      product *= o;
      used += 1;
    }
  }
  if (used === 0) return null;
  return Math.round(product * 100) / 100;
}

function sanitizeStake(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function StatusPill({ status, darkMode }) {
  const s = String(status || "pending").toLowerCase();
  const cls =
    s === "won"
      ? darkMode
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"
      : s === "lost"
      ? darkMode
        ? "border-red-500/30 bg-red-500/10 text-red-200"
        : "border-red-200 bg-red-50 text-red-700"
      : s === "void"
      ? darkMode
        ? "border-gray-700 bg-gray-900 text-gray-200"
        : "border-gray-200 bg-gray-50 text-gray-700"
      : darkMode
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span
      className={cx(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border shrink-0",
        cls
      )}
    >
      {s.toUpperCase()}
    </span>
  );
}

function Card({ darkMode, className, children }) {
  return (
    <div
      className={cx(
        "rounded-2xl border shadow-sm",
        darkMode
          ? "border-white/10 bg-gradient-to-b from-gray-950/60 to-gray-950"
          : "border-gray-200 bg-white",
        className
      )}
    >
      {children}
    </div>
  );
}

function SoftButton({ darkMode, className, ...props }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl border text-sm font-extrabold transition active:scale-[0.99]",
        darkMode
          ? "border-white/10 bg-white/5 text-gray-100 hover:bg-white/10"
          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
        className
      )}
    />
  );
}

function PrimaryButton({ className, ...props }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

/* ---------------- COMPONENT ---------------- */
export default function PerformanceTracker({ darkMode }) {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserPermissions();
  const { data: oddsHistory = [] } = useLiveOddsArchive(); // 🔥 LIVE CLV DATA

  const [showAllTickets, setShowAllTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  const [sharedTicketId, setSharedTicketId] = useState("");
  const [sharedTicketData, setSharedTicketData] = useState(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const [wallet, setWallet] = useState({
    balance: DEFAULT_BANKROLL,
    defaultStake: DEFAULT_STAKE,
  });
  const [ticketOddsMap, setTicketOddsMap] = useState({});
  const [ticketStakeMap, setTicketStakeMap] = useState({});

  const fmtNgn = (n) => {
    return formatNaira(n).replace("₦", "").trim(); // keep local fmtNgn for cases where only the number is needed, but properly formatted
  };

  const betslipStakeInput = useBetslipStore(
    (s) =>
      s?.stake ??
      s?.ticketStake ??
      s?.betAmount ??
      s?.stakeAmount ??
      s?.currentStake ??
      null
  );
  const localTrackedTickets = useBetslipStore((s) => s.tickets || []);
  const addMatch = useBetslipStore((s) => s.addMatch);
  const deleteLocalTicket = useBetslipStore((s) => s.deleteTicket);

  const autoStakeFromBetslip = useMemo(
    () => sanitizeStake(betslipStakeInput) || null,
    [betslipStakeInput]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_WALLET_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setWallet({
          balance:
            Number.isFinite(Number(parsed?.balance)) &&
            Number(parsed?.balance) >= 0
              ? Number(parsed?.balance)
              : DEFAULT_BANKROLL,
          defaultStake:
            Number.isFinite(Number(parsed?.defaultStake)) &&
            Number(parsed?.defaultStake) > 0
              ? Number(parsed?.defaultStake)
              : DEFAULT_STAKE,
        });
      } else {
        localStorage.setItem(
          LOCAL_WALLET_KEY,
          JSON.stringify({
            balance: DEFAULT_BANKROLL,
            defaultStake: DEFAULT_STAKE,
          })
        );
      }
    } catch {}
  }, []);

  const saveWallet = (next) => {
    setWallet(next);
    try {
      localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(next));
    } catch {}
  };
  const getWalletBalance = () =>
    Number.isFinite(Number(wallet?.balance)) && Number(wallet?.balance) >= 0
      ? Number(wallet?.balance)
      : DEFAULT_BANKROLL;
  const canAffordStake = () => true;
  const deductWallet = (stake) => {
    const s = Number(stake);
    if (Number.isFinite(s) && s > 0)
      saveWallet({ ...wallet, balance: Math.max(0, getWalletBalance() - s) });
  };

  const canResetNow = (isAdmin = false) => {
    if (isAdmin) return true;
    try {
      const last = localStorage.getItem(LOCAL_RESET_KEY);
      if (!last) return true;
      const d = new Date(last);
      const now = new Date();
      return !(
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    } catch {
      return true;
    }
  };
  const markResetNow = () => {
    try {
      localStorage.setItem(LOCAL_RESET_KEY, new Date().toISOString());
    } catch {}
  };

  useEffect(() => {
    try {
      const rawStake = localStorage.getItem(LOCAL_STAKE_KEY);
      if (rawStake) setTicketStakeMap(JSON.parse(rawStake));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_ODDS_KEY);
      if (raw) setTicketOddsMap(JSON.parse(raw));
    } catch {}
  }, []);

  const saveStakeMap = (next) => {
    setTicketStakeMap(next);
    try {
      localStorage.setItem(LOCAL_STAKE_KEY, JSON.stringify(next));
    } catch {}
  };
  const saveOddsMap = (next) => {
    setTicketOddsMap(next);
    try {
      localStorage.setItem(LOCAL_ODDS_KEY, JSON.stringify(next));
    } catch {}
  };

  const getEffectiveStake = (t) => {
    const saved = ticketStakeMap?.[t.ticket_id];
    if (saved !== undefined && saved !== null && String(saved).trim() !== "") {
      const n = Number(saved);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const s = Number(t?.stake);
    return Number.isFinite(s) && s > 0 ? s : null;
  };

  const getEffectiveOdds = (t) => {
    const saved = ticketOddsMap?.[t.ticket_id];
    if (saved !== undefined && saved !== null && String(saved).trim() !== "")
      return saved;
    if (t._source === "cloud" && t.total_odds) return t.total_odds;
    const auto = computeTicketOddsExcludingVoid(t?.selections || []);
    return Number.isFinite(auto) && auto > 0 ? String(auto) : "";
  };

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["performanceTracker"],
    queryFn: async () => {
      const response = await fetch("/api/performance-tracker");
      if (!response.ok) throw new Error("Failed to fetch performance data");
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  const resetTrackerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/performance-tracker?action=reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await safeReadJson(res);
      if (!res.ok)
        throw new Error(
          data.ok ? data.json?.error || "Reset failed" : "Reset failed"
        );
      return data.json;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["performanceTracker"] }),
  });

  const putTicketMutation = useMutation({
    mutationFn: async ({ ticketId, payload }) => {
      const response = await fetch(
        `/api/performance-tracker?ticketId=${encodeURIComponent(ticketId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await safeReadJson(response);
      if (!response.ok)
        throw new Error(
          data.ok
            ? data.json?.error || "Ticket update failed"
            : "Ticket update failed"
        );
      return data.json;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["performanceTracker"] }),
  });

  const deleteTicketCloudMutation = useMutation({
    mutationFn: async (ticketId) => {
      const response = await fetch(
        `/api/performance-tracker?ticketId=${encodeURIComponent(ticketId)}`,
        { method: "DELETE" }
      );
      const data = await safeReadJson(response);
      if (!response.ok)
        throw new Error(
          data.ok
            ? data.json?.error || "Ticket delete failed"
            : "Ticket delete failed"
        );
      return data.json;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["performanceTracker"] }),
  });

  const createTicketCloudMutation = useMutation({
    mutationFn: async ({ ticketCode, matches, share, stake }) => {
      const res = await fetch("/api/performance-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ticket",
          ticketCode,
          matches,
          share: Boolean(share),
          stake,
        }),
      });
      const data = await safeReadJson(res);
      if (!res.ok)
        throw new Error(
          data.ok
            ? data.json?.error || "Failed to create cloud ticket"
            : "Failed to create cloud ticket"
        );
      return data.json;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["performanceTracker"] }),
  });

  const handleCopy = async (txt) => {
    const v = cleanId(txt);
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopiedId(v);
      setTimeout(() => setCopiedId(""), 1200);
    } catch {
      alert("Copy failed. Please copy manually.");
    }
  };

  const handleShareTicket = async (ticket) => {
    if (!ticket?.ticket_id) return;
    if (ticket._source === "local") {
      alert(
        "This ticket is still syncing to the database. Please wait a few seconds and try again."
      );
      return;
    }
    try {
      await putTicketMutation.mutateAsync({
        ticketId: ticket.ticket_id,
        payload: { action: "setShare", share: true },
      });
      const text = `FutureBet Ticket\nTicket ID: ${ticket.ticket_id}\n\nTo view: Open FutureBet → Performance → View Shared Ticket → paste the ID.`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "FutureBet Ticket", text });
          return;
        } catch {}
      }
      await handleCopy(text);
      alert("Share not supported here. Ticket details copied.");
    } catch (e) {
      alert(String(e?.message || "Share failed"));
    }
  };

  const addSelectionToBetslip = (sel) => {
    if (!addMatch) {
      alert("BetSlip store is missing addMatch().");
      return;
    }
    const s = normalizeSelection(sel);
    const mo = parsePredictionToMarketOption(s.prediction);
    addMatch({
      match: s.match,
      league: s.league,
      date: toISODateOnly(s.match_date),
      time: s.time || formatTimeFromKickoff(s.kickoff_at) || "",
      selectedMarket: mo?.market ?? s.selectedMarket ?? null,
      selectedOption: mo?.option ?? s.selectedOption ?? null,
      ftScore: s.ftScore || "",
      odds: s.odds ?? null,
      chance: s?.chance ?? s?.confidence ?? null,
    });
  };

  const addAllSelectionsToBetslip = (ticket) => {
    const sels = Array.isArray(ticket?.selections) ? ticket.selections : [];
    const eligible = sels.filter((x) => !isFinalStatus(x?.status));
    eligible.forEach(addSelectionToBetslip);
  };

  const handleViewSharedTicket = async () => {
    const id = cleanId(sharedTicketId);
    if (!id) return;
    setSharedLoading(true);
    setSharedError("");
    setSharedTicketData(null);
    try {
      const res = await fetch(
        `/api/performance-tracker?ticketId=${encodeURIComponent(id)}`
      );
      const data = await safeReadJson(res);
      if (!res.ok)
        throw new Error(
          data.ok ? data.json?.error || "Ticket not found" : "Ticket not found"
        );
      setSharedTicketData(data.json);
    } catch (err) {
      setSharedError(String(err?.message || "Failed to load shared ticket"));
    } finally {
      setSharedLoading(false);
    }
  };

  const tickets = useMemo(() => {
    const apiTicketsRaw = Array.isArray(performanceData?.tickets)
      ? performanceData.tickets
      : [];
    const localRaw = Array.isArray(localTrackedTickets)
      ? localTrackedTickets
      : [];
    const normApi = apiTicketsRaw.map((t) => ({
      ticket_id: t.ticket_id || t.ticketCode || t.id || "UNKNOWN-TICKET",
      created_at: t.created_at || t.createdAt || new Date().toISOString(),
      status: t.status || "pending",
      total_matches:
        t.total_matches ?? t.totalMatches ?? t.selections?.length ?? 0,
      total_odds: t.total_odds ?? t.totalOdds ?? "",
      is_shared: Boolean(t.is_shared),
      selections: Array.isArray(t.selections)
        ? t.selections.map(normalizeSelection)
        : [],
      stake: t.stake ?? t.ticket_stake ?? null,
      _source: "cloud",
    }));
    const normLocal = localRaw.map((t) => ({
      ticket_id: t.id,
      created_at: t.createdAt || new Date().toISOString(),
      status: t.status || "pending",
      total_matches: t.selections?.length || 0,
      total_odds: "",
      is_shared: false,
      selections: Array.isArray(t.selections)
        ? t.selections.map(normalizeSelection)
        : [],
      stake: t.stake ?? null,
      _source: "local",
    }));
    return [...normLocal, ...normApi].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [performanceData?.tickets, localTrackedTickets]);

  const visibleTickets = showAllTickets ? tickets : tickets.slice(0, 5);
  const [syncingIds, setSyncingIds] = useState({});

  // Syncer runs through the local tickets sequentially
  useEffect(() => {
    const run = async () => {
      const locals = (tickets || []).filter((t) => t?._source === "local");
      if (locals.length === 0) return;
      for (const t of locals) {
        const id = t?.ticket_id;
        if (!id) continue;
        if (syncingIds[id]) continue;
        const stakeNow = sanitizeStake(getEffectiveStake(t));
        if (!stakeNow) continue;
        if (!canAffordStake(stakeNow)) {
          if (!syncingIds[`alert_${id}`]) {
            setSyncingIds((p) => ({ ...p, [`alert_${id}`]: true }));
            alert("Your Balance is lower than your Stake");
          }
          continue;
        }
        try {
          setSyncingIds((p) => ({ ...p, [id]: true }));
          await createTicketCloudMutation.mutateAsync({
            ticketCode: id,
            matches: t.selections || [],
            share: false,
            stake: stakeNow,
          });
          deductWallet(stakeNow);
          deleteLocalTicket(id);
        } catch (e) {
          console.error(e);
        } finally {
          setSyncingIds((p) => ({ ...p, [id]: false }));
        }
      }
    };
    run();
  }, [tickets, autoStakeFromBetslip, wallet?.balance]);

  const handleDeleteTicket = (ticket) => {
    const id = ticket?.ticket_id;
    if (!id) return;
    const ok = confirm(`Delete ticket ${shortId(id)}?`);
    if (!ok) return;
    if (ticket._source === "local") {
      deleteLocalTicket(id);
      const nextOdds = { ...(ticketOddsMap || {}) };
      delete nextOdds[id];
      saveOddsMap(nextOdds);
      const nextStake = { ...(ticketStakeMap || {}) };
      delete nextStake[id];
      saveStakeMap(nextStake);
      if (expandedTicketId === id) setExpandedTicketId(null);
      return;
    }
    deleteTicketCloudMutation.mutate(id, {
      onSuccess: () => {
        if (expandedTicketId === id) setExpandedTicketId(null);
      },
      onError: (e) => alert(String(e?.message || "Cloud delete failed.")),
    });
  };

  const stats = useMemo(() => {
    const allTickets = Array.isArray(tickets) ? tickets : [];
    const wonTickets = allTickets.filter((t) => t.status === "won").length;
    const lostTickets = allTickets.filter((t) => t.status === "lost").length;
    const decided = wonTickets + lostTickets;
    const winRate = decided > 0 ? (wonTickets / decided) * 100 : 0;
    let ticketStaked = 0;
    let ticketReturns = 0;
    allTickets.forEach((t) => {
      const stake = Number(getEffectiveStake(t));
      if (!Number.isFinite(stake) || stake <= 0) return;
      const status = String(t.status || "pending").toLowerCase();
      if (status === "void") return;
      ticketStaked += stake;
      if (status === "won") {
        const odds = Number(getEffectiveOdds(t));
        if (Number.isFinite(odds) && odds > 0) ticketReturns += stake * odds;
      }
    });
    const netProfit = ticketReturns - ticketStaked;
    const roi = ticketStaked > 0 ? (netProfit / ticketStaked) * 100 : 0;
    const currentBalance = DEFAULT_BANKROLL + netProfit;
    return {
      totalTickets: allTickets.length,
      winRate,
      netProfit,
      roi,
      ticketStaked,
      ticketReturns,
      currentBalance,
    };
  }, [tickets, ticketOddsMap, ticketStakeMap]);

  const chartData = useMemo(() => {
    const allTickets = Array.isArray(tickets) ? tickets : [];
    // Only use decided tickets for ROI charting
    const decided = allTickets.filter(t => t.status === "won" || t.status === "lost" || t.status === "void");
    // Sort ascending by date/time (oldest first)
    const sorted = [...decided].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    
    let currentBal = DEFAULT_BANKROLL;
    const data = [{
      name: "Start",
      balance: currentBal,
    }];
    
    sorted.forEach((t, i) => {
      const stake = Number(getEffectiveStake(t)) || 0;
      const odds = Number(getEffectiveOdds(t)) || 0;
      if (t.status === "won") {
        currentBal += (stake * odds) - stake;
      } else if (t.status === "lost") {
        currentBal -= stake;
      }
      
      data.push({
        name: `Ticket ${i + 1}`,
        balance: currentBal,
        date: toISODateOnly(t.created_at),
        profit: (t.status === "won") ? ((stake * odds) - stake) : (t.status === "lost" ? -stake : 0)
      });
    });
    
    return data;
  }, [tickets, ticketStakeMap, ticketOddsMap]);

  const marketIntelligence = useMemo(() => {
    const marketMap = {};
    const allTickets = Array.isArray(tickets) ? tickets : [];
    let totalSelectionsGlobal = 0;
    let totalOddsGlobal = 0;

    allTickets.forEach((ticket) => {
      const stake = Number(getEffectiveStake(ticket));
      const selections = Array.isArray(ticket.selections)
        ? ticket.selections
        : [];
      selections.forEach((raw) => {
        const s = normalizeSelection(raw);
        const selectionOdds = Number(s?.odds);
        const mo = parsePredictionToMarketOption(s.prediction);
        const marketName = String(mo.market || "Other").toLowerCase();
        if (!marketMap[marketName])
          marketMap[marketName] = {
            total: 0,
            won: 0,
            lost: 0,
            void: 0,
            stake: 0,
            returns: 0,
            oddsTotal: 0,
          };
        const m = marketMap[marketName];
        m.total += 1;
        totalSelectionsGlobal += 1;
        if (Number.isFinite(selectionOdds) && selectionOdds > 0) {
          m.oddsTotal += selectionOdds;
          totalOddsGlobal += selectionOdds;
        }
        const status = String(s.status || "pending").toLowerCase();
        if (status === "won") {
          m.won += 1;
          if (
            Number.isFinite(stake) &&
            stake > 0 &&
            Number.isFinite(selectionOdds) &&
            selectionOdds > 0
          ) {
            m.stake += stake;
            m.returns += stake * selectionOdds;
          }
        }
        if (status === "lost") {
          m.lost += 1;
          if (Number.isFinite(stake)) m.stake += stake;
        }
        if (status === "void") m.void += 1;
      });
    });

    const markets = Object.entries(marketMap).map(([name, data]) => {
      const decided = data.won + data.lost;
      const winRate = decided > 0 ? (data.won / decided) * 100 : 0;
      const roi =
        data.stake > 0 ? ((data.returns - data.stake) / data.stake) * 100 : 0;
      const avgOdds = data.total > 0 ? data.oddsTotal / data.total : 0;
      const exposure =
        totalSelectionsGlobal > 0
          ? (data.total / totalSelectionsGlobal) * 100
          : 0;
      const confidenceScore = winRate * Math.log(data.total + 1);
      return {
        name,
        ...data,
        winRate,
        roi,
        avgOdds,
        exposure,
        confidenceScore,
        profit: data.returns - data.stake,
      };
    });

    const overallAvgOdds =
      totalSelectionsGlobal > 0 ? totalOddsGlobal / totalSelectionsGlobal : 0;
    let riskProfile = "Conservative";
    if (overallAvgOdds >= 3.5) riskProfile = "Reckless";
    else if (overallAvgOdds >= 2.5) riskProfile = "Aggressive";
    else if (overallAvgOdds >= 1.8) riskProfile = "Balanced";
    const rankedByConfidence = [...markets].sort(
      (a, b) => b.confidenceScore - a.confidenceScore
    );
    const mostExposed = [...markets].sort((a, b) => b.exposure - a.exposure)[0];
    const performanceScore = Math.min(
      100,
      Math.max(
        0,
        stats.winRate * 0.4 +
          stats.roi * 0.4 +
          (100 - Math.abs(overallAvgOdds - 2) * 20) * 0.2
      )
    );
    return {
      markets,
      rankedByConfidence,
      mostExposed,
      riskProfile,
      overallAvgOdds,
      performanceScore,
    };
  }, [tickets, ticketStakeMap, ticketOddsMap, stats]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );

  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Performance Tracker
            </h2>
            <p
              className={cx(
                "text-sm mt-1",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              Manage your bankroll, track tickets, and measure your edge.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SoftButton
              darkMode={darkMode}
              onClick={() => {
                if (!canResetNow(isAdmin)) {
                  alert("Reset available once per month. Try again later.");
                  return;
                }
                const ok = confirm(
                  "Reset tracker? This will delete all tickets and reset wallet."
                );
                if (!ok) return;
                resetTrackerMutation.mutate(undefined, {
                  onSuccess: () => {
                    markResetNow();
                    const resetWallet = {
                      balance: DEFAULT_BANKROLL,
                      defaultStake: DEFAULT_STAKE,
                    };
                    saveWallet(resetWallet);
                    setTicketStakeMap({});
                    setTicketOddsMap({});
                    setSharedTicketData(null);
                    setSharedError("");
                    setSharedTicketId("");
                    setExpandedTicketId(null);
                    localStorage.removeItem(LOCAL_STAKE_KEY);
                    localStorage.removeItem(LOCAL_ODDS_KEY);
                    localStorage.setItem(
                      LOCAL_WALLET_KEY,
                      JSON.stringify(resetWallet)
                    );
                    queryClient.setQueryData(["performanceTracker"], {
                      bets: [],
                      tickets: [],
                    });
                  },
                  onError: (e) => alert(String(e?.message || "Reset failed")),
                });
              }}
              className={
                darkMode
                  ? "text-rose-400 hover:bg-rose-500/10"
                  : "text-rose-600 hover:bg-rose-50"
              }
            >
              <Shield className="h-4 w-4" /> Reset
            </SoftButton>
            <SoftButton
              darkMode={darkMode}
              onClick={() => setShowGuide((v) => !v)}
            >
              <CircleHelp className="h-4 w-4" />{" "}
              {showGuide ? "Hide Guide" : "Guide"}
            </SoftButton>
            <PrimaryButton
              onClick={() => setShowAllTickets((p) => !p)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <BarChart3 className="h-4 w-4" />{" "}
              {showAllTickets ? "Show Top 5" : "Show All Tickets"}
            </PrimaryButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div
            className={cx(
              "relative overflow-hidden rounded-[32px] p-6 sm:p-8 lg:col-span-2 shadow-2xl",
              darkMode
                ? "bg-gradient-to-br from-gray-900 via-gray-950 to-black border border-white/10"
                : "bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-transparent"
            )}
          >
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                    <Target className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-gray-400">
                    Tracking Wallet
                  </span>
                </div>
                <DollarSign className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <div className="text-4xl sm:text-6xl font-black tabular-nums tracking-tighter text-white drop-shadow-md">
                  {formatNaira(stats.currentBalance)}
                </div>
                <div className="mt-3 text-xs sm:text-sm text-gray-400 font-semibold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active balance syncs automatically with tickets
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div
              className={cx(
                "relative overflow-hidden rounded-[32px] p-6 border flex-1 flex flex-col justify-center transition-all",
                darkMode
                  ? "bg-white/5 border-white/10"
                  : "bg-white border-gray-200 shadow-sm"
              )}
            >
              <div
                className={cx(
                  "absolute inset-0 opacity-[0.03] dark:opacity-[0.05]",
                  stats.netProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"
                )}
              />
              <div className="relative z-10">
                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">
                  Net Profit
                </div>
                <div
                  className={cx(
                    "text-3xl sm:text-4xl font-black tabular-nums tracking-tight",
                    stats.netProfit >= 0
                      ? darkMode
                        ? "text-emerald-400"
                        : "text-emerald-500"
                      : darkMode
                      ? "text-rose-400"
                      : "text-rose-500"
                  )}
                >
                  {stats.netProfit >= 0 ? "+" : ""}{formatNaira(stats.netProfit)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              <div
                className={cx(
                  "rounded-[24px] p-5 border flex flex-col justify-center",
                  darkMode
                    ? "bg-white/5 border-white/10"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  ROI
                </div>
                <div
                  className={cx(
                    "text-xl font-black tabular-nums tracking-tight",
                    stats.roi >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {stats.roi >= 0 ? "+" : ""}
                  {stats.roi.toFixed(1)}%
                </div>
              </div>
              <div
                className={cx(
                  "rounded-[24px] p-5 border flex flex-col justify-center",
                  darkMode
                    ? "bg-white/5 border-white/10"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Win Rate
                </div>
                <div
                  className={cx(
                    "text-xl font-black tabular-nums tracking-tight",
                    darkMode ? "text-white" : "text-gray-900"
                  )}
                >
                  {stats.winRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* === FEATURE 5: ROI CHART === */}
        {chartData.length > 1 && (
          <div className={cx(
            "rounded-[24px] p-5 sm:p-6 border",
            darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">
                Bankroll Growth (ROI)
              </h3>
              <div className={cx(
                "px-3 py-1 rounded-full text-[11px] font-bold",
                stats.roi >= 0 
                  ? (darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700")
                  : (darkMode ? "bg-rose-500/20 text-rose-400" : "bg-rose-100 text-rose-700")
              )}>
                {stats.roi >= 0 ? "+" : ""}{stats.roi.toFixed(1)}% ROI
              </div>
            </div>
            
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${formatNaira(val)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      borderColor: darkMode ? '#374151' : '#e5e7eb',
                      borderRadius: '12px',
                      color: darkMode ? '#f3f4f6' : '#111827',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${formatNaira(value)}`, "Balance"]}
                    labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke={stats.netProfit >= 0 ? "#10b981" : "#f43f5e"} 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: stats.netProfit >= 0 ? "#10b981" : "#f43f5e", strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {showGuide && (
        <Card darkMode={darkMode} className="p-4 sm:p-5 mt-4">
          <div className="flex items-center gap-2">
            <CircleHelp className="h-4 w-4 text-blue-500" />
            <h3 className="text-base font-black">Performance Tracker Guide</h3>
          </div>
          <div
            className={cx(
              "mt-3 space-y-2 text-sm leading-7",
              darkMode ? "text-gray-300" : "text-gray-700"
            )}
          >
            <p>
              <b>Wallet Balance</b> is your tracker bankroll. It should be large
              enough to cover ticket stakes before local tickets sync.
            </p>
            <p>
              <b>Stake</b> is the amount placed on a ticket.
            </p>
            <p>
              <b>Total Odds</b> is the combined ticket price. VOID selections
              are excluded from the auto-calculated ticket odds.
            </p>
            <p>
              <b>Potential</b> is the estimated return for a winning ticket,
              calculated as <b>stake × total odds</b>.
            </p>
            <p>
              <b>Pending</b> means the result is not settled yet. <b> Won</b>{" "}
              means the selection or ticket settled successfully. <b> Lost</b>{" "}
              means the prediction failed. <b> Void</b> means the match did not
              settle normally or was still missing a final score after the
              cutoff.
            </p>
            <p>
              <b>Shared Ticket</b> lets you view a ticket from its ticket ID and
              add eligible selections back to your Betslip.
            </p>
            <p>
              <b>Win Rate</b> is based on decided tickets only.
            </p>
            <p>
              <b>Net Profit</b> is total returns minus total stake.
            </p>
            <p>
              <b>ROI</b> is return on investment, calculated from profit versus
              total amount staked.
            </p>
            <p>
              <b>Performance Score</b>, <b>Risk Profile</b>, and{" "}
              <b> Most Played Market</b> summarize your market behavior and
              performance patterns.
            </p>
            <p>
              If a final score is still unavailable after the configured result
              cutoff, the affected selection can be marked <b>VOID</b>.
            </p>
          </div>
        </Card>
      )}

      {/* 🔥 RESTORED: SHARED TICKET LOOKUP */}
      <Card darkMode={darkMode} className="p-4 sm:p-5 mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-black">View Shared Ticket</h3>
            <p
              className={cx(
                "text-xs mt-0.5",
                darkMode ? "text-gray-400" : "text-gray-600"
              )}
            >
              Paste a shared ticket ID to preview selections and eligible ticket
              data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <input
              value={sharedTicketId}
              onChange={(e) => setSharedTicketId(e.target.value)}
              placeholder="Paste Ticket ID e.g. FB-20260126-ABC123"
              className={cx(
                "w-full sm:w-[340px] px-3 py-2 rounded-2xl border text-sm font-semibold outline-none transition-all",
                darkMode
                  ? "border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:bg-white/10"
                  : "border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
              )}
            />
            <PrimaryButton
              onClick={handleViewSharedTicket}
              disabled={sharedLoading || !sharedTicketId.trim()}
              className="flex-1 sm:flex-none justify-center"
            >
              <Search className="h-4 w-4" />{" "}
              {sharedLoading ? "Loading…" : "View"}
            </PrimaryButton>
            {(sharedTicketData || sharedError) && (
              <SoftButton
                darkMode={darkMode}
                onClick={() => {
                  setSharedTicketData(null);
                  setSharedError("");
                }}
                title="Close preview"
              >
                <X className="h-4 w-4" />
              </SoftButton>
            )}
          </div>
        </div>

        {sharedError && (
          <div className="mt-3 text-sm text-red-500 font-semibold">
            {sharedError}
          </div>
        )}

        {sharedTicketData && (
          <div
            className={cx(
              "mt-4 rounded-3xl border p-4 sm:p-6",
              darkMode
                ? "border-white/10 bg-black/20"
                : "border-gray-200 bg-gray-50"
            )}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <div className="font-black flex items-center gap-2">
                  Shared Ticket:{" "}
                  <span className="text-blue-500 select-all">
                    {sharedTicketData.ticket_id || sharedTicketId}
                  </span>
                </div>
                <div
                  className={cx(
                    "text-xs mt-1",
                    darkMode ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  Status:{" "}
                  <span className="font-extrabold">
                    {safeUpper(sharedTicketData.status || "pending")}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const sels = Array.isArray(sharedTicketData?.selections)
                    ? sharedTicketData.selections
                    : [];
                  const hasEligible = sels.some(
                    (x) => !isFinalStatus(x?.status)
                  );
                  return (
                    <PrimaryButton
                      onClick={() =>
                        addAllSelectionsToBetslip(sharedTicketData)
                      }
                      disabled={!hasEligible}
                      className={cx(
                        hasEligible ? "" : "bg-gray-400 hover:bg-gray-400"
                      )}
                      title={
                        !hasEligible ? "All selections are already decided" : ""
                      }
                    >
                      Add All to Betslip
                    </PrimaryButton>
                  );
                })()}
                <SoftButton
                  darkMode={darkMode}
                  onClick={() =>
                    handleCopy(sharedTicketData.ticket_id || sharedTicketId)
                  }
                >
                  <Copy className="h-4 w-4" />{" "}
                  {copiedId === (sharedTicketData.ticket_id || sharedTicketId)
                    ? "Copied"
                    : "Copy ID"}
                </SoftButton>
              </div>
            </div>

            <div className="space-y-3">
              {(sharedTicketData.selections || []).map((raw, idx) => {
                const s = normalizeSelection(raw);
                const mo = parsePredictionToMarketOption(s.prediction);
                const locked = isFinalStatus(s.status);

                return (
                  <div
                    key={`${s.match}-${idx}`}
                    className={cx(
                      "group relative rounded-2xl p-4 transition-all border",
                      darkMode
                        ? "bg-black/20 border-white/5 hover:border-white/20"
                        : "bg-white border-gray-100 shadow-sm"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-blue-500 uppercase tracking-wider mb-1">
                          {s.league}
                        </div>
                        <div className="text-sm font-black truncate mb-1">
                          {s.match}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cx(
                              "text-xs font-bold px-2 py-0.5 rounded-md",
                              darkMode
                                ? "bg-white/5 text-gray-300"
                                : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {mo.market}:{" "}
                            <span className="font-black underline decoration-blue-500/50">
                              {mo.option || "—"}
                            </span>
                          </span>
                          <span className="text-[10px] font-black text-gray-500 uppercase">
                            {formatSelectionMeta(s)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 border-t sm:border-0 pt-3 sm:pt-0 dark:border-white/5 w-full sm:w-auto">
                        <StatusPill status={s.status} darkMode={darkMode} />
                        <button
                          onClick={() => addSelectionToBetslip(s)}
                          disabled={locked}
                          className={cx(
                            "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition",
                            locked
                              ? "opacity-30 cursor-not-allowed border-transparent"
                              : "border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:text-white"
                          )}
                        >
                          Re-Bet
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* TRACKED TICKETS LIST */}
      {tickets.length > 0 ? (
        <Card darkMode={darkMode}>
          <div
            className={cx(
              "p-4 sm:p-5 border-b",
              darkMode ? "border-white/10" : "border-gray-200"
            )}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-lg font-black">Tracked Tickets</h3>
                <p
                  className={cx(
                    "text-sm mt-1",
                    darkMode ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  Expand ticket → edit stake/odds → add selections to BetSlip →
                  share ticket ID
                </p>
              </div>
              <SoftButton
                darkMode={darkMode}
                onClick={() => setShowAllTickets((p) => !p)}
              >
                {showAllTickets ? "Show Top 5" : "Show All"}
              </SoftButton>
            </div>
          </div>

          <div
            className={cx(
              darkMode ? "divide-white/10" : "divide-gray-200",
              "divide-y"
            )}
          >
            {visibleTickets.map((t, idx) => {
              const open = expandedTicketId === t.ticket_id;
              const odds = getEffectiveOdds(t);
              const oddsNum = Number(odds);
              const stakeNow = getEffectiveStake(t);
              const stakeNowNum = Number(stakeNow);

              // Calculate Potential Return
              const potential =
                Number.isFinite(oddsNum) &&
                oddsNum > 0 &&
                Number.isFinite(stakeNowNum) &&
                stakeNowNum > 0
                  ? (oddsNum * stakeNowNum).toFixed(0)
                  : null;

              // 🔥 UPGRADE: Label Single vs Double vs Acca
              const betType =
                t.total_matches === 1
                  ? "SINGLE"
                  : t.total_matches === 2
                  ? "DOUBLE"
                  : t.total_matches === 3
                  ? "TREBLE"
                  : `${t.total_matches}-FOLD ACCA`;

              // CLV Math
              let totalClosingOdds = 1;
              let hasAllClosing = true;

              t.selections.forEach((raw) => {
                const s = normalizeSelection(raw);
                const mo = parsePredictionToMarketOption(s.prediction);
                const matchStr = String(s.match).toLowerCase();
                const matchRows = oddsHistory.filter((row) => {
                  const h = String(row["Home Team"] || "").toLowerCase();
                  const a = String(row["Away Team"] || "").toLowerCase();
                  return (
                    h && a && (matchStr.includes(h) || matchStr.includes(a))
                  );
                });

                let legClosing = Number(s.odds) || 1;
                if (matchRows.length > 0) {
                  matchRows.sort(
                    (a, b) =>
                      new Date(a["Time Checked"]) - new Date(b["Time Checked"])
                  );
                  const newest = matchRows[matchRows.length - 1];
                  let colName = "";
                  const mkt = String(mo.market).toUpperCase();
                  const opt = String(mo.option).toUpperCase();

                  if (mkt.includes("1X2")) {
                    if (opt === "HOME") colName = "Home Odds";
                    if (opt === "DRAW") colName = "Draw Odds";
                    if (opt === "AWAY") colName = "Away Odds";
                  } else if (mkt.includes("OVER") && mkt.includes("2.5"))
                    colName = "O2.5";
                  else if (mkt.includes("UNDER") && mkt.includes("2.5"))
                    colName = "U2.5";
                  else if (mkt.includes("OVER") && mkt.includes("1.5"))
                    colName = "O1.5";
                  else if (mkt.includes("UNDER") && mkt.includes("1.5"))
                    colName = "U1.5";
                  else if (mkt.includes("OVER") && mkt.includes("3.5"))
                    colName = "O3.5";
                  else if (mkt.includes("UNDER") && mkt.includes("3.5"))
                    colName = "U3.5";

                  if (colName && Number(newest[colName]) > 1) {
                    legClosing = Number(newest[colName]);
                  } else {
                    hasAllClosing = false;
                  }
                } else {
                  hasAllClosing = false;
                }
                totalClosingOdds *= legClosing;
              });

              const ticketClv =
                oddsNum &&
                hasAllClosing &&
                totalClosingOdds > 1 &&
                oddsNum !== totalClosingOdds
                  ? (oddsNum - totalClosingOdds).toFixed(2)
                  : null;

              return (
                <div key={t.ticket_id || idx} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0 w-full sm:flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black shrink-0">
                          Ticket
                        </span>
                        <button
                          onClick={() =>
                            setExpandedTicketId(open ? null : t.ticket_id)
                          }
                          className="text-blue-500 font-black underline underline-offset-4 inline-flex items-center gap-1"
                          title="Expand ticket details"
                        >
                          <span className="hidden sm:inline">
                            {t.ticket_id}
                          </span>
                          <span className="inline sm:hidden">
                            {shortId(t.ticket_id)}
                          </span>
                          {open ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>

                        {/* 🔥 NEW BADGE: Single/Double/Acca visual label */}
                        <span
                          className={cx(
                            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0",
                            darkMode
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-blue-50 text-blue-600 border-blue-200"
                          )}
                        >
                          {betType}
                        </span>

                        <StatusPill status={t.status} darkMode={darkMode} />
                        {t._source === "local" && (
                          <span
                            className={cx(
                              "text-[11px] px-2 py-1 rounded-full font-extrabold border shrink-0",
                              darkMode
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            )}
                          >
                            SYNCING
                          </span>
                        )}
                        {t.is_shared && (
                          <span
                            className={cx(
                              "text-[11px] px-2 py-1 rounded-full font-extrabold border shrink-0",
                              darkMode
                                ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
                                : "border-purple-200 bg-purple-50 text-purple-700"
                            )}
                          >
                            SHARED
                          </span>
                        )}
                      </div>

                      <div
                        className={cx(
                          "text-xs mt-1",
                          darkMode ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        {t.total_matches} selections • Created:{" "}
                        {new Date(t.created_at).toLocaleString()}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div
                          className={cx(
                            "text-xs",
                            darkMode ? "text-gray-300" : "text-gray-700"
                          )}
                        >
                          Odds:{" "}
                          <span className="font-black">{odds || "—"}</span>
                        </div>
                        <div
                          className={cx(
                            "text-xs tabular-nums",
                            darkMode ? "text-gray-300" : "text-gray-700"
                          )}
                        >
                          Stake:{" "}
                          <span className="font-black">
                            {Number.isFinite(stakeNowNum) ? formatNaira(stakeNowNum) : "—"}
                          </span>
                        </div>
                        {potential ? (
                          <div
                            className={cx(
                              "text-xs font-black tabular-nums",
                              darkMode ? "text-emerald-300" : "text-emerald-700"
                            )}
                          >
                            Potential: {formatNaira(potential)}
                          </div>
                        ) : (
                          <div
                            className={cx(
                              "text-xs",
                              darkMode ? "text-gray-500" : "text-gray-500"
                            )}
                          >
                            Set stake & odds
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-0 pt-3 sm:pt-0 dark:border-white/10">
                      <SoftButton
                        darkMode={darkMode}
                        onClick={() => handleCopy(t.ticket_id)}
                        title="Copy ticket ID"
                      >
                        <Copy className="h-4 w-4" />{" "}
                        {copiedId === t.ticket_id ? "Copied" : "Copy"}
                      </SoftButton>
                      <SoftButton
                        darkMode={darkMode}
                        onClick={() => handleShareTicket(t)}
                        title="Share ticket ID"
                      >
                        <Share2 className="h-4 w-4" /> Share
                      </SoftButton>
                      <SoftButton
                        darkMode={darkMode}
                        onClick={() => handleDeleteTicket(t)}
                        className={cx(
                          darkMode
                            ? "border-red-900/50 bg-red-950/30 text-red-200 hover:bg-red-950/50"
                            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        )}
                        title="Delete ticket"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </SoftButton>
                    </div>
                  </div>

                  {open && (
                    <div className="mt-4 animate-in slide-in-from-top-4 duration-300">
                      <div
                        className={cx(
                          "relative rounded-[32px] overflow-hidden border shadow-2xl",
                          t.status === "won"
                            ? darkMode
                              ? "bg-emerald-950/20 border-emerald-500/30 shadow-emerald-500/10"
                              : "bg-emerald-50/50 border-emerald-200"
                            : t.status === "lost"
                            ? darkMode
                              ? "bg-rose-950/20 border-rose-500/30 shadow-rose-500/10"
                              : "bg-rose-50/50 border-rose-200"
                            : darkMode
                            ? "bg-gray-900 border-white/10"
                            : "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div className="p-4 sm:p-6 space-y-3 mt-4">
                          {(t.selections || []).map((raw, i) => {
                            const s = normalizeSelection(raw);
                            const mo = parsePredictionToMarketOption(
                              s.prediction
                            );
                            const locked = isFinalStatus(s.status);

                            let clvValue = null;
                            const matchStr = String(s.match).toLowerCase();
                            const matchRows = oddsHistory.filter((row) => {
                              const h = String(
                                row["Home Team"] || ""
                              ).toLowerCase();
                              const a = String(
                                row["Away Team"] || ""
                              ).toLowerCase();
                              return (
                                h &&
                                a &&
                                (matchStr.includes(h) || matchStr.includes(a))
                              );
                            });

                            if (matchRows.length > 0 && s.odds) {
                              matchRows.sort(
                                (a, b) =>
                                  new Date(a["Time Checked"]) -
                                  new Date(b["Time Checked"])
                              );
                              const newest = matchRows[matchRows.length - 1]; // Closing line

                              let colName = "";
                              const mkt = String(mo.market).toUpperCase();
                              const opt = String(mo.option).toUpperCase();

                              if (mkt.includes("1X2")) {
                                if (opt === "HOME") colName = "Home Odds";
                                if (opt === "DRAW") colName = "Draw Odds";
                                if (opt === "AWAY") colName = "Away Odds";
                              } else if (
                                mkt.includes("OVER") &&
                                mkt.includes("2.5")
                              )
                                colName = "O2.5";
                              else if (
                                mkt.includes("UNDER") &&
                                mkt.includes("2.5")
                              )
                                colName = "U2.5";
                              else if (
                                mkt.includes("OVER") &&
                                mkt.includes("1.5")
                              )
                                colName = "O1.5";
                              else if (
                                mkt.includes("UNDER") &&
                                mkt.includes("1.5")
                              )
                                colName = "U1.5";
                              else if (
                                mkt.includes("OVER") &&
                                mkt.includes("3.5")
                              )
                                colName = "O3.5";
                              else if (
                                mkt.includes("UNDER") &&
                                mkt.includes("3.5")
                              )
                                colName = "U3.5";

                              if (colName && newest[colName]) {
                                const closingOdds = Number(newest[colName]);
                                if (
                                  closingOdds > 1 &&
                                  s.odds > 1 &&
                                  closingOdds !== Number(s.odds)
                                ) {
                                  clvValue = Number(s.odds) - closingOdds;
                                }
                              }
                            }

                            return (
                              <div
                                key={`${s.match}-${i}`}
                                className={cx(
                                  "group relative rounded-2xl p-4 transition-all border",
                                  darkMode
                                    ? "bg-black/20 border-white/5 hover:border-white/20"
                                    : "bg-white border-gray-100 shadow-sm"
                                )}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-black text-blue-500 uppercase tracking-wider mb-1">
                                      {s.league}
                                    </div>
                                    <div className="text-sm font-black truncate mb-1">
                                      {s.match}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={cx(
                                          "text-xs font-bold px-2 py-0.5 rounded-md",
                                          darkMode
                                            ? "bg-white/5 text-gray-300"
                                            : "bg-gray-100 text-gray-700"
                                        )}
                                      >
                                        {mo.market}:{" "}
                                        <span className="font-black underline decoration-blue-500/50">
                                          {mo.option || "—"}
                                        </span>
                                      </span>

                                      {clvValue !== null && (
                                        <span
                                          className={cx(
                                            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                            clvValue > 0
                                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                                              : "border-rose-500/30 bg-rose-500/10 text-rose-500"
                                          )}
                                        >
                                          CLV {clvValue > 0 ? "+" : ""}
                                          {clvValue.toFixed(2)}
                                        </span>
                                      )}

                                      <span className="text-[10px] font-black text-gray-500 uppercase">
                                        {formatSelectionMeta(s)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 border-t sm:border-0 pt-3 sm:pt-0 dark:border-white/5 w-full sm:w-auto">
                                    <StatusPill
                                      status={s.status}
                                      darkMode={darkMode}
                                    />
                                    <button
                                      onClick={() => addSelectionToBetslip(s)}
                                      disabled={locked}
                                      className={cx(
                                        "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition",
                                        locked
                                          ? "opacity-30 cursor-not-allowed border-transparent"
                                          : "border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:text-white"
                                      )}
                                    >
                                      Re-Bet
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-6 bg-black/5 dark:bg-white/5 border-t border-dashed border-gray-300 dark:border-white/10">
                          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                  Odds
                                </div>
                                <div className="text-base font-black">
                                  {odds || "1.00"}
                                </div>
                              </div>

                              <div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1">
                                  CLV <Activity size={10} />
                                </div>
                                {ticketClv ? (
                                  <div
                                    className={cx(
                                      "text-base font-black tabular-nums",
                                      ticketClv > 0
                                        ? "text-emerald-500"
                                        : "text-rose-500"
                                    )}
                                  >
                                    {ticketClv > 0 ? "+" : ""}
                                    {ticketClv}
                                  </div>
                                ) : (
                                  <div className="text-base font-black text-gray-400">
                                    —
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                  Stake
                                </div>
                                <div className="text-base font-black tabular-nums">
                                  {formatNaira(stakeNowNum)}
                                </div>
                              </div>

                              <div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                  Potential
                                </div>
                                <div
                                  className={cx(
                                    "text-base font-black tabular-nums",
                                    t.status === "won"
                                      ? "text-emerald-500"
                                      : "text-blue-600"
                                  )}
                                >
                                  {formatNaira(potential || "0")}
                                </div>
                              </div>
                            </div>
                            <PrimaryButton
                              onClick={() => addAllSelectionsToBetslip(t)}
                              className="w-full lg:w-auto py-4 rounded-2xl shadow-xl justify-center"
                            >
                              <Plus size={18} /> Add All to Betslip
                            </PrimaryButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card darkMode={darkMode} className="p-10 text-center">
          <Ticket
            className={cx(
              "h-12 w-12 mx-auto mb-3",
              darkMode ? "text-gray-600" : "text-gray-400"
            )}
          />
          <div className="text-lg font-black">No tickets yet</div>
          <p
            className={cx(
              "text-sm mt-1",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}
          >
            Add selections to your BetSlip and save tickets to start tracking.
          </p>
        </Card>
      )}

      {/* === 2. TERMINAL MARKET INTELLIGENCE === */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2 mb-2 px-2">
          <Brain
            className={cx(
              "h-5 w-5",
              darkMode ? "text-purple-400" : "text-purple-600"
            )}
          />
          <h3 className="text-lg sm:text-xl font-black">
            Pro Market Intelligence
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div
            className={cx(
              "rounded-[32px] border p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden",
              darkMode
                ? "bg-gradient-to-br from-indigo-950 via-gray-900 to-black border-indigo-500/20"
                : "bg-gradient-to-br from-indigo-50 to-white border-indigo-200"
            )}
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Target
                  className={cx(
                    "h-4 w-4",
                    darkMode ? "text-indigo-400" : "text-indigo-600"
                  )}
                />
                <span
                  className={cx(
                    "text-[10px] font-black uppercase tracking-widest",
                    darkMode ? "text-indigo-400" : "text-indigo-600"
                  )}
                >
                  Top Edge Market
                </span>
              </div>
              {marketIntelligence.rankedByConfidence.length > 0 ? (
                <>
                  <div className="text-3xl sm:text-4xl font-black capitalize tracking-tight mb-2">
                    {marketIntelligence.rankedByConfidence[0].name}
                  </div>
                  <div
                    className={cx(
                      "text-sm font-semibold",
                      darkMode ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    Highest performing mathematical edge
                  </div>
                </>
              ) : (
                <div className="text-xl font-bold text-gray-500">
                  Not enough data
                </div>
              )}
            </div>
            {marketIntelligence.rankedByConfidence.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-8">
                <div
                  className={cx(
                    "rounded-2xl p-4 border",
                    darkMode
                      ? "bg-white/5 border-white/10"
                      : "bg-white border-gray-200"
                  )}
                >
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                    Win Rate
                  </div>
                  <div className="text-xl font-black tabular-nums">
                    {marketIntelligence.rankedByConfidence[0].winRate.toFixed(
                      1
                    )}
                    %
                  </div>
                </div>
                <div
                  className={cx(
                    "rounded-2xl p-4 border",
                    darkMode
                      ? "bg-white/5 border-white/10"
                      : "bg-white border-gray-200"
                  )}
                >
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                    ROI
                  </div>
                  <div
                    className={cx(
                      "text-xl font-black tabular-nums",
                      marketIntelligence.rankedByConfidence[0].roi >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                    )}
                  >
                    {marketIntelligence.rankedByConfidence[0].roi >= 0
                      ? "+"
                      : ""}
                    {marketIntelligence.rankedByConfidence[0].roi.toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className={cx(
              "lg:col-span-2 rounded-[32px] border p-2 sm:p-4",
              darkMode
                ? "bg-gray-950/50 border-white/10"
                : "bg-white border-gray-200 shadow-sm"
            )}
          >
            <div className="flex items-center justify-between px-4 pt-2 pb-4 border-b border-gray-200 dark:border-white/10 mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                Market Breakdown
              </span>
              <span
                className={cx(
                  "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                  darkMode
                    ? "bg-white/5 border-white/10 text-gray-300"
                    : "bg-gray-50 border-gray-200 text-gray-600"
                )}
              >
                Risk: {marketIntelligence.riskProfile}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {marketIntelligence.rankedByConfidence.length > 0 ? (
                marketIntelligence.rankedByConfidence.map((m) => (
                  <div
                    key={m.name}
                    className={cx(
                      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[20px] transition-all",
                      darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={cx(
                            "text-sm font-black capitalize",
                            darkMode ? "text-white" : "text-gray-900"
                          )}
                        >
                          {m.name}
                        </span>
                        <span
                          className={cx(
                            "text-[10px] px-2 py-0.5 rounded-md font-bold",
                            m.roi >= 0
                              ? darkMode
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-emerald-100 text-emerald-700"
                              : darkMode
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-rose-100 text-rose-700"
                          )}
                        >
                          {m.roi >= 0 ? "+" : ""}
                          {m.roi.toFixed(1)}% ROI
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={cx(
                            "h-1.5 flex-1 rounded-full overflow-hidden",
                            darkMode ? "bg-gray-800" : "bg-gray-200"
                          )}
                        >
                          <div
                            className={cx(
                              "h-full rounded-full transition-all duration-1000",
                              m.winRate >= 60
                                ? "bg-emerald-500"
                                : m.winRate >= 45
                                ? "bg-amber-400"
                                : "bg-rose-500"
                            )}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, m.winRate)
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold tabular-nums w-10 text-right">
                          {m.winRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 border-t sm:border-0 pt-3 sm:pt-0 dark:border-white/10">
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Exposure
                        </div>
                        <div
                          className={cx(
                            "text-sm font-black tabular-nums",
                            darkMode ? "text-gray-300" : "text-gray-700"
                          )}
                        >
                          {m.exposure.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Avg Odds
                        </div>
                        <div
                          className={cx(
                            "text-sm font-black tabular-nums",
                            darkMode ? "text-gray-300" : "text-gray-700"
                          )}
                        >
                          {m.avgOdds.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm font-bold text-gray-500">
                  Track more tickets to unlock market intelligence.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}