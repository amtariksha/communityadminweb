'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GridCell, type GridColumn } from './grid-cells';
import {
  gridChange,
  initialRows,
  spareRows,
  type GridChange,
  type GridRowState,
  type SavedGridRow,
} from './grid-state';

/** Marking a row inactive instead of deleting it (history is kept). */
export interface GridDeactivate {
  header: string;
  // Button text, e.g. "Delete"; its accessible name is "<label> row <n>".
  label: string;
}

export interface GridSaveResult {
  // Messages to show on rows, by row key (see rowErrorsFromApi).
  rowErrors?: Record<string, string>;
}

export interface EditableGridProps<Values> {
  /** Accessible name of the table. */
  label: string;
  columns: readonly GridColumn<Values>[];
  rows: readonly SavedGridRow<Values>[];
  blank: () => Values;
  isBlank?: (values: Values) => boolean;
  /** Blank rows offered after the saved ones; 0 for none. */
  spareRows?: number;
  /** Errors by row key; nothing is saved while there are any. */
  validate?: (rows: readonly GridRowState<Values>[]) => Record<string, string>;
  reorder?: boolean;
  deactivate?: GridDeactivate;
  readOnly?: boolean;
  isSaving?: boolean;
  serialHeader?: string;
  emptyText?: string;
  onSave?: (change: GridChange<Values>) => Promise<GridSaveResult | void> | GridSaveResult | void;
  /**
   * For a page that saves several grids with one button: no Save Changes
   * here; the grid reports every change, and shows the errors the page
   * found (by row key).
   */
  hideSave?: boolean;
  onChange?: (state: { change: GridChange<Values>; rows: readonly GridRowState<Values>[] }) => void;
  errors?: Record<string, string>;
}

const DEFAULT_SPARE_ROWS = 5;

function useGridRows<Values>(props: EditableGridProps<Values>) {
  const nextKey = useRef(0);
  const newKey = (): string => `row-${nextKey.current++}`;
  const spareCount = props.readOnly ? 0 : props.spareRows ?? DEFAULT_SPARE_ROWS;
  const [rows, setRows] = useState<GridRowState<Values>[]>(() => [
    ...initialRows(props.rows, newKey),
    ...spareRows(spareCount, props.blank, newKey),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(key: string): void {
    setErrors((current) => {
      const { [key]: _cleared, ...rest } = current;
      return rest;
    });
  }

  function update(key: string, patch: Partial<GridRowState<Values>>): void {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    clearError(key);
  }

  function move(index: number, by: -1 | 1): void {
    setRows((current) => {
      const target = index + by;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const addSpares = (): void => setRows((current) => [...current, ...spareRows(spareCount, props.blank, newKey)]);
  return { rows, errors, setErrors, update, move, addSpares, spareCount };
}

function RowButtons<Values>({
  props,
  row,
  index,
  last,
  grid,
}: {
  props: EditableGridProps<Values>;
  row: GridRowState<Values>;
  index: number;
  last: boolean;
  grid: ReturnType<typeof useGridRows<Values>>;
}): ReactNode {
  const position = index + 1;
  const { deactivate } = props;
  return (
    <>
      {props.reorder && (
        <TableCell className="whitespace-nowrap align-top">
          <Button type="button" size="sm" variant="ghost" aria-label={`Move row ${position} up`} disabled={index === 0} onClick={() => grid.move(index, -1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" aria-label={`Move row ${position} down`} disabled={last} onClick={() => grid.move(index, 1)}>
            <ArrowDown className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
      {deactivate && (
        <TableCell className="align-top">
          {row.inactive ? (
            <Button type="button" size="sm" variant="outline" aria-label={`Undo ${deactivate.label.toLowerCase()} row ${position}`} onClick={() => grid.update(row.key, { inactive: false })}>
              <Undo2 className="mr-1 h-4 w-4" /> Undo
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" aria-label={`${deactivate.label} row ${position}`} onClick={() => grid.update(row.key, { inactive: true })}>
              <Trash2 className="mr-1 h-4 w-4" /> {deactivate.label}
            </Button>
          )}
        </TableCell>
      )}
    </>
  );
}

function GridHeader<Values>({ props, editable }: { props: EditableGridProps<Values>; editable: boolean }): ReactNode {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-16">{props.serialHeader ?? 'S.No'}</TableHead>
        {props.columns.map((column) => (
          <TableHead key={column.key} className={column.className}>
            {column.header}
          </TableHead>
        ))}
        {editable && props.reorder && <TableHead className="w-24">Order</TableHead>}
        {editable && props.deactivate && <TableHead className="w-28">{props.deactivate.header}</TableHead>}
      </TableRow>
    </TableHeader>
  );
}

interface GridBodyRowProps<Values> {
  props: EditableGridProps<Values>;
  grid: ReturnType<typeof useGridRows<Values>>;
  row: GridRowState<Values>;
  index: number;
  editable: boolean;
}

function GridBodyRow<Values>({ props, grid, row, index, editable }: GridBodyRowProps<Values>): ReactNode {
  const position = index + 1;
  const error = grid.errors[row.key];
  return (
    <TableRow>
      <TableCell>{position}</TableCell>
      {props.columns.map((column, columnIndex) => (
        <TableCell key={column.key} className="align-top">
          <GridCell
            column={column}
            cell={{
              row,
              position,
              disabled: !editable,
              invalid: Boolean(error),
              label: column.label?.(position) ?? `${column.header}, row ${position}`,
              change: (patch) => grid.update(row.key, { values: { ...row.values, ...patch } }),
            }}
          />
          {columnIndex === 0 && error && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {error}
            </p>
          )}
        </TableCell>
      ))}
      {editable && <RowButtons props={props} row={row} index={index} last={index === grid.rows.length - 1} grid={grid} />}
    </TableRow>
  );
}

/**
 * Editable grid (requirements SB-08): rows edited in place, N spare blank
 * rows, rows marked inactive instead of deleted, and one Save Changes that
 * hands the page the whole change (see GridChange). Nothing is sent while a
 * row has an error; errors the server returns are shown on their rows. The
 * page re-mounts the grid (a new `key`) once the saved list comes back.
 */
export function EditableGrid<Values>(props: EditableGridProps<Values>): ReactNode {
  const grid = useGridRows(props);
  const editable = !props.readOnly;
  const change = gridChange(grid.rows, props.blank, props.isBlank);
  const latestOnChange = useRef(props.onChange);
  latestOnChange.current = props.onChange;
  const shown = props.errors ? { ...grid, errors: { ...grid.errors, ...props.errors } } : grid;

  useEffect(() => {
    latestOnChange.current?.({ change: gridChange(grid.rows, props.blank, props.isBlank), rows: grid.rows });
    // The callback and blank-row helpers are read fresh; only the rows trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid.rows]);

  async function save(): Promise<void> {
    const found = props.validate?.(grid.rows) ?? {};
    grid.setErrors(found);
    if (Object.keys(found).length > 0 || !props.onSave) return;
    const result = await props.onSave(change);
    if (result?.rowErrors) grid.setErrors(result.rowErrors);
  }

  return (
    <div className="space-y-3">
      {props.rows.length === 0 && editable && props.emptyText && (
        <p className="text-sm text-muted-foreground">{props.emptyText}</p>
      )}
      <Table aria-label={props.label}>
        <GridHeader props={props} editable={editable} />
        <TableBody>
          {grid.rows.map((row, index) => (
            <GridBodyRow key={row.key} props={props} grid={shown} row={row} index={index} editable={editable} />
          ))}
        </TableBody>
      </Table>
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          {grid.spareCount > 0 && (
            <Button type="button" variant="outline" onClick={grid.addSpares}>
              <Plus className="mr-1 h-4 w-4" /> Add {grid.spareCount} more rows
            </Button>
          )}
          {!props.hideSave && (
            <Button type="button" disabled={props.isSaving} onClick={() => void save()}>
              <Save className="mr-1 h-4 w-4" /> {props.isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
