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
import type { InventoryCategory, InventoryCategoryGridRow } from '@/hooks/use-inventory-setup';

export interface InventoryCategoryValues {
  name: string;
}

const blank = (): InventoryCategoryValues => ({ name: '' });
const isBlank = (values: InventoryCategoryValues): boolean => !values.name.trim();

/** Per-row messages: 1–100 characters, no name twice (case ignored); blank spare rows are skipped. */
export function validateInventoryCategories(rows: readonly GridRowState<InventoryCategoryValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const name = row.values.name.trim();
    if (!row.id && !name) continue;
    if (!name) errors[row.key] = 'Enter the category.';
    else if (name.length > 100) errors[row.key] = 'A category is at most 100 characters.';
    else if (seen.has(name.toLowerCase())) errors[row.key] = `"${name}" is already in the list.`;
    seen.add(name.toLowerCase());
  }
  return errors;
}

export function toInventoryCategoryRows(change: GridChange<InventoryCategoryValues>): InventoryCategoryGridRow[] {
  return change.rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), name: row.values.name.trim(), is_active: !row.inactive }));
}

const COLUMNS: GridColumn<InventoryCategoryValues>[] = [{ key: 'name', header: 'Category', kind: 'text', field: 'name', maxLength: 100 }];

interface InventoryCategoriesGridProps {
  categories: readonly InventoryCategory[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: InventoryCategoryGridRow[]) => Promise<unknown>;
}

/** Set up Inventory Categories (ASSET-S2 form 1): rename in place, retire, ten spare rows, one Save Changes. */
export function InventoryCategoriesGrid({ categories, readOnly, isSaving, save }: InventoryCategoriesGridProps): ReactNode {
  async function onSave(change: GridChange<InventoryCategoryValues>): Promise<GridSaveResult | void> {
    try {
      await save(toInventoryCategoryRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }
  return (
    <EditableGrid
      label="Inventory categories"
      columns={COLUMNS}
      rows={categories.map((category) => ({ id: category.id, values: { name: category.name }, inactive: !category.is_active }))}
      blank={blank}
      isBlank={isBlank}
      validate={validateInventoryCategories}
      spareRows={10}
      deactivate={{ header: 'Active', label: 'Retire' }}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No inventory categories yet. Add them below."
      onSave={onSave}
    />
  );
}
