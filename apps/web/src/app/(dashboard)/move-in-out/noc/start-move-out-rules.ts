import { addDays, todayIST } from '@/lib/date';

/** Start Move-Out as typed (MOVE-S11's form). */
export interface StartMoveOutValues {
  unitId: string;
  memberId: string;
  memberType: 'owner' | 'tenant' | null;
  exitDate: string;
  reason: string;
}

/** The earliest exit date the society may record: 30 days back (the API's rule). */
export function earliestExitDate(now: Date = new Date()): string {
  return addDays(todayIST(now), -30);
}

/** The first problem with the form, or null. */
export function startMoveOutError(values: StartMoveOutValues, now: Date = new Date()): string | null {
  if (!values.unitId) return 'Choose the unit.';
  if (!values.memberId) return 'Choose the owner or tenant moving out.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.exitDate)) return 'Give the exit date.';
  if (values.exitDate < earliestExitDate(now)) return 'The exit date can be at most 30 days back.';
  if (values.reason.length > 500) return 'The reason is at most 500 characters.';
  return null;
}
