'use client';

import { useCallback, useState } from 'react';
import type { DayRange } from '@/components/day-range-filter';
import { todayIST } from '@/lib/date';

/**
 * What the Incident Investigator registers share (GATE-10): India-time
 * formatting, a From / To day range and the list state (page, page size,
 * search, range, block) where any filter change goes back to page 1.
 */

// India-time formatting and the day range are shared with other classic lists.
export { indiaDate, indiaDateTime, indiaTime } from '@/lib/india-time';
export { DayRangeFilter, type DayRange } from '@/components/day-range-filter';

export const REGISTER_PAGE_SIZES = [25, 50, 100] as const;

export interface RegisterState {
  page: number;
  pageSize: number;
  q: string;
  range: DayRange;
  block: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setQ: (q: string) => void;
  setRange: (range: DayRange) => void;
  setBlock: (block: string | null) => void;
}

/** List state of one register; `today` opens it on today's India day. */
export function useRegisterState(opens: 'today' | 'all' = 'today'): RegisterState {
  const today = todayIST();
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState<number>(REGISTER_PAGE_SIZES[0]);
  const [q, setSearch] = useState('');
  const [range, setDays] = useState<DayRange>(opens === 'today' ? { from: today, to: today } : { from: '', to: '' });
  const [block, setBlockValue] = useState<string | null>(null);
  const firstPage = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };
  return {
    page,
    pageSize,
    q,
    range,
    block,
    setPage,
    setPageSize: firstPage(setSize),
    // The table calls this once typing settles; it must keep its identity.
    setQ: useCallback((value: string) => {
      setSearch(value);
      setPage(1);
    }, []),
    setRange: firstPage(setDays),
    setBlock: firstPage(setBlockValue),
  };
}

/** The register filters as API parameters (`date_from`, `date_to`, `block`, `q`). */
export function registerFilters(state: RegisterState): {
  date_from?: string;
  date_to?: string;
  block?: string;
  q?: string;
} {
  return {
    date_from: state.range.from || undefined,
    date_to: state.range.to || undefined,
    block: state.block ?? undefined,
    q: state.q || undefined,
  };
}
