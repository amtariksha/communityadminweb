'use client';

import { type ReactNode } from 'react';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridChange,
  type GridColumn,
  type GridRowState,
} from '@/components/editable-grid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { HelpdeskCategory, HelpdeskSubcategoryRow } from '@/hooks';

const ORDER_STEP = 10;
const MAX_NAME_LENGTH = 100;

interface SubcategoryValues {
  name: string;
}

interface SubcategoriesDialogProps {
  /** The category whose sub-categories are edited; null keeps the dialog closed. */
  category: HelpdeskCategory | null;
  readOnly: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (categoryId: string, rows: HelpdeskSubcategoryRow[]) => Promise<void>;
}

const blank = (): SubcategoryValues => ({ name: '' });
const isBlank = (values: SubcategoryValues): boolean => values.name.trim() === '';

/** Errors by row key: a name is needed, and names must differ (case aside). */
export function validateSubcategoryRows(rows: readonly GridRowState<SubcategoryValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.inactive || (!row.id && isBlank(row.values))) continue;
    const name = row.values.name.trim();
    if (!name) {
      errors[row.key] = 'Enter a sub-category name.';
      continue;
    }
    const clash = seen.get(name.toLowerCase());
    if (clash) {
      errors[row.key] = 'Sub-category names must be different.';
      errors[clash] = 'Sub-category names must be different.';
    } else {
      seen.set(name.toLowerCase(), row.key);
    }
  }
  return errors;
}

/** The whole list in grid order: grid position becomes display order. */
export function subcategoryPayload(change: GridChange<SubcategoryValues>): HelpdeskSubcategoryRow[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    display_order: row.position * ORDER_STEP,
    ...(row.inactive ? { delete: true } : {}),
  }));
}

const COLUMNS: GridColumn<SubcategoryValues>[] = [
  {
    key: 'name',
    header: 'Sub-category',
    kind: 'text',
    field: 'name',
    maxLength: MAX_NAME_LENGTH,
    label: (position) => `Sub-category, row ${position}`,
  },
];

/**
 * "Sub-categories of <category>" (HELP-17): an SB-08 grid with spare rows
 * and Save Changes; Delete switches a sub-category off (requests keep it).
 */
export function SubcategoriesDialog({ category, readOnly, isSaving, onClose, onSave }: SubcategoriesDialogProps): ReactNode {
  return (
    <Dialog open={category !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sub-categories of {category?.name ?? ''}</DialogTitle>
        </DialogHeader>
        {category && (
          <EditableGrid
            key={category.id}
            label={`Sub-categories of ${category.name}`}
            columns={COLUMNS}
            rows={(category.subcategories ?? []).map((sub) => ({ id: sub.id, values: { name: sub.name } }))}
            blank={blank}
            isBlank={isBlank}
            validate={validateSubcategoryRows}
            deactivate={{ header: 'Delete', label: 'Delete' }}
            serialHeader="Sl.No"
            emptyText="Add the first sub-category"
            readOnly={readOnly}
            isSaving={isSaving}
            onSave={async (change) => {
              try {
                await onSave(category.id, subcategoryPayload(change));
                return undefined;
              } catch (error) {
                return { rowErrors: rowErrorsFromApi(error, change) };
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
