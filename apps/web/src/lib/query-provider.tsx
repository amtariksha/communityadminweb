'use client';

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useToast } from '@/components/ui/toast';

/**
 * Global toast dispatcher registered at runtime so the QueryCache
 * (which lives outside React's render tree) can surface failures.
 *
 * We can't `useToast()` inside `new QueryCache({ onError })` — that's
 * not React context. Instead <QueryToastBridge /> (below) wires the
 * ToastProvider's addToast into this module variable on mount and
 * cleans it up on unmount.
 */
let globalAddToast:
  | null
  | ((t: {
      title: string;
      description?: string;
      variant?: 'default' | 'destructive' | 'success';
    }) => void) = null;

/**
 * QueryCache with a process-wide error handler.
 *
 * Why this matters — tester-filed bug TC-027/TC-032/TC-033/TC-034:
 * every list page (Tickets, Staff, Utilities, Member Directory) was
 * "silently failing" on backend error. `isLoading` flipped to false,
 * the skeleton disappeared, and the page showed an empty/default
 * state with no indication that a 4xx or 5xx happened. Errors landed
 * only in the browser console.
 *
 * This handler toasts every non-401 query failure so the user can at
 * least see something went wrong and retry manually. 401s are skipped
 * because the Axios interceptor refreshes the token + retries
 * transparently — toasting them would fire once per failed query per
 * navigation, which is noisy.
 */
const queryCache = new QueryCache({
  onError: (error, query) => {
    const err = error as { response?: { status?: number }; message?: string };

    // Auth / refresh flow already retries transparently.
    if (err.response?.status === 401) return;

    // If a specific query opts in with meta.suppressToast, skip — the
    // page handles it locally (e.g. a dashboard tile that rolls up N
    // endpoints and tolerates one failing).
    if (query?.meta?.suppressToast === true) return;

    globalAddToast?.({
      title: 'Failed to load data',
      description:
        err.message?.slice(0, 200) ??
        'The server returned an error. Try again.',
      variant: 'destructive',
    });
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache,
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Render ONCE inside <ToastProvider> AND <QueryProvider>. Wires the
 * toast dispatcher into the module-level `globalAddToast` so the
 * QueryCache's onError can reach it. Renders null.
 */
export function QueryToastBridge(): ReactNode {
  const { addToast } = useToast();
  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);
  return null;
}
