import type { Metadata, Viewport } from "next";
import "./global.css";
import { Providers } from "./providers";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ReferralTracker } from "@/components/ReferralTracker";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { Suspense } from "react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://futurebet.com.ng"),
  title: "Futurebet | Best AI Football Prediction & Analytics",
  description:
    "Futurebet provides highly accurate AI football predictions, betting tips, algorithmic football predictions, backtesting, and VIP market context odds to help you win consistently.",
  applicationName: "FutureBet",
  authors: [{ name: "FutureBet Team", url: "https://futurebet.com.ng" }],
  keywords: ["Futurebet","Future bet","AI football predictions","VIP betting tips","algorithmic football predictions","sure wins today","football tips","value betting","soccer predictions","betting analytics","football algorithm","predictive football analytics","value betting software","AI betting algorithm","best football prediction site","sure bet predictions today","accurate soccer predictions for tomorrow","mathematical football predictions","betting tips 1x2","over 2.5 goals predictions","BTTS tips","daily VIP picks"],
  openGraph: {
    title: "Futurebet | AI Football Predictions",
    description:
      "Futurebet provides highly accurate AI football predictions, betting tips, and VIP market context odds.",
    url: "https://futurebet.com.ng",
    siteName: "Futurebet",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Futurebet AI Predictive Analytics",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Futurebet | AI Football Predictions",
    description:
      "Futurebet provides highly accurate AI football predictions and VIP betting tips.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  alternates: {
    canonical: "https://futurebet.com.ng",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"How accurate are Futurebet's AI football predictions?","acceptedAnswer":{"@type":"Answer","text":"Futurebet uses advanced machine learning models that analyze thousands of data points including xG, team form, injuries, and historical statistics to generate highly accurate football predictions, consistently outperforming traditional human analysis."}},{"@type":"Question","name":"Are your football betting tips free?","acceptedAnswer":{"@type":"Answer","text":"We offer a robust selection of free daily football tips and predictions. For serious bettors, we also offer a Premium subscription that unlocks elite algorithmic predictions, VIP market context, and deeper statistical insights."}},{"@type":"Question","name":"How does the AI Risk Analyzer work?","acceptedAnswer":{"@type":"Answer","text":"Our proprietary AI Risk Analyzer evaluates your combined betslip selections and identifies contradicting odds, mathematical traps, and overall risk levels, helping you avoid bad bets before placing them."}}]})
          }}
        />
        {/* Structured Data for Web Application */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Futurebet",
                alternateName: "Future bet",
                url: "https://futurebet.com.ng",
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "Futurebet",
                url: "https://futurebet.com.ng",
                logo: "https://futurebet.com.ng/favicon.png",
                description: "AI Football Predictions and Betting Analytics",
              },
              {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "Futurebet",
                url: "https://futurebet.com.ng",
                description:
                  "Futurebet provides highly accurate AI football predictions, betting tips, backtesting, and VIP market context odds to help you win consistently.",
                applicationCategory: "SportsApplication",
                operatingSystem: "Web",
              }
            ]),
          }}
        />
        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "FutureBet",
              "applicationCategory": "SportsApplication",
              "operatingSystem": "Web",
              "url": "https://futurebet.com.ng",
              "description": "Futurebet provides highly accurate AI football predictions, algorithmic betting tips, backtesting, and VIP market context odds.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "NGN"
              },
              "creator": {
                "@type": "Organization",
                "name": "FutureBet",
                "url": "https://futurebet.com.ng"
              }
            })
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">{children}</main>
            <footer className="py-10 bg-slate-50 dark:bg-[#030712] border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
              <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-5">
                {/* 18+ and Compliance Notice */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-black text-amber-600 dark:text-amber-400">
                    🔞 18+ ONLY
                  </span>
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    Not a Gambling Operator • Purely Statistical Insights • Bet Responsibly
                  </span>
                </div>

                {/* Legal Links */}
                <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 font-medium">
                  <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</a>
                  <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy (NDPA & GDPR)</a>
                  <a href="/disclaimer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Legal Disclaimer</a>
                  <a href="/responsible-gaming" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors flex items-center gap-1">
                    <span>Responsible Gaming</span>
                  </a>
                </div>

                {/* Statutory Disclaimer & Helpline Note */}
                <p className="max-w-4xl text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                  FutureBet (futurebet.com.ng) is an independent sports analytics and computational intelligence platform. FutureBet is not a bookmaker, does not accept or place bets, and does not operate gambling pools. All predictions, odds references, and performance ratings are algorithmic probabilities intended strictly for entertainment and informational purposes. Past performance is no guarantee of future results. Please gamble responsibly. If you or someone you know is experiencing gambling-related issues, confidential help is available via <a href="https://gamblealert.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GambleAlert Nigeria</a> or <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">BeGambleAware</a>.
                </p>

                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  © {new Date().getFullYear()} FutureBet Analytics. All rights reserved. Registered under applicable digital service and commercial laws.
                </div>
              </div>
            </footer>
          </div>
          <InstallPrompt />
          <CookieConsentBanner />
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
