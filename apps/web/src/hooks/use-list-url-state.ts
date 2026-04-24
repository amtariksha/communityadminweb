'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * URL-backed list state for pages that paginate and optionally sort.
 *
 * QA #46 — testers lose the current page + sort when navigating away and
 * back, or when pasting a link in chat. Persisting state in the URL solves
 * both while staying local to the page (no global store needed).
 *
 * The reserved keys are `page`, `sort`, and `dir`. Individual filters
 * (status, date range, etc.) are still page-local React state — only the
 * things that ought to survive a hard refresh live in the URL.
 */
export interface ListUrlState {
  page: number;
  sort: string | null;
  dir: 'asc' | 'desc';
}

interface UseListUrlStateOptions {
  /**
   * Allowlist of sortable columns the page supports. Unknown values
   * arriving from the URL are ignored (fallback to `defaultSort`) so a
   * tampered or stale link cannot blow up the page.
   */
  allowedSorts: readonly string[];
  defaultSort: string | null;
  defaultDir?: 'asc' | 'desc';
}

export function useListUrlState(options: UseListUrlStateOptions): {
  state: ListUrlState;
  setPage: (page: number) => void;
  setSort: (sort: string, dir?: 'asc' | 'desc') => void;
  toggleSort: (sort: string) => void;
  reset: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { allowedSorts, defaultSort, defaultDir = 'desc' } = options;

  const initial = useMemo<ListUrlState>(() => {
    const rawPage = Number(searchParams.get('page'));
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

    const rawSort = searchParams.get('sort');
    const sort =
      rawSort && allowedSorts.includes(rawSort) ? rawSort : defaultSort;

    const rawDir = searchParams.get('dir');
    const dir: 'asc' | 'desc' = rawDir === 'asc' ? 'asc' : rawDir === 'desc' ? 'desc' : defaultDir;

    return { page, sort, dir };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [state, setState] = useState<ListUrlState>(initial);

  // Keep React state in sync when the URL changes externally (back/forward,
  // programmatic `router.push`, etc.).
  useEffect(() => {
    setState(initial);
  }, [initial]);

  const writeToUrl = useCallback(
    (next: ListUrlState) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.page <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(next.page));
      }
      if (!next.sort || next.sort === defaultSort) {
        params.delete('sort');
      } else {
        params.set('sort', next.sort);
      }
      if (next.dir === defaultDir) {
        params.delete('dir');
      } else {
        params.set('dir', next.dir);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams, defaultSort, defaultDir],
  );

  const setPage = useCallback(
    (page: number) => {
      const next = { ...state, page: Math.max(1, Math.floor(page)) };
      setState(next);
      writeToUrl(next);
    },
    [state, writeToUrl],
  );

  const setSort = useCallback(
    (sort: string, dir?: 'asc' | 'desc') => {
      if (!allowedSorts.includes(sort)) return;
      const next: ListUrlState = {
        ...state,
        sort,
        dir: dir ?? state.dir,
        page: 1,
      };
      setState(next);
      writeToUrl(next);
    },
    [state, writeToUrl, allowedSorts],
  );

  const toggleSort = useCallback(
    (sort: string) => {
      if (!allowedSorts.includes(sort)) return;
      const sameColumn = state.sort === sort;
      const nextDir: 'asc' | 'desc' = sameColumn
        ? state.dir === 'asc'
          ? 'desc'
          : 'asc'
        : defaultDir;
      const next: ListUrlState = { ...state, sort, dir: nextDir, page: 1 };
      setState(next);
      writeToUrl(next);
    },
    [state, writeToUrl, allowedSorts, defaultDir],
  );

  const reset = useCallback(() => {
    const next: ListUrlState = { page: 1, sort: defaultSort, dir: defaultDir };
    setState(next);
    writeToUrl(next);
  }, [writeToUrl, defaultSort, defaultDir]);

  return { state, setPage, setSort, toggleSort, reset };
}
