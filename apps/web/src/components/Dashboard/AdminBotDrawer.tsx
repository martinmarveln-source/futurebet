"use client";
// @ts-nocheck

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  X,
  Send,
  Plus,
  Trash2,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  Database,
  MessageSquare,
  Loader2,
  RefreshCw,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { useBetslipStore } from "@/store/betslipStore";

const QUICK_PROMPTS = [
  {
    label: "Today's Top Value Picks",
    prompt:
      "Scan today's cached matches and rank the top 5 high-probability, positive-value fixtures using league table positions, recent form, goals/g, and H2H.",
  },
  {
    label: "Audit Current BetSlip",
    prompt:
      "Audit the matches currently in my BetSlip using live match stats, team standings, and H2H. Flag weak legs and recommend safer alternatives.",
  },
  {
    label: "O2.5 & BTTS Screener",
    prompt:
      "Identify the best Over 2.5 Goals and BTTS Yes opportunities in today's schedule backed by scoring/conceding rates.",
  },
  {
    label: "VIP & Multi-Bet Summary",
    prompt:
      "Summarize recent VIP picks, curated Multi-Bet slip performance, and Sandbox accuracy from the stats cache.",
  },
];

function renderInlineFormatting(line, keyPrefix) {
  const parts = String(line || "").split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={`${keyPrefix}-c-${idx}`}
          className="px-1.5 py-0.5 rounded bg-black/15 dark:bg-white/10 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${idx}`}>{part}</React.Fragment>;
  });
}

function FormattedBotMessage({ content, darkMode }) {
  const lines = String(content || "").split(/\r?\n/);
  const elements = [];
  let listItems = [];
  let listOrdered = false;

  const flushList = (keySuffix) => {
    if (listItems.length === 0) return;
    const Tag = listOrdered ? "ol" : "ul";
    elements.push(
      <Tag
        key={`list-${keySuffix}`}
        className={`my-1.5 pl-4 space-y-1 text-xs leading-relaxed ${
          listOrdered ? "list-decimal" : "list-disc"
        }`}
      >
        {listItems.map((item, idx) => (
          <li key={`li-${keySuffix}-${idx}`}>
            {renderInlineFormatting(item, `li-${keySuffix}-${idx}`)}
          </li>
        ))}
      </Tag>
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList(`empty-${index}`);
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList(`h-${index}`);
      elements.push(
        <div
          key={`h-${index}`}
          className={`mt-2.5 mb-1 text-xs font-bold tracking-wide uppercase ${
            darkMode ? "text-emerald-300" : "text-emerald-700"
          }`}
        >
          {renderInlineFormatting(headingMatch[2], `ht-${index}`)}
        </div>
      );
      return;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (listItems.length > 0 && listOrdered) {
        flushList(`switch-ul-${index}`);
      }
      listOrdered = false;
      listItems.push(bulletMatch[1]);
      return;
    }

    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      if (listItems.length > 0 && !listOrdered) {
        flushList(`switch-ol-${index}`);
      }
      listOrdered = true;
      listItems.push(numMatch[1]);
      return;
    }

    flushList(`p-${index}`);
    elements.push(
      <p key={`p-${index}`} className="text-xs leading-relaxed my-1">
        {renderInlineFormatting(trimmed, `pt-${index}`)}
      </p>
    );
  });

  flushList("end");
  return <div className="space-y-0.5">{elements}</div>;
}

export default function AdminBotDrawer({ show, onClose, darkMode }) {
  const { matches: betslipMatches, addMatch } = useBetslipStore();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [defaultModel, setDefaultModel] = useState("gemini-3.5-flash-lite");
  const [input, setInput] = useState("");
  const [includeBetslip, setIncludeBetslip] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [latestFixtures, setLatestFixtures] = useState([]);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  const messagesEndRef = useRef(null);

  const loadThread = async (convId = null) => {
    setIsLoadingHistory(true);
    setError("");
    try {
      const qs = convId ? `?conversationId=${encodeURIComponent(convId)}` : "";
      const res = await fetch(`/api/admin/bot${qs}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load FutureBet Bot history");
      }
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      setActiveConversationId(data.activeConversationId ?? null);
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      setMessages(msgs);
      if (data.defaultModel) setDefaultModel(data.defaultModel);

      // Restore latest assistant metadata if available
      const lastAssistant = [...msgs]
        .reverse()
        .find((m) => m.role === "assistant" && m.metadata);
      if (lastAssistant?.metadata) {
        let meta = lastAssistant.metadata;
        if (typeof meta === "string") {
          try {
            meta = JSON.parse(meta);
          } catch {
            meta = null;
          }
        }
        setLatestSnapshot(meta?.statsSnapshot || null);
        setLatestFixtures(
          Array.isArray(meta?.suggestedFixtures) ? meta.suggestedFixtures : []
        );
      } else {
        setLatestSnapshot(null);
        setLatestFixtures([]);
      }
    } catch (err) {
      setError(err?.message || "Failed to load Admin Bot");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (show) {
      loadThread(activeConversationId);
    }
  }, [show]);

  useEffect(() => {
    if (show && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending, show]);

  if (!show) return null;

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setLatestFixtures([]);
    setError("");
  };

  const handleSelectConversation = (convId) => {
    if (convId === activeConversationId || isSending) return;
    loadThread(convId);
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!convId) return;
    try {
      const res = await fetch(
        `/api/admin/bot?conversationId=${encodeURIComponent(convId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete conversation");
      }
      const nextList = conversations.filter((c) => c.id !== convId);
      setConversations(nextList);
      if (activeConversationId === convId) {
        if (nextList.length > 0) {
          loadThread(nextList[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      setError(err?.message || "Delete failed");
    }
  };

  const handleSend = async (overrideText = null) => {
    const prompt = String(overrideText !== null ? overrideText : input).trim();
    if (!prompt || isSending) return;

    setError("");
    if (overrideText === null) setInput("");

    const tempUserId = `temp-user-${Date.now()}`;
    const optimisticMsg = {
      id: tempUserId,
      role: "user",
      content: prompt,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setIsSending(true);

    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          conversationId: activeConversationId,
          betslip: includeBetslip ? betslipMatches : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "FutureBet Bot request failed");
      }

      const returnedConvId = data.conversationId;
      setActiveConversationId(returnedConvId);
      setLatestSnapshot(data.statsSnapshot || null);
      setLatestFixtures(
        Array.isArray(data.suggestedFixtures) ? data.suggestedFixtures : []
      );

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || "",
        model_used: data.modelUsed || defaultModel,
        metadata: {
          statsSnapshot: data.statsSnapshot,
          suggestedFixtures: data.suggestedFixtures,
        },
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Refresh thread list silently so new conversation title appears
      fetch(`/api/admin/bot?conversationId=${encodeURIComponent(returnedConvId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((threadData) => {
          if (threadData?.conversations) {
            setConversations(threadData.conversations);
          }
        })
        .catch(() => {});
    } catch (err) {
      setError(err?.message || "Error contacting FutureBet Bot");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
      if (overrideText === null) setInput(prompt);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 1800);
    } catch {}
  };

  const handleAddSuggestedFixture = (fixture) => {
    if (!fixture?.match) return;
    addMatch({ ...fixture });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="FutureBet Admin Bot"
    >
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-over drawer */}
      <div
        className={`w-full max-w-4xl h-full flex flex-col shadow-2xl border-l ${
          darkMode
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Top Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${
            darkMode
              ? "bg-slate-900/90 border-slate-800"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold tracking-tight">
                  FutureBet Admin Intelligence Bot
                </h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    darkMode
                      ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-300"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}
                >
                  {defaultModel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] opacity-75 mt-0.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">
                  Admin Only • Full Match &amp; League Stats Access • User PII Isolated
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleNewChat}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                darkMode
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              title="Start new conversation"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <button
              type="button"
              onClick={() => loadThread(activeConversationId)}
              className={`p-2 rounded-lg transition ${
                darkMode ? "hover:bg-slate-800" : "hover:bg-slate-200"
              }`}
              title="Refresh thread"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingHistory ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-lg transition ${
                darkMode ? "hover:bg-slate-800" : "hover:bg-slate-200"
              }`}
              aria-label="Close Admin Bot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body Layout: Sidebar + Main Chat */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Conversation History Sidebar */}
          <aside
            className={`hidden md:flex w-60 flex-col border-r shrink-0 ${
              darkMode
                ? "bg-slate-900/50 border-slate-800"
                : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Admin Threads ({conversations.length})
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
              {conversations.length === 0 ? (
                <div className="px-2 py-4 text-xs opacity-60 text-center">
                  No saved threads yet. Ask a match intelligence question to begin.
                </div>
              ) : (
                conversations.map((conv) => {
                  const active = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                        active
                          ? darkMode
                            ? "bg-emerald-900/40 text-emerald-200 border border-emerald-700/50"
                            : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                          : darkMode
                          ? "hover:bg-slate-800/70 text-slate-300"
                          : "hover:bg-slate-200/70 text-slate-700"
                      }`}
                    >
                      <span className="truncate flex-1 font-medium">
                        {conv.title || `Thread #${conv.id}`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition"
                        title="Delete thread"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Main Conversation Column */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Live Stats Access Snapshot Strip */}
            {latestSnapshot && (
              <div
                className={`px-4 py-2 border-b flex items-center gap-2 flex-wrap text-[11px] ${
                  darkMode
                    ? "bg-slate-900/40 border-slate-800 text-slate-300"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <Database className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>
                  <strong>{latestSnapshot.totalCachedMatches ?? 0}</strong> cached matches
                </span>
                <span>•</span>
                <span>
                  <strong>{latestSnapshot.todayMatchesCount ?? 0}</strong> today
                </span>
                <span>•</span>
                <span>
                  <strong>{latestSnapshot.teamsTracked ?? 0}</strong> teams /{" "}
                  <strong>{latestSnapshot.leaguesTracked ?? 0}</strong> leagues
                </span>
                {latestSnapshot.matchedFixturesCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-500 font-medium">
                      {latestSnapshot.matchedFixturesCount} query-matched fixtures
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Mobile Conversation Selector */}
            {conversations.length > 0 && (
              <div
                className={`md:hidden px-3 py-2 border-b flex items-center gap-2 ${
                  darkMode ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <select
                  value={activeConversationId || ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val) handleSelectConversation(val);
                  }}
                  className={`flex-1 text-xs rounded-lg px-2.5 py-1.5 border ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-200"
                      : "bg-white border-slate-300 text-slate-800"
                  }`}
                >
                  <option value="">Select conversation...</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || `Thread #${c.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && !isLoadingHistory && (
                <div className="max-w-xl mx-auto py-6 text-center space-y-4">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      darkMode
                        ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Match Stats, Standings, H2H, VIP &amp; Sandbox AI Copilot
                  </div>
                  <h3 className="text-base font-bold">
                    Ask FutureBet Bot anything about matches &amp; stats
                  </h3>
                  <p className="text-xs opacity-75 leading-relaxed">
                    Powered by FutureBet's live read-only stats index (matches cache,
                    team standings, goal averages, H2H, VIP picks, Multi-Bets &amp; Sandbox
                    accuracy). Regular users&apos; personal accounts, slips, and PII are
                    strictly excluded.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => handleSend(q.prompt)}
                        className={`p-3 rounded-xl border text-left transition ${
                          darkMode
                            ? "bg-slate-900/70 border-slate-800 hover:border-emerald-600/60 hover:bg-slate-900"
                            : "bg-slate-50 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40"
                        }`}
                      >
                        <div className="text-xs font-semibold text-emerald-500">
                          {q.label}
                        </div>
                        <div className="text-[11px] opacity-75 line-clamp-2 mt-0.5">
                          {q.prompt}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${
                        isUser
                          ? "bg-emerald-600 text-white rounded-br-sm"
                          : darkMode
                          ? "bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-sm"
                          : "bg-slate-100 border border-slate-200 text-slate-900 rounded-bl-sm"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-current/10">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-75">
                            <Bot className="h-3 w-3 text-emerald-500" />
                            <span>FutureBet Bot</span>
                            {msg.model_used && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 normal-case">
                                {msg.model_used}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
                            title="Copy response"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-60" />
                            )}
                          </button>
                        </div>
                      )}

                      {isUser ? (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      ) : (
                        <FormattedBotMessage
                          content={msg.content}
                          darkMode={darkMode}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex justify-start">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl rounded-bl-sm border flex items-center gap-2 text-xs ${
                      darkMode
                        ? "bg-slate-900 border-slate-800 text-slate-300"
                        : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                    <span>Querying match intelligence cache &amp; reasoning...</span>
                  </div>
                </div>
              )}

              {/* Suggested Fixtures Strip */}
              {latestFixtures.length > 0 && !isSending && (
                <div
                  className={`p-3 rounded-xl border ${
                    darkMode
                      ? "bg-slate-900/60 border-slate-800"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70 mb-2">
                    Referenced Fixtures ({latestFixtures.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {latestFixtures.slice(0, 6).map((fx, i) => {
                      const alreadyInSlip = betslipMatches.some(
                        (m) => m.match === fx.match
                      );
                      return (
                        <div
                          key={`${fx.match}-${i}`}
                          className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs ${
                            darkMode
                              ? "bg-slate-950/70 border-slate-800"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{fx.match}</div>
                            <div className="text-[10px] opacity-70 truncate">
                              {fx.league || "League"} • {fx.date || ""}{" "}
                              {fx.time || ""}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={alreadyInSlip}
                            onClick={() => handleAddSuggestedFixture(fx)}
                            className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition ${
                              alreadyInSlip
                                ? "bg-emerald-500/15 text-emerald-500 cursor-default"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            {alreadyInSlip ? (
                              <>
                                <Check className="h-3 w-3" /> In Slip
                              </>
                            ) : (
                              <>
                                <PlusCircle className="h-3 w-3" /> Add
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div
              className={`p-3 border-t ${
                darkMode
                  ? "bg-slate-900/70 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer select-none opacity-80">
                  <input
                    type="checkbox"
                    checked={includeBetslip}
                    onChange={(e) => setIncludeBetslip(e.target.checked)}
                    className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Include active Admin BetSlip ({betslipMatches.length} legs)
                  </span>
                </label>
                <span className="text-[10px] opacity-60">
                  Enter to send • Shift+Enter for new line
                </span>
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about any team, league table, fixture odds, H2H, or today's top picks..."
                  className={`flex-1 resize-none rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode
                      ? "bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                      : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  }`}
                />
                <button
                  type="button"
                  disabled={isSending || !input.trim()}
                  onClick={() => handleSend()}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
