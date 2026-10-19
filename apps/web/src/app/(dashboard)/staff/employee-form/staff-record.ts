import type { Staff, StaffGender } from '@/hooks/use-staff';
import { dateIST, todayIST } from '@/lib/date';

/**
 * The badge and profile part of Add / Edit Staff (STAFF-20, screen
 * STAFF-S3): what the form holds, how Badge Valid Till is worked out (the
 * same rule as the API), and what is sent.
 */

export const GENDER_OPTIONS: ReadonlyArray<{ value: StaffGender; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const VALIDITY_OPTIONS = [
  { value: '0', label: 'No Expiry' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '9', label: '9 months' },
] as const;

export interface StaffRecordDraft {
  badgeNo: string;
  issuedOn: string;
  /** '0' | '3' | '6' | '9', or '' to leave a saved validity alone. */
  validity: string;
  gender: string;
  qualification: string;
  skills: string;
  languages: string;
  notes: string;
  idProofNumber: string;
  leftOn: string;
}

/** A DATE the API sends (a day or a timestamp) as India's `YYYY-MM-DD`. */
export const dayOf = (value: string | null | undefined): string => (value ? dateIST(value) : '');

/** The day before the same date `months` later; a short month runs to its last day. Null for No Expiry. */
export function badgeValidUntil(issuedOn: string, months: number): string | null {
  if (months === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) return null;
  const [year, month, date] = issuedOn.split('-').map(Number);
  const target = month - 1 + months;
  const lastOfTarget = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
  const end = date > lastOfTarget ? new Date(Date.UTC(year, target + 1, 1)) : new Date(Date.UTC(year, target, date));
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

/** The validity choice that gives the saved Valid Till, else '' (left alone). */
function savedValidity(issuedOn: string, validUntil: string): string {
  if (!validUntil) return '0';
  const match = VALIDITY_OPTIONS.find((option) => option.value !== '0' && badgeValidUntil(issuedOn, Number(option.value)) === validUntil);
  return match?.value ?? '';
}

export function recordDraftFrom(employee?: Staff | null): StaffRecordDraft {
  const issuedOn = dayOf(employee?.badge_issued_on);
  return {
    badgeNo: employee?.badge_no ?? '',
    issuedOn,
    validity: employee ? savedValidity(issuedOn, dayOf(employee.badge_valid_until)) : '0',
    gender: employee?.gender ?? '',
    qualification: employee?.qualification ?? '',
    skills: employee?.skills ?? '',
    languages: employee?.languages ?? '',
    notes: employee?.notes ?? '',
    idProofNumber: employee?.id_proof_number ?? '',
    leftOn: dayOf(employee?.exit_date),
  };
}

const LIMITS: ReadonlyArray<[keyof StaffRecordDraft, number, string]> = [
  ['badgeNo', 20, 'Badge No.'],
  ['qualification', 100, 'Qualification'],
  ['skills', 200, 'Skills'],
  ['languages', 200, 'Languages'],
  ['notes', 1000, 'Notes'],
  ['idProofNumber', 50, 'Id proof number'],
];

/** A problem with the typed record, or null. */
export function recordDraftError(draft: StaffRecordDraft): string | null {
  const tooLong = LIMITS.find(([field, max]) => draft[field].trim().length > max);
  return tooLong ? `${tooLong[2]} has at most ${tooLong[1]} characters.` : null;
}

/** What Badge Valid Till will read after a save ('' = no expiry or unknown). */
export function validTillPreview(draft: StaffRecordDraft, saved?: Staff | null): string {
  if (draft.validity === '') return dayOf(saved?.badge_valid_until);
  return badgeValidUntil(issuedOrToday(draft), Number(draft.validity)) ?? '';
}

/** An expiring badge is issued today unless a date is typed (as the API does). */
function issuedOrToday(draft: StaffRecordDraft): string {
  return draft.issuedOn || (Number(draft.validity) > 0 ? todayIST() : '');
}

const orNull = (text: string): string | null => text.trim() || null;

/**
 * The record fields to send. A blank badge on Add is left out, so the API
 * gives the next free number; on Edit it takes the badge away.
 */
export function recordPayload(draft: StaffRecordDraft, editing: boolean): Record<string, unknown> {
  const badge = draft.badgeNo.trim();
  return {
    ...(badge || editing ? { badge_no: badge || null } : {}),
    badge_issued_on: issuedOrToday(draft) || null,
    ...(draft.validity === '' ? {} : { badge_validity_months: Number(draft.validity) }),
    gender: draft.gender || null,
    qualification: orNull(draft.qualification),
    skills: orNull(draft.skills),
    languages: orNull(draft.languages),
    notes: orNull(draft.notes),
    id_proof_number: draft.idProofNumber.trim() || undefined,
    ...(editing ? { exit_date: draft.leftOn || null } : {}),
  };
}
