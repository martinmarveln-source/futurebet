import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, FileText } from "lucide-react";

export const metadata = {
  title: "Terms and Conditions - FutureBet",
  description: "Terms and conditions, user agreement, and subscription policies for FutureBet.",
};

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 mb-4">
            <FileText className="w-3.5 h-3.5" />
            LEGAL AGREEMENT & USER TERMS
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Terms & Conditions of Service
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Last Updated: November 2026 • Effective Immediately
          </p>
        </div>

        {/* Warning Banner */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 mb-8">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p className="text-sm leading-relaxed">
            <strong>CRITICAL NOTICE:</strong> FutureBet is NOT a bookmaker, gambling operator, or financial advisory firm. We do not accept bets or wagers. By using this service, you acknowledge that sports betting carries inherent financial risk, and you agree to hold FutureBet 100% harmless from any betting losses.
          </p>
        </div>

        <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
          {/* 1. Acceptance */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              1. Acceptance of Terms & Eligibility
            </h2>
            <p className="mb-3">
              By accessing, browsing, registering for an account, or subscribing to services on FutureBet (accessible via <strong>futurebet.com.ng</strong>), you irrevocably agree to comply with and be legally bound by these Terms and Conditions.
            </p>
            <p>
              <strong>Age Requirement (Strictly 18+):</strong> You affirm and warrant that you are at least 18 years of age (or the legal age for gambling and digital commerce in your relevant jurisdiction). If you are under 18, you are strictly prohibited from using our services.
            </p>
          </section>

          {/* 2. Nature of Service */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              2. Nature of Service (Data Analytics & Entertainment Only)
            </h2>
            <p className="mb-3">
              FutureBet provides computational intelligence, statistical modeling, probability estimation, and historical sports data analysis.
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>FutureBet does <strong>NOT</strong> accept bets, wagers, stakes, or pool funds.</li>
              <li>FutureBet does <strong>NOT</strong> guarantee the accuracy, certainty, or profitability of any algorithm, tip, or match forecast.</li>
              <li>Past predictive performance, backtesting scores, and model win rates are historical indicators only and provide <strong>no guarantee of future outcomes</strong>.</li>
            </ul>
          </section>

          {/* 3. No Financial Advice & Complete Waiver */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              3. No Financial Advice & Assumption of Risk
            </h2>
            <p className="mb-3">
              All information, probability percentages, odds references, and value ratings presented on FutureBet are intended solely for informational, statistical, and entertainment purposes.
            </p>
            <p className="mb-3">
              None of our content constitutes investment advice, financial planning, or an endorsement to wager real currency. Any decision you make to place a wager with a third-party bookmaker is made entirely at your sole discretion, judgment, and risk.
            </p>
            <p>
              <strong>Complete Waiver:</strong> You expressly release and waive any claims against FutureBet, its founders, engineers, affiliates, and licensors from any direct, indirect, consequential, or punitive damages, including financial or psychological losses arising from betting decisions.
            </p>
          </section>

          {/* 4. Subscriptions, Payments & Strictly No-Refund Policy */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              4. Premium Subscriptions, Billing & Non-Refundable Policy
            </h2>
            <p className="mb-3">
              FutureBet offers paid subscription tiers (including Silver Analyst and VIP Gold) granting access to premium algorithms, VIP Picks, and advanced comparison engines.
            </p>
            <ul className="space-y-2.5 list-disc list-inside mb-4">
              <li><strong>Secure Processing:</strong> Payments are processed securely via verified third-party gateways (e.g. Paystack). FutureBet does not store raw credit card numbers or banking passwords.</li>
              <li><strong>Immediate Digital Access:</strong> Because our subscription services provide instant, irreversible digital access to proprietary data, analytics, and active VIP picks, <strong>ALL SUBSCRIPTION FEES ARE STRICTLY NON-REFUNDABLE</strong> once payment has been completed.</li>
              <li><strong>No Guarantee Refunds:</strong> Subscriptions will not be refunded due to subjective dissatisfaction, personal losses on third-party bookmaker sites, or unexpected match outcomes.</li>
              <li><strong>Cancellation:</strong> You may cancel auto-renewals at any time from your account settings. Cancellation stops future billing cycles but does not entitle you to retroactive refunds for the active period.</li>
            </ul>
          </section>

          {/* 5. Intellectual Property & Anti-Syndication */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              5. Intellectual Property & Prohibited Re-selling
            </h2>
            <p className="mb-3">
              All proprietary algorithms, predictive software, data feeds, UI components, text, design, and VIP selections are the exclusive intellectual property of FutureBet.
            </p>
            <p className="mb-3">
              <strong>Zero Tolerance on Piracy / Re-Selling:</strong> Your subscription grants an individual, non-transferable, single-user license. You are strictly prohibited from:
            </p>
            <ul className="space-y-1.5 list-disc list-inside mb-3">
              <li>Scraping, crawling, or extracting data via automated scripts or bots.</li>
              <li>Broadcasting, reselling, syndicating, or sharing VIP picks in Telegram channels, WhatsApp groups, social media, or secondary websites.</li>
              <li>Account sharing or credential distribution.</li>
            </ul>
            <p className="text-xs text-rose-500 font-semibold">
              Violation will result in immediate permanent account termination without refund and possible legal prosecution under Nigerian copyright and digital crimes legislation.
            </p>
          </section>

          {/* 6. Limitation of Liability */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              6. Limitation of Liability & Maximum Cap
            </h2>
            <p className="mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL FUTUREBET, ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, GAMBLING LOSSES, DATA LOSS, OR EMOTIONAL DISTRESS.
            </p>
            <p>
              IN ANY EVENT, FUTUREBET’S AGGREGATE LIABILITY ARISING OUT OF OR IN CONNECTION WITH THE SERVICES SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO FUTUREBET IN THE ONE (1) MONTH IMMEDIATELY PRECEDING THE CLAIM.
            </p>
          </section>

          {/* 7. Governing Law */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              7. Governing Law & Dispute Resolution
            </h2>
            <p className="mb-3">
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the <strong>Federal Republic of Nigeria</strong>, without regard to its conflict of law principles.
            </p>
            <p>
              Any dispute, controversy, or claim arising out of or relating to these Terms shall first be attempted to be resolved amicably through good-faith negotiation. If unresolved, it shall be submitted to the exclusive jurisdiction of the state or federal courts located in Nigeria.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
