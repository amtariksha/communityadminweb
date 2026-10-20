import { addDays, todayIST } from './date';

/**
 * Preferred Service Date (HELP-16): a calendar day (YYYY-MM-DD) from today
 * in India up to a year ahead, as the API checks it.
 */
export const MAX_SERVICE_DATE_DAYS = 365;

/** The `min` / `max` of the date input. */
export function serviceDateRange(today: string = todayIST()): { min: string; max: string } {
  return { min: today, max: addDays(today, MAX_SERVICE_DATE_DAYS) };
}

/** Why a chosen date cannot be sent, or undefined; a blank date is fine. */
export function serviceDateError(day: string, today: string = todayIST()): string | undefined {
  if (!day) return undefined;
  const { min, max } = serviceDateRange(today);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < min || day > max) {
    return 'Choose a date from today up to a year ahead.';
  }
  return undefined;
}

/** `24/10/2026` for a stored day; `—` when there is none. */
export function formatServiceDate(day: string | null | undefined): string {
  if (!day) return '—';
  const [year, month, date] = day.slice(0, 10).split('-');
  return year && month && date ? `${date}/${month}/${year}` : '—';
}
