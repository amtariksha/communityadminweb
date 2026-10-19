'use client';

import { type ReactNode } from 'react';
import {
  EditableGrid,
  type GridChange,
  type GridColumn,
  type GridRowState,
} from '@/components/editable-grid';
import type { HelpdeskAssignee, HelpdeskCategory, HelpdeskCategoryRow } from '@/hooks';

const ORDER_STEP = 10;
const MAX_NAME_LENGTH = 100;

interface CategoryValues {
  name: string;
  ownerId: string;
}

interface CategoriesGridProps {
  categories: HelpdeskCategory[];
  owners: HelpdeskAssignee[];
  isSaving: boolean;
  /** Roles that may read the list but not change it. */
  readOnly: boolean;
  onSave: (rows: HelpdeskCategoryRow[]) => Promise<void> | void;
}

const MESSAGES = {
  needsName: 'Enter a category name.',
  needsOwner: 'Choose an owner for this category.',
  duplicate: 'Category names must be different.',
} as const;

const blank = (): CategoryValues => ({ name: '', ownerId: '' });
const isBlank = (values: CategoryValues): boolean => values.name.trim() === '' && values.ownerId === '';

/** Errors by row key; a row marked for deletion is never checked. */
export function validateRows(rows: readonly GridRowState<CategoryValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.inactive || (!row.id && isBlank(row.values))) continue;
    const name = row.values.name.trim();
    if (!name) {
      errors[row.key] = MESSAGES.needsName;
      continue;
    }
    if (!row.values.ownerId) errors[row.key] = MESSAGES.needsOwner;
    const clash = seen.get(name.toLowerCase());
    if (clash) {
      errors[row.key] = MESSAGES.duplicate;
      errors[clash] = MESSAGES.duplicate;
    } else {
      seen.set(name.toLowerCase(), row.key);
    }
  }
  return errors;
}

/** The whole list in grid order: grid position becomes display order. */
function toPayload(change: GridChange<CategoryValues>): HelpdeskCategoryRow[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    owner_l1_user_id: row.values.ownerId || null,
    display_order: row.position * ORDER_STEP,
    ...(row.inactive ? { delete: true } : {}),
  }));
}

function ownerLabel(owner: HelpdeskAssignee): string {
  return `${owner.name ?? 'Unnamed'} (${owner.roles.join(', ')})`;
}

/** Setup › Helpdesk Categories on the shared editable grid (SB-08). */
export function CategoriesGrid({ categories, owners, isSaving, readOnly, onSave }: CategoriesGridProps): ReactNode {
  const columns: GridColumn<CategoryValues>[] = [
    {
      key: 'name',
      header: 'Category',
      kind: 'text',
      field: 'name',
      maxLength: MAX_NAME_LENGTH,
      label: (position) => `Category name, row ${position}`,
    },
    {
      key: 'owner',
      header: 'Category Owner Level1 *',
      kind: 'select',
      field: 'ownerId',
      placeholder: 'Select owner...',
      options: owners.map((owner) => ({ value: owner.user_id, label: ownerLabel(owner) })),
      label: (position) => `Owner, row ${position}`,
    },
  ];

  return (
    <EditableGrid
      label="Helpdesk categories"
      columns={columns}
      rows={categories.map((category) => ({
        id: category.id,
        values: { name: category.name, ownerId: category.owner_l1_user_id ?? '' },
      }))}
      blank={blank}
      isBlank={isBlank}
      validate={validateRows}
      deactivate={{ header: 'Delete', label: 'Delete' }}
      serialHeader="Sl.No"
      emptyText="Add your first category"
      readOnly={readOnly}
      isSaving={isSaving}
      onSave={(change) => onSave(toPayload(change))}
    />
  );
}
