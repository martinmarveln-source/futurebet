import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, AlertOctagon } from "lucide-react";

export const metadata = {
  title: "Disclaimer & Risk Disclosure - FutureBet",
  description: "Comprehensive legal disclaimer, risk disclosures, and non-liability terms for FutureBet.",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#030712] dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-10 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 mb-4">
            <AlertOctagon className="w-3.5 h-3.5" />
            MANDATORY LEGAL RISK DISCLOSURE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Disclaimer & Limitation of Liability
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Last Updated: November 2026 • Please read carefully before using any insights on this platform.
          </p>
        </div>

        {/* Critical Red Notice */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-950 dark:text-rose-200 flex items-start gap-3.5 mb-8">
          <ShieldAlert className="w-6 h-6 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <p className="font-bold text-rose-950 dark:text-rose-100 mb-1">
              IMPORTANT: FUTUREBET IS NOT A BOOKMAKER AND DOES NOT ACCEPT BETS.
            </p>
            <p>
              FutureBet is an independent statistical intelligence platform. All probability models, predictions, +EV ratings, and tip outputs are computational estimates for informational and entertainment use only. We accept ZERO liability for financial losses incurred on third-party bookmaker platforms.
            </p>
          </div>
        </div>

        <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              1. No Guarantees & Inherent Sports Variance
            </h2>
            <p className="mb-3">
              Sports are inherently variable, dynamic, and unpredictable. Random events such as refereeing decisions, red cards, weather conditions, player injuries, and psychological momentum cannot be mathematically guaranteed.
            </p>
            <p className="mb-3">
              While our Machine Learning algorithms, statistical regression engines, and backtesting systems strive for high statistical edge, <strong>we provide NO GUARANTEE of profit, win rate, or positive financial return</strong>.
            </p>
            <p>
              Past performance, historical accuracy metrics (e.g. 78% win rate), or previous winning streaks do not guarantee, predict, or imply future performance.
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              2. Complete Assumption of Financial Risk
            </h2>
            <p className="mb-3">
              Any decision to place a sports wager with an external licensed bookmaker (such as Bet9ja, SportyBet, 1xBet, Betway, etc.) is made entirely at your own independent discretion, discretion, and risk.
            </p>
            <p className="mb-3">
              FutureBet, its developers, operators, shareholders, and data providers shall not be held liable under any circumstance for any direct, indirect, consequential, or punitive damages or losses resulting from your reliance on information or predictions obtained through our site.
            </p>
            <p className="font-semibold text-slate-900 dark:text-white">
              You should never wager money that you cannot afford to lose completely.
            </p>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              3. Independent Status & Third-Party Bookmaker Odds
            </h2>
            <p className="mb-3">
              Odds, market lines, and bookmaker probabilities displayed on FutureBet are aggregated from third-party sources for comparative analysis. Bookmaker odds fluctuate in real time and may differ from the live odds offered on third-party betting apps at the time of placing your bet.
            </p>
            <p>
              FutureBet does not warrant the completeness or timeliness of third-party betting odds. References to bookmaker brands or logos are for informational identification purposes only and do not constitute an endorsement, agency, or partnership.
            </p>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              4. Strict Age Restrictions & Jurisdictional Legality
            </h2>
            <p className="mb-3">
              You must be at least <strong>18 years of age</strong> (or the legal age required by the gambling regulatory body in your country or state of residence) to consume sports prediction content.
            </p>
            <p>
              It is your sole responsibility to ensure that interacting with sports analytics and online betting content is legal in your jurisdiction. FutureBet disclaims any liability for users accessing the platform in territories where online betting or sports forecasting is prohibited by law.
            </p>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              5. Not Financial or Investment Advice
            </h2>
            <p>
              The materials and analysis contained on FutureBet do not constitute financial advice, investment advice, trading advice, or professional consultation. You are advised to conduct your own independent due diligence before placing any financial capital at risk.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
