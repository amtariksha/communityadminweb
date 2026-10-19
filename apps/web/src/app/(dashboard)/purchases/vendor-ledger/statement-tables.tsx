'use client';

import { type ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { VendorStatement } from '@/hooks/use-vendor-ledger';

/** EXP-S10 Current Dues: open invoices with what remains and days overdue. */
export function CurrentDuesTable({ statement }: { statement: VendorStatement }): ReactNode {
  const rows = statement.current_dues.rows;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No open invoices.</p>;
  return (
    <Table aria-label="Current Dues">
      <TableHeader>
        <TableRow>
          {['Sl.No', 'Voucher No', 'Vendor Invoice No', 'Invoice Date', 'Due Date', 'Expense Head', 'Invoice Amount', 'Remaining', 'Days Overdue'].map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((bill, index) => (
          <TableRow key={bill.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{bill.bill_number}</TableCell>
            <TableCell>{bill.vendor_invoice_number ?? '—'}</TableCell>
            <TableCell>{formatDate(bill.bill_date)}</TableCell>
            <TableCell>{formatDate(bill.due_date)}</TableCell>
            <TableCell>{bill.heads ?? '—'}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(bill.invoice_amount)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(bill.remaining)}</TableCell>
            <TableCell className="text-right">{bill.days_overdue}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const CREDIT_TYPE = { advance_payment: 'Advance payment', debit_note: 'Debit note' } as const;

/** EXP-S10 Current Advance: payments and debit notes not yet set against invoices. */
export function CurrentAdvanceTable({ statement }: { statement: VendorStatement }): ReactNode {
  const rows = statement.current_advance.rows;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No advance with this vendor.</p>;
  return (
    <Table aria-label="Current Advance">
      <TableHeader>
        <TableRow>
          {['Sl.No', 'Voucher No', 'Date', 'Type', 'Amount', 'Unallocated'].map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((credit, index) => (
          <TableRow key={credit.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{credit.voucher_number ?? '—'}</TableCell>
            <TableCell>{formatDate(credit.date)}</TableCell>
            <TableCell>{CREDIT_TYPE[credit.type]}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(credit.amount)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(credit.unallocated)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
