'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ImportTarget } from '@/hooks/use-imports';
import { ImportStepView } from './import-flow';
import type { ImportPreviewColumn } from './import-rows-table';
import { useImportFlow } from './use-import-flow';

const ROWS_PER_BATCH = 10;

type GridRow = Record<string, string>;

const blankRows = (count: number): GridRow[] => Array.from({ length: count }, () => ({}));
const filled = (row: GridRow): boolean => Object.values(row).some((value) => value.trim() !== '');

export interface ImportGridProps {
  target: ImportTarget;
  title: string;
  description?: ReactNode;
  /** The template's columns, typed in the grid. */
  columns: readonly ImportPreviewColumn[];
  options?: Record<string, unknown>;
  children?: ReactNode;
  applyLabel?: string;
  allowed?: boolean;
}

/**
 * SB-13's second way in: the template's columns typed into numbered rows
 * (ten at a time), previewed and committed by the same API as an uploaded
 * file — the same checks, the same per-row errors, the same posting.
 */
export function ImportGrid({ target, title, description, columns, options, children, applyLabel = 'Import', allowed = true }: ImportGridProps): ReactNode {
  const flow = useImportFlow(target, options);
  const [rows, setRows] = useState<GridRow[]>(() => blankRows(ROWS_PER_BATCH));
  // Up to the last filled row, blanks included, so the API's row numbers are the grid's.
  const sent = (): GridRow[] => rows.slice(0, rows.map(filled).lastIndexOf(true) + 1);
  const edit = (index: number, key: string, value: string) => setRows((current) => current.map((row, at) => (at === index ? { ...row, [key]: value } : row)));
  if (flow.step.kind === 'unavailable') {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">This screen is not available yet. It opens once the server is updated.</p></CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        {children}
        <Table aria-label={title}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {columns.map((column) => <TableHead key={column.key}>{column.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Input aria-label={`${column.label}, row ${index + 1}`} className="min-w-28" disabled={!allowed || flow.busy} value={row[column.key] ?? ''} onChange={(e) => edit(index, column.key, e.target.value)} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="link" className="px-0" onClick={() => setRows((current) => [...current, ...blankRows(ROWS_PER_BATCH)])}>
            Add {ROWS_PER_BATCH} more rows
          </Button>
          <Button type="button" size="sm" disabled={!allowed || flow.busy || sent().length === 0} onClick={() => void flow.runPreview(sent())}>
            {flow.previewing ? 'Checking…' : 'Preview'}
          </Button>
        </div>
        <ImportStepView step={flow.step} columns={columns} applyLabel={applyLabel} disabled={!allowed || flow.busy} onApply={(preview) => void flow.runApply(preview, sent())} />
      </CardContent>
    </Card>
  );
}
