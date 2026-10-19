import type { MemberImportResult } from '@/hooks/use-units';
import { ApiError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';

/**
 * Rows of the Add Users grid (UNIT-14, screen UNIT-S3) and how they map
 * to POST /units/import-members and back. Pure, so the screen's rules are
 * tested without rendering.
 */

export const RESIDENT_TYPES = [
  { value: 'owner', label: 'Owner' },
  { value: 'owner_family', label: 'Owner Family' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'tenant_family', label: 'Tenant Family' },
] as const;

export type ResidentType = (typeof RESIDENT_TYPES)[number]['value'];

/** Rows the grid starts with, and adds with "Add 10 more rows". */
export const ROWS_PER_BATCH = 10;

export interface RowResult {
  tone: 'success' | 'error' | 'note';
  text: string;
}

export interface AddUserRow {
  key: string;
  firstName: string;
  lastName: string;
  unitId: string;
  phone: string;
  intercom: string;
  residentType: ResidentType | '';
  email: string;
  result?: RowResult;
}

export interface ImportMember {
  unit_id: string;
  name: string;
  phone: string;
  member_type: ResidentType;
  email?: string;
  intercom?: string;
}

type EditableField = Exclude<keyof AddUserRow, 'key' | 'result'>;
const FIELDS: readonly EditableField[] = ['firstName', 'lastName', 'unitId', 'phone', 'intercom', 'residentType', 'email'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let lastKey = 0;
export function blankRow(): AddUserRow {
  lastKey += 1;
  return { key: `add-user-${lastKey}`, firstName: '', lastName: '', unitId: '', phone: '', intercom: '', residentType: '', email: '' };
}

export function blankRows(count = ROWS_PER_BATCH): AddUserRow[] {
  return Array.from({ length: count }, blankRow);
}

export function isBlankRow(row: AddUserRow): boolean {
  return FIELDS.every((field) => String(row[field]).trim() === '');
}

/** What is wrong with a filled row before it can be sent, or null. */
function rowProblem(row: AddUserRow): string | null {
  const missing = [
    !row.firstName.trim() && 'First Name',
    !row.unitId && 'Unit No',
    !row.phone.trim() && 'Phone/Mobile',
    !row.residentType && 'Resident Type',
  ].filter(Boolean);
  if (missing.length > 0) return `Fill in ${missing.join(', ')}.`;
  const phone = normalizePhone(row.phone);
  if (!phone.ok) return phone.error;
  if (row.email.trim() && !EMAIL_RE.test(row.email.trim())) return 'Email Address is not valid.';
  if (row.intercom.trim().length > 20) return 'Intercom is at most 20 characters.';
  return null;
}

function toMember(row: AddUserRow): ImportMember {
  const phone = normalizePhone(row.phone);
  const member: ImportMember = {
    unit_id: row.unitId,
    name: `${row.firstName.trim()} ${row.lastName.trim()}`.trim(),
    phone: phone.ok ? phone.value : row.phone.trim(),
    member_type: row.residentType as ResidentType,
  };
  if (row.email.trim()) member.email = row.email.trim();
  if (row.intercom.trim()) member.intercom = row.intercom.trim();
  return member;
}

export interface PreparedImport {
  /** Rows as they show now, with the problems of rows that cannot go. */
  rows: AddUserRow[];
  members: ImportMember[];
  /** Key of the grid row behind each member sent, in request order. */
  sentKeys: string[];
}

/** The filled, complete rows go in one request; the others stay with their problem. */
export function prepareImport(rows: readonly AddUserRow[]): PreparedImport {
  const members: ImportMember[] = [];
  const sentKeys: string[] = [];
  const next = rows.map((row) => {
    if (isBlankRow(row)) return { ...row, result: undefined };
    const problem = rowProblem(row);
    if (problem) return { ...row, result: { tone: 'error' as const, text: problem } };
    members.push(toMember(row));
    sentKeys.push(row.key);
    return { ...row, result: undefined };
  });
  return { rows: next, members, sentKeys };
}

/** Result cells from the answer: created rows are cleared, the others keep their values. */
export function applyImportResult(rows: readonly AddUserRow[], sentKeys: readonly string[], result: MemberImportResult): AddUserRow[] {
  const byKey = new Map(
    (result.results ?? []).map((entry) => [sentKeys[entry.row - 1], entry] as const).filter(([key]) => key !== undefined),
  );
  return rows.map((row) => {
    const entry = byKey.get(row.key);
    if (!entry) return row;
    if (entry.status === 'skipped') return { ...row, result: { tone: 'error', text: entry.error ?? 'Not added' } };
    const created: RowResult = { tone: entry.note ? 'note' : 'success', text: entry.note ? `Created. ${entry.note}` : 'Created' };
    return { ...blankRow(), result: created };
  });
}

/** A 400 names rows by their place in the request (`members.2.email`); show it on those rows. */
export function applyRequestErrors(rows: readonly AddUserRow[], sentKeys: readonly string[], error: unknown): AddUserRow[] | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null;
  const messages = new Map<string, string>();
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    const match = /^members\.(\d+)\./.exec(field);
    const key = match ? sentKeys[Number(match[1])] : undefined;
    if (key && !messages.has(key)) messages.set(key, message);
  }
  if (messages.size === 0) return null;
  return rows.map((row) => {
    const message = messages.get(row.key);
    return message ? { ...row, result: { tone: 'error', text: message } } : row;
  });
}
