import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - FutureBet',
  description: 'Privacy Policy for FutureBet.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#030712] dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Privacy Policy</h1>
        
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>Last updated: August 2026</p>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, subscribe to our premium services, or contact support. This includes your email address, username, and payment information (processed securely via our payment partners).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">2. How We Use Your Information</h2>
            <p>We use the information we collect to operate, maintain, and improve our services, communicate with you, process transactions, and personalize your experience on FutureBet.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">3. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">4. Cookies and Tracking</h2>
            <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information, ensuring a smooth authentication process and customized user preferences.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us through the support channels provided on our platform.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
