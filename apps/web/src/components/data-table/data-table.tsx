'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { DataTablePager } from './data-table-pager';
import { ExportStrip, type DataTableExport } from './export-strip';
import { printableTable, serialNumber, toTsv, type TextColumn } from './table-text';

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Text for Copy and Print; needed when `cell` is not plain text. */
  text?: (row: Row) => string;
  className?: string;
}

/** A row button in a column of its own, e.g. "Post Invoice" (SB-04). */
export interface DataTableAction<Row> {
  key: string;
  header: string;
  label: string | ((row: Row) => string);
  onClick?: (row: Row) => void;
  href?: (row: Row) => string;
  hidden?: (row: Row) => boolean;
}

export interface DataTableSearch {
  /** The search the list is filtered by now. */
  value: string;
  /** Called once typing pauses; reset to page 1 here. */
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface DataTableProps<Row> {
  /** Names the table, its print-out and (with `export`) the file. */
  title: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  search?: DataTableSearch;
  /** Filter controls shown beside the search box. */
  filters?: ReactNode;
  actions?: readonly DataTableAction<Row>[];
  export?: DataTableExport;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyText: string;
  /** Header of the serial column; "S.No" unless the screen says otherwise (e.g. "Sr No"). */
  serialHeader?: string;
  /** Extra classes for a row, e.g. a visitor past their stay in red (GATE-10). */
  rowClassName?: (row: Row) => string | undefined;
  /**
   * Fetch mode (SB-09): the classic register opens empty with this panel
   * above it and shows rows only once `fetched` (the page sets it when the
   * panel's Fetch is pressed). Leave it out for live filters.
   */
  fetchMode?: DataTableFetchMode;
  /** Rows after the body, e.g. a report section's totals (REP-05); cells after S.No. */
  footer?: ReactNode;
}

export interface DataTableFetchMode {
  panel: ReactNode;
  fetched: boolean;
  /** Shown in the empty table before the first Fetch. */
  prompt?: string;
}

const DEFAULT_FETCH_PROMPT = 'Choose what to show above and press Fetch.';

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const;
const SEARCH_DELAY_MS = 300;

function textOf<Row>(column: DataTableColumn<Row>, row: Row): string {
  if (column.text) return column.text(row);
  const value = column.cell(row);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function SearchBox({ search }: { search: DataTableSearch }): ReactNode {
  const [draft, setDraft] = useState(search.value);
  const settled = useDebouncedValue(draft, SEARCH_DELAY_MS);
  const { value, onChange } = search;

  useEffect(() => {
    if (settled.trim() !== value) onChange(settled.trim());
  }, [settled, value, onChange]);

  return (
    <Input
      type="search"
      aria-label="Search"
      className="w-64"
      placeholder={search.placeholder ?? 'Search'}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

function ActionCell<Row>({ action, row }: { action: DataTableAction<Row>; row: Row }): ReactNode {
  if (action.hidden?.(row)) return null;
  const label = typeof action.label === 'function' ? action.label(row) : action.label;
  if (action.href) {
    return (
      <Link href={action.href(row)} className={buttonVariants({ variant: 'outline', size: 'sm' })} data-slot="button" data-size="sm">
        {label}
      </Link>
    );
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => action.onClick?.(row)}>
      {label}
    </Button>
  );
}

function StateRow({ span, children }: { span: number; children: ReactNode }): ReactNode {
  return (
    <TableRow>
      <TableCell colSpan={span} className="py-8 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

function BodyRows<Row>(props: DataTableProps<Row> & { span: number }): ReactNode {
  const { rows, columns, actions = [], page, pageSize, span } = props;
  if (props.fetchMode && !props.fetchMode.fetched) {
    return <StateRow span={span}>{props.fetchMode.prompt ?? DEFAULT_FETCH_PROMPT}</StateRow>;
  }
  if (props.loading) {
    return Array.from({ length: 3 }, (_, i) => (
      <StateRow key={i} span={span}>
        <Skeleton className="h-4 w-full" />
      </StateRow>
    ));
  }
  if (props.error) {
    return (
      <StateRow span={span}>
        <span className="text-destructive">Could not load the list. </span>
        {props.onRetry && (
          <Button type="button" variant="link" className="px-1" onClick={props.onRetry}>
            Retry
          </Button>
        )}
      </StateRow>
    );
  }
  if (rows.length === 0) return <StateRow span={span}>{props.emptyText}</StateRow>;
  return rows.map((row, index) => (
    <TableRow key={props.rowKey(row)} className={props.rowClassName?.(row)}>
      <TableCell>{serialNumber(page, pageSize, index)}</TableCell>
      {columns.map((column) => (
        <TableCell key={column.key} className={column.className}>
          {column.cell(row)}
        </TableCell>
      ))}
      {actions.map((action) => (
        <TableCell key={action.key}>
          <ActionCell action={action} row={row} />
        </TableCell>
      ))}
    </TableRow>
  ));
}

/**
 * The shared data table of the classic lists (requirements SB-04): S.No
 * continuous across pages, server-side search, pager with page sizes,
 * the export strip (files from the server cover the whole filtered
 * result; Copy and Print the visible page) and row actions as labelled
 * columns. The page owns the query; the table only shows it.
 */
export function DataTable<Row>(props: DataTableProps<Row>): ReactNode {
  const { columns, actions = [], rows, page, pageSize, title } = props;
  const textColumns: TextColumn<Row>[] = columns.map((column) => ({
    header: column.header,
    text: (row) => textOf(column, row),
  }));
  const serial = { serial: { page, pageSize } };
  const span = columns.length + actions.length + 1;
  // Before the first Fetch there is nothing to search, export or page.
  const waiting = props.fetchMode !== undefined && !props.fetchMode.fetched;

  return (
    <div className="space-y-3">
      {props.fetchMode?.panel}
      <div className="flex flex-wrap items-start justify-between gap-2">
        {props.export && !waiting ? (
          <ExportStrip
            config={props.export}
            rowCount={rows.length}
            copyText={() => toTsv(textColumns, rows, serial)}
            printPage={() => printableTable(title, textColumns, rows, serial)}
          />
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {props.filters}
          {props.search && !waiting && <SearchBox search={props.search} />}
        </div>
      </div>
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">{props.serialHeader ?? 'S.No'}</TableHead>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
            {actions.map((action) => (
              <TableHead key={action.key}>{action.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <BodyRows {...props} span={span} />
        </TableBody>
        {props.footer && !waiting && rows.length > 0 && <tfoot>{props.footer}</tfoot>}
      </Table>
      {!waiting && (
        <DataTablePager
          page={page}
          pageSize={pageSize}
          total={props.total}
          pageSizeOptions={props.pageSizeOptions ?? DEFAULT_PAGE_SIZES}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
        />
      )}
    </div>
  );
}
