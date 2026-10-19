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
import type { UnitBlock, UnitBlockRow } from '@/hooks/use-unit-blocks';

const MAX_NAME_LENGTH = 50;

export interface BlockValues {
  name: string;
  // Set for a block found only on units, never saved in the master.
  fromName: string;
  units: number;
}

const blank = (): BlockValues => ({ name: '', fromName: '', units: 0 });
const isBlank = (values: BlockValues): boolean => values.name.trim() === '';
// Blocks are stored as units carry them: trimmed, upper case.
const normal = (name: string): string => name.trim().toUpperCase();

export function validateBlocks(rows: readonly GridRowState<BlockValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (!row.id && isBlank(row.values)) continue;
    const name = normal(row.values.name);
    if (!name) {
      errors[row.key] = 'Enter a block name.';
      continue;
    }
    const clash = seen.get(name);
    if (clash) {
      errors[row.key] = 'Block names must be different.';
      errors[clash] = 'Block names must be different.';
    } else {
      seen.set(name, row.key);
    }
  }
  return errors;
}

/** PUT /unit-blocks/bulk rows: the whole list in grid order. */
export function toBlockRows(change: GridChange<BlockValues>): UnitBlockRow[] {
  return change.rows.map((row) => {
    const name = normal(row.values.name);
    if (row.values.fromName) return { from_name: row.values.fromName, name };
    return row.id ? { id: row.id, name } : { name };
  });
}

export const savedBlockRows = (blocks: readonly UnitBlock[]) =>
  blocks.map((block) => ({
    // A block known only from units has no master id yet.
    id: block.id ?? `unit-only:${block.name}`,
    values: { name: block.name, fromName: block.id ? '' : block.name, units: block.unit_count },
  }));

const COLUMNS: GridColumn<BlockValues>[] = [
  { key: 'name', header: 'Block', kind: 'text', field: 'name', maxLength: MAX_NAME_LENGTH },
  { key: 'units', header: 'Units', kind: 'custom', render: ({ row }) => <span>{row.values.units}</span> },
];

interface BlocksGridProps {
  blocks: readonly UnitBlock[];
  readOnly: boolean;
  isSaving: boolean;
  /** Resolves when saved; rejects with the API error otherwise. */
  save: (rows: UnitBlockRow[]) => Promise<unknown>;
}

/** Block master on the shared editable grid (SB-08, SB-10). */
export function BlocksGrid({ blocks, readOnly, isSaving, save }: BlocksGridProps): ReactNode {
  async function onSave(change: GridChange<BlockValues>): Promise<GridSaveResult | void> {
    try {
      await save(toBlockRows(change));
    } catch (error) {
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <EditableGrid
      label="Blocks"
      columns={COLUMNS}
      rows={savedBlockRows(blocks)}
      blank={blank}
      isBlank={isBlank}
      validate={validateBlocks}
      spareRows={3}
      reorder
      readOnly={readOnly}
      isSaving={isSaving}
      emptyText="Add your first block"
      onSave={onSave}
    />
  );
}
