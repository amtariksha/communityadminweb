'use client';

import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { useVendorAging } from '@/hooks';
import { formatCurrency } from '@/lib/utils';
import { ReportSkeleton } from './report-skeleton';

export function VendorAgingView(): ReactNode {
  const { data, isLoading } = useVendorAging();

  if (isLoading) return <ReportSkeleton />;
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No vendor aging data</p>;
  }

  const totals = data.reduce(
    (acc, row) => ({
      current: acc.current + row.current,
      days_30: acc.days_30 + row.days_30,
      days_60: acc.days_60 + row.days_60,
      days_90: acc.days_90 + row.days_90,
      over_90: acc.over_90 + row.over_90,
      total: acc.total + row.total,
    }),
    { current: 0, days_30: 0, days_60: 0, days_90: 0, over_90: 0, total: 0 },
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <ExportButton
          data={data as unknown as Record<string, unknown>[]}
          filename={`vendor-aging-${new Date().toISOString().split('T')[0]}`}
          columns={[
            { key: 'vendor_name', label: 'Vendor' },
            { key: 'current', label: 'Current' },
            { key: 'days_30', label: '1-30 Days' },
            { key: 'days_60', label: '31-60 Days' },
            { key: 'days_90', label: '61-90 Days' },
            { key: 'over_90', label: '90+ Days' },
            { key: 'total', label: 'Total' },
          ]}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">1-30 Days</TableHead>
            <TableHead className="text-right">31-60 Days</TableHead>
            <TableHead className="text-right">61-90 Days</TableHead>
            <TableHead className="text-right">90+ Days</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.vendor_id}>
              <TableCell className="font-medium">{row.vendor_name}</TableCell>
              <TableCell className="text-right">
                {row.current > 0 ? formatCurrency(row.current) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.days_30 > 0 ? formatCurrency(row.days_30) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.days_60 > 0 ? formatCurrency(row.days_60) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.days_90 > 0 ? formatCurrency(row.days_90) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {row.over_90 > 0 ? (
                  <span className="text-destructive">{formatCurrency(row.over_90)}</span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(row.total)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-bold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.current)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.days_30)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.days_60)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.days_90)}</TableCell>
            <TableCell className="text-right text-destructive">{formatCurrency(totals.over_90)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
