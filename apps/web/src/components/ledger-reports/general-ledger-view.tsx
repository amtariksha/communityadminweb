'use client';

import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { useGeneralLedgerReport } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReportSkeleton } from './report-skeleton';

export function GeneralLedgerView({
  accountId,
  startDate,
  endDate,
}: {
  accountId: string;
  startDate: string;
  endDate: string;
}): ReactNode {
  const { data, isLoading } = useGeneralLedgerReport(accountId, startDate, endDate);

  if (isLoading) return <ReportSkeleton />;
  if (!data) return <p className="py-8 text-center text-muted-foreground">Select an account to view its ledger</p>;

  // 2026-05-09 (QA #245) — production crash: when the GL endpoint
  // returned a row whose `account_name` was null (e.g. a stub bank
  // ledger created pre-migration 023 backfill), the next line
  // tried `undefined.replace(...)` and threw a runtime TypeError
  // that broke the entire page. Render-safe fallbacks below.
  // The API sends `account: { name }`; `account_name` is an older shape.
  const accountName = data.account?.name ?? data.account_name ?? 'account';
  const filenameSafeAccount = accountName.replace(/\s+/g, '-');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{accountName}</h3>
          <p className="text-sm text-muted-foreground">
            {formatDate(startDate)} to {formatDate(endDate)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Opening Balance</p>
            <p className="font-semibold">{formatCurrency(data.opening_balance)}</p>
          </div>
          <ExportButton
            data={data.transactions as unknown as Record<string, unknown>[]}
            filename={`general-ledger-${filenameSafeAccount}-${startDate}-to-${endDate}`}
            columns={[
              { key: 'entry_date', label: 'Date' },
              { key: 'entry_number', label: 'Entry #' },
              { key: 'narration', label: 'Narration' },
              { key: 'debit', label: 'Debit' },
              { key: 'credit', label: 'Credit' },
              { key: 'running_balance', label: 'Balance' },
            ]}
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry #</TableHead>
            <TableHead>Narration</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.transactions.map((txn, idx) => (
            <TableRow key={idx}>
              <TableCell className="text-muted-foreground">{formatDate(txn.entry_date ?? txn.date)}</TableCell>
              <TableCell className="font-mono text-xs">{txn.entry_number}</TableCell>
              <TableCell>{txn.narration}</TableCell>
              <TableCell className="text-right">
                {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(txn.running_balance)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={5} className="text-right">Closing Balance</TableCell>
            <TableCell className="text-right">{formatCurrency(data.closing_balance)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
