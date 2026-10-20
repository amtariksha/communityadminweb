'use client';

import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { useBalanceSheet } from '@/hooks';
import type { StatementSwitches } from '@/hooks/use-ledger';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReportSkeleton } from './report-skeleton';

export function BalanceSheetView({ asOfDate, switches = {} }: { asOfDate: string; switches?: StatementSwitches }): ReactNode {
  const { data, isLoading, isError, error } = useBalanceSheet(asOfDate, switches);

  if (isLoading) return <ReportSkeleton />;
  if (isError) return <p className="py-8 text-center text-destructive">Failed to load: {(error as Error)?.message ?? 'Unknown error'}</p>;
  if (!data) return <p className="py-8 text-center text-muted-foreground">No data available</p>;

  const assetRows = data.assets ?? [];
  const liabilityRows = data.liabilities ?? [];

  // Flatten for export: each row labelled with its side (Asset / Liability)
  // and group so the exported CSV reads independently of the page layout.
  const exportRows = [
    ...assetRows.flatMap((s) =>
      s.accounts.map((acc) => ({
        side: 'Asset',
        group: s.group,
        account: acc.account_name,
        balance: acc.balance,
      })),
    ),
    ...liabilityRows.flatMap((s) =>
      s.accounts.map((acc) => ({
        side: 'Liability',
        group: s.group,
        account: acc.account_name,
        balance: acc.balance,
      })),
    ),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">As of {formatDate(data.as_of_date)}</p>
        <ExportButton
          data={exportRows as unknown as Record<string, unknown>[]}
          filename={`balance-sheet-${data.as_of_date}`}
          columns={[
            { key: 'side', label: 'Side' },
            { key: 'group', label: 'Group' },
            { key: 'account', label: 'Account' },
            { key: 'balance', label: 'Balance' },
          ]}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-lg font-semibold">Assets</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetRows.map((section) => (
                <>
                  <TableRow key={`group-${section.group}`} className="bg-muted/50">
                    <TableCell colSpan={2} className="font-semibold">{section.group}</TableCell>
                  </TableRow>
                  {section.accounts.map((acc) => (
                    <TableRow key={acc.account_id}>
                      <TableCell className="pl-6">{acc.account_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.balance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow key={`subtotal-${section.group}`}>
                    <TableCell className="pl-6 font-medium">Subtotal</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(section.total)}
                    </TableCell>
                  </TableRow>
                </>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Total Assets</TableCell>
                <TableCell className="text-right">{formatCurrency(data.total_assets)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-semibold">Liabilities</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liabilityRows.map((section) => (
                <>
                  <TableRow key={`group-${section.group}`} className="bg-muted/50">
                    <TableCell colSpan={2} className="font-semibold">{section.group}</TableCell>
                  </TableRow>
                  {section.accounts.map((acc) => (
                    <TableRow key={acc.account_id}>
                      <TableCell className="pl-6">{acc.account_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(acc.balance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow key={`subtotal-${section.group}`}>
                    <TableCell className="pl-6 font-medium">Subtotal</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(section.total)}
                    </TableCell>
                  </TableRow>
                </>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Total Liabilities</TableCell>
                <TableCell className="text-right">{formatCurrency(data.total_liabilities)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
