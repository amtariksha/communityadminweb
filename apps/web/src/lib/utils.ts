import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// ---------------------------------------------------------------------------
// Date input helpers
// ---------------------------------------------------------------------------
//
// All `<input type="date">` fields in the app should use these bounds so users
// can't enter nonsense years (e.g. 5685, the bug that caused the 'wrong date'
// on resident invoices). Most places use `dateInputBounds()` for the broad
// 1950-2099 range; financial entries should prefer `financialDateBounds()`
// which limits selection to the current financial year plus the next month.

/** Broad bounds for DOB / historic records / general-purpose date inputs. */
export const DATE_INPUT_MIN = '1950-01-01';
export const DATE_INPUT_MAX = '2099-12-31';

export function dateInputBounds(): { min: string; max: string } {
  return { min: DATE_INPUT_MIN, max: DATE_INPUT_MAX };
}

/**
 * Financial-entry bounds: previous financial year start through the end of the
 * next month. Prevents back-dating further than the prior FY and forward-dating
 * beyond the natural billing horizon.
 */
export function financialDateBounds(now = new Date()): {
  min: string;
  max: string;
} {
  // Indian FY starts in April. If we're between Jan and Mar, the current FY
  // started in April of the previous calendar year.
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const currentFyStartYear = month < 3 ? year - 1 : year;
  const prevFyStartYear = currentFyStartYear - 1;

  const min = `${prevFyStartYear}-04-01`;

  // Last day of next month.
  const nextMonthEnd = new Date(year, month + 2, 0);
  const max = nextMonthEnd.toISOString().slice(0, 10);

  return { min, max };
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
