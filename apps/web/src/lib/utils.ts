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

/**
 * Tally-style balance rendering. Returns the absolute amount + the
 * EFFECTIVE side (Dr / Cr) of the balance.
 *
 * Why this isn't `formatCurrency` with a minus sign: Tally never
 * emits negative numbers in account ledger / chart-of-accounts views.
 * Direction is always carried by the Dr / Cr suffix, never by sign:
 *
 *   Asset with credit balance (overpayment refund pending):
 *     ours OLD: "-₹2,000 Dr"  ← confusing: minus + Dr disagree
 *     Tally-style: "2,000.00 Cr"  ← the Dr→Cr flip says "anomalous"
 *
 *   Vendor (credit-normal) with our advance sitting in their account:
 *     ours OLD: "-₹500 Cr"
 *     Tally-style: "500.00 Dr"
 *
 * Inputs:
 *   - amount: signed balance from the backend's natural-direction
 *     calculation. Positive = in the natural direction, negative
 *     = on the opposite side from the account's normal home.
 *   - naturalSide: the account's normal home side. For ledger
 *     accounts this matches `balance_type` ('debit' | 'credit'),
 *     which itself reflects the parent group's account_type
 *     (asset/expense → debit; liability/income/equity → credit).
 */
export function formatTallyBalance(
  amount: number | string | null | undefined,
  naturalSide: 'debit' | 'credit' | null | undefined,
): { text: string; side: 'Dr' | 'Cr' } {
  const num =
    typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safeNum = Number.isFinite(num) ? num : 0;
  const abs = Math.abs(safeNum);
  // When natural side is unknown (legacy data, missing group_id),
  // fall back to "Dr if positive, Cr if negative" — the same
  // signed-as-debit convention raw journal_lines use.
  const home: 'debit' | 'credit' = naturalSide ?? 'debit';
  // Negative number on the natural side → balance is on the OPPOSITE
  // side; flip the suffix.
  const effectiveSide: 'debit' | 'credit' =
    safeNum < 0 ? (home === 'debit' ? 'credit' : 'debit') : home;
  return {
    text: formatCurrency(abs),
    side: effectiveSide === 'debit' ? 'Dr' : 'Cr',
  };
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

/**
 * Clamp a YYYY-MM-DD string to [min, max] (both YYYY-MM-DD).
 *
 * HTML5 `<input type="date">` enforces min/max on the native picker
 * and on form submission in modern browsers, but users can still
 * paste / type a value outside the range. Call this from every date
 * input's onChange to guarantee state is always within bounds.
 *
 * Returns the input unchanged if empty or not a valid YYYY-MM-DD.
 */
export function clampDateString(value: string, min: string, max: string): string {
  if (!value) return value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  // QA #22 — backend occasionally sends Unix epoch 0 when a date
  // field is null but typed as string. Treat "before 1970-02-01" as
  // "no real date" and render the em-dash fallback.
  if (parsed.getTime() < 24 * 60 * 60 * 1000 * 31) return '—';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
