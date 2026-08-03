import type { Metadata, Viewport } from "next";
import "./global.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "FutureBet — Football Prediction Analytics",
  description:
    "Football prediction, backtesting sandbox, and machine learning calibration.",
  openGraph: {
    title: "FutureBet — Football Prediction Analytics",
    description:
      "Football prediction, backtesting sandbox, and machine learning calibration.",
    url: "https://futurebet.com.ng",
    siteName: "FutureBet",
    images: [
      {
        url: "/favicon.png",
        width: 512,
        height: 512,
        alt: "FutureBet Logo",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FutureBet — Football Prediction Analytics",
    description:
      "Football prediction, backtesting sandbox, and machine learning calibration.",
    images: ["/favicon.png"],
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
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "FutureBet",
              url: "https://futurebet.com.ng",
              description:
                "Football prediction, backtesting sandbox, and machine learning calibration.",
              applicationCategory: "SportsApplication",
              operatingSystem: "Web",
            }),
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
