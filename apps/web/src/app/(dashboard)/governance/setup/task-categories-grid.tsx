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
import type { TaskCategory, TaskCategoryGridRow } from '@/hooks/use-task-categories';

/** PROJ-S1: one category per numbered slot, at most twelve active. */
export const MAX_ACTIVE_CATEGORIES = 12;

export interface CategoryValues {
  name: string;
}

const blank = (): CategoryValues => ({ name: '' });
const isBlank = (values: CategoryValues): boolean => !values.name.trim();

/** Per-row messages: 2–60 characters, no repeated name; null rows are skipped spares. */
export function validateCategories(rows: readonly GridRowState<CategoryValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const name = row.values.name.trim();
    if (!row.id && !name) continue;
    if (name.length < 2 || name.length > 60) errors[row.key] = 'A category is 2 to 60 characters.';
    else if (seen.has(name.toLowerCase())) errors[row.key] = `"${name}" is already in the list.`;
    seen.add(name.toLowerCase());
  }
  return errors;
}

/** PUT rows: the whole list in slot order; a retired row is `is_active: false`. */
export function toCategoryRows(change: GridChange<CategoryValues>): TaskCategoryGridRow[] {
  return change.rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), name: row.values.name.trim(), is_active: !row.inactive }));
}

/** How many of the rows about to be saved are active. */
export function activeCount(change: GridChange<CategoryValues>): number {
  return change.rows.filter((row) => !row.inactive).length;
}

const COLUMNS: GridColumn<CategoryValues>[] = [{ key: 'name', header: 'Category', kind: 'text', field: 'name', maxLength: 60 }];

interface TaskCategoriesGridProps {
  categories: readonly TaskCategory[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: TaskCategoryGridRow[]) => Promise<unknown>;
  onTooMany: () => void;
}

/**
 * Setup Task Categories (PROJ-S1, PROJ-22) on the shared grid: numbered
 * slots, a category retired (its tasks keep it) rather than deleted, and one
 * Save Changes for the list.
 */
export function TaskCategoriesGrid({ categories, readOnly, isSaving, save, onTooMany }: TaskCategoriesGridProps): ReactNode {
  async function onSave(change: GridChange<CategoryValues>): Promise<GridSaveResult | void> {
    if (activeCount(change) > MAX_ACTIVE_CATEGORIES) {
      onTooMany();
      return;
    }
    try {
      await save(toCategoryRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }
  const active = categories.filter((category) => category.is_active).length;
  return (
    <EditableGrid
      label="Task categories"
      columns={COLUMNS}
      rows={categories.map((category) => ({ id: category.id, values: { name: category.name }, inactive: !category.is_active }))}
      blank={blank}
      isBlank={isBlank}
      validate={validateCategories}
      spareRows={Math.max(MAX_ACTIVE_CATEGORIES - active, 1)}
      deactivate={{ header: 'Active', label: 'Retire' }}
      serialHeader="No."
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No task categories yet. Add up to twelve below."
      onSave={onSave}
    />
  );
}
