/**
 * Date helpers for financial posting-date defaults.
 *
 * `new Date().toISOString().slice(0, 10)` yields a UTC date, which for a
 * Bangalore user after ~18:30 IST rolls forward to *tomorrow* (or, before
 * 05:30 IST, could resolve to yesterday relative to their wall clock). For
 * financial documents (journal entries, receipts, debit notes, invoices) the
 * default posting date must match the operator's local (IST) calendar day.
 *
 * `en-CA` formats as `YYYY-MM-DD`, matching the shape of `<input type="date">`.
 */
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
}

export interface MonthRange {
  /** `YYYY-MM`. */
  month: string;
  /** Short English month name, e.g. `May`. */
  label: string;
  start_date: string;
  end_date: string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * The last `count` calendar months, oldest first, the last one being the month
 * of `today` (a `YYYY-MM-DD` string; defaults to today in IST). Pure string and
 * integer arithmetic, so the result does not depend on the browser's time zone.
 */
export function lastMonthRanges(count: number, today: string = todayIST()): MonthRange[] {
  const year = Number(today.slice(0, 4));
  const monthIndex = Number(today.slice(5, 7)) - 1;
  const ranges: MonthRange[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const absolute = year * 12 + monthIndex - back;
    const rangeYear = Math.floor(absolute / 12);
    const rangeMonth = absolute % 12;
    const lastDay = new Date(Date.UTC(rangeYear, rangeMonth + 1, 0)).getUTCDate();
    const month = `${rangeYear}-${twoDigits(rangeMonth + 1)}`;
    ranges.push({
      month,
      label: MONTH_LABELS[rangeMonth],
      start_date: `${month}-01`,
      end_date: `${month}-${twoDigits(lastDay)}`,
    });
  }
  return ranges;
}

export interface FinancialYearRange {
  start_date: string;
  end_date: string;
}

/**
 * The April–March financial year that `today` (a `YYYY-MM-DD` string; defaults
 * to today in IST) falls in: 2026-10-14 → 2026-04-01 to 2027-03-31, and
 * 2027-02-10 → the same year.
 */
export function currentFinancialYear(today: string = todayIST()): FinancialYearRange {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const startYear = month >= 4 ? year : year - 1;
  return { start_date: `${startYear}-04-01`, end_date: `${startYear + 1}-03-31` };
}
