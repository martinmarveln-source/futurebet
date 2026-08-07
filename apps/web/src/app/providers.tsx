'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// Create a client that persists across re-renders
function makeQueryClient() {
  const handleError = (error: Error | any) => {
    if (error?.name === 'AbortError') return;
    const msg = error?.response?.data?.error || error?.message || 'An unexpected error occurred';
    // Don't toast for common 401s if handled by auth layer
    if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('not logged in')) return;
    
    toast.error(msg, {
      description: 'Please try again or contact support if the issue persists.',
    });
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleError,
    }),
    mutationCache: new MutationCache({
      onError: handleError,
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
        retry: 1,
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

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="relative group max-w-md w-full overflow-hidden rounded-3xl p-1 bg-gradient-to-b from-red-500/20 to-red-500/5 dark:from-red-500/10 dark:to-red-900/10 shadow-2xl">
        <div className="absolute inset-0 bg-red-500/10 dark:bg-red-500/5 blur-xl group-hover:blur-2xl transition-all duration-500" />
        <div className="relative bg-white/70 dark:bg-gray-900/80 backdrop-blur-xl border border-red-500/20 rounded-[22px] p-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-6 shadow-inner ring-1 ring-red-500/20">
            <AlertTriangle size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            We encountered an unexpected error while trying to load this page. Our team has been notified.
          </p>
          <div className="w-full bg-red-50/50 dark:bg-red-900/10 rounded-xl p-4 mb-8 border border-red-100 dark:border-red-500/10">
            <p className="text-xs font-mono text-red-600 dark:text-red-400 text-left break-words line-clamp-3">
              {error.message || "Unknown error occurred"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Home size={16} />
              Go Home
            </button>
            <button
              onClick={resetErrorBoundary}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
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
      <Toaster 
        position="bottom-right" 
        richColors 
        theme="system" 
        closeButton 
        toastOptions={{
          style: {
            borderRadius: '16px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
