import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms and Conditions - FutureBet',
  description: 'Terms and conditions for using FutureBet.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#030712] dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Terms and Conditions</h1>
        
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">1. Introduction</h2>
            <p>Welcome to FutureBet. By accessing and using our website (futurebet.com.ng) and services, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">2. Our Service</h2>
            <p>FutureBet is a sports prediction and analytics platform. We provide data-driven insights and AI-generated predictions for sports events. We are not a sportsbook and do not accept real-money bets.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">3. User Responsibilities</h2>
            <p>Users must be at least 18 years of age to use our services. You agree to use the information provided by FutureBet responsibly and in compliance with the gambling laws and regulations in your jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">4. No Financial Advice or Guarantees</h2>
            <p>The predictions and analytics provided on FutureBet are for informational and entertainment purposes only. They do not constitute financial advice. We do not guarantee the accuracy of any predictions and accept no liability for any financial losses incurred based on our data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">5. Subscriptions and Payments</h2>
            <p>Certain features (such as VIP Picks and Unlimited AI Usage) require a premium subscription. All payments are processed securely. We reserve the right to change our subscription plans or adjust pricing, which will be communicated in advance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">6. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. Your continued use of the service following any changes constitutes your acceptance of the new Terms.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
