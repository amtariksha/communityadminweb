'use client';

import { type ReactNode } from 'react';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridChange,
  type GridColumn,
  type GridRowState,
  type GridSaveResult,
} from '@/components/editable-grid';
import { Input } from '@/components/ui/input';
import type { Shift, ShiftGridRow } from '@/hooks/use-staff';

export interface ShiftValues {
  name: string;
  /** HH:MM, 24-hour. */
  start: string;
  /** Typed hours, 0.5–24 in steps of 0.5. */
  hours: string;
}

const MINUTES_PER_DAY = 24 * 60;
const blank = (): ShiftValues => ({ name: '', start: '', hours: '' });
const isBlank = (values: ShiftValues): boolean => !values.name.trim() && !values.start && !values.hours;
const minutesOf = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Hours of a saved shift; an end equal to its start is 24 hours. */
export function hoursBetween(start: string, end: string): number {
  const span = (minutesOf(end) - minutesOf(start) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return (span === 0 ? MINUTES_PER_DAY : span) / 60;
}

/** `22:00` → `10:00 PM`; the grid shows times with AM / PM (STAFF-22). */
export function clock12(time: string): string {
  if (!/^\d{2}:\d{2}/.test(time)) return '';
  const hour = Number(time.slice(0, 2));
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${String(hour % 12 === 0 ? 12 : hour % 12).padStart(2, '0')}:${time.slice(3, 5)} ${suffix}`;
}

/** The end time the server will store, or '' while start or hours are not valid. */
export function shiftEnds(values: ShiftValues): string {
  const hours = Number(values.hours);
  if (!/^\d{2}:\d{2}$/.test(values.start) || !validHours(hours)) return '';
  return clock((minutesOf(values.start) + hours * 60) % MINUTES_PER_DAY);
}

const validHours = (hours: number): boolean => Number.isFinite(hours) && hours >= 0.5 && hours <= 24 && Number.isInteger(hours * 2);

export function validateShifts(rows: readonly GridRowState<ShiftValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    if (!row.values.name.trim()) errors[row.key] = 'Enter a shift name.';
    else if (!/^\d{2}:\d{2}$/.test(row.values.start)) errors[row.key] = 'Enter the start time.';
    else if (!validHours(Number(row.values.hours))) errors[row.key] = 'Shift hours are 0.5 to 24, in steps of 0.5.';
  }
  return errors;
}

export const savedShiftRows = (shifts: readonly Shift[]) =>
  shifts.map((shift) => ({
    id: shift.id,
    values: {
      name: shift.name,
      start: shift.start_time.slice(0, 5),
      hours: String(shift.hours ?? hoursBetween(shift.start_time, shift.end_time)),
    },
    // An older API sends no is_active: every shift is active there.
    inactive: shift.is_active === false,
  }));

/** PUT /staff/shifts/bulk rows: the whole list; a retired row is `is_active: false`. */
export function toShiftRows(change: GridChange<ShiftValues>): ShiftGridRow[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    start_time: row.values.start,
    hours: Number(row.values.hours),
    is_active: !row.inactive,
  }));
}

const COLUMNS: GridColumn<ShiftValues>[] = [
  { key: 'name', header: 'Shift Name', kind: 'text', field: 'name', maxLength: 100 },
  {
    key: 'start',
    header: 'Shift Start Time',
    kind: 'custom',
    render: ({ row, label, disabled, change }) => (
      <div className="space-y-1">
        <Input type="time" aria-label={label} disabled={disabled} value={row.values.start} onChange={(event) => change({ start: event.target.value })} />
        {row.values.start && <p className="text-xs tabular-nums text-muted-foreground">{clock12(row.values.start)}</p>}
      </div>
    ),
  },
  { key: 'hours', header: 'Shift Hours', kind: 'number', field: 'hours', min: 0.5, max: 24, step: 0.5 },
  { key: 'ends', header: 'Ends', kind: 'custom', render: ({ row }) => <span className="tabular-nums">{clock12(shiftEnds(row.values)) || '—'}</span> },
];

interface ShiftsGridProps {
  shifts: readonly Shift[];
  readOnly: boolean;
  isSaving: boolean;
  /** Resolves when saved; rejects with the API error otherwise. */
  save: (rows: ShiftGridRow[]) => Promise<unknown>;
}

/**
 * Staff Shift Management (STAFF-11, STAFF-22, STAFF-S1 block 3) on the shared
 * grid: name, start time and hours edited in place, start and Ends shown with
 * AM / PM, a shift
 * retired (never deleted) and one Save Changes for the whole list.
 */
export function ShiftsGrid({ shifts, readOnly, isSaving, save }: ShiftsGridProps): ReactNode {
  async function onSave(change: GridChange<ShiftValues>): Promise<GridSaveResult | void> {
    try {
      await save(toShiftRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <EditableGrid
      label="Shifts"
      columns={COLUMNS}
      rows={savedShiftRows(shifts)}
      blank={blank}
      isBlank={isBlank}
      validate={validateShifts}
      spareRows={3}
      deactivate={{ header: 'Active', label: 'Retire' }}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No shifts yet. Add one below."
      onSave={onSave}
    />
  );
}
