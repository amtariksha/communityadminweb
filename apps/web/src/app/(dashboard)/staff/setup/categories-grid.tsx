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
import type { StaffCategory, StaffCategoryGridRow } from '@/hooks/use-staff-categories';

export interface CategoryValues {
  name: string;
  kind: string;
  gate: boolean;
}

const KINDS = [
  { value: 'official', label: 'Official Staff' },
  { value: 'domestic', label: 'Domestic Staff' },
];

const COLUMNS: GridColumn<CategoryValues>[] = [
  { key: 'name', header: 'Category', kind: 'text', field: 'name', maxLength: 50 },
  { key: 'kind', header: 'Official / Domestic', kind: 'select', field: 'kind', options: KINDS },
  { key: 'gate', header: 'Gate access', kind: 'checkbox', field: 'gate' },
];

const blank = (): CategoryValues => ({ name: '', kind: 'official', gate: false });
const isBlank = (values: CategoryValues): boolean => !values.name.trim() && !values.gate;

export function validateCategories(rows: readonly GridRowState<CategoryValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const name = row.values.name.trim();
    if (name.length < 2) errors[row.key] = 'A category is at least 2 characters.';
    else if (seen.has(name.toLowerCase())) errors[row.key] = 'Another category already has this name.';
    else if (row.values.kind === 'domestic' && row.values.gate) errors[row.key] = 'Only society (Official) staff get the guard app.';
    seen.add(name.toLowerCase());
  }
  return errors;
}

export function toCategoryRows(change: GridChange<CategoryValues>): StaffCategoryGridRow[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    kind: row.values.kind === 'domestic' ? 'domestic' : 'official',
    grants_guard_role: row.values.gate,
    is_active: !row.inactive,
  }));
}

interface StaffCategoriesGridProps {
  categories: readonly StaffCategory[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: StaffCategoryGridRow[]) => Promise<unknown>;
}

/**
 * Staff Manager › Setup › Set up Staff Categories (STAFF-41, block 1): each
 * category Official (paid by the society) or Domestic (paid by flats), and
 * whether its members get the guard app; retired, never deleted.
 */
export function StaffCategoriesGrid({ categories, readOnly, isSaving, save }: StaffCategoriesGridProps): ReactNode {
  async function onSave(change: GridChange<CategoryValues>): Promise<GridSaveResult | void> {
    try {
      await save(toCategoryRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }
  return (
    <EditableGrid
      label="Staff categories"
      columns={COLUMNS}
      rows={categories.map((category) => ({
        id: category.id,
        values: { name: category.name, kind: category.kind, gate: category.grants_guard_role },
        inactive: !category.is_active,
      }))}
      blank={blank}
      isBlank={isBlank}
      validate={validateCategories}
      reorder
      deactivate={{ header: 'Active', label: 'Retire' }}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No staff categories yet. Add one below."
      onSave={onSave}
    />
  );
}
