'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OpenBill } from '@/hooks/use-vendor-payments';
import { clampAmount, COMMENT_MAX, tickAll, tickRow, type PayRow } from './payment-model';

interface OpenInvoicesTableProps {
  bills: readonly OpenBill[];
  rows: Record<string, PayRow>;
  onChange: (rows: Record<string, PayRow>) => void;
}

/**
 * EXP-S9 open invoices: tick a row (or Select All) and its Edit Amount takes
 * what remains; a Comment written beside a ticked invoice is kept with it.
 */
export function OpenInvoicesTable({ bills, rows, onChange }: OpenInvoicesTableProps): ReactNode {
  if (bills.length === 0) {
    return <p className="text-sm text-muted-foreground">No open invoices for this vendor</p>;
  }
  const allTicked = bills.every((bill) => rows[bill.id]?.ticked);
  const set = (bill: OpenBill, row: PayRow): void => onChange({ ...rows, [bill.id]: row });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sl.No</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Invoice No.</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Payee Name</TableHead>
            <TableHead className="text-right">Invoice Amount</TableHead>
            <TableHead className="text-right">Remaining Amount</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>
              <label className="flex items-center gap-1">
                <input type="checkbox" aria-label="Select All" checked={allTicked} onChange={(e) => onChange(tickAll(bills, e.target.checked, rows))} />
                Select All
              </label>
            </TableHead>
            <TableHead>Edit Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill, index) => {
            const row = rows[bill.id] ?? { ticked: false, amount: '', comment: '' };
            const number = bill.vendor_invoice_number ?? bill.bill_number;
            return (
              <TableRow key={bill.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{bill.heads ?? '—'}</TableCell>
                <TableCell>{number}</TableCell>
                <TableCell>{formatDate(bill.bill_date)}</TableCell>
                <TableCell>{bill.payee_name ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(bill.invoice_amount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(bill.remaining)}</TableCell>
                <TableCell>
                  <Input
                    aria-label={`Comment for ${number}`}
                    className="w-40"
                    maxLength={COMMENT_MAX}
                    disabled={!row.ticked}
                    value={row.comment ?? ''}
                    onChange={(e) => set(bill, { ...row, comment: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <input type="checkbox" aria-label={`Pay ${number}`} checked={row.ticked} onChange={(e) => set(bill, tickRow(bill, e.target.checked, row.comment))} />
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={`Amount for ${number}`}
                    className="w-28"
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!row.ticked}
                    value={row.amount}
                    onChange={(e) => set(bill, { ...row, amount: clampAmount(bill, e.target.value) })}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
