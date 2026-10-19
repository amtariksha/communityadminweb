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
import type { Gate } from '@/hooks/use-staff';
import type { GateGridRow } from '@/hooks/use-gate-grid';

export interface GateValues {
  name: string;
  entry: boolean;
  exit: boolean;
  location: string;
  type: string;
}

// The stored types (gates CHECK, migration 018).
export const GATE_TYPES = [
  { value: 'vehicle_and_pedestrian', label: 'Vehicle & pedestrian' },
  { value: 'vehicle_only', label: 'Vehicle only' },
  { value: 'pedestrian_only', label: 'Pedestrian only' },
  { value: 'service', label: 'Service' },
] as const;

const blank = (): GateValues => ({ name: '', entry: true, exit: true, location: '', type: 'vehicle_and_pedestrian' });
// A spare row starts In and Out; it counts as blank until it is named.
const isBlank = (values: GateValues): boolean => !values.name.trim() && !values.location.trim();

export function validateGates(rows: readonly GridRowState<GateValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const key = row.values.name.trim().toLowerCase();
    if (!key) errors[row.key] = 'Enter a gate name.';
    else if (seen.has(key)) errors[row.key] = 'Another gate already has this name.';
    else if (!row.inactive && !row.values.entry && !row.values.exit) errors[row.key] = 'Tick In, Out or both for an active gate.';
    seen.add(key);
  }
  return errors;
}

export const savedGateRows = (gates: readonly Gate[]) =>
  gates.map((gate) => ({
    id: gate.id,
    values: {
      name: gate.name,
      // An older API sends neither flag: every gate is In and Out there.
      entry: gate.allows_entry !== false,
      exit: gate.allows_exit !== false,
      location: gate.location ?? '',
      type: gate.gate_type,
    },
    inactive: !gate.is_active,
  }));

/** PUT /gate/gates/bulk rows: the whole list; a retired row is `is_active: false`. */
export function toGateRows(change: GridChange<GateValues>): GateGridRow[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    location: row.values.location.trim() || null,
    gate_type: row.values.type || 'vehicle_and_pedestrian',
    allows_entry: row.values.entry,
    allows_exit: row.values.exit,
    is_active: !row.inactive,
  }));
}

const COLUMNS: GridColumn<GateValues>[] = [
  { key: 'name', header: 'Gate Name', kind: 'text', field: 'name', maxLength: 100 },
  { key: 'entry', header: 'In', kind: 'checkbox', field: 'entry' },
  { key: 'exit', header: 'Out', kind: 'checkbox', field: 'exit' },
  { key: 'location', header: 'Location', kind: 'text', field: 'location', maxLength: 200 },
  { key: 'type', header: 'Type', kind: 'select', field: 'type', options: GATE_TYPES },
];

interface GatesGridProps {
  gates: readonly Gate[];
  readOnly: boolean;
  isSaving: boolean;
  /** Resolves when saved; rejects with the API error otherwise. */
  save: (rows: GateGridRow[]) => Promise<unknown>;
}

/**
 * Gate & Visitors › Setup › Gates (GATE-20, GATE-S1 block 3) on the shared
 * grid: name, In, Out, location and type edited in place, 5 spare rows, a
 * gate retired (never deleted) and one Save Changes for the whole list.
 */
export function GatesGrid({ gates, readOnly, isSaving, save }: GatesGridProps): ReactNode {
  async function onSave(change: GridChange<GateValues>): Promise<GridSaveResult | void> {
    try {
      await save(toGateRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <EditableGrid
      label="Gates"
      columns={COLUMNS}
      rows={savedGateRows(gates)}
      blank={blank}
      isBlank={isBlank}
      validate={validateGates}
      deactivate={{ header: 'Active', label: 'Retire' }}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No gates yet. Add one below."
      onSave={onSave}
    />
  );
}
