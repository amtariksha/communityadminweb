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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAmenitySlotSettings, useSaveAmenitySlots, type AmenitySlotRowInput, type AmenitySlotSetting } from '@/hooks/use-amenity-setup';
import { ApiError, friendlyError } from '@/lib/api-error';

/**
 * AMEN-20 — Add / Edit Amenity › Slots (By Slot): up to 40 named, priced
 * slots, each every day or on one weekday, saved as one grid (SB-08). A
 * slot is retired, never deleted; one without a cost charges the amenity's
 * rate. Overlaps are refused by the API row by row.
 */

export const MAX_SLOTS = 40;

export interface SlotValues {
  name: string;
  cost: string;
  /** '' = every day, else 0 (Sunday) … 6. */
  day: string;
  start: string;
  end: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_OPTIONS = [{ value: '', label: 'Every day' }, ...DAYS.map((label, index) => ({ value: String(index), label }))];
const TIME = /^\d{2}:\d{2}$/;

const blank = (): SlotValues => ({ name: '', cost: '', day: '', start: '', end: '' });
const isBlank = (values: SlotValues): boolean => !values.name.trim() && !values.cost.trim() && !values.start && !values.end;

export function savedSlotRows(slots: readonly AmenitySlotSetting[]) {
  return slots.map((slot) => ({
    id: slot.id,
    inactive: !slot.is_active,
    values: {
      name: slot.name ?? '',
      cost: slot.cost ?? '',
      day: slot.day_of_week === null ? '' : String(slot.day_of_week),
      start: slot.start_time.slice(0, 5),
      end: slot.end_time.slice(0, 5),
    },
  }));
}

/** Rows the API will refuse anyway: times missing or the end not after the start, a bad cost. */
export function validateSlots(rows: readonly GridRowState<SlotValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const { start, end, cost } = row.values;
    if (!TIME.test(start) || !TIME.test(end)) errors[row.key] = 'Give the start and end times.';
    else if (end !== '00:00' && end <= start) errors[row.key] = 'The end must be after the start.';
    else if (cost.trim() && !(Number(cost) >= 0)) errors[row.key] = 'The cost is an amount of 0 or more.';
  }
  return errors;
}

/** PUT /amenities/:id/slots/bulk rows: the whole list in grid order. */
export function toSlotRows(change: GridChange<SlotValues>): AmenitySlotRowInput[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim() || null,
    cost: row.values.cost.trim() === '' ? null : Number(row.values.cost),
    day_of_week: row.values.day === '' ? null : Number(row.values.day),
    start_time: row.values.start,
    end_time: row.values.end,
    is_active: !row.inactive,
  }));
}

const timeCell = (field: 'start' | 'end', header: string): GridColumn<SlotValues> => ({
  key: field,
  header,
  kind: 'custom',
  render: ({ row, change, disabled, label }) => (
    <Input type="time" aria-label={label} disabled={disabled} value={row.values[field]} onChange={(e) => change({ [field]: e.target.value })} />
  ),
});

const COLUMNS: GridColumn<SlotValues>[] = [
  { key: 'name', header: 'Slot', kind: 'text', field: 'name', maxLength: 50, placeholder: 'e.g. Morning' },
  { key: 'cost', header: 'Cost', kind: 'number', field: 'cost', min: 0, step: 0.01 },
  { key: 'day', header: 'Day', kind: 'select', field: 'day', options: DAY_OPTIONS },
  timeCell('start', 'From'),
  timeCell('end', 'To'),
];

export function SlotGrid({ amenityId }: { amenityId: string }): ReactNode {
  const { addToast } = useToast();
  const slotsQuery = useAmenitySlotSettings(amenityId);
  const save = useSaveAmenitySlots(amenityId);

  if (slotsQuery.isLoading) return <Skeleton className="h-24 w-full" />;
  if (slotsQuery.error || !slotsQuery.data) {
    const notYet = slotsQuery.error instanceof ApiError && slotsQuery.error.status === 404;
    return <p className="text-sm text-muted-foreground">{notYet ? 'Slots are not available yet on this server.' : 'The slots could not be loaded.'}</p>;
  }
  const slots = slotsQuery.data;

  async function onSave(change: GridChange<SlotValues>): Promise<GridSaveResult | void> {
    try {
      await save.mutateAsync(toSlotRows(change));
      addToast({ title: 'Slots saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the slots', description: friendlyError(error), variant: 'destructive' });
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <EditableGrid
      key={slots.map((slot) => `${slot.id}:${slot.is_active}`).join(',')}
      label="Slots"
      columns={COLUMNS}
      rows={savedSlotRows(slots)}
      blank={blank}
      isBlank={isBlank}
      validate={validateSlots}
      spareRows={Math.max(1, MAX_SLOTS - slots.filter((slot) => slot.is_active).length)}
      reorder
      deactivate={{ header: 'Retire', label: 'Retire' }}
      isSaving={save.isPending}
      emptyText="No slots yet"
      onSave={onSave}
    />
  );
}
