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
import { ApiError } from '@/lib/api-error';
import type { UnitBillingCategory, UnitBillingCategoryRow } from '@/hooks/use-unit-billing-categories';

const MAX_NAME_LENGTH = 60;

export interface UnitTypeValues {
  name: string;
  gstThreshold: boolean;
  units: number;
}

const blank = (): UnitTypeValues => ({ name: '', gstThreshold: true, units: 0 });
const isBlank = (values: UnitTypeValues): boolean => values.name.trim() === '';
const key = (name: string): string => name.trim().toLowerCase();

/** Names must differ ignoring case; a saved type with its name blanked is a removal. */
export function validateUnitTypes(rows: readonly GridRowState<UnitTypeValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (isBlank(row.values)) continue;
    const name = key(row.values.name);
    const clash = seen.get(name);
    if (clash) {
      errors[row.key] = 'Unit type names must be different.';
      errors[clash] = 'Unit type names must be different.';
    } else {
      seen.set(name, row.key);
    }
  }
  return errors;
}

/** PUT /unit-billing-categories rows: the whole list in grid order. */
export function toUnitTypeRows(change: GridChange<UnitTypeValues>): UnitBillingCategoryRow[] {
  return change.rows.map((row) => {
    const values = { name: row.values.name.trim(), gst_threshold_applies: row.values.gstThreshold };
    return row.id ? { id: row.id, ...values } : values;
  });
}

export const savedUnitTypeRows = (types: readonly UnitBillingCategory[]) =>
  types.map((type) => ({
    id: type.id,
    values: { name: type.name, gstThreshold: type.gst_threshold_applies, units: type.unit_count },
  }));

// A type still in use cannot be removed (409): the message goes on the rows being removed.
function inUseErrors(error: unknown, change: GridChange<UnitTypeValues>): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'unit_billing_category_in_use') return {};
  return Object.fromEntries(
    change.rows.filter((row) => row.id && isBlank(row.values)).map((row) => [row.key, error.message]),
  );
}

const COLUMNS: GridColumn<UnitTypeValues>[] = [
  { key: 'name', header: 'Unit type', kind: 'text', field: 'name', maxLength: MAX_NAME_LENGTH },
  { key: 'gst', header: 'GST only above ₹7,500 a month', kind: 'checkbox', field: 'gstThreshold' },
  { key: 'units', header: 'Units', kind: 'custom', render: ({ row }) => <span>{row.values.units}</span> },
];

interface UnitTypesGridProps {
  types: readonly UnitBillingCategory[];
  readOnly: boolean;
  isSaving: boolean;
  /** Resolves when saved; rejects with the API error otherwise. */
  save: (rows: UnitBillingCategoryRow[]) => Promise<unknown>;
}

/** Unit types for billing on the shared editable grid (SB-08, INC-15). */
export function UnitTypesGrid({ types, readOnly, isSaving, save }: UnitTypesGridProps): ReactNode {
  async function onSave(change: GridChange<UnitTypeValues>): Promise<GridSaveResult | void> {
    try {
      await save(toUnitTypeRows(change));
    } catch (error) {
      return { rowErrors: { ...rowErrorsFromApi(error, change), ...inUseErrors(error, change) } };
    }
  }

  return (
    <EditableGrid
      label="Unit types"
      columns={COLUMNS}
      rows={savedUnitTypeRows(types)}
      blank={blank}
      isBlank={isBlank}
      validate={validateUnitTypes}
      spareRows={3}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="Add your first unit type"
      onSave={onSave}
    />
  );
}
