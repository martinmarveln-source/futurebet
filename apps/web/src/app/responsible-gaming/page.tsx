import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, HeartHandshake, PhoneCall, CheckCircle2, AlertTriangle, Scale } from "lucide-react";

export const metadata = {
  title: "Responsible Gaming - FutureBet",
  description: "Our commitment to responsible gambling, player safety, and support resources.",
};

export default function ResponsibleGamingPage() {
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

        {/* Header Header */}
        <div className="mb-10 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-4">
            <HeartHandshake className="w-3.5 h-3.5" />
            PLAYER PROTECTION & SAFETY
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Responsible Gaming Policy
          </h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400 max-w-2xl">
            FutureBet is committed to promoting safe, healthy, and responsible interaction with sports analytics and betting.
          </p>
        </div>

        <div className="space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Important Notice Box */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200 flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 shrink-0 text-amber-600 dark:text-amber-400 mt-1" />
            <div>
              <h2 className="font-bold text-base text-amber-950 dark:text-amber-100">
                18+ Strictly Enforced • FutureBet Is NOT a Gambling Operator
              </h2>
              <p className="text-sm mt-1 leading-relaxed">
                FutureBet provides statistical data, computational intelligence, and sports prediction analytics. We do not accept bets, hold customer deposits, or facilitate real-money wagers. Sports betting involves substantial risk of financial loss.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Core Principles of Responsible Play</h2>
            </div>
            <p className="text-sm sm:text-base mb-4">
              If you choose to use our statistical insights to place bets with licensed third-party operators, we urge you to treat sports wagering as a form of recreational entertainment rather than an investment or income strategy.
            </p>
            <ul className="space-y-2 text-sm sm:text-base list-disc list-inside text-slate-600 dark:text-slate-300">
              <li><strong>Only wager disposable income:</strong> Never bet money intended for rent, utilities, medical care, or living expenses.</li>
              <li><strong>Do not chase losses:</strong> Losses are an unavoidable reality of sports variance. Trying to urgently win back lost capital almost always compounds financial distress.</li>
              <li><strong>Set strict time & budget limits:</strong> Establish fixed daily, weekly, or monthly bankroll caps and walk away once your threshold is reached.</li>
              <li><strong>Never bet under emotional or physical stress:</strong> Avoid wagering when feeling anxious, depressed, fatigued, or under the influence of alcohol.</li>
            </ul>
          </section>

          {/* Section 2: Warning Signs */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Warning Signs of Problem Gambling</h2>
            </div>
            <p className="text-sm sm:text-base mb-4">
              Ask yourself these questions honestly. If you or a loved one answers "yes" to multiple indicators, it may be time to seek professional support:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                ⚠️ Do you spend more time or money betting than you intended?
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                ⚠️ Have you ever borrowed money, sold assets, or used debt to place bets?
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                ⚠️ Does betting negatively interfere with your family, career, or relationships?
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                ⚠️ Do you feel anxiety, anger, or despair when unable to place a bet?
              </div>
            </div>
          </section>

          {/* Section 3: Helplines */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Official Support Resources & Helplines</h2>
            </div>
            <p className="text-sm sm:text-base mb-6">
              Confidential, professional assistance is available 24/7. These independent organizations provide free advice, counseling, and recovery programs:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">GambleAlert (Nigeria)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                  Leading independent non-profit dedicated to problem gambling awareness in Nigeria.
                </p>
                <div className="space-y-1 text-xs font-semibold">
                  <p>Website: <a href="https://gamblealert.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">gamblealert.org</a></p>
                  <p>Helpline: <span className="text-emerald-500 font-mono">+234 915 541 3333</span></p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">BeGambleAware (International)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                  Free, confidential help and support for anyone concerned about gambling habits.
                </p>
                <div className="space-y-1 text-xs font-semibold">
                  <p>Website: <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">begambleaware.org</a></p>
                  <p>Helpline (UK/Intl): <span className="text-emerald-500 font-mono">0808 8020 133</span></p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Gamblers Anonymous</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                  Global fellowship offering mutual support and local group meetings worldwide.
                </p>
                <p className="text-xs font-semibold">
                  Website: <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">gamblersanonymous.org</a>
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">GamCare</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                  Information, advice, and live chat counseling for anyone impacted by gambling.
                </p>
                <p className="text-xs font-semibold">
                  Website: <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">gamcare.org.uk</a>
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Self-Exclusion & Account Pauses */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Scale className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Self-Exclusion & FutureBet Account Suspension</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed">
              If you feel that access to sports prediction data is contributing to unhealthy habits, we offer voluntary self-exclusion. You may request account deactivation, pause marketing notifications, or request immediate permanent deletion of your profile by emailing us at <span className="font-mono text-blue-500">support@futurebet.com.ng</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
