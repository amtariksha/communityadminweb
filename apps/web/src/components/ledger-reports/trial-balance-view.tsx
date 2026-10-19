'use client';

import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { useTrialBalance } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReportSkeleton } from './report-skeleton';

export function TrialBalanceView({ asOfDate }: { asOfDate: string }): ReactNode {
  const { data, isLoading, isError, error } = useTrialBalance(asOfDate);

  if (isLoading) return <ReportSkeleton />;
  if (isError) return <p className="py-8 text-center text-destructive">Failed to load: {(error as Error)?.message ?? 'Unknown error'}</p>;
  if (!data) return <p className="py-8 text-center text-muted-foreground">No data available</p>;

  // QA #249 — backend now ships `total_debit` / `total_credit` per
  // row (movement sums), not `debit` / `credit`. The legacy keys
  // were left optional on TrialBalanceRow so a rolling deploy
  // wouldn't break either way; render whichever is populated.
  // Without this, every row's Debit / Credit cell rendered '-'
  // even though the total row at the bottom showed real numbers.
  type TBRow = (typeof data.rows)[number];
  function rowDebit(row: TBRow): number {
    return Number(row.total_debit ?? row.debit ?? 0);
  }
  function rowCredit(row: TBRow): number {
    return Number(row.total_credit ?? row.credit ?? 0);
  }

  // QA #229 — Trial Balance export was missing the total row. Append
  // a synthetic total row to the export array so CSV / Excel users
  // see the same bottom line as the on-screen table.
  const exportRows: Record<string, unknown>[] = [
    ...data.rows.map((row) => ({
      account_code: row.account_code,
      account_name: row.account_name,
      group_name: row.group_name,
      debit: rowDebit(row),
      credit: rowCredit(row),
    })),
    {
      account_code: '',
      account_name: 'TOTAL',
      group_name: '',
      debit: data.total_debit,
      credit: data.total_credit,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">As of {formatDate(data.as_of_date)}</p>
        <ExportButton
          data={exportRows}
          filename={`trial-balance-${data.as_of_date}`}
          columns={[
            { key: 'account_code', label: 'Code' },
            { key: 'account_name', label: 'Account' },
            { key: 'group_name', label: 'Group' },
            { key: 'debit', label: 'Debit' },
            { key: 'credit', label: 'Credit' },
          ]}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Code</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => {
            const d = rowDebit(row);
            const c = rowCredit(row);
            return (
              <TableRow key={row.account_id}>
                <TableCell className="font-mono text-xs">{row.account_code}</TableCell>
                <TableCell className="font-medium">{row.account_name}</TableCell>
                <TableCell className="text-muted-foreground">{row.group_name}</TableCell>
                <TableCell className="text-right">
                  {d > 0 ? formatCurrency(d) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {c > 0 ? formatCurrency(c) : '-'}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={3} className="text-right">
              Total
            </TableCell>
            <TableCell className="text-right">{formatCurrency(data.total_debit)}</TableCell>
            <TableCell className="text-right">{formatCurrency(data.total_credit)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
