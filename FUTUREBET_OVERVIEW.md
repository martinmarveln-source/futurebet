# FutureBet — Comprehensive Product & Platform Guide

> **URL:** [futurebet.com.ng](https://futurebet.com.ng)  
> **Tagline:** Data-Driven Football Intelligence & AI BetSlip Engineering  
> **Platform Type:** Next.js Progressive Web App (PWA) with Serverless Intelligence & AI Analytics

---

## 1. Executive Summary

**FutureBet** is an AI-powered sports intelligence platform engineered to replace emotional betting and speculative gambling with quantitative statistics, algorithmic edge detection, and machine learning risk audits.

Traditional sports punters lose over 90% of their accumulator tickets due to **hidden statistical contradictions**—such as betting outright match winners (1X2) on volatile games, selecting Over 2.5 goals between low-scoring defensive teams, or falling into "away favourite" traps. FutureBet bridges the information asymmetry between bookmakers and punters by calculating true probabilities, identifying bookmaker mispricings (Value Edges), and automatically assembling optimized, correlated-risk-free betslips.

---

## 2. Core Value Proposition

| Traditional Betting | The FutureBet Edge |
| :--- | :--- |
| **Gut feeling & club bias** | **100+ quantitative metrics** per fixture (xG, H2H, Form $\Delta$, Clean Sheets) |
| **Outright 1X2 focus (high volatility)** | **Alternative market intelligence** (Over 1.5, BTTS, Double Chance, Clean Sheets) |
| **Unchecked accumulator slips** | **AI Slip Risk Audit** that flags statistical traps before real money is staked |
| **Blind flat/martingale staking** | **Fractional Kelly Criterion staking** to preserve long-term capital |
| **Hours of manual league table study** | **Global Stats Hub** indexing the top 1% trends globally with 1-click slip additions |

---

## 3. Key Modules & Features

### 3.1. Match Intelligence Dashboard
The main dashboard displays all upcoming fixtures across 50+ global leagues, enriched with real-time computational metrics:
- **Win / Draw / Away Probabilities:** Derived from proprietary historical Poisson and form models.
- **Goal Line Probabilities:** Individual percentages for Over/Under 1.5, 2.5, 3.5, and 4.5 goals.
- **Both Teams To Score (BTTS / GG):** Historical hit rates for home, away, and combined matchups.
- **Head-to-Head (H2H) Breakdown:** Recent game history showing win distributions, average goals, and clean sheet frequencies.
- **Form Momentum Delta ($\Delta$):** Comparative point and goal differentials over the last 5–6 matches to identify teams in rapid ascent or quiet decline.
- **Predicted Scorelines:** Most statistically probable exact scores paired with algorithmic confidence scores.

---

### 3.2. AI BetSlip Builder (`/api/ai-recommend-slip`)
An automated betslip generator powered by Gemini AI that builds optimized accumulators based on exact user preferences.
- **User Parameters:**
  - **Min / Max Matches:** Select from 2 to 15 legs.
  - **Min / Max Odds:** Set the target odds window per selection (e.g., 1.30 to 2.50).
  - **Target Date:** Filter for today's fixtures or specific match days.
- **100-Point Algorithmic Scoring Rubric:**
  - **Conviction Tier:** HIGH (+30 pts), MEDIUM (+15 pts), LOW (0 pts).
  - **Model Chance & Rating:** High statistical probability (+15 to +20 pts).
  - **H2H Support:** Chosen market verified by $\ge 60\%$ historical head-to-head hit rate (+15 pts).
  - **Form Edge:** Point differential $\Delta \ge 3$ (+10 pts); coin flips penalised ($-10$ pts).
  - **Value Edge:** Bookmaker mispricing bonus (+10 pts).
- **Anti-Correlation & Safety Rules:**
  - **No Duplicate Teams:** Ensures no club appears in multiple legs across the slip.
  - **League Diversity:** Caps selections at a maximum of 2 games per league to avoid localized upsets.
  - **No Contradictory Combos:** Blocks positive correlation traps (e.g., Home Win combined with BTTS Yes on low-scoring fixtures).

---

### 3.3. AI Slip Analyzer & Risk Detector (`/api/ai-slip-analysis`)
A pre-bet validation engine that acts as a financial risk audit on any slip the user creates:
- **Contradiction Detection:**
  - Flags Over 2.5 selections if combined average goals is $< 2.0$ or recent Over 2.5 rate is $< 40\%$.
  - Flags BTTS Yes if either team regularly fails to score or keeps frequent clean sheets.
  - Flags Home or Away outright picks if the opposing side holds superior form points and lower conceding rates.
- **Clear Verdicts:**
  - ⚠️ **Contradiction Warnings:** Explicitly quotes contradicting data points (e.g., *"Home team averages only 0.8 goals/game and away team kept 4 clean sheets in 5"*).
  - 🎯 **Solid Premium Confirmation:** Highlights data that strongly supports the picks.
  - ✅ **Final Actionable Verdict:** Clear status (*"Safe to lock in"*, *"Proceed with caution on Leg 3"*, or *"Too risky — reconsider Legs 2 and 4"*).

---

### 3.4. Global Stats Hub (`/stats/insights`)
A dedicated analytical screen indexing the top 1% performance outliers across world football:
- **Market Rankings:**
  - Best Over 1.5, Over 2.5, Over 3.5, and Over 4.5 teams
  - Best Under 1.5, Under 2.5, Under 3.5, and Under 4.5 teams
  - Best BTTS (Both Teams To Score) & Clean Sheet Fortresses
  - Strongest Home Teams & Dominant Away Teams
  - Highest Draw Tendencies
- **Interactive Filtering:** Filter by minimum games played (4, 5, 8, 10, 15, 20), Home/Away/Overall split, and minimum odds.
- **Trend Sparklines:** Inline interactive visual curves illustrating recent form trajectories.
- **1-Click Slip Toggle:**
  - Clicking `+` instantly queues the match and exact market into the persistent betslip.
  - Button dynamically turns into a green checkmark `✓` (or red `✕` on hover to remove).
  - Floating top tray displays all currently selected picks with 1-click removal and "Clear All" functionality.

---

### 3.5. System Bets & Staking Engine
- **Single & Accumulator Modes:** Instant transition from simple accumulators to complex combinations.
- **System Permutations:** Generates Trixie, Yankee, Canadian, Heinz, and Super Heinz permutations, allowing punters to guarantee payouts even if 1 or 2 matches fail.
- **Fractional Kelly Criterion Calculator:** Recommends precise stake sizing (capped at conservative 1–5% bankroll fractions) to protect against drawdown and eliminate emotional over-betting.

---

## 4. Technical Architecture

```mermaid
flowchart TD
    subgraph Data Sources
        GS[Google Sheets Live Master Data] -->|4h Cron Sync| MC[(Neon PostgreSQL Matches Cache)]
        LC[(League Table Cache)] --> MC
    end

    subgraph Backend Core (Next.js 16 / Node)
        MC --> IE[Intelligence & Pick Engine]
        IE --> API_M[/api/matches]
        IE --> API_S[/api/stats/insights]
        API_M --> REC[/api/ai-recommend-slip]
        API_M --> ANA[/api/ai-slip-analysis]
        REC --> GEMINI[Google Gemini AI Engine]
        ANA --> GEMINI
    end

    subgraph Client Application (React 19 / Tailwind)
        API_M --> DASH[Match Dashboard]
        API_S --> HUB[Global Stats Hub]
        REC --> MODAL[AI Slip Builder Modal]
        ANA --> AUDIT[AI Slip Risk Drawer]
        DASH --> STORE[(Zustand Persisted BetSlip)]
        HUB --> STORE
        MODAL --> STORE
    end
```

### Stack Details
- **Frontend:** Next.js 16.2.6 (App Router), React 19, Tailwind CSS v4, Lucide Icons, Recharts, Sonner Toasts.
- **State Management:** Zustand with client-side localStorage persistence for seamless betslip hydration.
- **Database & Hosting:** Serverless PostgreSQL (Neon Database) deployed on Railway with Nixpacks.
- **Authentication:** Better Auth with secure session cookies, Argon2 password hashing, IP rate limiting, and RBAC tiers (Free, VIP, Pro, Admin).
- **AI Integration:** Google Gemini REST API integration configured for structured JSON output and low-latency response cycles.

---

## 5. Typical User Journey

1. **Discovery:** The user visits [futurebet.com.ng](https://futurebet.com.ng) on their phone or desktop.
2. **Review High-Conviction Matches:** Scans the Dashboard for games tagged with `HIGH CONVICTION` and positive `ValueEdge`.
3. **Explore Alternative Markets:** Visits `/stats/insights` to identify consistent Over 1.5 or BTTS teams that bookies have underpriced.
4. **1-Click Assembly:** Taps the `+` button on 3 to 5 top picks, immediately populating the BetSlip tray.
5. **Auto-Generate with AI (Optional):** Opens the **AI Slip Builder**, sets desired odds (e.g., 2.0 to 4.0), and lets the AI curate the safest mathematical combination.
6. **Run Pre-Bet Audit:** Clicks **AI Analysis** to verify there are no hidden statistical traps, conflicting team news, or poor away records.
7. **Size the Bet:** Consults the AI Staking recommendation to stake a disciplined 2–5% of bankroll.
8. **Lock in & Win:** Copies the final ticket or booking code to their preferred sportsbook with maximum statistical confidence.

---

## 6. Project Directory Reference

For developers and contributors working on the codebase:
- `apps/web/src/app/api/ai-recommend-slip/route.ts` — Main AI slip recommendation engine.
- `apps/web/src/app/api/ai-slip-analysis/route.ts` — AI risk contradiction analysis engine.
- `apps/web/src/app/stats/insights/page.tsx` — Global Stats Hub with 1-click betslip toggle tray.
- `apps/web/src/utils/intelligenceEngine.ts` — Core quantitative scoring algorithms and conviction calculations.
- `apps/web/src/utils/pickEngine.ts` — Market recommendation derivation and real-odds resolution.
- `apps/web/src/store/betslipStore.ts` — Zustand store managing active betslip selections and state.
- `apps/web/src/lib/auth.ts` — Better Auth authentication and security layer.

---

*Document generated for FutureBet Platform Operations & Product Documentation.*
