'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { useState } from 'react';

// Create a client that persists across re-renders
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 max-w-md w-full">
        <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
        <p className="text-sm opacity-80 mb-4 font-mono text-left break-words bg-red-100/50 p-2 rounded">
          {error.message}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  // Initialize query client once
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {children}
      </ErrorBoundary>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
