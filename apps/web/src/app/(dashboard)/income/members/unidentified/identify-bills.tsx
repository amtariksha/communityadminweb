'use client';

import { type ReactNode } from 'react';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OpenBill } from '@/hooks/use-unit-statement';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { BillPick, IdentifyForm } from './identify-state';

interface IdentifyBillsProps {
  bills: readonly OpenBill[];
  form: IdentifyForm;
  onPick: (billId: string, pick: BillPick) => void;
  errors: Record<string, string>;
}

/** The unit's open bills to pick from (INC-S21's table, without TDS). */
export function IdentifyBills({ bills, form, onPick, errors }: IdentifyBillsProps): ReactNode {
  if (bills.length === 0) return <p className="text-sm text-muted-foreground">No open bills — the amount will be held as the unit&apos;s advance.</p>;
  return (
    <Table aria-label="Open bills">
      <TableHeader>
        <TableRow>
          <TableHead>Bill No</TableHead>
          <TableHead>Bill Date</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Remaining</TableHead>
          <TableHead>Select</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bills.map((bill) => {
          const pick = form.picks[bill.id] ?? { selected: false, amount: '' };
          return (
            <TableRow key={bill.id}>
              <TableCell className="font-mono text-xs">{bill.invoice_number}</TableCell>
              <TableCell>{formatDate(bill.bill_date)}</TableCell>
              <TableCell>{formatDate(bill.due_date)}</TableCell>
              <TableCell>{bill.account}</TableCell>
              <TableCell className="text-right">{formatCurrency(Number(bill.remaining))}</TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Select ${bill.invoice_number}`}
                  disabled={form.fifo}
                  checked={pick.selected}
                  onChange={(e) => onPick(bill.id, { selected: e.target.checked, amount: pick.amount || bill.remaining })}
                />
              </TableCell>
              <TableCell className="w-32">
                <Input
                  aria-label={`Amount for ${bill.invoice_number}`}
                  inputMode="decimal"
                  disabled={form.fifo || !pick.selected}
                  value={pick.amount}
                  onChange={(e) => onPick(bill.id, { ...pick, amount: e.target.value })}
                />
                <FormFieldError message={errors[`bill.${bill.id}`]} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
