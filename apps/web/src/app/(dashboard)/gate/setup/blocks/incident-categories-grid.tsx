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
import type { IncidentCategory, IncidentCategoryGridRow } from '@/hooks/use-gate-lists';

export interface CategoryValues {
  name: string;
}

const COLUMNS: GridColumn<CategoryValues>[] = [{ key: 'name', header: 'Category', kind: 'text', field: 'name', maxLength: 60 }];
const blank = (): CategoryValues => ({ name: '' });
const isBlank = (values: CategoryValues): boolean => !values.name.trim();

export function validateCategories(rows: readonly GridRowState<CategoryValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const name = row.values.name.trim();
    if (name.length < 2) errors[row.key] = 'A category is at least 2 characters.';
    else if (seen.has(name.toLowerCase())) errors[row.key] = 'Another category already has this name.';
    seen.add(name.toLowerCase());
  }
  return errors;
}

export function toCategoryRows(change: GridChange<CategoryValues>): IncidentCategoryGridRow[] {
  return change.rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), name: row.values.name.trim(), is_active: !row.inactive }));
}

interface IncidentCategoriesGridProps {
  categories: readonly IncidentCategory[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: IncidentCategoryGridRow[]) => Promise<unknown>;
}

/** Gate & Visitors › Setup › Incident Categories (GATE-42, block 8). */
export function IncidentCategoriesGrid({ categories, readOnly, isSaving, save }: IncidentCategoriesGridProps): ReactNode {
  async function onSave(change: GridChange<CategoryValues>): Promise<GridSaveResult | void> {
    try {
      await save(toCategoryRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }
  return (
    <EditableGrid
      label="Incident categories"
      columns={COLUMNS}
      rows={categories.map((category) => ({ id: category.id, values: { name: category.name }, inactive: !category.is_active }))}
      blank={blank}
      isBlank={isBlank}
      validate={validateCategories}
      reorder
      deactivate={{ header: 'Active', label: 'Retire' }}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No incident categories yet. Add one below."
      onSave={onSave}
    />
  );
}
