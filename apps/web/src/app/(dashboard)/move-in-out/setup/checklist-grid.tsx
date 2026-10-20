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
import type { ChecklistItem, SaveChecklistInput } from '@/hooks/use-move-checklists';

/** MOVE-S2 / S3 grid: Check List · Enabled?, ordered with up / down arrows. */
export interface ChecklistValues {
  label: string;
  is_enabled: boolean;
}

const blank = (): ChecklistValues => ({ label: '', is_enabled: true });
const isBlank = (values: ChecklistValues): boolean => !values.label.trim();

const COLUMNS: GridColumn<ChecklistValues>[] = [
  { key: 'label', header: 'Check List', kind: 'text', field: 'label', maxLength: 200 },
  { key: 'enabled', header: 'Enabled?', kind: 'checkbox', field: 'is_enabled', className: 'w-24' },
];

/** 1–200 characters, unique in the list ignoring case. */
export function checklistLabelError(label: string, others: readonly string[]): string | null {
  const text = label.trim();
  if (text.length < 1 || text.length > 200) return 'A checklist item is 1 to 200 characters.';
  if (others.some((other) => other.trim().toLowerCase() === text.toLowerCase())) return `"${text}" is already in the list.`;
  return null;
}

export function validateChecklist(rows: readonly GridRowState<ChecklistValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen: string[] = [];
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const error = checklistLabelError(row.values.label, seen);
    if (error) errors[row.key] = error;
    seen.push(row.values.label);
  }
  return errors;
}

/** The whole list in grid order (SB-08 `rows`). */
export function toChecklistRows(change: GridChange<ChecklistValues>): SaveChecklistInput['rows'] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    label: row.values.label.trim(),
    is_enabled: row.values.is_enabled,
  }));
}

interface ChecklistGridProps {
  phaseLabel: string;
  items: readonly ChecklistItem[];
  readOnly: boolean;
  isSaving: boolean;
  save: (rows: SaveChecklistInput['rows']) => Promise<unknown>;
}

/** An item used on a request is switched off with Enabled?, never removed. */
export function ChecklistGrid({ phaseLabel, items, readOnly, isSaving, save }: ChecklistGridProps): ReactNode {
  async function onSave(change: GridChange<ChecklistValues>): Promise<GridSaveResult | void> {
    try {
      await save(toChecklistRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }
  return (
    <EditableGrid
      label={`${phaseLabel} CheckList`}
      columns={COLUMNS}
      rows={items.map((item) => ({ id: item.id, values: { label: item.label, is_enabled: item.is_enabled } }))}
      blank={blank}
      isBlank={isBlank}
      validate={validateChecklist}
      spareRows={0}
      reorder
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="No checklist items yet."
      onSave={onSave}
    />
  );
}
