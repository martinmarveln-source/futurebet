// @ts-nocheck
"use client";

import React from "react";
import {
  BookOpen,
  Info,
  AlertTriangle,
  Zap,
  Terminal,
  ShieldCheck,
} from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* === UPGRADED UI COMPONENTS === */

function Badge({ children, tone = "gray", darkMode = false }) {
  const tones = {
    blue: darkMode
      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
      : "bg-blue-50 text-blue-700 border-blue-200",
    violet: darkMode
      ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
      : "bg-violet-50 text-violet-700 border-violet-200",
    emerald: darkMode
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: darkMode
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-amber-50 text-amber-700 border-amber-200",
    rose: darkMode
      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
      : "bg-rose-50 text-rose-700 border-rose-200",
    gray: darkMode
      ? "bg-white/5 text-gray-300 border-white/10"
      : "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm",
        tones[tone] || tones.gray
      )}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children, darkMode = false, icon: Icon }) {
  return (
    <div
      className={cn(
        "mt-12 mb-6 pb-3 border-b flex items-center gap-3",
        darkMode ? "border-white/10" : "border-gray-200"
      )}
    >
      {Icon && (
        <div
          className={cn(
            "p-2 rounded-xl",
            darkMode ? "bg-white/5 text-blue-400" : "bg-gray-100 text-blue-600"
          )}
        >
          <Icon size={18} />
        </div>
      )}
      <h2
        className={cn(
          "text-xl sm:text-2xl font-black tracking-tight",
          darkMode ? "text-white" : "text-gray-900"
        )}
      >
        {children}
      </h2>
    </div>
  );
}

function Card({ children, darkMode = false, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-6 sm:p-8 transition-all duration-300",
        darkMode
          ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10 shadow-lg"
          : "bg-white border-gray-200 hover:shadow-xl shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function NoteBox({ children, darkMode = false, tone = "amber" }) {
  const config = {
    amber: {
      style: darkMode
        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
        : "bg-amber-50 border-amber-300 text-amber-800",
      icon: (
        <AlertTriangle
          size={18}
          className={darkMode ? "text-amber-400" : "text-amber-600"}
        />
      ),
    },
    emerald: {
      style: darkMode
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
        : "bg-emerald-50 border-emerald-300 text-emerald-800",
      icon: (
        <ShieldCheck
          size={18}
          className={darkMode ? "text-emerald-400" : "text-emerald-600"}
        />
      ),
    },
    rose: {
      style: darkMode
        ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
        : "bg-rose-50 border-rose-300 text-rose-800",
      icon: (
        <Zap
          size={18}
          className={darkMode ? "text-rose-400" : "text-rose-600"}
        />
      ),
    },
    blue: {
      style: darkMode
        ? "bg-blue-500/10 border-blue-500/30 text-blue-200"
        : "bg-blue-50 border-blue-300 text-blue-800",
      icon: (
        <Info
          size={18}
          className={darkMode ? "text-blue-400" : "text-blue-600"}
        />
      ),
    },
  };

  const activeConfig = config[tone] || config.amber;

  return (
    <div
      className={cn(
        "mt-6 rounded-2xl border-l-4 p-5 flex items-start gap-4",
        activeConfig.style
      )}
    >
      <div className="shrink-0 mt-0.5">{activeConfig.icon}</div>
      <div className="text-sm font-medium leading-relaxed">{children}</div>
    </div>
  );
}

function BulletList({ items, darkMode = false }) {
  return (
    <ul
      className={cn(
        "space-y-2.5 text-sm",
        darkMode ? "text-gray-300" : "text-gray-600"
      )}
    >
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full mt-2 shrink-0",
              darkMode ? "bg-blue-500" : "bg-blue-500"
            )}
          />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Paragraph({ children, darkMode = false, className = "" }) {
  return (
    <p
      className={cn(
        "text-sm leading-relaxed mb-4",
        darkMode ? "text-gray-300" : "text-gray-600",
        className
      )}
    >
      {children}
    </p>
  );
}

function DataTable({ headers = [], rows = [], darkMode = false }) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[20px] border mt-4",
        darkMode
          ? "border-white/10 bg-black/20"
          : "border-gray-200 bg-white shadow-sm"
      )}
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr
            className={
              darkMode
                ? "bg-white/5 border-b border-white/10"
                : "bg-gray-50 border-b border-gray-200"
            }
          >
            {headers.map((header, index) => (
              <th
                key={index}
                className={cn(
                  "p-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={cn(
            "divide-y",
            darkMode ? "divide-white/5" : "divide-gray-100"
          )}
        >
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                "transition-colors",
                darkMode ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"
              )}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "p-4 text-sm font-medium align-top",
                    darkMode ? "text-gray-300" : "text-gray-700",
                    cellIndex === 0 &&
                      "font-bold text-blue-500 dark:text-blue-400"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Formula({ children, darkMode = false }) {
  return (
    <code
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-tight border",
        darkMode
          ? "bg-black/50 border-white/10 text-emerald-400"
          : "bg-gray-100 border-gray-200 text-emerald-600"
      )}
    >
      <Terminal size={14} className="opacity-50" /> {children}
    </code>
  );
}

/* === CONTENT ARRAYS === */

const ACCESS_ROWS = [
  [
    <span key="plan">Guest</span>,
    "Explore limited parts of the app, view public/basic match data, and browse visible non-premium surfaces.",
    "No Home tab, no Team Compare workspace, no Silver+ compare depth, no Premium Intelligence, no Auto Pick, no account-based betslip actions.",
  ],
  [
    <span key="plan">Free / Standard</span>,
    "Basic app usage, core exploration, basic match card view, and base comparison modal surfaces where allowed.",
    "No Team Compare workspace, no Silver+ Recent/H2H depth, no AI Matchup Lab, no market-intelligence compare panels, no Premium Intelligence, no Auto Pick.",
  ],
  [
    <span key="plan">Silver</span>,
    "Home tab access, advanced filters, compare tools, Team Compare workspace, AI Matchup Lab, team profile cards, market intelligence, premium edge dashboard, league context, recommendation DNA, explainable AI notes, and deep comparison matrix.",
    "No Premium Intelligence tab content, no AI Insight in match cards, no Auto Pick, no Premium-only intelligence sections.",
  ],
  [
    <span key="plan">Premium</span>,
    "Full Home tab, full compare access, Team Compare workspace, Premium Intelligence, AI Insight, Auto Pick, VIP features, advanced workflows, and all Silver features.",
    "Premium is the main full subscriber level. Only Admin has full platform override powers.",
  ],
  [
    <span key="plan">Admin</span>,
    "Full access to all features including Premium-only tools, resets, gating bypass, and all internal capabilities.",
    "No normal user restrictions apply.",
  ],
];

const COMPARISON_MODAL_ROWS = [
  [
    "Overview",
    "Basic matchup summary, form snapshot, league position, and key structure.",
    "Free+",
  ],
  ["Stats", "Side-by-side statistical comparison between teams.", "Free+"],
  ["Recent", "Last matches and recent momentum context.", "Silver+"],
  [
    "H2H",
    "Recent meetings between both teams with pattern summaries.",
    "Silver+",
  ],
  [
    "Intelligence",
    "Premium AI-style betting analysis and tactical reasoning.",
    "Premium+",
  ],
];

const COMPARE_ACCESS_ROWS = [
  ["Team Compare workspace entry", "No", "Yes", "Yes", "Yes"],
  ["Team Compare guide panel", "No", "Yes", "Yes", "Yes"],
  ["Selection panels (country → league → team)", "No", "Yes", "Yes", "Yes"],
  ["Team profile cards & score bars", "No", "Yes", "Yes", "Yes"],
  ["AI Matchup Verdict", "No", "Yes", "Yes", "Yes"],
  ["Market intelligence", "No", "Yes", "Yes", "Yes"],
  ["Premium edge dashboard", "No", "Yes", "Yes", "Yes"],
  ["League context windows", "No", "Yes", "Yes", "Yes"],
  ["Recommendation DNA", "No", "Yes", "Yes", "Yes"],
  ["Explainable AI matchup notes", "No", "Yes", "Yes", "Yes"],
  ["Deep Comparison Matrix", "No", "Yes", "Yes", "Yes"],
  ["AI Match Summary", "No", "Yes", "Yes", "Yes"],
  ["Comparison Modal Overview", "Yes", "Yes", "Yes", "Yes"],
  ["Comparison Modal Stats", "Yes", "Yes", "Yes", "Yes"],
  ["Comparison Modal Recent", "No", "Yes", "Yes", "Yes"],
  ["Comparison Modal H2H", "No", "Yes", "Yes", "Yes"],
  ["Comparison Modal Intelligence", "No", "No", "Yes", "Yes"],
];

const HOME_AUTOPICK_ROWS = [
  ["Home / Dashboard tab", "No", "Yes", "Yes", "Yes"],
  ["Auto Pick", "No", "No", "Yes", "Yes"],
  ["AI Insight in Match Cards", "No", "No", "Yes", "Yes"],
];

export default function GuideTab({ darkMode = false }) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* === HERO SECTION === */}
      <section
        className={cn(
          "relative overflow-hidden rounded-[32px] border p-8 sm:p-12 transition-all",
          darkMode
            ? "bg-gradient-to-br from-blue-900/20 via-black to-emerald-900/10 border-white/10 shadow-2xl"
            : "bg-gradient-to-br from-blue-50 via-white to-emerald-50 border-gray-200 shadow-xl"
        )}
      >
        <div
          className={cn(
            "absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] pointer-events-none",
            darkMode ? "bg-blue-500/10" : "bg-blue-400/20"
          )}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge darkMode={darkMode} tone="blue">
              FutureBet Command Center
            </Badge>
            <Badge darkMode={darkMode} tone="violet">
              App Manual
            </Badge>
            <Badge darkMode={darkMode} tone="emerald">
              Premium Workflow
            </Badge>
          </div>

          <h1
            className={cn(
              "text-3xl sm:text-5xl font-black tracking-tight mb-4",
              darkMode ? "text-white" : "text-gray-900"
            )}
          >
            Platform Documentation
          </h1>

          <Paragraph
            darkMode={darkMode}
            className="text-base sm:text-lg max-w-2xl opacity-80"
          >
            This manual explains how the FutureBet app works, what each major
            section does, what important betting terms mean, how the model
            presents information, and what each access level can unlock.
          </Paragraph>

          <NoteBox darkMode={darkMode} tone="amber">
            This manual reflects the current feature structure including:{" "}
            <strong>Silver access to Home tab</strong>,{" "}
            <strong>Silver+ access to Team Compare workspace</strong>,{" "}
            <strong>
              AI Matchup Lab, market intelligence, premium edge dashboard,
              league context, recommendation DNA, explainable AI notes, and deep
              comparison matrix inside Team Compare
            </strong>
            , <strong>Recent + H2H locked to Silver+</strong>,{" "}
            <strong>Intelligence locked to Premium</strong>, and{" "}
            <strong>Auto Pick locked to Premium/Admin only</strong>.
          </NoteBox>
        </div>
      </section>

      {/* 1 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          1. App Overview
        </SectionTitle>
        <Card darkMode={darkMode}>
          <Paragraph darkMode={darkMode}>
            FutureBet is a match-discovery and betting workflow platform
            designed to help users:
          </Paragraph>
          <BulletList
            darkMode={darkMode}
            items={[
              "Discover matches more efficiently.",
              "Compare teams using statistical and contextual signals.",
              "Build and manage a betslip.",
              "Review VIP or curated picks.",
              "Track performance over time.",
              "Use premium intelligence and AI-style explanations for stronger decision support.",
            ]}
          />
        </Card>
      </section>

      {/* 2 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={ShieldCheck}>
          2. Access Levels and What They Can Use
        </SectionTitle>
        <DataTable
          darkMode={darkMode}
          headers={["Plan", "Main Access", "Restrictions"]}
          rows={ACCESS_ROWS}
        />
      </section>

      {/* 3 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={Terminal}>
          3. Main Navigation Tabs
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Home / Dashboard
            </h3>
            <Paragraph darkMode={darkMode}>
              This is the executive command center of the app. It presents
              premium-style match workflows, top opportunities, shortcuts, and
              faster actions.
            </Paragraph>
            <div
              className={cn(
                "text-xs font-bold uppercase tracking-widest mt-4 p-3 rounded-xl",
                darkMode ? "bg-white/5" : "bg-gray-50"
              )}
            >
              <span className="text-blue-500">Access:</span> Silver, Premium,
              Admin
            </div>
          </Card>

          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Explore Matches
            </h3>
            <Paragraph darkMode={darkMode}>
              This is the main discovery workspace. Users can search matches,
              apply filters, sort data, and narrow results using thresholds and
              filter panels.
            </Paragraph>
          </Card>

          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Compare
            </h3>
            <Paragraph darkMode={darkMode}>
              Compare teams and review matchup logic, structure, form, table
              strength, and AI-style verdicts.
            </Paragraph>
            <div
              className={cn(
                "text-xs font-bold uppercase tracking-widest mt-4 p-3 rounded-xl",
                darkMode ? "bg-white/5" : "bg-gray-50"
              )}
            >
              <span className="text-blue-500">Access:</span> Silver+
            </div>
          </Card>

          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Betslip
            </h3>
            <Paragraph darkMode={darkMode}>
              Build and manage selected picks. Users can add markets, track
              odds, and save ticket-related workflows.
            </Paragraph>
          </Card>

          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              VIP Picks
            </h3>
            <Paragraph darkMode={darkMode}>
              A premium stream of curated or filtered high-signal picks with
              stronger market focus and ranking logic.
            </Paragraph>
          </Card>

          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Performance Tracker
            </h3>
            <Paragraph darkMode={darkMode}>
              Monitor tickets, status outcomes, stake, returns, ROI, wallet
              balance, and market intelligence from tracked ticket history.
            </Paragraph>
          </Card>
        </div>
      </section>

      {/* 4 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          4. Dashboard / Home Tab Manual
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-8">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              What the Home tab is for
            </h3>
            <Paragraph darkMode={darkMode}>
              The Home tab is the premium summary space that surfaces:
            </Paragraph>
            <BulletList
              darkMode={darkMode}
              items={[
                "Best match opportunities",
                "Quick preset workflows",
                "Shortcut actions into Explore, Compare, and Betslip",
                "Top-level premium stats and workflow summaries",
              ]}
            />
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              What users see there
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">Current Workspace</strong> —
                  the active tab or work area the user is viewing.
                </span>,
                <span key="2">
                  <strong className="text-blue-500">Access Tier</strong> — user
                  plan status such as Guest, Standard, Silver, Premium, or
                  Admin.
                </span>,
                <span key="3">
                  <strong className="text-blue-500">Betslip Summary</strong> —
                  current number of selected matches against allowed limit.
                </span>,
                <span key="4">
                  <strong className="text-blue-500">Account Summary</strong> —
                  current account plan.
                </span>,
              ]}
            />
          </div>

          <NoteBox darkMode={darkMode} tone="emerald">
            <strong>Silver users:</strong> can now access the Home / Dashboard
            tab.
          </NoteBox>
        </Card>
      </section>

      {/* 5 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          5. Explore Matches Manual
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-8">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Purpose
            </h3>
            <Paragraph darkMode={darkMode}>
              Explore is the match-discovery workspace where users search,
              filter, sort, and narrow match opportunities.
            </Paragraph>
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Main controls
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">Search</strong> — find
                  matches, leagues, markets, or labels quickly.
                </span>,
                <span key="2">
                  <strong className="text-blue-500">Date filter</strong> — limit
                  matches to a selected date or range.
                </span>,
                <span key="3">
                  <strong className="text-blue-500">League filter</strong> —
                  show only selected competitions.
                </span>,
                <span key="4">
                  <strong className="text-blue-500">Market filter</strong> —
                  show only prediction types such as 1X2, BTTS, Over/Under.
                </span>,
                <span key="5">
                  <strong className="text-blue-500">Sort</strong> — reorder the
                  result list by date, league, or selected metric.
                </span>,
                <span key="6">
                  <strong className="text-blue-500">Chance threshold</strong> —
                  minimum probability needed before a match is shown.
                </span>,
                <span key="7">
                  <strong className="text-blue-500">Rating threshold</strong> —
                  minimum internal quality score needed before a match is shown.
                </span>,
              ]}
            />
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Important definitions
            </h3>
            <Paragraph darkMode={darkMode}>
              <strong>Chance threshold:</strong> filters out matches below the
              selected model probability.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Rating threshold:</strong> filters out matches below the
              selected model quality score.
            </Paragraph>
          </div>

          <NoteBox darkMode={darkMode} tone="amber">
            Best workflow: narrow by <strong>Date</strong>,{" "}
            <strong>Leagues</strong>, and <strong>Markets</strong> first, then
            raise thresholds to make the list more selective.
          </NoteBox>
        </Card>
      </section>

      {/* 6 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          6. Match Card Manual
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-8">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              What a Match Card shows
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">Primary pick</strong> — the
                  main suggested selection for the match.
                </span>,
                <span key="2">
                  <strong className="text-blue-500">Market Context</strong> —
                  dynamic display of odds and exact Value Edge (+EV)
                  calculations for the primary market (e.g. 1X2, BTTS,
                  Over/Under).
                </span>,
                <span key="3">
                  <strong className="text-blue-500">Chance</strong> —
                  probability for the active pick.
                </span>,
                <span key="4">
                  <strong className="text-blue-500">Rating</strong> — internal
                  score measuring quality and confidence.
                </span>,
                <span key="5">
                  <strong className="text-blue-500">Band</strong> — rating tier
                  such as Low, Medium, or High.
                </span>,
                <span key="6">
                  <strong className="text-blue-500">VIP score</strong> — a
                  composite score used to summarize the match opportunity.
                </span>,
                <span key="7">
                  <strong className="text-blue-500">Value tag</strong> — label
                  such as Edge, Solid, or Value based on VIP score.
                </span>,
                <span key="8">
                  <strong className="text-blue-500">Predicted score</strong> —
                  model scoreline projection.
                </span>,
                <span key="9">
                  <strong className="text-blue-500">Strength</strong> — pick
                  classification such as Strong, Good, or Risky.
                </span>,
                <span key="10">
                  <strong className="text-blue-500">Compare Stats</strong> —
                  opens team comparison analysis.
                </span>,
                <span key="11">
                  <strong className="text-blue-500">Match Details</strong> —
                  hidden section revealing expanded goal probability ladders
                  (O/U 1.5, 2.5, 3.5), comprehensive Market Edge Hub, and deep
                  AI logic.
                </span>,
              ]}
            />
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              How some match-card values are calculated
            </h3>
            <Paragraph darkMode={darkMode}>
              <strong>VIP score:</strong> usually displayed as a weighted blend
              of chance and rating. In your current logic, one common formula
              used is:
            </Paragraph>
            <div className="mb-4">
              <Formula darkMode={darkMode}>
                VIP Score = Chance × 0.6 + Rating × 0.4
              </Formula>
            </div>

            <Paragraph darkMode={darkMode}>
              <strong>Value Tag:</strong>
            </Paragraph>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong>80+</strong> = Value
                </span>,
                <span key="2">
                  <strong>70+</strong> = Solid
                </span>,
                "Below that = Edge",
              ]}
            />

            <Paragraph darkMode={darkMode} className="mt-6">
              <strong>Value Edge:</strong> compares model probability to market
              implied probability.
            </Paragraph>
            <div className="mb-4">
              <Formula darkMode={darkMode}>
                Value Edge = (model prob / 100 − 1 / odds) × 100
              </Formula>
            </div>

            <Paragraph darkMode={darkMode} className="mt-6">
              <strong>Double Chance Odds:</strong> derived mathematically by
              removing margin from the 1X2 market odds and applying a standard
              5% vig.
            </Paragraph>
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Predicted score access
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                "Guest / Free: hidden",
                "Silver: visible",
                "Premium: visible",
                "Admin: visible",
              ]}
            />

            <h3
              className={cn(
                "text-lg font-black mb-3 mt-6",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Market Edge Hub access
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                "Guest / Free: basic odds locked, +EV visualizer hidden",
                "Silver: visible",
                "Premium: visible",
                "Admin: visible",
              ]}
            />

            <h3
              className={cn(
                "text-lg font-black mb-3 mt-6",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              AI Insight access
            </h3>
            <BulletList
              darkMode={darkMode}
              items={["Silver: locked", "Premium: unlocked", "Admin: unlocked"]}
            />
          </div>
        </Card>
      </section>

      {/* 7 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          7. Team Comparison Modal Manual
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-6">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Purpose
            </h3>
            <Paragraph darkMode={darkMode}>
              The Team Comparison Modal is the premium match-specific comparison
              window opened from a match card. It allows users to compare the
              two teams inside that specific fixture.
            </Paragraph>
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Tabs inside the modal
            </h3>
            <DataTable
              darkMode={darkMode}
              headers={["Tab", "Meaning", "Access"]}
              rows={COMPARISON_MODAL_ROWS}
            />
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Important comparison concepts
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">PPG:</strong> Points Per
                  Game.
                </span>,
                <span key="2">
                  <strong className="text-blue-500">BTTS %:</strong> Both Teams
                  To Score probability pattern.
                </span>,
                <span key="3">
                  <strong className="text-blue-500">Over 2.5 %:</strong>{" "}
                  likelihood of 3 or more total goals.
                </span>,
                <span key="4">
                  <strong className="text-blue-500">Clean Sheet %:</strong> how
                  often a team does not concede.
                </span>,
                <span key="5">
                  <strong className="text-blue-500">Failed To Score %:</strong>{" "}
                  how often a team does not score.
                </span>,
              ]}
            />
          </div>
        </Card>
      </section>

      {/* 8 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          8. Team Compare Workspace Manual
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-8">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Purpose
            </h3>
            <Paragraph darkMode={darkMode}>
              Team Compare is the app’s cross-league comparison lab. It lets a
              user pick any two teams and compare them through normalized table
              strength, form, scoring environment, market support, scoreline
              clarity, and explainable AI outputs.
            </Paragraph>
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Access level
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                "Free: no access",
                "Silver: full access",
                "Premium: full access",
                "Admin: full access",
              ]}
            />
            <NoteBox darkMode={darkMode} tone="blue">
              Team Compare itself is now a <strong>Silver+</strong> feature. If
              access is denied, the workspace shows an upgrade prompt.
            </NoteBox>
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Selection workflow
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">
                    Team A and Team B panels
                  </strong>{" "}
                  — each side uses cascading Country → League → Team selectors.
                </span>,
                <span key="2">
                  <strong className="text-blue-500">
                    Smart reset behavior
                  </strong>{" "}
                  — changing country resets league and team; changing league
                  resets team.
                </span>,
                <span key="3">
                  <strong className="text-blue-500">Clear button</strong> — each
                  panel can clear current selection without affecting the other
                  side.
                </span>,
                <span key="4">
                  <strong className="text-blue-500">Live preview</strong> —
                  chosen team, country, and league shown inside selection card.
                </span>,
              ]}
            />
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Core Team Compare metrics
            </h3>
            <Paragraph darkMode={darkMode}>
              <strong>Attack Score:</strong> blended from goals scored, model
              goals-for, prediction chance, rating, over-goals support, xG
              environment, failed-to-score resistance, and win support.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Defense Score:</strong> blended from goals conceded, model
              goals-against, clean sheets, BTTS suppression, concession control,
              and defensive stability.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Control Score:</strong> built from points per game, win
              rate, recent form quality, form-points average, and team win model
              support.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Momentum Score:</strong> recent-form quality score that
              leans more heavily on current form, form-points average, chance,
              rating, and win support.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Market Trust Score:</strong> how strongly market-backed
              win probability, chance, rating, 1X2 alignment, and scoreline
              confidence agree with a side.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Stability Score:</strong> measures structural resistance
              to chaotic matches using defense, control, clean sheets,
              failed-to-score resistance, loss avoidance, and BTTS control.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Scoreline Clarity:</strong> rates how clearly the model
              points toward a narrow correct-score corridor.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Overall Model Score:</strong> weighted blend of attack,
              defense, control, momentum, market trust, and stability.
            </Paragraph>
          </div>

          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              AI Matchup Verdict meanings
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">Stronger Side</strong> — the
                  team with the better normalized composite profile.
                </span>,
                <span key="2">
                  <strong className="text-blue-500">Confidence</strong> — how
                  strong the edge looks after combining metrics.
                </span>,
                <span key="3">
                  <strong className="text-blue-500">Goals Lean</strong> — main
                  total-goals angle (Over/Under).
                </span>,
                <span key="4">
                  <strong className="text-blue-500">Scoreline Zone</strong> —
                  most natural result corridor.
                </span>,
                <span key="5">
                  <strong className="text-blue-500">Clean-Sheet Lean</strong> —
                  win-to-nil / shutout threat.
                </span>,
                <span key="6">
                  <strong className="text-blue-500">Safer Angle</strong> —
                  lower-variance market interpretation.
                </span>,
                <span key="7">
                  <strong className="text-blue-500">Aggressive Angle</strong> —
                  higher-upside, higher-variance version of the read.
                </span>,
              ]}
            />
          </div>

          <NoteBox darkMode={darkMode} tone="amber">
            If the verdict says <strong>Too close to call</strong>, direct 1X2
            bets deserve extra caution. In those spots, wider cover markets such
            as Draw No Bet, Double Chance, Under 3.5, or BTTS/Over 1.5 style
            cover are usually safer.
          </NoteBox>
        </Card>
      </section>

      {/* 9 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          9. Premium Intelligence Manual
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-6">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Purpose
            </h3>
            <Paragraph darkMode={darkMode}>
              Premium Intelligence is the deepest match explanation layer in the
              app. It combines structured stats, recent form, H2H, Poisson-style
              goal logic, simulation, and narrative explanation.
            </Paragraph>
          </div>
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Access
            </h3>
            <BulletList
              darkMode={darkMode}
              items={["Silver: locked", "Premium: unlocked", "Admin: unlocked"]}
            />
          </div>
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Calculations
            </h3>
            <div className="mb-4">
              <Formula darkMode={darkMode}>Fair Odds = 1 / probability</Formula>
            </div>
            <Paragraph darkMode={darkMode}>
              <strong>Suggested max stake:</strong> Uses a conservative capped
              Kelly-style logic based on probability strength and confidence.
            </Paragraph>
            <Paragraph darkMode={darkMode}>
              <strong>Monte Carlo simulation:</strong> Repeated scoreline
              sampling is used to estimate likely outcomes.
            </Paragraph>
          </div>
        </Card>
      </section>

      {/* 10 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={Zap}>
          10. Auto Pick Manual
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-6">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Purpose
            </h3>
            <Paragraph darkMode={darkMode}>
              Auto Pick builds a suggested betslip automatically from selected
              filters.
            </Paragraph>
          </div>
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Access
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                "Silver: no access",
                "Premium: full access",
                "Admin: full access",
              ]}
            />
            <NoteBox darkMode={darkMode} tone="rose">
              <strong>Important:</strong> Silver users may access the Home tab,
              but <strong>Auto Pick remains Premium/Admin only</strong>.
            </NoteBox>
          </div>
        </Card>
      </section>

      {/* 11 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          11. Betslip Manual
        </SectionTitle>
        <Card darkMode={darkMode}>
          <h3
            className={cn(
              "text-lg font-black mb-3",
              darkMode ? "text-white" : "text-gray-900"
            )}
          >
            Purpose
          </h3>
          <Paragraph darkMode={darkMode}>
            The Betslip is where users collect selected matches and define the
            exact market and option to be used.
          </Paragraph>
          <BulletList
            darkMode={darkMode}
            items={[
              "Add a match from cards, Home tab, VIP, or shared ticket selections",
              "Select a market and option",
              "Review chosen odds",
              "Save or track tickets",
            ]}
          />
        </Card>
      </section>

      {/* 12 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          12. VIP Picks Manual
        </SectionTitle>
        <Card darkMode={darkMode}>
          <h3
            className={cn(
              "text-lg font-black mb-3",
              darkMode ? "text-white" : "text-gray-900"
            )}
          >
            Purpose
          </h3>
          <Paragraph darkMode={darkMode}>
            VIP Picks show curated, high-signal opportunities ranked using
            chance, rating, and model strength.
          </Paragraph>
          <BulletList
            darkMode={darkMode}
            items={[
              <span key="1">
                <strong className="text-blue-500">VIP score:</strong> composite
                ranking score used to sort picks.
              </span>,
              <span key="2">
                <strong className="text-blue-500">Market rating:</strong> degree
                to which market-specific stats support the chosen angle.
              </span>,
            ]}
          />
        </Card>
      </section>

      {/* 13 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          13. Performance Tracker Manual
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-6">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Purpose
            </h3>
            <Paragraph darkMode={darkMode}>
              Performance Tracker helps users monitor ticket outcomes, wallet
              balance, stake, return, profit, ROI, shared tickets, and market
              behavior over time.
            </Paragraph>
          </div>
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Status meanings
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">Pending</strong> — result
                  not settled yet.
                </span>,
                <span key="2">
                  <strong className="text-emerald-500">Won</strong> — prediction
                  or ticket succeeded.
                </span>,
                <span key="3">
                  <strong className="text-rose-500">Lost</strong> — prediction
                  or ticket failed.
                </span>,
                <span key="4">
                  <strong className="text-gray-500">Void</strong> — selection
                  removed from outcome result.
                </span>,
              ]}
            />
          </div>
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Important formulas
            </h3>
            <div className="mb-3">
              <Formula darkMode={darkMode}>
                Potential Return = Stake × Total Odds
              </Formula>
            </div>
            <div className="mb-3">
              <Formula darkMode={darkMode}>
                Net Profit = Total Returns − Total Stake
              </Formula>
            </div>
            <div>
              <Formula darkMode={darkMode}>
                ROI = (Net Profit / Total Stake) × 100
              </Formula>
            </div>
          </div>
        </Card>
      </section>

      {/* 14 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          14. Shared Ticket Manual
        </SectionTitle>
        <Card darkMode={darkMode}>
          <Paragraph darkMode={darkMode}>
            Shared Ticket allows a user to open a ticket using a ticket ID and
            review the selections.
          </Paragraph>
          <Paragraph darkMode={darkMode}>
            Only tickets marked as shared should be available to non-owners.
          </Paragraph>
        </Card>
      </section>

      {/* 15 & 16 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={ShieldCheck}>
          15. & 16. Access Rules Summaries
        </SectionTitle>
        <div className="space-y-8">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Compare Access
            </h3>
            <DataTable
              darkMode={darkMode}
              headers={["Feature", "Free", "Silver", "Premium", "Admin"]}
              rows={COMPARE_ACCESS_ROWS}
            />
          </div>
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Home Tab & Auto Pick Access
            </h3>
            <DataTable
              darkMode={darkMode}
              headers={[
                "Feature",
                "Guest / Free",
                "Silver",
                "Premium",
                "Admin",
              ]}
              rows={HOME_AUTOPICK_ROWS}
            />
          </div>
        </div>
      </section>

      {/* 17 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={BookOpen}>
          17. Common Terms Glossary
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Betting Terms
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">1X2</strong> — Home win,
                  Draw, or Away win.
                </span>,
                <span key="2">
                  <strong className="text-blue-500">BTTS</strong> — Both Teams
                  To Score.
                </span>,
                <span key="3">
                  <strong className="text-blue-500">Over 2.5</strong> — 3 or
                  more total goals.
                </span>,
                <span key="4">
                  <strong className="text-blue-500">Under 2.5</strong> — 2 or
                  fewer total goals.
                </span>,
                <span key="5">
                  <strong className="text-blue-500">Double Chance</strong> —
                  covers two 1X2 outcomes.
                </span>,
              ]}
            />
          </Card>

          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Model Terms
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                <span key="1">
                  <strong className="text-blue-500">Chance</strong> — estimated
                  probability.
                </span>,
                <span key="2">
                  <strong className="text-blue-500">Rating</strong> — internal
                  confidence score.
                </span>,
                <span key="3">
                  <strong className="text-blue-500">Value edge</strong> — model
                  advantage over market implied probability.
                </span>,
                <span key="4">
                  <strong className="text-blue-500">Momentum Score</strong> —
                  recent-form quality and directional strength.
                </span>,
              ]}
            />
          </Card>
        </div>
      </section>

      {/* 18 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={ShieldCheck}>
          18. Best Workflows by User Type
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card darkMode={darkMode}>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              Silver Workflow
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                "Use Home tab for summary access.",
                "Use Explore with advanced filters and thresholds.",
                "Use Compare for recent form and H2H.",
                "Use Team Compare workspace for cross-team review.",
              ]}
            />
          </Card>

          <Card
            darkMode={darkMode}
            className={
              darkMode
                ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20"
                : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
            }
          >
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-amber-400" : "text-amber-700"
              )}
            >
              Premium Workflow
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                "Start from Home tab.",
                "Use Auto Pick for fast workflow building.",
                "Use Compare Intelligence for premium explanations.",
                "Use AI Insight in match cards.",
              ]}
            />
          </Card>
        </div>
      </section>

      {/* 19 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={AlertTriangle}>
          19. Troubleshooting Guide
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-6">
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              If a feature looks locked unexpectedly
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                "Check your current plan badge.",
                "Refresh the page.",
                "Log out and back in if needed.",
              ]}
            />
          </div>
          <div>
            <h3
              className={cn(
                "text-lg font-black mb-3",
                darkMode ? "text-white" : "text-gray-900"
              )}
            >
              If Compare does not load
            </h3>
            <BulletList
              darkMode={darkMode}
              items={[
                "Check whether your account plan is Silver, Premium, or Admin.",
                "Make sure Team A and Team B each have Country, League, and Team selected.",
                "If league context looks incomplete, wait for league-table loading to finish or refresh the page.",
              ]}
            />
          </div>
        </Card>
      </section>

      {/* 20 */}
      <section>
        <SectionTitle darkMode={darkMode} icon={Zap}>
          20. Upgrade Guidance Summary
        </SectionTitle>
        <Card darkMode={darkMode} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3
                className={cn(
                  "text-lg font-black mb-3",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                Why upgrade to Silver?
              </h3>
              <BulletList
                darkMode={darkMode}
                items={[
                  "Home tab access",
                  "Team Compare workspace and built-in guide",
                  "AI Matchup Lab verdicts and premium edge dashboard",
                ]}
              />
            </div>
            <div>
              <h3
                className={cn(
                  "text-lg font-black mb-3",
                  darkMode ? "text-white" : "text-gray-900"
                )}
              >
                Why upgrade to Premium?
              </h3>
              <BulletList
                darkMode={darkMode}
                items={[
                  "AI Insight in match cards",
                  "Premium Intelligence",
                  "Auto Pick",
                  "Full elite workflow and deeper explanation layers",
                  "Algorithmic Sandbox access",
                ]}
              />
            </div>
          </div>
          <NoteBox darkMode={darkMode} tone="emerald">
            <strong>Simple rule:</strong> If you want better filtering and
            comparison depth, Silver is enough. If you want AI explanations,
            Auto Pick, the Algorithmic Sandbox, and the full high-end workflow,
            Premium is the right upgrade.
          </NoteBox>
        </Card>
      </section>

      {/* Footer */}
      <div
        className={cn(
          "mt-16 pt-8 border-t text-center text-xs font-bold uppercase tracking-widest",
          darkMode
            ? "border-white/10 text-gray-600"
            : "border-gray-200 text-gray-400"
        )}
      >
        <p>FutureBet Manual — Official System Documentation</p>
      </div>
    </div>
  );
}