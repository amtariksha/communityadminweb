'use client';

import { type ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdvances } from '@/hooks/use-receipts';
import type { UnitLedgerScope } from '@/hooks/use-unit-ledger';
import { useOpenBills, type OpenBill } from '@/hooks/use-unit-statement';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatCurrency, formatDate } from '@/lib/utils';

export function EmptyRow({ span, text }: { span: number; text: string }): ReactNode {
  return (
    <TableRow>
      <TableCell colSpan={span} className="py-6 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

interface DueTableProps {
  rows: readonly OpenBill[];
  loading: boolean;
  emptyText: string;
}

/** Open bills, oldest due first: Bill No · Bill Date · Due Date · Account · Bill Amount · Amount Paid · Remaining. */
export function DueTable({ rows, loading, emptyText }: DueTableProps): ReactNode {
  return (
    <Table aria-label="Current due">
      <TableHeader>
        <TableRow>
          <TableHead>Bill No</TableHead>
          <TableHead>Bill Date</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Bill Amount</TableHead>
          <TableHead className="text-right">Amount Paid</TableHead>
          <TableHead className="text-right">Remaining</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <EmptyRow span={7} text={loading ? 'Loading…' : emptyText} />}
        {rows.map((bill) => (
          <TableRow key={bill.id}>
            <TableCell className="font-mono text-xs">{bill.invoice_number}</TableCell>
            <TableCell>{formatDate(bill.bill_date)}</TableCell>
            <TableCell>{formatDate(bill.due_date)}</TableCell>
            <TableCell>{bill.account}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(bill.bill_amount))}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(bill.bill_amount) - Number(bill.remaining))}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(bill.remaining))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Current Due: the unit's open bills in the ledger, oldest due first. */
export function CurrentDueTab({ unitId, scope }: { unitId: string; scope: UnitLedgerScope }): ReactNode {
  const bills = useOpenBills(unitId, scope);
  if (isNotDeployed(bills.error)) return <p className="text-sm text-muted-foreground">Open bills are not available yet on this server.</p>;
  return <DueTable rows={bills.data ?? []} loading={bills.isLoading} emptyText="This unit has no open bills." />;
}

/** Current Advances: what the unit has paid beyond its bills, receipt by receipt. */
export function CurrentAdvancesTab({ unitId }: { unitId: string }): ReactNode {
  const advances = useAdvances(unitId);
  const rows = advances.data?.data ?? [];
  return (
    <Table aria-label="Current advances">
      <TableHeader>
        <TableRow>
          <TableHead>Receipt No</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Remaining</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <EmptyRow span={5} text={advances.isLoading ? 'Loading…' : 'No advance held.'} />}
        {rows.map((advance) => (
          <TableRow key={advance.id}>
            <TableCell className="font-mono text-xs">{advance.receipt_number}</TableCell>
            <TableCell>{formatDate(advance.created_at)}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(advance.amount))}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(advance.remaining))}</TableCell>
            <TableCell>{advance.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
