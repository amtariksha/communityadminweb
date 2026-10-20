'use client';

import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ExportButton } from '@/components/ui/export-button';
import { useIncomeExpenditure, type StatementSwitches } from '@/hooks/use-ledger';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReportSkeleton } from './report-skeleton';

export function IncomeExpenditureView({ startDate, endDate, switches = {} }: { startDate: string; endDate: string; switches?: StatementSwitches }): ReactNode {
  const { data, isLoading, isError, error } = useIncomeExpenditure(startDate, endDate, switches);

  if (isLoading) return <ReportSkeleton />;
  if (isError) return <p className="py-8 text-center text-destructive">Failed to load: {(error as Error)?.message ?? 'Unknown error'}</p>;
  if (!data) return <p className="py-8 text-center text-muted-foreground">No data available</p>;

  const incomeRows = data.income ?? [];
  const expenditureRows = data.expense ?? [];
  const isSurplus = (data.surplus ?? 0) >= 0;

  const exportRows = [
    ...incomeRows.map((r) => ({
      type: 'Income',
      code: r.account_code,
      account: r.account_name,
      amount: r.amount,
    })),
    ...expenditureRows.map((r) => ({
      type: 'Expenditure',
      code: r.account_code,
      account: r.account_name,
      amount: r.amount,
    })),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Period: {formatDate(data.start_date)} to {formatDate(data.end_date)}
        </p>
        <ExportButton
          data={exportRows as unknown as Record<string, unknown>[]}
          filename={`income-expenditure-${data.start_date}-to-${data.end_date}`}
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'code', label: 'Code' },
            { key: 'account', label: 'Account' },
            { key: 'amount', label: 'Amount' },
          ]}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-lg font-semibold text-success">Income</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeRows.map((row) => (
                <TableRow key={row.account_id}>
                  <TableCell className="font-mono text-xs">{row.account_code}</TableCell>
                  <TableCell>{row.account_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell colSpan={2} className="text-right">Total Income</TableCell>
                <TableCell className="text-right text-success">
                  {formatCurrency(data.total_income)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold text-destructive">Expenditure</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenditureRows.map((row) => (
                <TableRow key={row.account_id}>
                  <TableCell className="font-mono text-xs">{row.account_code}</TableCell>
                  <TableCell>{row.account_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell colSpan={2} className="text-right">Total Expenditure</TableCell>
                <TableCell className="text-right text-destructive">
                  {formatCurrency(data.total_expense ?? 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <Separator className="my-6" />
      <div className="flex items-center justify-between rounded-lg border p-4">
        <span className="text-lg font-semibold">
          {isSurplus ? 'Surplus' : 'Deficit'}
        </span>
        <span className={`text-2xl font-bold ${isSurplus ? 'text-success' : 'text-destructive'}`}>
          {formatCurrency(Math.abs(data.surplus ?? 0))}
        </span>
      </div>
    </div>
  );
}
