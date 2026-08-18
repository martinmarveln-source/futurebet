// @ts-nocheck
import { create } from "zustand";
import { persist } from "zustand/middleware";

let __fbTicketCounter = 0;

function makeTicketId() {
  __fbTicketCounter = (__fbTicketCounter + 1) % 100000;
  const ts = Date.now().toString(36).toUpperCase();

  let rand = "";
  try {
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.getRandomValues
    ) {
      const arr = new Uint32Array(3);
      window.crypto.getRandomValues(arr);
      rand = Array.from(arr, (n) => n.toString(36).toUpperCase()).join("");
    } else {
      rand = Math.random().toString(36).slice(2).toUpperCase();
    }
  } catch {
    rand = Math.random().toString(36).slice(2).toUpperCase();
  }

  const ctr = __fbTicketCounter.toString(36).toUpperCase().padStart(3, "0");
  return `FB-${ts}-${ctr}-${rand.slice(0, 10)}`;
}

function normalizeName(s) {
  return String(s || "").trim();
}

function normalizeCompare(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

/* ====================================================
   🔥 SYSTEM BET COMBINATORICS HELPERS
==================================================== */
function nCr(n, r) {
  if (r > n) return 0;
  let res = 1;
  for (let i = 1; i <= r; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return Math.round(res);
}

function getStoreCombinations(arr, k) {
  if (k === 1) return arr.map((item) => [item]);
  const combos = [];
  arr.forEach((item, index) => {
    const smaller = getStoreCombinations(arr.slice(index + 1), k - 1);
    smaller.forEach((combo) => combos.push([item, ...combo]));
  });
  return combos;
}

/* ====================================================
   🔥 THE MASTER MATH ENGINE 
==================================================== */

function toProbPercent(v) {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace("%", "").trim();
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

function probToOdds(probPercent) {
  const p = Math.max(1, Math.min(99, Number(probPercent) || 1));
  return Number((100 / p).toFixed(2));
}

function poissonPMF(k, lambda) {
  if (k < 0) return 0;
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

function poissonOverK(lambda, kInclusiveMax) {
  let s = 0;
  for (let i = 0; i <= kInclusiveMax; i++) s += poissonPMF(i, lambda);
  return 1 - s;
}

function inferLambdaFromOver25(pOver25) {
  const target = Math.max(0.001, Math.min(0.999, pOver25));
  let lo = 0.05,
    hi = 7.0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const p = poissonOverK(mid, 2);
    if (p < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function inferLambdaSafely(match, ov25Pct) {
  if (ov25Pct > 0) return inferLambdaFromOver25(ov25Pct / 100);
  const avg = Number(match?.avg);
  if (Number.isFinite(avg) && avg > 0) return avg;
  const hgs = Number(match?.hgs),
    ags = Number(match?.ags);
  if (Number.isFinite(hgs) && Number.isFinite(ags) && hgs + ags > 0)
    return hgs + ags;
  return 2.5;
}

function parseScore(opt) {
  const s = String(opt || "").trim();
  const parts = s.split("-");
  if (parts.length !== 2) return null;
  const a = Number(parts[0]),
    b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

function calculatePoissonMarketProbs(m) {
  const hgs = Number(m?.hgs) > 0 ? Number(m.hgs) : 1.2;
  const hgc = Number(m?.hgc) > 0 ? Number(m.hgc) : 1.2;
  const ags = Number(m?.ags) > 0 ? Number(m.ags) : 1.1;
  const agc = Number(m?.agc) > 0 ? Number(m.agc) : 1.3;

  const lambdaH = Math.max(0.05, Math.min(4.5, (hgs + agc) / 2));
  const lambdaA = Math.max(0.05, Math.min(4.5, (ags + hgc) / 2));

  let pHome = 0,
    pDraw = 0,
    pAway = 0,
    pBTTS = 0,
    pO25 = 0;
  for (let i = 0; i <= 6; i++) {
    const pi = poissonPMF(i, lambdaH);
    for (let j = 0; j <= 6; j++) {
      const pj = poissonPMF(j, lambdaA);
      const pij = pi * pj;
      if (i > j) pHome += pij;
      else if (i === j) pDraw += pij;
      else pAway += pij;
      if (i + j >= 3) pO25 += pij;
      if (i > 0 && j > 0) pBTTS += pij;
    }
  }
  return { home: pHome, draw: pDraw, away: pAway, btts: pBTTS, o25: pO25 };
}

export function getRealOdds(match, market, option) {
  if (!match || !market || !option) return null;

  const mkt = String(market).trim();
  const opt = String(option).trim();

  // Try direct odds from sheet first!
  let directOdds = null;
  if (mkt === "1X2") {
    if (opt === "Home") directOdds = match.homeOdds ?? match.home_odds;
    if (opt === "Draw") directOdds = match.drawOdds ?? match.draw_odds;
    if (opt === "Away") directOdds = match.awayOdds ?? match.away_odds;
  } else if (mkt === "Double Chance") {
    if (opt === "Home or Draw") directOdds = match.dc1X;
    if (opt === "Home or Away") directOdds = match.dc12;
    if (opt === "Draw or Away") directOdds = match.dcX2;
  } else if (mkt === "BTTS") {
    if (opt === "Yes") directOdds = match.bttsYesOdds ?? match.btts_yes_odds;
    if (opt === "No") directOdds = match.bttsNoOdds ?? match.btts_no_odds;
  } else if (mkt === "Over 2.5" || mkt === "O/U 2.5") {
    if (opt === "Yes" || opt === "Over 2.5") directOdds = match.o25Odds ?? match.o25_odds;
    if (opt === "No" || opt === "Under 2.5") directOdds = match.u25Odds ?? match.u25_odds;
  } else if (mkt === "Over 1.5") {
    if (opt === "Yes") directOdds = match.o15Odds ?? match.o15_odds;
    if (opt === "No") directOdds = match.u15Odds ?? match.u15_odds;
  } else if (mkt === "Over 3.5") {
    if (opt === "Yes") directOdds = match.o35Odds ?? match.o35_odds;
    if (opt === "No") directOdds = match.u35Odds ?? match.u35_odds;
  } else if (mkt === "Over 4.5") {
    if (opt === "Yes") directOdds = match.o45Odds ?? match.o45_odds;
    if (opt === "No") directOdds = match.u45Odds ?? match.u45_odds;
  }

  const dOdds = Number(directOdds);
  if (Number.isFinite(dOdds) && dOdds > 1) {
    return Number(dOdds.toFixed(2));
  }

  const rawOdds = Number(match?.odds);
  if (Number.isFinite(rawOdds) && rawOdds > 1) {
    return Number(rawOdds.toFixed(2));
  }

  return null;
}

function deriveMasterOdds(match, market, option) {
  const realOdds = getRealOdds(match, market, option);
  if (realOdds) return realOdds;

  const mkt = String(market).trim();
  const opt = String(option).trim();

  // Fallback to converting sheet probabilities to exact odds
  const home = toProbPercent(match.homeWin ?? match.home ?? match.hWin);
  const draw = toProbPercent(match.draw ?? match.hDraw);
  const away = toProbPercent(match.awayWin ?? match.away ?? match.aWin);
  const gg = toProbPercent(match.gg ?? match.btts);
  const ng = toProbPercent(match.ng);
  const ov25 = toProbPercent(match.ov25 ?? match.hOv2);
  const un25 = toProbPercent(match.un25);

  let prob = null;

  if (mkt === "1X2") {
    if (opt === "Home") prob = home;
    if (opt === "Draw") prob = draw;
    if (opt === "Away") prob = away;
  } else if (mkt === "Double Chance") {
    if (opt === "Home or Draw") prob = home + draw;
    if (opt === "Home or Away") prob = home + away;
    if (opt === "Draw or Away") prob = draw + away;
  } else if (mkt === "BTTS") {
    if (opt === "Yes") prob = gg > 0 ? gg : ng > 0 ? 100 - ng : 0;
    if (opt === "No") prob = ng > 0 ? ng : gg > 0 ? 100 - gg : 0;
  } else if (mkt === "Over 2.5" || mkt === "O/U 2.5") {
    if (opt === "Yes" || opt === "Over 2.5")
      prob = ov25 > 0 ? ov25 : un25 > 0 ? 100 - un25 : 0;
    if (opt === "No" || opt === "Under 2.5")
      prob = un25 > 0 ? un25 : ov25 > 0 ? 100 - ov25 : 0;
  } else if (mkt === "Over 1.5") {
    const direct = toProbPercent(match.ov15 ?? match.over15 ?? match.o15);
    if (direct > 0) prob = opt === "Yes" ? direct : 100 - direct;
  } else if (mkt === "Over 3.5") {
    const direct = toProbPercent(match.ov35 ?? match.over35 ?? match.o35);
    if (direct > 0) prob = opt === "Yes" ? direct : 100 - direct;
  } else if (mkt === "Over 4.5") {
    const direct = toProbPercent(match.ov45 ?? match.over45 ?? match.o45);
    if (direct > 0) prob = opt === "Yes" ? direct : 100 - direct;
  }

  if (prob && prob > 0) return probToOdds(prob);

  const rawOdds = Number(match?.odds);
  if (Number.isFinite(rawOdds) && rawOdds > 1)
    return Number(rawOdds.toFixed(2));

  return null;
}

const MONTH_MAP = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function isISODate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function parseSheetDateToISO(dateStr) {
  const raw = String(dateStr || "").trim();
  if (!raw) return "";
  if (isISODate(raw)) return raw;

  const parts = raw.split("-");
  if (parts.length !== 2) return "";

  const day = Number(parts[0]);
  const monStr = String(parts[1] || "").trim();
  const monthIdx = MONTH_MAP[monStr];

  if (!Number.isFinite(day) || monthIdx === undefined) return "";

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  let year = currentYear;
  if (monthIdx < currentMonthIdx) year = currentYear + 1;

  const dt = new Date(year, monthIdx, day);
  if (Number.isNaN(dt.getTime())) return "";

  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeResult(r) {
  const v = String(r || "")
    .toLowerCase()
    .trim();
  if (v === "won" || v === "lost" || v === "void") return v;
  return "pending";
}

function computeTicketStatus(selections = []) {
  if (!selections.length) return "pending";
  const r = selections.map((m) => normalizeResult(m.result));
  if (r.includes("lost")) return "lost";
  const allDecided = r.every((x) => x === "won" || x === "void");
  if (!allDecided) return "pending";
  const anyWon = r.some((x) => x === "won");
  return anyWon ? "won" : "void";
}

function computeTicketTotalOdds(selections = []) {
  let total = 1;
  for (const s of selections) {
    if (normalizeResult(s.result) === "void") continue;
    const o = Number(s.odds);
    if (Number.isFinite(o) && o > 0) total *= o;
  }
  return total > 1 ? Number(total.toFixed(2)) : null;
}

function inferSelectionFromVip(m = {}) {
  const marketRaw = String(
    m.market || m.marketLabel || m.tipMarket || ""
  ).toLowerCase();
  const selRaw = String(
    m.selection || m.pick || m.pickLabel || ""
  ).toLowerCase();

  if (marketRaw.includes("1x2")) {
    if (selRaw.includes("home"))
      return { selectedMarket: "1X2", selectedOption: "Home" };
    if (selRaw.includes("draw"))
      return { selectedMarket: "1X2", selectedOption: "Draw" };
    if (selRaw.includes("away"))
      return { selectedMarket: "1X2", selectedOption: "Away" };
  }
  if (marketRaw.includes("btts")) {
    if (selRaw.includes("yes"))
      return { selectedMarket: "BTTS", selectedOption: "Yes" };
    if (selRaw.includes("no"))
      return { selectedMarket: "BTTS", selectedOption: "No" };
  }
  if (marketRaw.includes("2.5")) {
    if (selRaw.includes("under"))
      return { selectedMarket: "Over 2.5", selectedOption: "No" };
    if (selRaw.includes("over"))
      return { selectedMarket: "Over 2.5", selectedOption: "Yes" };
  }
  return null;
}

function ensureMatchShape(m = {}) {
  const match = normalizeName(m.match);
  const league = String(m.league || "");
  const country = String(m.country || "");

  const dateRaw = String(m.dateRaw || m.date || "").trim();
  const dateISO =
    String(m.dateISO || m.date_iso || "").trim() ||
    parseSheetDateToISO(dateRaw);
  const time = String(m.time || "").trim();
  const ftScore = String(m.ftScore || m.actual_result || "").trim();

  let selectedMarket = m.selectedMarket ?? null;
  let selectedOption = m.selectedOption ?? null;

  if (!selectedMarket || !selectedOption) {
    const inferred = inferSelectionFromVip(m);
    if (inferred?.selectedMarket && !selectedMarket)
      selectedMarket = inferred.selectedMarket;
    if (inferred?.selectedOption && !selectedOption)
      selectedOption = inferred.selectedOption;
  }

  // Preserve existing odds from the payload if they exist
  const oddsNum = Number(m.odds);
  let odds = Number.isFinite(oddsNum) && oddsNum > 0 ? oddsNum : null;

  // Only run the math engine if we don't have valid odds yet
  if (!odds && selectedMarket && selectedOption) {
    odds = deriveMasterOdds(m, selectedMarket, selectedOption);
  }

  return {
    ...m,
    match,
    league,
    country,
    dateRaw,
    dateISO,
    time,
    ftScore,
    odds,
    selectedMarket,
    selectedOption,
  };
}

/* ====================================================
   ZUSTAND STORE 
==================================================== */
const useBetslipStore = create(
  persist(
    (set, get) => ({
      computeOddsForSelection: (match, market, option) =>
        deriveMasterOdds(match, market, option),

      matches: [],
      maxMatches: 20,
      stake: 1000,
      slipTitle: "",

      setSlipTitle: (title) => set({ slipTitle: title || "" }),

      setStakeAmount: (value) => {
        const n = Number(value);
        set({ stake: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 });
      },

      addMatch: (match = {}) => {
        const incoming = ensureMatchShape(match);
        if (!incoming.match || incoming.odds === null || incoming.odds === undefined) {
          console.warn("Blocked match from entering betslip due to missing/invalid odds:", match.match);
          return false;
        }

        let added = false;
        set((state) => {
          // 2. Define the unique identifier for this match
          const matchKey = normalizeCompare(incoming.match);

          // 3. Check if this exact match is ALREADY in the betslip array
          const alreadyExists = state.matches.some(
            (m) => normalizeCompare(m.match) === matchKey
          );

          // 4. STRICT DEDUPLICATION: If it exists, block it and return current state untouched.
          if (alreadyExists) {
            console.warn(
              `Blocked duplicate match from entering betslip: ${incoming.match}`
            );
            return state;
          }

          // 5. Enforce Maximum limit
          if (state.matches.length >= state.maxMatches) return state;

          // 6. If it is unique and fits, add it safely
          const newMatchData = {
            ...incoming,
            addedAt: new Date().toISOString(),
          };

          added = true;
          return { matches: [...state.matches, newMatchData] };
        });
        return added;
      },

      updateMatchSelection: (matchName, selectedMarket, selectedOption) => {
        const nameKey = normalizeCompare(matchName);
        set((state) => ({
          matches: state.matches.map((m) => {
            if (normalizeCompare(m.match) !== nameKey) return m;

            const nextMarket = selectedMarket ?? null;
            const nextOption = selectedOption ?? null;
            // If the user manually changes the market in the UI, we must recalculate the odds
            const nextOdds =
              nextMarket && nextOption
                ? deriveMasterOdds(m, nextMarket, nextOption)
                : null;

            return {
              ...m,
              selectedMarket: nextMarket,
              selectedOption: nextOption,
              odds: nextOdds,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      updateMatchFtScore: (matchName, ftScore) => {
        const nameKey = normalizeCompare(matchName);
        const score = String(ftScore || "").trim();
        set((state) => ({
          matches: state.matches.map((m) =>
            normalizeCompare(m.match) === nameKey
              ? { ...m, ftScore: score, updatedAt: new Date().toISOString() }
              : m
          ),
        }));
      },

      removeMatch: (matchName) => {
        const nameKey = normalizeCompare(matchName);
        set((state) => ({
          matches: state.matches.filter(
            (m) => normalizeCompare(m.match) !== nameKey
          ),
        }));
      },

      clearAll: () => set({ matches: [] }),

      isMatchInBetslip: (matchName) => {
        const nameKey = normalizeCompare(matchName);
        return get().matches.some((m) => normalizeCompare(m.match) === nameKey);
      },

      getMatchCount: () => get().matches.length,
      canAddMore: () => get().matches.length < get().maxMatches,

      tickets: [],

      trackThisBet: (systemStakes = null) => {
        const rawSlip = Array.isArray(get().matches) ? get().matches : [];
        if (!rawSlip.length) return { ok: false, reason: "empty" };
        if (rawSlip.some((m) => !m.selectedMarket || !m.selectedOption))
          return { ok: false, reason: "missing_selection" };

        const uniqueMatches = [];
        for (const m of rawSlip) {
          if (!uniqueMatches.some(x => normalizeCompare(x.match) === normalizeCompare(m.match))) {
            uniqueMatches.push(m);
          }
        }
        const slip = uniqueMatches.slice(0, 20);

        const fallbackStake = Number(get().stake);

        const stakesToProcess =
          systemStakes && Object.keys(systemStakes).length > 0
            ? systemStakes
            : { [slip.length]: fallbackStake };

        let expectedTickets = 0;
        Object.entries(stakesToProcess).forEach(([sizeStr, stakeVal]) => {
          if (Number(stakeVal) > 0) {
            expectedTickets += nCr(slip.length, Number(sizeStr));
          }
        });

        if (expectedTickets > 500) {
          return {
            ok: false,
            reason: "too_many_combinations",
            message: `This system bet generates ${expectedTickets} combinations. The tracking maximum is 500 at once to prevent server crashes.`,
          };
        }

        let totalBetsGenerated = 0;
        let lastTicketId = "";
        const newTickets = [];
        const createdAt = new Date().toISOString();

        Object.entries(stakesToProcess).forEach(([sizeStr, stakeVal]) => {
          const comboSize = Number(sizeStr);
          const stake = Number(stakeVal);
          if (!Number.isFinite(stake) || stake <= 0) return;

          const combos = getStoreCombinations(slip, comboSize);

          combos.forEach((combo) => {
            totalBetsGenerated++;
            const ticketId = makeTicketId();
            lastTicketId = ticketId;
            const selections = combo.map((m) => {
              const mm = ensureMatchShape(m);
              return {
                match: normalizeName(mm.match),
                league: mm.league || "",
                country: mm.country || "",
                match_date: mm.dateISO || "",
                dateRaw: mm.dateRaw || "",
                time: mm.time || "",
                ftScore: mm.ftScore || "",
                chance: mm.chance ?? null,
                rating: mm.rating ?? null,
                selectedMarket: mm.selectedMarket,
                selectedOption: mm.selectedOption,
                odds: mm.odds ?? null,
                result: "pending",
              };
            });

            const ticketTotalOdds = computeTicketTotalOdds(selections);

            newTickets.push({
              id: ticketId,
              createdAt,
              selections,
              stake,
              status: computeTicketStatus(selections),
              total_odds: ticketTotalOdds,
            });
          });
        });

        if (newTickets.length === 0)
          return { ok: false, reason: "invalid_stake" };

        set((state) => ({
          tickets: [...newTickets, ...(state.tickets || [])],
          matches: [],
        }));

        return {
          ok: true,
          ticketId:
            totalBetsGenerated > 1
              ? `${totalBetsGenerated} System Tickets`
              : lastTicketId,
        };
      },

      deleteTicket: (ticketId) =>
        set((state) => ({
          tickets: (state.tickets || []).filter((t) => t.id !== ticketId),
        })),

      updateTicketSelectionResult: (ticketId, matchName, result) => {
        const r = normalizeResult(result);
        const nameKey = normalizeCompare(matchName);

        set((state) => ({
          tickets: (state.tickets || []).map((t) => {
            if (t.id !== ticketId) return t;
            const selections = (t.selections || []).map((s) =>
              normalizeCompare(s.match) === nameKey ? { ...s, result: r } : s
            );
            return {
              ...t,
              selections,
              status: computeTicketStatus(selections),
            };
          }),
        }));
      },
    }),
    {
      name: "futurebet-betslip-storage",
      version: 2,
      migrate: (persistedState) => {
        try {
          const state = persistedState || {};
          const matches = Array.isArray(state.matches) ? state.matches : [];
          const tickets = Array.isArray(state.tickets) ? state.tickets : [];

          const uniqueMatches = [];
          for (const m of matches) {
            if (!uniqueMatches.some(x => normalizeCompare(x.match) === normalizeCompare(m.match))) {
              uniqueMatches.push(ensureMatchShape(m));
            }
          }

          return {
            ...state,
            matches: uniqueMatches.slice(0, 20),
            tickets: tickets.filter((t) => !Array.isArray(t.selections) || t.selections.length <= 20).map((t) => {
              const uniqueSelections = [];
              if (Array.isArray(t.selections)) {
                for (const s of t.selections) {
                  if (!uniqueSelections.some(x => normalizeCompare(x.match) === normalizeCompare(s.match))) {
                    uniqueSelections.push(s);
                  }
                }
              }

              return {
              ...t,
              selections: uniqueSelections.map((s) => {
                    const dateRaw = String(
                      s.dateRaw || s.date || s.match_date || ""
                    ).trim();
                    const iso =
                      String(s.match_date || "").trim() ||
                      String(s.dateISO || "").trim() ||
                      parseSheetDateToISO(dateRaw);
                    const oddsNum = Number(s.odds);
                    const odds =
                      Number.isFinite(oddsNum) && oddsNum > 0 ? oddsNum : null;

                    return {
                      ...s,
                      match: normalizeName(s.match),
                      league: String(s.league || ""),
                      match_date: iso || "",
                      dateRaw: dateRaw || "",
                      time: String(s.time || ""),
                      ftScore: String(s.ftScore || s.actual_result || ""),
                      result: normalizeResult(s.result),
                      odds,
                    };
                  })
              };
            }),
          };
        } catch {
          return persistedState;
        }
      },
      partialize: (state) => ({
        matches: state.matches,
        tickets: state.tickets,
        stake: state.stake,
      }),
    }
  )
);

export default useBetslipStore;