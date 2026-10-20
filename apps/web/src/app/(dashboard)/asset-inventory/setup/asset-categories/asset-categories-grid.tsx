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
import type { AssetCategory, AssetCategoryGridRow, DepreciationMethod } from '@/hooks/use-asset-categories';

/** ASSET-S1: ten blank rows after the saved ones. */
export const SPARE_CATEGORY_ROWS = 10;

/** A grid row: the name and (ASSET-19) the depreciation inputs, as typed. */
export interface AssetCategoryValues {
  name: string;
  method: string;
  rate: string;
  life: string;
  residual: string;
}

const blank = (): AssetCategoryValues => ({ name: '', method: '', rate: '', life: '', residual: '5' });
const isBlank = (values: AssetCategoryValues): boolean => !values.name.trim();

export const DEPRECIATION_METHOD_OPTIONS: ReadonlyArray<{ value: DepreciationMethod; label: string }> = [
  { value: 'slm', label: 'Straight line' },
  { value: 'wdv', label: 'Written-down value' },
];

/** A stored category as grid values (numbers without trailing zeros). */
export function categoryValues(category: AssetCategory): AssetCategoryValues {
  const plain = (value: string | number | null): string => (value === null || value === '' ? '' : String(Number(value)));
  return {
    name: category.name,
    method: category.depreciation_method ?? '',
    rate: plain(category.depreciation_rate),
    life: plain(category.useful_life_years),
    residual: plain(category.residual_percent),
  };
}

/** The depreciation inputs' problem on a row, or null. */
function depreciationError(values: AssetCategoryValues): string | null {
  const rate = values.rate.trim() === '' ? null : Number(values.rate);
  const life = values.life.trim() === '' ? null : Number(values.life);
  const residual = values.residual.trim() === '' ? 5 : Number(values.residual);
  if (rate !== null && !(rate > 0 && rate <= 100)) return 'The rate is more than 0 and at most 100%.';
  if (life !== null && !(Number.isInteger(life) && life >= 1 && life <= 100)) return 'The useful life is 1 to 100 whole years.';
  if (!(residual >= 0 && residual < 100)) return 'The residual value is 0 to 99.99% of cost.';
  if (values.method === 'wdv' && rate === null && life === null) return 'Written-down value needs a rate or a useful life.';
  return null;
}

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
    else {
      const problem = depreciationError(row.values);
      if (problem) errors[row.key] = problem;
    }
    seen.add(name.toLowerCase());
  }
  return errors;
}

/** PUT rows: the whole list in grid order; a retired row is `is_active: false`. */
export function toAssetCategoryRows(change: GridChange<AssetCategoryValues>): AssetCategoryGridRow[] {
  const number = (text: string): number | null => (text.trim() === '' ? null : Number(text));
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    is_active: !row.inactive,
    depreciation_method: (row.values.method || null) as DepreciationMethod | null,
    depreciation_rate: number(row.values.rate),
    useful_life_years: number(row.values.life),
    residual_percent: number(row.values.residual) ?? 5,
  }));
}

const COLUMNS: GridColumn<AssetCategoryValues>[] = [
  { key: 'name', header: 'Category', kind: 'text', field: 'name', maxLength: 100 },
  // ASSET-19: blank method = straight line once a rate or life is set (decision A6).
  { key: 'method', header: 'Depreciation method', kind: 'select', field: 'method', options: DEPRECIATION_METHOD_OPTIONS, placeholder: 'Not set' },
  { key: 'rate', header: 'Rate %', kind: 'number', field: 'rate', min: 0, max: 100, step: 'any', className: 'w-24' },
  { key: 'life', header: 'Useful life (years)', kind: 'number', field: 'life', min: 1, max: 100, step: 1, className: 'w-24' },
  { key: 'residual', header: 'Residual %', kind: 'number', field: 'residual', min: 0, max: 99.99, step: 'any', className: 'w-24' },
];

interface AssetCategoriesGridProps {
  categories: readonly AssetCategory[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: AssetCategoryGridRow[]) => Promise<unknown>;
}

/**
 * Setup Asset Categories (ASSET-S1, ASSET-16) on the shared grid: rename
 * in place, retire instead of delete (refused while active assets use the
 * category), ten spare rows and one Save Changes. Each category carries
 * its depreciation inputs (ASSET-19): method, rate or useful life and the
 * residual value; the reports use them, nothing is posted.
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
      rows={categories.map((category) => ({ id: category.id, values: categoryValues(category), inactive: !category.is_active }))}
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
