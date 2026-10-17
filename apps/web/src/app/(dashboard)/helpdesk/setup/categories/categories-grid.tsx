'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Plus, Save, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { HelpdeskAssignee, HelpdeskCategory, HelpdeskCategoryRow } from '@/hooks';

const SPARE_ROWS = 5;
const ORDER_STEP = 10;
const MAX_NAME_LENGTH = 100;

interface GridRow {
  key: string;
  id?: string;
  name: string;
  ownerId: string;
  deleted: boolean;
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

const isBlank = (row: GridRow): boolean => row.name.trim() === '' && row.ownerId === '';

/** Errors by row key; a row marked for deletion is never checked. */
export function validateRows(rows: readonly GridRow[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.deleted || isBlank(row)) continue;
    const name = row.name.trim();
    if (!name) {
      errors[row.key] = MESSAGES.needsName;
      continue;
    }
    if (!row.ownerId) {
      errors[row.key] = MESSAGES.needsOwner;
    }
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

/** The rows to send: grid order becomes display order; blanks are dropped. */
function toPayload(rows: readonly GridRow[]): HelpdeskCategoryRow[] {
  return rows.flatMap((row, index) => {
    if (isBlank(row) || (row.deleted && !row.id)) return [];
    return [
      {
        ...(row.id ? { id: row.id } : {}),
        name: row.name.trim(),
        owner_l1_user_id: row.ownerId || null,
        display_order: (index + 1) * ORDER_STEP,
        ...(row.deleted ? { delete: true } : {}),
      },
    ];
  });
}

function ownerLabel(owner: HelpdeskAssignee): string {
  return `${owner.name ?? 'Unnamed'} (${owner.roles.join(', ')})`;
}

export function CategoriesGrid({
  categories,
  owners,
  isSaving,
  readOnly,
  onSave,
}: CategoriesGridProps): ReactNode {
  const nextKey = useRef(0);
  const newKey = (): string => `row-${nextKey.current++}`;
  const spareRows = (): GridRow[] =>
    Array.from({ length: SPARE_ROWS }, () => ({ key: newKey(), name: '', ownerId: '', deleted: false }));

  const [rows, setRows] = useState<GridRow[]>(() => [
    ...categories.map((category) => ({
      key: newKey(),
      id: category.id,
      name: category.name,
      ownerId: category.owner_l1_user_id ?? '',
      deleted: false,
    })),
    ...(readOnly ? [] : spareRows()),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function change(key: string, patch: Partial<GridRow>): void {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setErrors((current) => {
      const { [key]: _cleared, ...rest } = current;
      return rest;
    });
  }

  async function handleSave(): Promise<void> {
    const found = validateRows(rows);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await onSave(toPayload(rows));
  }

  return (
    <div className="space-y-3">
      {categories.length === 0 && !readOnly && (
        <p className="text-sm text-muted-foreground">Add your first category</p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Sl.No</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Category Owner Level1 *</TableHead>
            {!readOnly && <TableHead className="w-28">Delete</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const position = index + 1;
            const error = errors[row.key];
            return (
              <TableRow key={row.key}>
                <TableCell>{position}</TableCell>
                <TableCell className="align-top">
                  <Input
                    aria-label={`Category name, row ${position}`}
                    aria-invalid={error ? true : undefined}
                    maxLength={MAX_NAME_LENGTH}
                    disabled={readOnly}
                    value={row.name}
                    className={cn(row.deleted && 'line-through text-muted-foreground')}
                    onChange={(event) => change(row.key, { name: event.target.value })}
                  />
                  {error && (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                      {error}
                    </p>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <select
                    aria-label={`Owner, row ${position}`}
                    disabled={readOnly}
                    value={row.ownerId}
                    className={cn(
                      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50',
                      row.deleted && 'line-through text-muted-foreground',
                    )}
                    onChange={(event) => change(row.key, { ownerId: event.target.value })}
                  >
                    <option value="">Select owner...</option>
                    {owners.map((owner) => (
                      <option key={owner.user_id} value={owner.user_id}>
                        {ownerLabel(owner)}
                      </option>
                    ))}
                  </select>
                </TableCell>
                {!readOnly && (
                  <TableCell className="align-top">
                    {row.deleted ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Undo delete row ${position}`}
                        onClick={() => change(row.key, { deleted: false })}
                      >
                        <Undo2 className="mr-1 h-4 w-4" /> Undo
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Delete row ${position}`}
                        onClick={() => change(row.key, { deleted: true })}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, ...spareRows()])}>
            <Plus className="mr-1 h-4 w-4" /> Add {SPARE_ROWS} more rows
          </Button>
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            <Save className="mr-1 h-4 w-4" /> Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
