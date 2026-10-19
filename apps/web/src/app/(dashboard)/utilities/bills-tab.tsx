'use client';

import { useState, type ReactNode } from 'react';
import { Calculator, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUtilityBills } from '@/hooks';
import type { UtilityBill } from '@/hooks/use-utilities';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BillInvoiceDialog } from './bill-invoice-dialog';
import { CalculateBillsDialog } from './calculate-bills-dialog';
import { billStatusVariant, METER_TYPES, meterTypeIcon, meterTypeLabel } from './utility-ui';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 8;

function BillRow({ bill, onInvoice }: { bill: UtilityBill; onInvoice: (billId: string) => void }): ReactNode {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          {meterTypeIcon(bill.meter_type ?? '')}
          <span className="capitalize">{bill.meter_type ?? ''}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">{bill.meter_number ?? ''}</TableCell>
      <TableCell>{bill.unit_number ?? ''}</TableCell>
      <TableCell className="text-xs">
        {formatDate(bill.period_from)} – {formatDate(bill.period_to)}
      </TableCell>
      <TableCell>{Number(bill.consumption)} units</TableCell>
      <TableCell className="font-medium">{formatCurrency(Number(bill.amount))}</TableCell>
      <TableCell>
        <Badge variant={billStatusVariant(bill.status)}>{bill.status}</Badge>
      </TableCell>
      <TableCell>
        {bill.status === 'pending' && (
          <Button variant="ghost" size="sm" className="h-8 px-2" title="Generate Invoice" onClick={() => onInvoice(bill.id)}>
            <FileText className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function BillRows({ loading, bills, onInvoice }: { loading: boolean; bills: UtilityBill[]; onInvoice: (billId: string) => void }): ReactNode {
  if (loading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
        ))}
      </TableRow>
    ));
  }
  if (bills.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-muted-foreground">
          No bills found. Calculate bills from meter readings.
        </TableCell>
      </TableRow>
    );
  }
  return bills.map((bill) => <BillRow key={bill.id} bill={bill} onInvoice={onInvoice} />);
}

function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }): ReactNode {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function BillsTab(): ReactNode {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [calcOpen, setCalcOpen] = useState(false);
  const [invoiceBillId, setInvoiceBillId] = useState<string | null>(null);
  const billsQuery = useUtilityBills({
    status: statusFilter || undefined,
    meter_type: typeFilter || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });
  const bills = billsQuery.data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((billsQuery.data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Utility Bills</CardTitle>
            <Button onClick={() => setCalcOpen(true)}>
              <Calculator className="mr-2 h-4 w-4" /> Calculate Bills
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="bills-type">Type</Label>
              <Select id="bills-type" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                {METER_TYPES.map((t) => (
                  <option key={t} value={t}>{meterTypeLabel(t)}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bills-status">Status</Label>
              <Select id="bills-status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Meter</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Consumption</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <BillRows loading={billsQuery.isLoading} bills={bills} onInvoice={setInvoiceBillId} />
            </TableBody>
          </Table>
          <Pager page={currentPage} totalPages={totalPages} onPage={setCurrentPage} />
        </CardContent>
      </Card>
      <CalculateBillsDialog open={calcOpen} onOpenChange={setCalcOpen} />
      <BillInvoiceDialog billId={invoiceBillId} onClose={() => setInvoiceBillId(null)} />
    </div>
  );
}
