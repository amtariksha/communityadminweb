'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { todayIST } from '@/lib/date';

/**
 * What the Incident Investigator registers share (GATE-10): India-time
 * formatting, a From / To day range and the list state (page, page size,
 * search, range, block) where any filter change goes back to page 1.
 */

const IST = 'Asia/Kolkata';

/** `19 Oct 2026` on India's calendar; `—` when there is no date. */
export function indiaDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST });
}

/** `09:45 am` on India's clock; `—` when there is no time. */
export function indiaTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: IST });
}

export function indiaDateTime(iso: string | null | undefined): string {
  return iso ? `${indiaDate(iso)} ${indiaTime(iso)}` : '—';
}

export const REGISTER_PAGE_SIZES = [25, 50, 100] as const;

export interface DayRange {
  from: string;
  to: string;
}

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

/** From / To day pickers; an end before the start moves the start with it. */
export function DayRangeFilter({ value, onChange }: { value: DayRange; onChange: (range: DayRange) => void }): ReactNode {
  return (
    <div className="flex items-center gap-1 text-sm">
      <label className="flex items-center gap-1">
        From
        <Input
          type="date"
          aria-label="From date"
          className="w-36"
          value={value.from}
          onChange={(event) => onChange({ from: event.target.value, to: value.to && event.target.value > value.to ? event.target.value : value.to })}
        />
      </label>
      <label className="flex items-center gap-1">
        To
        <Input
          type="date"
          aria-label="To date"
          className="w-36"
          value={value.to}
          onChange={(event) => onChange({ from: value.from && event.target.value < value.from ? event.target.value : value.from, to: event.target.value })}
        />
      </label>
    </div>
  );
}
