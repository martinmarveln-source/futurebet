import type { Metadata, Viewport } from "next";
import "./global.css";
import { Providers } from "./providers";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ReferralTracker } from "@/components/ReferralTracker";
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
  keywords: [
    "Futurebet",
    "AI football predictions",
    "VIP betting tips",
    "algorithmic football predictions",
    "sure wins today",
    "football tips",
    "value betting",
    "soccer predictions",
    "betting analytics",
    "football algorithm",
    "predictive football analytics",
    "value betting software",
    "AI betting algorithm"
  ],
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
            <footer className="py-8 bg-slate-50 dark:bg-[#030712] border-t border-slate-200 dark:border-slate-800/60 text-sm text-slate-500 dark:text-slate-400">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
                <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms & Conditions</a>
                <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</a>
                <a href="/disclaimer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Disclaimer</a>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
                <span>© {new Date().getFullYear()} FutureBet. All rights reserved.</span>
              </div>
            </footer>
          </div>
          <InstallPrompt />
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
