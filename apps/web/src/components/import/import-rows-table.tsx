'use client';

import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ImportPreviewRow, ImportRowAction } from '@/hooks/use-imports';

/** A column of the uploaded sheet shown in the preview: the template key and its header. */
export interface ImportPreviewColumn {
  key: string;
  label: string;
}

const ACTION_WORDS: Record<ImportRowAction, string> = {
  create: 'Will add',
  update: 'Will update',
  post: 'Will post',
  skip: 'Skipped',
};

function RowStatus({ row }: { row: ImportPreviewRow }): ReactNode {
  if (row.errors.length > 0) {
    return (
      <ul className="space-y-0.5 text-destructive">
        {row.errors.map((issue, index) => (
          <li key={`${issue.field ?? 'row'}-${index}`}>{issue.message}</li>
        ))}
      </ul>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant={row.action === 'skip' ? 'secondary' : 'success'}>{ACTION_WORDS[row.action]}</Badge>
      {row.note && <span className="text-muted-foreground">{row.note}</span>}
    </span>
  );
}

interface ImportRowsTableProps {
  rows: readonly ImportPreviewRow[];
  columns: readonly ImportPreviewColumn[];
  /** Accessible name of the table. */
  label: string;
}

/** The preview of an upload: one line per sheet row with its cells and what the commit will do, or what is wrong. */
export function ImportRowsTable({ rows, columns, label }: ImportRowsTableProps): ReactNode {
  return (
    <Table aria-label={label}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Row</TableHead>
          {columns.map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.row} data-state={row.errors.length > 0 ? 'error' : row.action}>
            <TableCell>{row.row}</TableCell>
            {columns.map((column) => {
              const bad = row.errors.some((issue) => issue.field === column.key);
              return (
                <TableCell key={column.key} className={bad ? 'text-destructive font-medium' : undefined}>
                  {row.values[column.key] ?? ''}
                </TableCell>
              );
            })}
            <TableCell>
              <RowStatus row={row} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
