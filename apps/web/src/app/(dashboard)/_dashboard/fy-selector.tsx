'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useFinancialYears } from '@/hooks';
import type { DashboardSummary } from '@/hooks/use-analytics';
import { calendarDateIST, currentFinancialYear } from '@/lib/date';

/** The year the ACCOUNTING band shows, from `?fy=` (DASH-09); none = the API's default, the current year. */
export function useDashboardYearParam(): string | undefined {
  return useSearchParams()?.get('fy') || undefined;
}

/** "2026 to 2027", as the band labels a year. */
interface YearDates {
  start_date: string | Date;
  end_date: string | Date;
}

export function yearLabel(year: YearDates): string {
  return `${calendarDateIST(year.start_date).slice(0, 4)} to ${calendarDateIST(year.end_date).slice(0, 4)}`;
}

/** The year shown by default: the one marked current, else the April–March year of today. */
export function defaultYear<Year extends YearDates & { is_current: boolean }>(years: readonly Year[]): Year | undefined {
  const current = years.find((year) => year.is_current);
  if (current) return current;
  const today = currentFinancialYear();
  return years.find((year) => calendarDateIST(year.start_date) === today.start_date) ?? years[0];
}

interface FinancialYearSelectProps {
  period: DashboardSummary['period'] | undefined;
}

/**
 * The ACCOUNTING band's year (DASH-09): a select of the society's financial
 * years labelled "2026 to 2027". Choosing one puts it in the URL (`?fy=`),
 * which re-fetches the band's figures for that year.
 */
export function FinancialYearSelect({ period }: FinancialYearSelectProps): ReactNode {
  const years = useFinancialYears().data ?? [];
  const chosen = useDashboardYearParam();
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const query = useSearchParams()?.toString() ?? '';
  if (years.length === 0) return period ? <span className="text-sm font-medium">{period.label}</span> : null;
  const selected = chosen ?? period?.fy_id ?? defaultYear(years)?.id ?? '';

  function choose(id: string): void {
    const params = new URLSearchParams(query);
    params.set('fy', id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      aria-label="Financial year"
      className="h-8 rounded-md border border-input bg-background px-2 text-sm font-medium"
      value={selected}
      onChange={(event) => choose(event.target.value)}
    >
      {years.map((year) => (
        <option key={year.id} value={year.id}>
          {yearLabel(year)}
        </option>
      ))}
    </select>
  );
}
