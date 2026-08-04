import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Disclaimer - FutureBet',
  description: 'Legal disclaimer for FutureBet.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#030712] dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Disclaimer</h1>
        
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <p><strong>FutureBet is NOT a gambling site.</strong> We are a data analytics and predictive modeling platform designed to provide insights into sporting events.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">No Guarantees</h2>
            <p>While our Machine Learning models and analytics tools strive for accuracy, sports are inherently unpredictable. We do not guarantee the success of any prediction, tip, or analysis provided on our platform. Past performance is not indicative of future results.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">Responsible Usage</h2>
            <p>If you choose to use our data to place wagers on third-party betting platforms, you do so entirely at your own risk. FutureBet and its operators are not liable for any financial losses or damages you may incur. We strongly encourage responsible gambling and recommend setting strict limits on your activities.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">Age Restriction</h2>
            <p>You must be 18 years or older, and of legal age in your jurisdiction, to use the insights provided by FutureBet for any betting purposes.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
