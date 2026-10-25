'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useGstReport } from '@/hooks';
import type { GstReportRow } from '@/hooks';

const COLUMN_COUNT = 9;

const EXPORT_COLUMNS = [
  { key: 'invoice_number', label: 'Invoice' },
  { key: 'invoice_date', label: 'Date' },
  { key: 'unit_number', label: 'Unit' },
  { key: 'customer_name', label: 'Payer' },
  { key: 'hsn_sac', label: 'HSN/SAC' },
  { key: 'taxable_amount', label: 'Taxable' },
  { key: 'gst_percentage', label: 'Rate %' },
  { key: 'cgst', label: 'CGST' },
  { key: 'sgst', label: 'SGST' },
  { key: 'igst', label: 'IGST' },
  { key: 'gst_amount', label: 'GST Total' },
  { key: 'total', label: 'Total' },
];

/** "18%" from 18 or "18.00"; a missing rate shows a dash. */
export function gstRateLabel(rate: number | string | null | undefined): string {
  const value = Number(rate);
  if (rate === null || rate === undefined || rate === '' || !Number.isFinite(value)) return '—';
  return `${value}%`;
}

function GstReportLine({ row }: { row: GstReportRow }): ReactNode {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.invoice_number}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(row.invoice_date)}</TableCell>
      <TableCell>{row.unit_number ?? row.customer_name ?? '—'}</TableCell>
      <TableCell className="text-right">{formatCurrency(row.taxable_amount)}</TableCell>
      <TableCell className="text-right">{gstRateLabel(row.gst_percentage)}</TableCell>
      <TableCell className="text-right">{formatCurrency(row.cgst)}</TableCell>
      <TableCell className="text-right">{formatCurrency(row.sgst)}</TableCell>
      <TableCell className="text-right">{formatCurrency(row.igst)}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(row.total)}</TableCell>
    </TableRow>
  );
}

function StatusRow({ className, children }: { className: string; children: ReactNode }): ReactNode {
  return (
    <TableRow>
      <TableCell colSpan={COLUMN_COUNT} className={className}>
        {children}
      </TableCell>
    </TableRow>
  );
}

function GstReportBody({ query }: { query: ReturnType<typeof useGstReport> }): ReactNode {
  const rows = query.data ?? [];
  if (query.isLoading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
          <TableCell key={j}>
            <Skeleton className="h-4 w-20" />
          </TableCell>
        ))}
      </TableRow>
    ));
  }
  if (query.isError) {
    return (
      <StatusRow className="py-6 text-center text-destructive">
        Failed to load GST report — {(query.error as Error)?.message ?? 'unknown error'}.{' '}
        <Button size="sm" variant="link" className="px-1 text-destructive underline" onClick={() => query.refetch()}>
          Retry
        </Button>
      </StatusRow>
    );
  }
  if (rows.length === 0) {
    return <StatusRow className="py-8 text-center text-muted-foreground">No GST-bearing invoices in this period.</StatusRow>;
  }
  // An invoice with several taxed lines comes as several rows, so the key is the position.
  return rows.map((row, index) => <GstReportLine key={`${row.invoice_id}-${index}`} row={row} />);
}

/** Taxes › GST Invoice Report: one row per taxed invoice line, split into CGST / SGST or IGST as posted. */
export function GstReportSection({ from, to }: { from: string; to: string }): ReactNode {
  const query = useGstReport({ from_date: from, to_date: to });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>GST Invoice Report</CardTitle>
          <ExportButton
            data={(query.data ?? []) as unknown as Record<string, unknown>[]}
            filename={`gst-report-${from}-to-${to}`}
            columns={EXPORT_COLUMNS}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <GstReportBody query={query} />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
