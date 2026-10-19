import type { Staff } from '@/hooks/use-staff';

/**
 * Field names and option lists of the Staff page, in the API's terms
 * (STAFF-01): society_staff.join_date, staff_leaves.start_date / end_date,
 * staff_shift_assignments.effective_from / effective_until.
 */

export const LEAVE_TYPE_OPTIONS = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'compensatory', label: 'Compensatory Leave' },
] as const;

export const EMPLOYEE_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'staff_type', label: 'Type' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'join_date', label: 'Joined' },
] as const;

/** Export rows: `status` is Active / Inactive from is_active; the join date as YYYY-MM-DD. */
export function employeeExportRows(employees: readonly Staff[]): Record<string, unknown>[] {
  return employees.map((employee) => ({
    ...employee,
    status: employee.is_active ? 'Active' : 'Inactive',
    join_date: dateOnly(employee.join_date),
  }));
}

/** "2026-10-01" from a DATE the API sends as a date or a timestamp. */
export function dateOnly(value: string | null | undefined): string {
  return value ? value.split('T')[0] : '';
}

/** "8h 0m"; "-" while clocked in. */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '-';
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/** The salary typed on the form, or undefined for blank. Refuses negatives and junk. */
export function salaryFromInput(text: string): { ok: true; value: number | undefined } | { ok: false } {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: undefined };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100) return { ok: false };
  return { ok: true, value };
}
