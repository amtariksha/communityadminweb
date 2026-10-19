'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GridRowState } from './grid-state';

export interface GridCellProps<Values> {
  row: GridRowState<Values>;
  position: number;
  disabled: boolean;
  invalid: boolean;
  label: string;
  change: (patch: Partial<Values>) => void;
}

interface ColumnBase {
  key: string;
  header: string;
  className?: string;
  /** Accessible name of the cell's control; default "<header>, row <n>". */
  label?: (position: number) => string;
}

type FieldOf<Values> = keyof Values & string;

export type GridColumn<Values> = ColumnBase &
  (
    | { kind: 'text'; field: FieldOf<Values>; maxLength?: number; placeholder?: string }
    | { kind: 'number'; field: FieldOf<Values>; min?: number; max?: number; step?: number | 'any' }
    | {
        kind: 'select';
        field: FieldOf<Values>;
        options: ReadonlyArray<{ value: string; label: string }>;
        placeholder?: string;
      }
    | { kind: 'checkbox'; field: FieldOf<Values> }
    | { kind: 'custom'; render: (cell: GridCellProps<Values>) => ReactNode }
  );

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50';

// An inactive row stays visible, struck through, until Save Changes.
const inactiveClass = (row: GridRowState<unknown>): string | false =>
  row.inactive && 'line-through text-muted-foreground';

/** The control of one cell, by column kind. */
export function GridCell<Values>({ column, cell }: { column: GridColumn<Values>; cell: GridCellProps<Values> }): ReactNode {
  if (column.kind === 'custom') return column.render(cell);
  const value = (cell.row.values as Record<string, unknown>)[column.field];
  const common = {
    'aria-label': cell.label,
    'aria-invalid': cell.invalid ? true : undefined,
    disabled: cell.disabled,
  };
  const set = (next: unknown): void => cell.change({ [column.field]: next } as Partial<Values>);

  if (column.kind === 'checkbox') {
    return <input type="checkbox" {...common} checked={value === true} onChange={(e) => set(e.target.checked)} />;
  }
  if (column.kind === 'select') {
    return (
      <select
        {...common}
        value={String(value ?? '')}
        className={cn(SELECT_CLASS, inactiveClass(cell.row as GridRowState<unknown>))}
        onChange={(e) => set(e.target.value)}
      >
        <option value="">{column.placeholder ?? 'Select...'}</option>
        {column.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Input
      {...common}
      type={column.kind === 'number' ? 'number' : 'text'}
      inputMode={column.kind === 'number' ? 'decimal' : undefined}
      min={column.kind === 'number' ? column.min : undefined}
      max={column.kind === 'number' ? column.max : undefined}
      step={column.kind === 'number' ? column.step : undefined}
      maxLength={column.kind === 'text' ? column.maxLength : undefined}
      placeholder={column.kind === 'text' ? column.placeholder : undefined}
      value={String(value ?? '')}
      className={cn(inactiveClass(cell.row as GridRowState<unknown>))}
      onChange={(e) => set(e.target.value)}
    />
  );
}
