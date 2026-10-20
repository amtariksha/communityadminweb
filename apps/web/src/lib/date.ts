/**
 * Date helpers for date inputs and their defaults.
 *
 * A Date's ISO text is UTC: its first ten characters on `new Date()` are the
 * UTC day — yesterday in India from 00:00 to 05:30 — and on a Date built at
 * local midnight (`new Date(y, m, d)`) the day before in India. Days come from
 * here; `utc-day-guard.test.ts` refuses the pattern anywhere else.
 *
 * `en-CA` formats as `YYYY-MM-DD`, matching the shape of `<input type="date">`.
 */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(now);
}

/** `YYYY-MM-DD` of a Date built at UTC midnight (`Date.UTC`): the one place ISO text becomes a day. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The day `days` after `day` (before it when negative), both `YYYY-MM-DD`. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.slice(0, 10).split('-').map(Number);
  return utcDay(new Date(Date.UTC(year, month - 1, date + days)));
}

/** The same date `months` later (a short month overflows, as Date#setMonth does). */
export function addMonths(day: string, months: number): string {
  const [year, month, date] = day.slice(0, 10).split('-').map(Number);
  return utcDay(new Date(Date.UTC(year, month - 1 + months, date)));
}

/**
 * The India calendar day (`YYYY-MM-DD`) of an instant — e.g. an
 * announcement's `expires_at` (23:59:59 IST) shown back in a date input.
 */
export function dateIST(instant: string): string {
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(parsed);
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The India calendar day of a date the API sent: a plain `YYYY-MM-DD`, or a
 * DATE column serialised as a timestamp (midnight of the server's zone,
 * which reads as the day before in UTC when the server runs in IST).
 */
export function calendarDateIST(value: string | Date): string {
  if (typeof value === 'string' && ISO_DATE.test(value)) return value;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

/** The year among `years` whose start and end dates hold `date` (`YYYY-MM-DD`). */
export function yearContaining<Year extends { start_date: string | Date; end_date: string | Date }>(
  years: readonly Year[],
  date: string,
): Year | undefined {
  return years.find((year) => calendarDateIST(year.start_date) <= date && date <= calendarDateIST(year.end_date));
}
