'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus, Receipt, IndianRupee, CreditCard, Banknote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useReceipts,
  useReceiptSummary,
  useCreateReceipt,
  useCreateCreditNote,
  useFinancialYears,
  useInvoices,
} from '@/hooks';
import { useUnits } from '@/hooks';
import type { ReceiptMode } from '@communityos/shared';

const ITEMS_PER_PAGE = 20;

function getPaymentModeLabel(mode: string): string {
  switch (mode) {
    case 'cash':
      return 'Cash';
    case 'cheque':
      return 'Cheque';
    case 'upi':
      return 'UPI';
    case 'bank_transfer':
      return 'NEFT';
    case 'online':
      return 'Razorpay';
    default:
      return mode;
  }
}

function getPaymentModeBadgeClass(mode: string): string {
  switch (mode) {
    case 'cash':
      return 'border-transparent bg-success/15 text-success';
    case 'cheque':
      return 'border-transparent bg-blue-500/15 text-blue-600';
    case 'upi':
      return 'border-transparent bg-purple-500/15 text-purple-600';
    case 'bank_transfer':
      return 'border-transparent bg-indigo-500/15 text-indigo-600';
    case 'online':
      return 'border-transparent bg-orange-500/15 text-orange-600';
    default:
      return '';
  }
}

function SummaryCardsSkeleton(): ReactNode {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-1 h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 text-right" /></TableCell>
          <TableCell><Skeleton className="h-5 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function ReceiptsContent(): ReactNode {
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [modeFilter, setModeFilter] = useState('');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);

  // Form state for receipt
  const [receiptUnitId, setReceiptUnitId] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptMode, setReceiptMode] = useState<string>('cash');
  const [receiptReference, setReceiptReference] = useState('');
  const [receiptDate, setReceiptDate] = useState('');

  // Form state for credit note
  const [cnUnitId, setCnUnitId] = useState('');
  const [cnInvoiceId, setCnInvoiceId] = useState('');
  const [cnAmount, setCnAmount] = useState('');
  const [cnReason, setCnReason] = useState('');

  const receiptsQuery = useReceipts({
    payment_mode: modeFilter || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const summaryQuery = useReceiptSummary();
  const unitsQuery = useUnits({ limit: 500 });
  const fyQuery = useFinancialYears();
  const invoicesQuery = useInvoices({ unit_id: cnUnitId || undefined, limit: 50 });
  const createReceipt = useCreateReceipt();
  const createCreditNote = useCreateCreditNote();

  const currentFY = fyQuery.data?.find((fy: { is_current: boolean }) => fy.is_current);
  const currentFYId = currentFY?.id ?? '';

  const receipts = receiptsQuery.data?.data ?? [];
  const totalReceipts = receiptsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalReceipts / ITEMS_PER_PAGE));

  const summary = summaryQuery.data;
  const totalCollected = summary?.total_collected ?? 0;
  const cashCollected = summary?.cash ?? 0;
  const digitalCollected = (summary?.upi ?? 0) + (summary?.bank_transfer ?? 0) + (summary?.online ?? 0);

  const units = unitsQuery.data?.data ?? [];

  function resetReceiptForm(): void {
    setReceiptUnitId('');
    setReceiptAmount('');
    setReceiptMode('cash');
    setReceiptReference('');
    setReceiptDate('');
  }

  function resetCreditNoteForm(): void {
    setCnUnitId('');
    setCnInvoiceId('');
    setCnAmount('');
    setCnReason('');
  }

  function handleRecordReceipt(e: FormEvent): void {
    e.preventDefault();
    createReceipt.mutate(
      {
        financial_year_id: currentFYId,
        unit_id: receiptUnitId,
        receipt_date: receiptDate,
        amount: Number(receiptAmount),
        mode: receiptMode,
        reference_number: receiptReference || null,
      },
      {
        onSuccess() {
          setReceiptDialogOpen(false);
          resetReceiptForm();
          addToast({ title: 'Receipt recorded successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to record receipt', variant: 'destructive' });
        },
      },
    );
  }

  function handleCreateCreditNote(e: FormEvent): void {
    e.preventDefault();
    createCreditNote.mutate(
      {
        financial_year_id: currentFYId,
        invoice_id: cnInvoiceId,
        unit_id: cnUnitId,
        amount: Number(cnAmount),
        reason: cnReason,
      },
      {
        onSuccess() {
          setCreditNoteDialogOpen(false);
          resetCreditNoteForm();
          addToast({ title: 'Credit note created successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to create credit note', variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Receipts' }]}
        title="Receipts"
        description="Record payments received from members — cash, cheque, bank transfer, UPI"
        actions={
          <>
            <ExportButton
              data={receipts as unknown as Record<string, unknown>[]}
              filename={`receipts-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { key: 'receipt_number', label: 'Receipt #' },
                { key: 'unit_id', label: 'Unit' },
                { key: 'amount', label: 'Amount' },
                { key: 'mode', label: 'Payment Mode' },
                { key: 'receipt_date', label: 'Date' },
                { key: 'reference_number', label: 'Reference' },
              ]}
            />
            <Dialog open={creditNoteDialogOpen} onOpenChange={setCreditNoteDialogOpen}>
              <DialogTrigger>
                <Button variant="outline">Create Credit Note</Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateCreditNote}>
                  <DialogHeader>
                    <DialogTitle>Create Credit Note</DialogTitle>
                    <DialogDescription>Issue a credit note against a unit</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="cn-unit">Unit</Label>
                      <Select
                        id="cn-unit"
                        required
                        value={cnUnitId}
                        onChange={(e) => setCnUnitId(e.target.value)}
                      >
                        <option value="">Select unit</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.unit_number}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cn-invoice">Invoice</Label>
                      <Select
                        id="cn-invoice"
                        required
                        value={cnInvoiceId}
                        onChange={(e) => setCnInvoiceId(e.target.value)}
                      >
                        <option value="">Select invoice</option>
                        {(invoicesQuery.data?.data ?? []).map((inv: { id: string; invoice_number: string; balance_due: number }) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_number} (Due: {formatCurrency(Number(inv.balance_due))})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cn-amount">Amount</Label>
                      <Input
                        id="cn-amount"
                        type="number"
                        placeholder="0.00"
                        required
                        min="0.01"
                        step="0.01"
                        title="Amount must be greater than zero"
                        value={cnAmount}
                        onChange={(e) => setCnAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cn-reason">Reason</Label>
                      <Input
                        id="cn-reason"
                        placeholder="Reason for credit note"
                        required
                        value={cnReason}
                        onChange={(e) => setCnReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createCreditNote.isPending}>
                      {createCreditNote.isPending ? 'Creating...' : 'Create Credit Note'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
              <DialogTrigger>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Receipt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleRecordReceipt}>
                  <DialogHeader>
                    <DialogTitle>Record Receipt</DialogTitle>
                    <DialogDescription className="flex items-center gap-1">
                      Record a new payment receipt from a unit owner
                      <HelpTooltip text="The receipt amount is automatically allocated against the unit's oldest pending invoices to track dues clearance." />
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="receipt-unit">Unit</Label>
                      <Select
                        id="receipt-unit"
                        required
                        value={receiptUnitId}
                        onChange={(e) => setReceiptUnitId(e.target.value)}
                      >
                        <option value="">Select unit</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.unit_number}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receipt-amount">Amount</Label>
                      <Input
                        id="receipt-amount"
                        type="number"
                        placeholder="0.00"
                        required
                        min="0.01"
                        step="0.01"
                        title="Amount must be greater than zero"
                        value={receiptAmount}
                        onChange={(e) => setReceiptAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receipt-mode">Payment Mode</Label>
                      <Select
                        id="receipt-mode"
                        required
                        value={receiptMode}
                        onChange={(e) => setReceiptMode(e.target.value)}
                      >
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">NEFT / Bank Transfer</option>
                        <option value="online">Razorpay / Online</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receipt-reference">Reference / Transaction ID</Label>
                      <Input
                        id="receipt-reference"
                        placeholder="e.g., UPI-12345678"
                        value={receiptReference}
                        onChange={(e) => setReceiptReference(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receipt-date">Date</Label>
                      <Input
                        id="receipt-date"
                        type="date"
                        required
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createReceipt.isPending}>
                      {createReceipt.isPending ? 'Recording...' : 'Record Receipt'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {summaryQuery.isLoading ? (
        <SummaryCardsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Collected
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalCollected)}</p>
              <p className="text-xs text-muted-foreground">
                {summary?.count ?? 0} receipts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cash Collection
              </CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(cashCollected)}</p>
              <p className="text-xs text-muted-foreground">Cash payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Digital Collection
              </CardTitle>
              <CreditCard className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(digitalCollected)}</p>
              <p className="text-xs text-muted-foreground">UPI, NEFT, Razorpay</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Receipt History</CardTitle>
            <Select
              className="w-full sm:w-48"
              value={modeFilter}
              onChange={(e) => {
                setModeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">NEFT</option>
              <option value="online">Razorpay</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receiptsQuery.isLoading ? (
                <TableSkeleton />
              ) : (
                receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      <span className="font-mono text-xs">{receipt.receipt_number}</span>
                    </TableCell>
                    <TableCell className="font-medium">{receipt.unit_id}</TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {formatCurrency(receipt.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentModeBadgeClass(receipt.mode)}>
                        {getPaymentModeLabel(receipt.mode)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(receipt.receipt_date)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {receipt.reference_number ?? '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!receiptsQuery.isLoading && receipts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No receipts yet</p>
              <p className="text-sm text-muted-foreground">Record your first receipt to get started</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalReceipts} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
