'use client';

import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInvoices } from '@/hooks/use-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface PickerProps {
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** Rows that cannot be picked, e.g. invoices with no interest to waive. */
  pickable?: (invoice: { lpi_amount: number }) => boolean;
}

const STATUSES = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'sent', label: 'Posted, not due' },
  { value: 'partially_paid', label: 'Partially paid' },
] as const;

/** Open member invoices to pick for a correction: status, search, at most 100 shown. */
export function InvoicePicker({ selected, onChange, pickable = () => true }: PickerProps): ReactNode {
  const [status, setStatus] = useState<string>('overdue');
  const [q, setQ] = useState('');
  const query = useInvoices({ status, scope: 'member', party: 'unit', q, page: 1, limit: 100 });
  const rows = query.data?.data ?? [];
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="pick-status">Status</Label>
          <Select id="pick-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pick-search">Search</Label>
          <Input id="pick-search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Invoice no. or unit" />
        </div>
      </div>
      <Table aria-label="Invoices">
        <TableHeader>
          <TableRow>
            <TableHead>Pick</TableHead>
            <TableHead>Invoice No</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Interest</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Pick ${invoice.invoice_number}`}
                  disabled={!pickable({ lpi_amount: Number(invoice.lpi_amount ?? 0) })}
                  checked={selected.has(invoice.id)}
                  onChange={() => toggle(invoice.id)}
                />
              </TableCell>
              <TableCell>{invoice.invoice_number}</TableCell>
              <TableCell>{[invoice.block, invoice.unit_number].filter(Boolean).join('-')}</TableCell>
              <TableCell>{formatDate(invoice.due_date)}</TableCell>
              <TableCell>{formatCurrency(invoice.balance_due)}</TableCell>
              <TableCell>{formatCurrency(invoice.lpi_amount ?? 0)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                {query.isLoading ? 'Loading…' : 'No invoices match.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
