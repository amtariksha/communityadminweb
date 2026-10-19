'use client';

import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { useDefaulters } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReportSkeleton } from './report-skeleton';

export function DefaultersView(): ReactNode {
  const { data, isLoading } = useDefaulters();

  if (isLoading) return <ReportSkeleton />;
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No defaulters found</p>;
  }

  // 2026-05-09 (QA #91) — backend `invoice.service.ts#getDefaulters`
  // returns `total_due` and `invoice_count`, not `total_overdue` /
  // `overdue_months`. The interface in `use-invoices.ts` was
  // realigned with the server; this report view was previously
  // typo'd to match the old interface and showed "NaN" / blank
  // cells. Decimal strings from `numeric` PG columns need a
  // `Number(...)` cast before arithmetic.
  const totalOverdue = data.reduce(
    (sum, d) => sum + Number(d.total_due ?? 0),
    0,
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} defaulting units</p>
        <div className="flex items-center gap-4">
          <p className="font-semibold text-destructive">
            Total Overdue: {formatCurrency(totalOverdue)}
          </p>
          <ExportButton
            data={data as unknown as Record<string, unknown>[]}
            filename={`defaulters-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'unit_number', label: 'Unit' },
              { key: 'block', label: 'Block' },
              { key: 'total_due', label: 'Overdue Amount' },
              { key: 'invoice_count', label: 'Overdue Invoices' },
              { key: 'oldest_due_date', label: 'Oldest Due Date' },
              { key: 'days_overdue', label: 'Days Overdue' },
            ]}
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit</TableHead>
            <TableHead>Block</TableHead>
            <TableHead className="text-right">Overdue Amount</TableHead>
            <TableHead className="text-right">Overdue Invoices</TableHead>
            <TableHead>Oldest Due Date</TableHead>
            <TableHead className="text-right">Days Overdue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.unit_id}>
              <TableCell className="font-medium">{row.unit_number}</TableCell>
              <TableCell>{row.block ?? '-'}</TableCell>
              <TableCell className="text-right font-medium text-destructive">
                {formatCurrency(row.total_due)}
              </TableCell>
              <TableCell className="text-right">{row.invoice_count}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(row.oldest_due_date)}
              </TableCell>
              <TableCell className="text-right">{row.days_overdue ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
