// @ts-nocheck
"use client";
import "./global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        suspense: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export default function RootLayout({ children }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <html lang="en">
      <head>
        <title>FutureBet — Football Prediction Analytics</title>
        <meta name="description" content="Football prediction, backtesting sandbox, and machine learning calibration." />
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <style jsx global>{`
            *,
            *::before,
            *::after {
              box-sizing: border-box;
            }

            html,
            body {
              padding: 0;
              margin: 0;
              min-height: 100%;
            }

            html {
              font-size: 15px;
              scroll-behavior: smooth;
            }

            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.45;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              overscroll-behavior: none;
            }

            @media (min-width: 640px) {
              html {
                font-size: 16px;
              }
            }

            @media (min-width: 1024px) {
              html {
                font-size: 16.5px;
              }
            }

            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }

            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }

            body[data-scroll-locked="true"] {
              overflow: hidden;
              touch-action: none;
            }

            @media (prefers-reduced-motion: reduce) {
              *,
              *::before,
              *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
              }
            }

            body::before {
              content: "";
              position: fixed;
              inset: 0;
              pointer-events: none;
              z-index: -1;
              background: radial-gradient(
                1200px 600px at 50% -200px,
                rgba(99, 102, 241, 0.06),
                transparent 60%
              );
            }
          `}</style>

          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
