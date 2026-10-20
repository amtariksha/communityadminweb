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
import type { EntryReason, EntryReasonGridRow } from '@/hooks/use-gate-lists';

export interface ReasonValues {
  name: string;
  /** Minutes as text; '' = the society's overstay default. */
  stay: string;
}

// GATE-S1 Expected Stay choices (their full list was not captured; ours).
const STAY_MINUTES = [10, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440] as const;

export function stayLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/** The choices, plus a saved value outside them so it is not lost on Save. */
export function stayOptions(saved: readonly EntryReason[]): Array<{ value: string; label: string }> {
  const minutes = new Set<number>(STAY_MINUTES);
  for (const reason of saved) if (reason.expected_minutes !== null) minutes.add(reason.expected_minutes);
  return [
    { value: '', label: 'Society default' },
    ...[...minutes].sort((a, b) => a - b).map((value) => ({ value: String(value), label: stayLabel(value) })),
  ];
}

const blank = (): ReasonValues => ({ name: '', stay: '' });
const isBlank = (values: ReasonValues): boolean => !values.name.trim() && values.stay === '';

export function validateReasons(rows: readonly GridRowState<ReasonValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const name = row.values.name.trim();
    const key = name.toLowerCase();
    if (name.length < 2) errors[row.key] = 'A reason is at least 2 characters.';
    else if (seen.has(key)) errors[row.key] = 'Another reason already has this name.';
    seen.add(key);
  }
  return errors;
}

/** PUT /gate/entry-reasons/bulk rows: the whole list in grid order. */
export function toReasonRows(change: GridChange<ReasonValues>): EntryReasonGridRow[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    expected_minutes: row.values.stay === '' ? null : Number(row.values.stay),
    is_active: !row.inactive,
  }));
}

interface EntryReasonsGridProps {
  reasons: readonly EntryReason[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: EntryReasonGridRow[]) => Promise<unknown>;
}

/**
 * Gate & Visitors › Setup › Visitor Entry Reasons (GATE-41, block 4): the
 * reasons the guard app offers, each with an expected stay that drives the
 * overstay alert and the red rows; a reason is retired, never deleted.
 */
export function EntryReasonsGrid({ reasons, readOnly, isSaving, save }: EntryReasonsGridProps): ReactNode {
  const columns: GridColumn<ReasonValues>[] = [
    { key: 'name', header: 'Reason', kind: 'text', field: 'name', maxLength: 50 },
    { key: 'stay', header: 'Expected Stay', kind: 'select', field: 'stay', options: stayOptions(reasons) },
  ];

  async function onSave(change: GridChange<ReasonValues>): Promise<GridSaveResult | void> {
    try {
      await save(toReasonRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <EditableGrid
      label="Visitor entry reasons"
      columns={columns}
      rows={reasons.map((reason) => ({
        id: reason.id,
        values: { name: reason.name, stay: reason.expected_minutes === null ? '' : String(reason.expected_minutes) },
        inactive: !reason.is_active,
      }))}
      blank={blank}
      isBlank={isBlank}
      validate={validateReasons}
      reorder
      deactivate={{ header: 'Active', label: 'Retire' }}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No entry reasons yet. Add one below."
      onSave={onSave}
    />
  );
}
