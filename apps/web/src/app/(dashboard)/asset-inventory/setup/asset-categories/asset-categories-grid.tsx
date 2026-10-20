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
import type { AssetCategory, AssetCategoryGridRow } from '@/hooks/use-asset-categories';

/** ASSET-S1: ten blank rows after the saved ones. */
export const SPARE_CATEGORY_ROWS = 10;

export interface AssetCategoryValues {
  name: string;
}

const blank = (): AssetCategoryValues => ({ name: '' });
const isBlank = (values: AssetCategoryValues): boolean => !values.name.trim();

/** Per-row messages: 1–100 characters, no name twice (case ignored); blank spare rows are skipped. */
export function validateAssetCategories(rows: readonly GridRowState<AssetCategoryValues>[]): Record<string, string> {
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

/** PUT rows: the whole list in grid order; a retired row is `is_active: false`. */
export function toAssetCategoryRows(change: GridChange<AssetCategoryValues>): AssetCategoryGridRow[] {
  return change.rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), name: row.values.name.trim(), is_active: !row.inactive }));
}

const COLUMNS: GridColumn<AssetCategoryValues>[] = [{ key: 'name', header: 'Category', kind: 'text', field: 'name', maxLength: 100 }];

interface AssetCategoriesGridProps {
  categories: readonly AssetCategory[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: AssetCategoryGridRow[]) => Promise<unknown>;
}

/**
 * Setup Asset Categories (ASSET-S1, ASSET-16) on the shared grid: rename
 * in place, retire instead of delete (refused while active assets use the
 * category), ten spare rows and one Save Changes.
 */
export function AssetCategoriesGrid({ categories, readOnly, isSaving, save }: AssetCategoriesGridProps): ReactNode {
  async function onSave(change: GridChange<AssetCategoryValues>): Promise<GridSaveResult | void> {
    try {
      await save(toAssetCategoryRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }
  return (
    <EditableGrid
      label="Asset categories"
      columns={COLUMNS}
      rows={categories.map((category) => ({ id: category.id, values: { name: category.name }, inactive: !category.is_active }))}
      blank={blank}
      isBlank={isBlank}
      validate={validateAssetCategories}
      spareRows={SPARE_CATEGORY_ROWS}
      deactivate={{ header: 'Active', label: 'Retire' }}
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No asset categories yet. Add them below."
      onSave={onSave}
    />
  );
}
