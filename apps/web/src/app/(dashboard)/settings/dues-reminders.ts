/** The API accepts up to four reminder days a month (INC-02). */
export const REMINDER_SLOT_COUNT = 4;

export interface DuesReminders {
  enabled: boolean;
  days: number[];
}

/** Distinct days 1–31, ascending, at most four; 0 and anything invalid are dropped. */
export function normalizeReminderDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  const valid = days.filter(
    (day): day is number => Number.isInteger(day) && day >= 1 && day <= 31,
  );
  return [...new Set(valid)].sort((a, b) => a - b).slice(0, REMINDER_SLOT_COUNT);
}

/** settings_json.billing_reminders as saved, with the API's defaults (off, no days). */
export function readDuesReminders(saved: unknown): DuesReminders {
  const value = (saved ?? {}) as { enabled?: unknown; days?: unknown };
  return { enabled: value.enabled === true, days: normalizeReminderDays(value.days) };
}

/** Four select values for the form; unused slots are 0 ("Off"). */
export function daysToSlots(days: number[]): number[] {
  return Array.from({ length: REMINDER_SLOT_COUNT }, (_, index) => days[index] ?? 0);
}

export function sameReminders(a: DuesReminders, b: DuesReminders): boolean {
  return a.enabled === b.enabled && a.days.join(',') === b.days.join(',');
}

export function ordinalDay(day: number): string {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${day}th`;
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
  return `${day}${suffix}`;
}
