'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  ShoppingCart,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  CreditCard,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import type { VendorBill } from '@communityos/shared';
import { DirectExpenseDialog } from './direct-expense-dialog';
import { DebitNoteDialog } from './debit-note-dialog';
import { ExportButton } from '@/components/ui/export-button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BILL_STATUS_FILTER_OPTIONS, getBillStatusLabel, getBillStatusVariant } from './bill-status';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  usePurchaseRequests,
  useApprovePR,
  useRejectPR,
  useVendorBills,
  useEditBill,
  useCancelBill,
  useVendorAging,
  useVendors,
} from '@/hooks';
import { useWord } from '@/lib/vocabulary';
import Link from 'next/link';
import { ConvertToInvoiceButton, CreatePurchaseRequestButton, ViewPurchaseRequestButton } from './create-request-button';
import { VendorInvoiceForm } from './vendor-invoice/vendor-invoice-form';
import { VendorPaymentForm } from './vendor-payment/vendor-payment-form';
import { NumberingForm } from './vendor-ledger/numbering-form';
import { InputCreditCard } from './vendor-ledger/input-credit-card';
import { CreditDaysCard } from './vendor-ledger/credit-days-card';
import { PaymentRegisterContent } from './vendor-ledger/payment-register-content';
import { VendorPayablesContent } from './vendor-ledger/vendor-payables-content';
import { BudgetTab } from '@/app/(dashboard)/expense-tracker/budget/budget-view';
import { todayIST } from '@/lib/date';

// API responses may include joined fields beyond the base shared types
interface PRRow {
  id: string;
  pr_number: string;
  title: string;
  description: string;
  estimated_amount: number;
  vendor_id: string | null;
  vendor_name?: string;
  requested_by: string;
  requested_by_name?: string;
  status: string;
  created_at: Date;
}

interface BillRow {
  id: string;
  bill_number: string;
  vendor_id: string;
  vendor_name?: string;
  bill_date: Date;
  due_date: Date;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  gst_amount?: number;
  tds_amount?: number;
  net_payable?: number;
  status: string;
  narration: string;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 20;

type ActiveTab = 'requests' | 'bills' | 'payments' | 'vendors' | 'numbering' | 'budget';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function getPRStatusVariant(
  status: string,
): 'secondary' | 'warning' | 'success' | 'destructive' | 'default' {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'pending_approval':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'destructive';
    case 'converted':
      return 'default';
    default:
      return 'secondary';
  }
}

function getPRStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending_approval':
      return 'Pending Approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'converted':
      return 'Converted';
    default:
      return status;
  }
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function PRTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function BillTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PurchasesContent(): ReactNode {
  const { addToast } = useToast();
  // EXP-20: the classic words inside Expense Tracker (standard as written).
  const word = useWord();
  const [activeTab, setActiveTab] = useState<ActiveTab>('requests');

  // Purchase Request state
  const [prPage, setPrPage] = useState(1);
  const [prStatusFilter, setPrStatusFilter] = useState('');
  const [prSearch, setPrSearch] = useState('');
  const [prSearchInput, setPrSearchInput] = useState('');
  const [directExpenseDialogOpen, setDirectExpenseDialogOpen] = useState(false);
  const [debitNoteDialogOpen, setDebitNoteDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPRId, setSelectedPRId] = useState('');

  // Approve/reject form
  const [approveRemarks, setApproveRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');

  // Vendor Bill state
  const [billPage, setBillPage] = useState(1);
  const [billStatusFilter, setBillStatusFilter] = useState('');
  const [billVendorFilter, setBillVendorFilter] = useState('');
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [payBill, setPayBill] = useState<{ vendorId: string; billId: string } | null>(null);
  const [agingDialogOpen, setAgingDialogOpen] = useState(false);
  // Phase D.1 — Edit + Cancel bill dialogs.
  const [editBillDialogOpen, setEditBillDialogOpen] = useState(false);
  const [cancelBillDialogOpen, setCancelBillDialogOpen] = useState(false);
  const [editBillId, setEditBillId] = useState('');
  const [editBillNumber, setEditBillNumber] = useState('');
  const [editBillDate, setEditBillDate] = useState('');
  const [editBillDueDate, setEditBillDueDate] = useState('');
  const [editBillAmount, setEditBillAmount] = useState('');
  const [editBillGstRate, setEditBillGstRate] = useState('');
  const [editBillTdsRate, setEditBillTdsRate] = useState('');
  const [editBillNarration, setEditBillNarration] = useState('');
  const [cancelBillId, setCancelBillId] = useState('');
  const [cancelBillNumberDisplay, setCancelBillNumberDisplay] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Data queries
  const prQuery = usePurchaseRequests({
    status: prStatusFilter || undefined,
    search: prSearch || undefined,
    page: prPage,
    limit: ITEMS_PER_PAGE,
  });
  const billQuery = useVendorBills({
    status: billStatusFilter || undefined,
    vendor_id: billVendorFilter || undefined,
    page: billPage,
    limit: ITEMS_PER_PAGE,
  });
  const vendorsQuery = useVendors({ limit: 200 });
  const agingQuery = useVendorAging();

  // Mutations
  const approvePR = useApprovePR();
  const rejectPR = useRejectPR();
  const editBill = useEditBill();
  const cancelBill = useCancelBill();

  // Derived data
  const purchaseRequests = (prQuery.data?.data ?? []) as unknown as PRRow[];
  const totalPRs = prQuery.data?.total ?? 0;
  const totalPRPages = Math.max(1, Math.ceil(totalPRs / ITEMS_PER_PAGE));

  const bills = (billQuery.data?.data ?? []) as unknown as BillRow[];
  const totalBills = billQuery.data?.total ?? 0;
  const totalBillPages = Math.max(1, Math.ceil(totalBills / ITEMS_PER_PAGE));

  const vendors = vendorsQuery.data?.data ?? [];
  const agingData = agingQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // PR handlers
  // ---------------------------------------------------------------------------

  function handlePRSearch(): void {
    setPrSearch(prSearchInput);
    setPrPage(1);
  }

  function handleApprovePR(e: FormEvent): void {
    e.preventDefault();
    approvePR.mutate(
      { id: selectedPRId, data: { level: 1, comments: approveRemarks || undefined } },
      {
        onSuccess() {
          setApproveDialogOpen(false);
          setSelectedPRId('');
          setApproveRemarks('');
          addToast({ title: 'Purchase request approved', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to approve', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleRejectPR(e: FormEvent): void {
    e.preventDefault();
    rejectPR.mutate(
      { id: selectedPRId, data: { level: 1, comments: rejectRemarks } },
      {
        onSuccess() {
          setRejectDialogOpen(false);
          setSelectedPRId('');
          setRejectRemarks('');
          addToast({ title: 'Purchase request rejected', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to reject', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Bill handlers
  // ---------------------------------------------------------------------------

  // Phase D.1 — open the edit dialog. Pre-fills from the bill row;
  // the operator can change any allowed metadata. The handler
  // submits a PATCH to /purchases/bills/:id which reverses the old
  // JE and posts a new one. Disabled at the row level when the bill
  // already has a payment recorded.
  function openEditBillDialog(bill: VendorBill): void {
    setEditBillId(bill.id);
    setEditBillNumber(bill.bill_number ?? '');
    // The shared VendorBill type declares bill_date / due_date as
    // Date, but the API actually serializes them as ISO strings.
    // Coerce defensively without relying on the static type.
    const billDateRaw = bill.bill_date as unknown as string | Date | null;
    const dueDateRaw = bill.due_date as unknown as string | Date | null;
    setEditBillDate(
      typeof billDateRaw === 'string'
        ? billDateRaw.slice(0, 10)
        : billDateRaw instanceof Date
          ? todayIST(billDateRaw)
          : '',
    );
    setEditBillDueDate(
      typeof dueDateRaw === 'string'
        ? dueDateRaw.slice(0, 10)
        : dueDateRaw instanceof Date
          ? todayIST(dueDateRaw)
          : '',
    );
    // Reverse-derive base + rates from the stored amounts. The
    // backend stores absolute gst_amount / tds_amount, but the form
    // is rate-driven for ergonomic re-entry. The shared VendorBill
    // type is leaner than the actual API response (no subtotal /
    // gst_amount / tds_amount); cast through unknown to read them.
    const billExtras = bill as unknown as {
      subtotal?: number | string;
      gst_amount?: number | string;
      tds_amount?: number | string;
      total_amount?: number | string;
    };
    const subtotal = Number(billExtras.subtotal ?? 0);
    const gstAmt = Number(billExtras.gst_amount ?? 0);
    const tdsAmt = Number(billExtras.tds_amount ?? 0);
    const total = Number(billExtras.total_amount ?? bill.total_amount ?? 0);
    setEditBillAmount(subtotal > 0 ? String(subtotal) : '');
    const gstRate = subtotal > 0 ? Math.round((gstAmt / subtotal) * 100) : 0;
    const tdsRate = total > 0 ? Math.round((tdsAmt / total) * 1000) / 10 : 0;
    setEditBillGstRate(gstRate ? String(gstRate) : '');
    setEditBillTdsRate(tdsRate ? String(tdsRate) : '');
    setEditBillNarration('');
    setEditBillDialogOpen(true);
  }

  function handleEditBill(e: FormEvent): void {
    e.preventDefault();
    const baseAmount = Number(editBillAmount) || 0;
    const gstRate = editBillGstRate ? Number(editBillGstRate) : 0;
    const tdsRate = editBillTdsRate ? Number(editBillTdsRate) : 0;
    const gstAmount = Math.round(baseAmount * gstRate) / 100;
    const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100;
    const tdsAmount = Math.round(totalAmount * tdsRate) / 100;
    editBill.mutate(
      {
        id: editBillId,
        data: {
          bill_number: editBillNumber || undefined,
          bill_date: editBillDate || undefined,
          due_date: editBillDueDate || undefined,
          total_amount: totalAmount > 0 ? totalAmount : undefined,
          gst_amount: gstAmount > 0 ? gstAmount : undefined,
          tds_amount: tdsAmount > 0 ? tdsAmount : undefined,
          narration: editBillNarration || undefined,
        },
      },
      {
        onSuccess() {
          setEditBillDialogOpen(false);
          addToast({ title: 'Bill updated', variant: 'success' });
        },
        onError(err) {
          addToast({
            title: 'Failed to update bill',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function openCancelBillDialog(bill: VendorBill): void {
    setCancelBillId(bill.id);
    setCancelBillNumberDisplay(bill.bill_number ?? bill.id.slice(0, 8));
    setCancelReason('');
    setCancelBillDialogOpen(true);
  }

  function handleCancelBill(e: FormEvent): void {
    e.preventDefault();
    if (!cancelReason.trim()) {
      addToast({
        title: 'Cancellation reason required',
        variant: 'destructive',
      });
      return;
    }
    cancelBill.mutate(
      {
        id: cancelBillId,
        data: { reason: cancelReason.trim() },
      },
      {
        onSuccess() {
          setCancelBillDialogOpen(false);
          setCancelBillId('');
          addToast({
            title: `Bill ${cancelBillNumberDisplay} cancelled`,
            description: 'Reversal JE posted; AP and expense unwound.',
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to cancel bill',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Purchases' }]}
        title="Purchases"
        description="Track purchase requests, vendor bills, and approvals"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setDirectExpenseDialogOpen(true)}
            >
              Direct Expense
            </Button>
            <Button
              variant="outline"
              onClick={() => setDebitNoteDialogOpen(true)}
            >
              Debit Note
            </Button>
            <ExportButton
              data={[...purchaseRequests, ...bills] as unknown as Record<string, unknown>[]}
              filename={`purchases-${todayIST()}`}
              columns={[
                { key: 'pr_number', label: 'PR #' },
                { key: 'bill_number', label: 'Bill #' },
                { key: 'title', label: 'Title' },
                { key: 'vendor_name', label: 'Vendor' },
                { key: 'estimated_amount', label: 'Amount' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Date' },
              ]}
            />
          </>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          <ShoppingCart className="mr-2 inline-block h-4 w-4" />
          Purchase Requests
        </button>
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'bills'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('bills')}
        >
          <FileText className="mr-2 inline-block h-4 w-4" />
          {word('Vendor Bills')}
        </button>
        {/* New: standalone Vendor Payments tab. Lists every
            vendor_payment regardless of bill linkage — including
            Tally-imported direct-expense payments that have
            vendor_bill_id=NULL and therefore never appear under
            any bill row. */}
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'payments'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard className="mr-2 inline-block h-4 w-4" />
          Vendor Payments
        </button>
        {/* EXP-16 / EXP-18 / EXP-22: By Vendors, Numbering and Budget. */}
        {([['vendors', 'By Vendors'], ['numbering', 'Numbering'], ['budget', 'Budget']] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {label}
            </button>
          ))}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Purchase Requests Tab                                                */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">Purchase Requests</CardTitle>
                {/* EXP-09 — the bucket lists (drafts, my approval, by level; closed). */}
                <p className="text-xs text-muted-foreground">
                  <Link className="underline" href="/expense-tracker/purchase-workflow/open">Open by approval level</Link>
                  {' · '}
                  <Link className="underline" href="/expense-tracker/purchase-workflow/closed">Closed</Link>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    value={prSearchInput}
                    onChange={(e) => setPrSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePRSearch(); }}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={prStatusFilter}
                  onChange={(e) => { setPrStatusFilter(e.target.value); setPrPage(1); }}
                  className="w-40"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="converted">Converted</option>
                </Select>
                {/* EXP-08 — the purchase request form with lines. */}
                <CreatePurchaseRequestButton />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{word('PR #')}</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Est. Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prQuery.isLoading ? (
                  <PRTableSkeleton />
                ) : purchaseRequests.length > 0 ? (
                  purchaseRequests.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{pr.pr_number ?? pr.id.slice(0, 8)}</span>
                      </TableCell>
                      <TableCell className="font-medium">{pr.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {pr.vendor_name ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(pr.estimated_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPRStatusVariant(pr.status)}>
                          {getPRStatusLabel(pr.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pr.requested_by_name ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(String(pr.created_at))}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <ViewPurchaseRequestButton requestId={pr.id} />
                          {pr.status === 'pending_approval' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-success"
                                title="Approve"
                                onClick={() => {
                                  setSelectedPRId(pr.id);
                                  setApproveDialogOpen(true);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                title="Reject"
                                onClick={() => {
                                  setSelectedPRId(pr.id);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {pr.status === 'approved' && (
                            <ConvertToInvoiceButton requestId={pr.id} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}
              </TableBody>
            </Table>

            {!prQuery.isLoading && purchaseRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No purchase requests found</p>
                <p className="text-sm text-muted-foreground">Create your first purchase request to get started</p>
              </div>
            )}

            {totalPRPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {prPage} of {totalPRPages} ({totalPRs} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={prPage <= 1}
                    onClick={() => setPrPage(prPage - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={prPage >= totalPRPages}
                    onClick={() => setPrPage(prPage + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Vendor Bills Tab                                                     */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'bills' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Vendor Bills</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={billStatusFilter}
                  onChange={(e) => { setBillStatusFilter(e.target.value); setBillPage(1); }}
                  className="w-40"
                >
                  {BILL_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={billVendorFilter}
                  onChange={(e) => { setBillVendorFilter(e.target.value); setBillPage(1); }}
                  className="w-40"
                >
                  <option value="">All Vendors</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </Select>
                <Dialog open={agingDialogOpen} onOpenChange={setAgingDialogOpen}>
                  <DialogTrigger>
                    <Button variant="outline">
                      <Clock className="mr-2 h-4 w-4" />
                      Vendor Aging
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Vendor Aging Report</DialogTitle>
                      <DialogDescription>Outstanding balances by aging period</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      {agingQuery.isLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                          ))}
                        </div>
                      ) : agingData.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Vendor</TableHead>
                              <TableHead className="text-right">Current</TableHead>
                              <TableHead className="text-right">1-30 Days</TableHead>
                              <TableHead className="text-right">31-60 Days</TableHead>
                              <TableHead className="text-right">61-90 Days</TableHead>
                              <TableHead className="text-right">90+ Days</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agingData.map((row) => (
                              <TableRow key={row.vendor_id}>
                                <TableCell className="font-medium">{row.vendor_name}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.current)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.days_30)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.days_60)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.days_90)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.over_90)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(row.total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="py-8 text-center text-muted-foreground">No outstanding vendor balances</p>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose>
                        <Button variant="outline">Close</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* EXP-12: the multi-line vendor invoice form. */}
                <Button onClick={() => setNewInvoiceOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {word('Create Bill')}
                </Button>
                <VendorInvoiceForm
                  mode="dialog"
                  open={newInvoiceOpen}
                  onClose={() => setNewInvoiceOpen(false)}
                  onSaved={() => setNewInvoiceOpen(false)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{word('Bill #')}</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead className="text-right">Base Amount</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billQuery.isLoading ? (
                  <BillTableSkeleton />
                ) : bills.length > 0 ? (
                  bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{bill.bill_number ?? bill.id.slice(0, 8)}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {bill.vendor_id ? (
                          <Link className="underline" href={`/expense-tracker/by-vendors/${bill.vendor_id}/statement?tab=full`}>{bill.vendor_name ?? '-'}</Link>
                        ) : (
                          bill.vendor_name ?? '-'
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(String(bill.bill_date))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bill.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bill.gst_amount ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bill.tds_amount ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(bill.net_payable ?? bill.total_amount)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const payments =
                            ((bill as unknown) as {
                              payments_summary?: Array<{
                                id: string;
                                payment_date: string;
                                amount: number;
                                payment_mode: string;
                                reference_number: string | null;
                              }>;
                            }).payments_summary ?? [];
                          if (payments.length === 0) {
                            return (
                              <span className="text-xs text-muted-foreground">—</span>
                            );
                          }
                          return (
                            <div className="flex flex-col gap-0.5 text-xs">
                              {payments.slice(0, 3).map((p) => (
                                <span
                                  key={p.id}
                                  className="text-muted-foreground"
                                  title={`${p.payment_mode.replace(/_/g, ' ')}${
                                    p.reference_number
                                      ? ` · ${p.reference_number}`
                                      : ''
                                  }`}
                                >
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(Number(p.amount))}
                                  </span>
                                  <span className="ml-1">
                                    · {formatDate(p.payment_date)}
                                  </span>
                                </span>
                              ))}
                              {payments.length > 3 && (
                                <span className="text-muted-foreground">
                                  +{payments.length - 3} more
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBillStatusVariant(bill.status)}>
                          {getBillStatusLabel(bill.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(bill.status === 'received' ||
                            bill.status === 'partially_paid' ||
                            bill.status === 'overdue') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 p-1 text-xs"
                              // EXP-14: the Pay vendor form, this invoice ticked.
                              onClick={() => setPayBill({ vendorId: bill.vendor_id, billId: bill.id })}
                            >
                              <CreditCard className="mr-1 h-3 w-3" />
                              Pay
                            </Button>
                          )}
                          {/* Phase D.1 — Edit + Cancel. Edit only
                              shown before any payment lands; cancel
                              only when not already cancelled and
                              with no payments. */}
                          {bill.status !== 'cancelled' &&
                            bill.status !== 'paid' &&
                            Number(
                              (bill as unknown as { amount_paid?: number | string })
                                .amount_paid ?? 0,
                            ) === 0 && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 p-1 text-xs"
                                  onClick={() =>
                                    openEditBillDialog(bill as unknown as VendorBill)
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 p-1 text-xs text-destructive hover:text-destructive"
                                  onClick={() =>
                                    openCancelBillDialog(bill as unknown as VendorBill)
                                  }
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : null}
              </TableBody>
            </Table>

            {!billQuery.isLoading && bills.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No vendor bills found</p>
                <p className="text-sm text-muted-foreground">Create a bill or convert a purchase request</p>
              </div>
            )}

            {totalBillPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {billPage} of {totalBillPages} ({totalBills} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={billPage <= 1}
                    onClick={() => setBillPage(billPage - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={billPage >= totalBillPages}
                    onClick={() => setBillPage(billPage + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Vendor Payments Tab                                                  */}
      {/* ------------------------------------------------------------------- */}
      {/* EXP-17: the payment register with Voucher, Bank A/c GL, Reverse and export. */}
      {activeTab === 'payments' && <PaymentRegisterContent fetchFirst={false} />}
      {activeTab === 'vendors' && <VendorPayablesContent />}
      {activeTab === 'numbering' && (
        <div className="space-y-4">
          <NumberingForm />
          <InputCreditCard />
          <CreditDaysCard />
        </div>
      )}
      {activeTab === 'budget' && <BudgetTab />}

      {/* ------------------------------------------------------------------- */}
      {/* Approve PR Dialog                                                    */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <form onSubmit={handleApprovePR}>
            <DialogHeader>
              <DialogTitle>Approve Purchase Request</DialogTitle>
              <DialogDescription>Approve this purchase request to proceed with billing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="approve-remarks">Remarks (optional)</Label>
                <Textarea
                  id="approve-remarks"
                  placeholder="Add any remarks..."
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={approvePR.isPending}>
                {approvePR.isPending ? 'Approving...' : 'Approve'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Reject PR Dialog                                                     */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <form onSubmit={handleRejectPR}>
            <DialogHeader>
              <DialogTitle>Reject Purchase Request</DialogTitle>
              <DialogDescription>Please provide a reason for rejection</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reject-remarks">Reason for Rejection</Label>
                <Textarea
                  id="reject-remarks"
                  placeholder="Explain why this request is being rejected..."
                  required
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={rejectPR.isPending}>
                {rejectPR.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EXP-14: Pay vendor from a bill row. */}
      {payBill && (
        <VendorPaymentForm
          mode="dialog"
          open
          vendorId={payBill.vendorId}
          initialBillId={payBill.billId}
          onClose={() => setPayBill(null)}
          onSaved={() => setPayBill(null)}
        />
      )}

      {/* Direct-expense payment dialog — for petty cash, freight,
          courier, one-off reimbursements that don't go through the
          vendor-bill workflow (Phase B accounting reorg) */}
      <DirectExpenseDialog
        open={directExpenseDialogOpen}
        onOpenChange={setDirectExpenseDialogOpen}
      />

      {/* Debit Note dialog (Phase C.4) — for vendor returns / refund
          credits / post-billing discounts */}
      <DebitNoteDialog
        open={debitNoteDialogOpen}
        onOpenChange={setDebitNoteDialogOpen}
      />

      {/* Phase D.1 — Edit bill dialog. Allowed only when no payment
          has been recorded; backend re-validates and refuses
          otherwise. */}
      <Dialog open={editBillDialogOpen} onOpenChange={setEditBillDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditBill}>
            <DialogHeader>
              <DialogTitle>Edit bill</DialogTitle>
              <DialogDescription>
                Allowed only before any payment is recorded. The original
                journal entry will be reversed and a fresh one posted with
                the updated amounts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eb-number">{word('Bill #')}</Label>
                  <Input
                    id="eb-number"
                    value={editBillNumber}
                    onChange={(e) => setEditBillNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eb-date">Bill date</Label>
                  <Input
                    id="eb-date"
                    type="date"
                    value={editBillDate}
                    onChange={(e) => setEditBillDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eb-due">Due date</Label>
                  <Input
                    id="eb-due"
                    type="date"
                    value={editBillDueDate}
                    onChange={(e) => setEditBillDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eb-amount">Base amount</Label>
                  <Input
                    id="eb-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editBillAmount}
                    onChange={(e) => setEditBillAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eb-gst">GST rate (%)</Label>
                  <Input
                    id="eb-gst"
                    type="number"
                    min="0"
                    max="28"
                    step="0.1"
                    value={editBillGstRate}
                    onChange={(e) => setEditBillGstRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eb-tds">TDS rate (%)</Label>
                  <Input
                    id="eb-tds"
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={editBillTdsRate}
                    onChange={(e) => setEditBillTdsRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eb-narration">Narration</Label>
                <Textarea
                  id="eb-narration"
                  rows={2}
                  maxLength={500}
                  placeholder="Optional notes on what changed"
                  value={editBillNarration}
                  onChange={(e) => setEditBillNarration(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={editBill.isPending}>
                {editBill.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Phase D.1 — Cancel bill dialog. Reverses the original JE
          and stamps the bill cancelled. Refused if any payment was
          recorded — operator must reverse payments first or raise a
          debit note. */}
      <Dialog open={cancelBillDialogOpen} onOpenChange={setCancelBillDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCancelBill}>
            <DialogHeader>
              <DialogTitle>Cancel bill {cancelBillNumberDisplay}</DialogTitle>
              <DialogDescription>
                Posts a reversal journal entry that unwinds the original
                AP and expense entries. The bill stays in the system as
                an audit record with status=&quot;cancelled&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cb-reason">Reason</Label>
                <Textarea
                  id="cb-reason"
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Duplicate of bill BILL-00007 — recorded in error"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">
                  Keep bill
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancelBill.isPending}
              >
                {cancelBill.isPending ? 'Cancelling…' : 'Cancel bill'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
