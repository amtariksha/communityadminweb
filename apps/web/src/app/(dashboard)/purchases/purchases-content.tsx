'use client';

import { useRef, useState, useMemo, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  ShoppingCart,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ArrowRightLeft,
  CreditCard,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { GstRateSelect } from '@/components/ui/gst-rate-select';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
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
import { ExportButton } from '@/components/ui/export-button';
import { formatCurrency, formatDate, financialDateBounds, clampDateString } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  usePurchaseRequests,
  useCreatePR,
  useApprovePR,
  useRejectPR,
  useConvertPRToBill,
  useVendorBills,
  useCreateBill,
  useRecordBillPayment,
  useVendorAging,
  useVendors,
  useCreateVendor,
  useLedgerAccounts,
  useBankAccounts,
  useTdsConfig,
} from '@/hooks';
import type { TdsConfig } from '@/hooks';
import { useOcrInvoice } from '@/hooks/use-ocr';

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

type ActiveTab = 'requests' | 'bills';

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

function getBillStatusVariant(
  status: string,
): 'secondary' | 'warning' | 'success' | 'destructive' | 'default' {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'approved':
      return 'success';
    case 'partially_paid':
      return 'warning';
    case 'paid':
      return 'success';
    case 'cancelled':
      return 'destructive';
    default:
      return 'default';
  }
}

function getBillStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'approved':
      return 'Approved';
    case 'partially_paid':
      return 'Partially Paid';
    case 'paid':
      return 'Paid';
    case 'cancelled':
      return 'Cancelled';
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
  // Clamp date inputs to prev FY start → next month end.
  const dateBounds = useMemo(() => financialDateBounds(), []);
  const [activeTab, setActiveTab] = useState<ActiveTab>('requests');

  // Purchase Request state
  const [prPage, setPrPage] = useState(1);
  const [prStatusFilter, setPrStatusFilter] = useState('');
  const [prSearch, setPrSearch] = useState('');
  const [prSearchInput, setPrSearchInput] = useState('');
  const [createPRDialogOpen, setCreatePRDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPRId, setSelectedPRId] = useState('');

  // PR form state
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [prVendorId, setPrVendorId] = useState('');
  const [prEstimatedAmount, setPrEstimatedAmount] = useState('');

  // Approve/reject form
  const [approveRemarks, setApproveRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');

  // Vendor Bill state
  const [billPage, setBillPage] = useState(1);
  const [billStatusFilter, setBillStatusFilter] = useState('');
  const [billVendorFilter, setBillVendorFilter] = useState('');
  const [createBillDialogOpen, setCreateBillDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [agingDialogOpen, setAgingDialogOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState('');

  // Bill form state
  const [billVendorId, setBillVendorId] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billDueDate, setBillDueDate] = useState('');
  const [billNarration, setBillNarration] = useState('');
  const [billLineAccount, setBillLineAccount] = useState('');
  const [billLineDescription, setBillLineDescription] = useState('');
  const [billLineAmount, setBillLineAmount] = useState('');
  const [billLineGstRate, setBillLineGstRate] = useState('');
  const [billExpenseAccountId, setBillExpenseAccountId] = useState('');
  const [billPayableAccountId, setBillPayableAccountId] = useState('');
  // AI scan — populates the fields above from a vendor invoice photo/PDF.
  // 10 MiB cap keeps us well under Gemini's ~20 MiB base64 limit.
  const billFileInputRef = useRef<HTMLInputElement | null>(null);
  const [billScanConfidence, setBillScanConfidence] = useState<number | null>(null);
  const [billScanVendorName, setBillScanVendorName] = useState<string | null>(null);
  const ocrInvoice = useOcrInvoice();
  const MAX_OCR_BYTES = 10 * 1024 * 1024;

  // Convert PR form state.
  // `convertSubtotal` is the goods/services value before GST. The
  // displayed total = subtotal + gst_amount; the vendor's payable =
  // total - tds_amount. The server-side service derives the same
  // splits and posts a 4-line JE (expense + gst_input vs payable +
  // tds_payable) when GST or TDS is non-zero.
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertPRId, setConvertPRId] = useState('');
  const [convertVendorId, setConvertVendorId] = useState('');
  const [convertBillNumber, setConvertBillNumber] = useState('');
  const [convertBillDate, setConvertBillDate] = useState('');
  const [convertDueDate, setConvertDueDate] = useState('');
  const [convertSubtotal, setConvertSubtotal] = useState('');
  const [convertGstRate, setConvertGstRate] = useState<number | null>(null);
  const [convertTdsRate, setConvertTdsRate] = useState('');
  const [convertExpenseAccountId, setConvertExpenseAccountId] = useState('');
  const [convertPayableAccountId, setConvertPayableAccountId] = useState('');

  // Quick "+ Add Vendor" inline dialog state. Used by both the
  // Convert and the Direct-Bill dialogs to avoid making the operator
  // navigate to /vendors mid-flow.
  const [quickVendorDialogOpen, setQuickVendorDialogOpen] = useState(false);
  const [quickVendorTarget, setQuickVendorTarget] = useState<
    'convert' | 'bill' | 'pr' | null
  >(null);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickVendorPhone, setQuickVendorPhone] = useState('');
  const [quickVendorGstin, setQuickVendorGstin] = useState('');

  // Derived totals for the convert dialog. Memoized so we don't
  // re-parse on every keystroke for downstream consumers (the form
  // uses the values for both the read-only summary AND the submit
  // payload).
  const convertSubtotalNum = Number(convertSubtotal) || 0;
  const convertGstAmount = convertGstRate
    ? Math.round(convertSubtotalNum * convertGstRate) / 100
    : 0;
  const convertTotalNum = convertSubtotalNum + convertGstAmount;
  const convertTdsRateNum = convertTdsRate ? Number(convertTdsRate) : 0;
  const convertTdsAmount = Math.round(convertTotalNum * convertTdsRateNum) / 100;
  const convertPayableNum = convertTotalNum - convertTdsAmount;

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentBankAccountId, setPaymentBankAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

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
  const accountsQuery = useLedgerAccounts({ limit: 200 });
  const bankAccountsQuery = useBankAccounts();
  const agingQuery = useVendorAging();
  // Resolved TDS config for this tenant — drives the auto-suggest in
  // the convert-PR-to-bill dialog. Falls through to the platform
  // default when the tenant hasn't customized.
  const tdsConfigQuery = useTdsConfig();
  const tdsConfig: TdsConfig | null = tdsConfigQuery.data?.config ?? null;

  // Mutations
  const createPR = useCreatePR();
  const approvePR = useApprovePR();
  const rejectPR = useRejectPR();
  const convertPR = useConvertPRToBill();
  const createBill = useCreateBill();
  const recordPayment = useRecordBillPayment();
  const createVendorMut = useCreateVendor();

  /**
   * Suggest a TDS rate (%) for a given subtotal + vendor. Returns 0
   * when:
   *   - The TDS auto-suggest is disabled for this tenant
   *   - The subtotal is below the matching threshold
   *   - No config has loaded yet (mid-fetch)
   *
   * Pure client-side computation against the resolved TDS config.
   * Mirrors the server-side suggestTds(), but avoids a round-trip on
   * every keystroke.
   */
  function suggestTdsRate(
    subtotalGross: number,
    vendor?: { tds_section?: string | null } | null,
  ): number {
    if (!tdsConfig || !tdsConfig.enabled || subtotalGross <= 0) return 0;
    const section = vendor?.tds_section?.trim();
    let threshold = tdsConfig.default_threshold;
    let rate = tdsConfig.default_rate;
    if (section) {
      const match = tdsConfig.sections.find(
        (s) => s.code.toLowerCase() === section.toLowerCase(),
      );
      if (match) {
        threshold = match.threshold;
        rate = match.rate;
      }
    }
    return subtotalGross >= threshold ? rate : 0;
  }

  function openQuickVendorDialog(target: 'convert' | 'bill' | 'pr'): void {
    setQuickVendorTarget(target);
    setQuickVendorName('');
    setQuickVendorPhone('');
    setQuickVendorGstin('');
    setQuickVendorDialogOpen(true);
  }

  function handleQuickVendorSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!quickVendorName.trim()) {
      addToast({ title: 'Vendor name is required', variant: 'destructive' });
      return;
    }
    createVendorMut.mutate(
      {
        name: quickVendorName.trim(),
        phone: quickVendorPhone.trim() || undefined,
        gstin: quickVendorGstin.trim() || undefined,
      },
      {
        onSuccess(res) {
          // res.data is the created vendor (the hook unwraps the
          // `{ data: ... }` envelope). Use the new id to auto-select
          // in the parent dialog the operator was on.
          const newId = res.data.id;
          if (quickVendorTarget === 'convert') {
            setConvertVendorId(newId);
            if (res.data.ledger_account_id) {
              setConvertPayableAccountId(res.data.ledger_account_id);
            }
          } else if (quickVendorTarget === 'bill') {
            setBillVendorId(newId);
            if (res.data.ledger_account_id) {
              setBillPayableAccountId(res.data.ledger_account_id);
            }
          } else if (quickVendorTarget === 'pr') {
            setPrVendorId(newId);
          }
          setQuickVendorDialogOpen(false);
          addToast({ title: `Vendor "${res.data.name}" created`, variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to create vendor',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  // Derived data
  const purchaseRequests = (prQuery.data?.data ?? []) as unknown as PRRow[];
  const totalPRs = prQuery.data?.total ?? 0;
  const totalPRPages = Math.max(1, Math.ceil(totalPRs / ITEMS_PER_PAGE));

  const bills = (billQuery.data?.data ?? []) as unknown as BillRow[];
  const totalBills = billQuery.data?.total ?? 0;
  const totalBillPages = Math.max(1, Math.ceil(totalBills / ITEMS_PER_PAGE));

  const vendors = vendorsQuery.data?.data ?? [];
  const accounts = accountsQuery.data?.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];
  const agingData = agingQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // PR handlers
  // ---------------------------------------------------------------------------

  function resetPRForm(): void {
    setPrTitle('');
    setPrDescription('');
    setPrVendorId('');
    setPrEstimatedAmount('');
  }

  function handlePRSearch(): void {
    setPrSearch(prSearchInput);
    setPrPage(1);
  }

  function handleCreatePR(e: FormEvent): void {
    e.preventDefault();
    createPR.mutate(
      {
        title: prTitle,
        description: prDescription,
        estimated_amount: Number(prEstimatedAmount),
        vendor_id: prVendorId || null,
      },
      {
        onSuccess() {
          setCreatePRDialogOpen(false);
          resetPRForm();
          addToast({ title: 'Purchase request created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create purchase request', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
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

  function openConvertDialog(pr: PRRow): void {
    setConvertPRId(pr.id);
    const vendorId = pr.vendor_id ?? '';
    setConvertVendorId(vendorId);
    setConvertBillNumber('');
    setConvertBillDate('');
    setConvertDueDate('');
    // PR carries an estimated amount; treat it as the subtotal
    // (operator can edit). Defaulting GST to zero so a straight
    // passthrough click still works. TDS auto-suggests below.
    const subtotalNum = Number(pr.estimated_amount ?? 0);
    setConvertSubtotal(String(pr.estimated_amount ?? ''));
    setConvertGstRate(null);
    setConvertExpenseAccountId('');
    // Auto-fill the payable account if the PR's vendor already has a
    // linked Sundry Creditors ledger. Same logic as the vendor-onChange
    // handler on the Select below — this makes the dialog open in a
    // ready-to-submit state when no vendor change is needed.
    const preselectedVendor = vendorId
      ? vendors.find((v) => v.id === vendorId)
      : undefined;
    setConvertPayableAccountId(preselectedVendor?.ledger_account_id ?? '');
    // Auto-suggest TDS rate from the resolved tenant TDS config. The
    // operator can override before submitting; this just removes the
    // manual lookup from "common case" PRs.
    const suggestedRate = suggestTdsRate(subtotalNum, preselectedVendor);
    setConvertTdsRate(suggestedRate > 0 ? String(suggestedRate) : '');
    setConvertDialogOpen(true);
  }

  /**
   * Re-run the TDS suggestion when the vendor or subtotal changes
   * inside the convert dialog. Only fires for the dialog that's
   * currently open. Skips when the operator has already typed a
   * non-zero rate — we never overwrite manual edits.
   */
  function reSuggestTds(nextVendorId: string, nextSubtotal: string): void {
    const subtotalNum = Number(nextSubtotal) || 0;
    const vendor = nextVendorId
      ? vendors.find((v) => v.id === nextVendorId)
      : undefined;
    const suggested = suggestTdsRate(subtotalNum, vendor);
    setConvertTdsRate(suggested > 0 ? String(suggested) : '');
  }

  function handleConvertPR(e: FormEvent): void {
    e.preventDefault();
    convertPR.mutate(
      {
        id: convertPRId,
        data: {
          vendor_id: convertVendorId,
          bill_number: convertBillNumber || undefined,
          bill_date: convertBillDate,
          due_date: convertDueDate,
          // Server expects total_amount as the gross (subtotal + GST).
          // It splits subtotal back out and posts the journal lines.
          total_amount: convertTotalNum,
          gst_amount: convertGstAmount > 0 ? convertGstAmount : undefined,
          tds_amount: convertTdsAmount > 0 ? convertTdsAmount : undefined,
          expense_account_id: convertExpenseAccountId,
          payable_account_id: convertPayableAccountId,
        },
      },
      {
        onSuccess() {
          setConvertDialogOpen(false);
          setConvertPRId('');
          addToast({ title: 'Purchase request converted to bill', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to convert', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Bill handlers
  // ---------------------------------------------------------------------------

  function resetBillForm(): void {
    setBillVendorId('');
    setBillDate('');
    setBillDueDate('');
    setBillNarration('');
    setBillLineAccount('');
    setBillLineDescription('');
    setBillLineAmount('');
    setBillLineGstRate('');
    setBillExpenseAccountId('');
    setBillPayableAccountId('');
    setBillScanConfidence(null);
    setBillScanVendorName(null);
  }

  async function handleScanInvoice(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (file.size > MAX_OCR_BYTES) {
      addToast({
        title: 'File too large',
        description: `Max ${MAX_OCR_BYTES / (1024 * 1024)} MiB for AI scanning.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await ocrInvoice.mutateAsync(file);
      // Match a known vendor by GSTIN first (most reliable), then by
      // name contains match. If neither hits, leave blank + surface the
      // extracted vendor name so the user can create or pick manually.
      const byGstin = result.vendor_gstin
        ? vendors.find((v) => (v.gstin ?? '').toLowerCase() === result.vendor_gstin!.toLowerCase())
        : undefined;
      const byName =
        !byGstin && result.vendor_name
          ? vendors.find((v) => v.name.toLowerCase().includes(result.vendor_name!.toLowerCase()))
          : undefined;
      const matchedVendor = byGstin ?? byName;
      if (matchedVendor) setBillVendorId(matchedVendor.id);
      setBillScanVendorName(result.vendor_name ?? null);

      if (result.invoice_date) {
        setBillDate(clampDateString(result.invoice_date, dateBounds.min, dateBounds.max));
      }
      if (result.due_date) {
        setBillDueDate(clampDateString(result.due_date, dateBounds.min, dateBounds.max));
      }
      if (result.total_amount != null) {
        setBillLineAmount(String(result.total_amount));
      }
      // Best-effort description: first line item, else invoice_number
      if (result.line_items?.length > 0 && result.line_items[0].description) {
        setBillLineDescription(result.line_items[0].description);
      } else if (result.invoice_number) {
        setBillLineDescription(`Invoice ${result.invoice_number}`);
      }
      // GST rate lifted from the first line item if present
      if (
        result.line_items?.length > 0 &&
        result.line_items[0].gst_rate != null
      ) {
        setBillLineGstRate(String(result.line_items[0].gst_rate));
      }
      setBillScanConfidence(result.confidence);

      addToast({
        title: matchedVendor
          ? `Extracted — vendor matched to ${matchedVendor.name}`
          : result.vendor_name
            ? `Extracted — vendor "${result.vendor_name}" not in list, pick manually`
            : 'Extracted — review fields before saving',
        description: `Confidence ${Math.round((result.confidence ?? 0) * 100)}%. Verify every field; AI can miss values.`,
        variant: matchedVendor ? 'success' : 'default',
      });
    } catch (err) {
      addToast({
        title: 'AI extraction failed',
        description:
          (err as Error).message ?? 'Please fill the form manually.',
        variant: 'destructive',
      });
    }
  }

  function handleCreateBill(e: FormEvent): void {
    e.preventDefault();
    const gstRate = billLineGstRate ? Number(billLineGstRate) : undefined;
    createBill.mutate(
      {
        vendor_id: billVendorId,
        bill_date: billDate,
        due_date: billDueDate,
        total_amount: Number(billLineAmount),
        expense_account_id: billExpenseAccountId,
        payable_account_id: billPayableAccountId,
        narration: billNarration || undefined,
        lines: [
          {
            ledger_account_id: billLineAccount,
            description: billLineDescription,
            amount: Number(billLineAmount),
            gst_rate: gstRate,
          },
        ],
      },
      {
        onSuccess() {
          setCreateBillDialogOpen(false);
          resetBillForm();
          addToast({ title: 'Vendor bill created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create bill', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function resetPaymentForm(): void {
    setPaymentAmount('');
    setPaymentMode('bank_transfer');
    setPaymentReference('');
    setPaymentBankAccountId('');
    setPaymentDate('');
  }

  function handleRecordPayment(e: FormEvent): void {
    e.preventDefault();
    recordPayment.mutate(
      {
        bill_id: selectedBillId,
        payment_date: paymentDate,
        amount: Number(paymentAmount),
        mode: paymentMode,
        reference_number: paymentReference || null,
        bank_account_id: paymentBankAccountId || null,
      },
      {
        onSuccess() {
          setPaymentDialogOpen(false);
          setSelectedBillId('');
          resetPaymentForm();
          addToast({ title: 'Payment recorded', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to record payment', description: friendlyError(error), variant: 'destructive' });
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
          <ExportButton
            data={[...purchaseRequests, ...bills] as unknown as Record<string, unknown>[]}
            filename={`purchases-${new Date().toISOString().split('T')[0]}`}
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
          Vendor Bills
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Purchase Requests Tab                                                */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Purchase Requests</CardTitle>
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
                <Dialog open={createPRDialogOpen} onOpenChange={setCreatePRDialogOpen}>
                  <DialogTrigger>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create PR
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleCreatePR}>
                      <DialogHeader>
                        <DialogTitle>Create Purchase Request</DialogTitle>
                        <DialogDescription>Submit a new purchase request for approval</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="pr-title">Title</Label>
                          <Input
                            id="pr-title"
                            placeholder="e.g., Annual Painting Work"
                            required
                            value={prTitle}
                            onChange={(e) => setPrTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pr-description">Description</Label>
                          <Textarea
                            id="pr-description"
                            placeholder="Describe the purchase requirement..."
                            required
                            value={prDescription}
                            onChange={(e) => setPrDescription(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="pr-vendor">Vendor</Label>
                            <div className="flex gap-2">
                              <Select
                                id="pr-vendor"
                                value={prVendorId}
                                onChange={(e) => setPrVendorId(e.target.value)}
                                className="flex-1"
                              >
                                <option value="">Select vendor (optional)</option>
                                {vendors.map((v) => (
                                  <option key={v.id} value={v.id} disabled={v.is_active === false}>
                                    {v.name}
                                    {v.is_active === false ? ' (inactive)' : ''}
                                  </option>
                                ))}
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => openQuickVendorDialog('pr')}
                                title="Add a new vendor"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pr-amount">Estimated Amount</Label>
                            <Input
                              id="pr-amount"
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              placeholder="0.00"
                              title="Amount must be greater than zero"
                              value={prEstimatedAmount}
                              onChange={(e) => setPrEstimatedAmount(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={createPR.isPending}>
                          {createPR.isPending ? 'Creating...' : 'Create Request'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR #</TableHead>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 p-1 text-xs"
                              title="Convert to Bill"
                              onClick={() => openConvertDialog(pr)}
                            >
                              <ArrowRightLeft className="mr-1 h-3 w-3" />
                              Convert
                            </Button>
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
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
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
                <Dialog open={createBillDialogOpen} onOpenChange={setCreateBillDialogOpen}>
                  <DialogTrigger>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Bill
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleCreateBill}>
                      <DialogHeader>
                        <DialogTitle>Create Vendor Bill</DialogTitle>
                        <DialogDescription>Record a new vendor bill directly</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 text-sm">
                              <div className="flex items-center gap-2 font-medium">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Scan invoice with AI
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Upload a vendor invoice (PDF / image). Gemini will pre-fill the fields below. Always review before saving.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={ocrInvoice.isPending}
                              onClick={() => billFileInputRef.current?.click()}
                            >
                              {ocrInvoice.isPending ? 'Extracting…' : 'Upload'}
                            </Button>
                            <input
                              ref={billFileInputRef}
                              type="file"
                              className="hidden"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              onChange={handleScanInvoice}
                            />
                          </div>
                          {billScanConfidence != null && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Last scan confidence:{' '}
                              <span className={billScanConfidence >= 0.7 ? 'text-success font-medium' : 'text-warning font-medium'}>
                                {Math.round(billScanConfidence * 100)}%
                              </span>
                              {billScanVendorName && !billVendorId && (
                                <span className="ml-2">
                                  Vendor read as <strong>{billScanVendorName}</strong> — not in your list, pick manually below.
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bill-vendor">Vendor</Label>
                          <div className="flex gap-2">
                            <Select
                              id="bill-vendor"
                              required
                              value={billVendorId}
                              onChange={(e) => {
                                const newVendorId = e.target.value;
                                setBillVendorId(newVendorId);
                                const vendor = vendors.find((v) => v.id === newVendorId);
                                if (vendor?.ledger_account_id) {
                                  setBillPayableAccountId(vendor.ledger_account_id);
                                }
                              }}
                              className="flex-1"
                            >
                              <option value="">Select vendor</option>
                              {vendors.map((v) => (
                                <option key={v.id} value={v.id} disabled={v.is_active === false}>
                                  {v.name}
                                  {v.is_active === false ? ' (inactive)' : ''}
                                </option>
                              ))}
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => openQuickVendorDialog('bill')}
                              title="Add a new vendor"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bill-date">Bill Date</Label>
                            <Input
                              id="bill-date"
                              type="date"
                              min={dateBounds.min}
                              max={dateBounds.max}
                              required
                              value={billDate}
                              onChange={(e) => setBillDate(clampDateString(e.target.value, dateBounds.min, dateBounds.max))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bill-due-date">Due Date</Label>
                            <Input
                              id="bill-due-date"
                              type="date"
                              min={dateBounds.min}
                              max={dateBounds.max}
                              required
                              value={billDueDate}
                              onChange={(e) => setBillDueDate(clampDateString(e.target.value, dateBounds.min, dateBounds.max))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bill-account">Expense Account</Label>
                          <Select
                            id="bill-account"
                            required
                            value={billLineAccount}
                            onChange={(e) => setBillLineAccount(e.target.value)}
                          >
                            <option value="">Select account</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bill-line-desc">Description</Label>
                          <Input
                            id="bill-line-desc"
                            required
                            placeholder="e.g., Security services for March"
                            value={billLineDescription}
                            onChange={(e) => setBillLineDescription(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bill-line-amount">Amount</Label>
                            <Input
                              id="bill-line-amount"
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              placeholder="0.00"
                              title="Amount must be greater than zero"
                              value={billLineAmount}
                              onChange={(e) => setBillLineAmount(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bill-line-gst">GST Rate</Label>
                            <GstRateSelect
                              id="bill-line-gst"
                              allowNone
                              value={billLineGstRate ? Number(billLineGstRate) : null}
                              onChange={(v) => setBillLineGstRate(v == null ? '' : String(v))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bill-expense-account">Expense Account</Label>
                            <AccountSearchSelect
                              value={billExpenseAccountId}
                              onChange={setBillExpenseAccountId}
                              accountType={['expense']}
                              placeholder="Search expense account..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bill-payable-account">Payable Account</Label>
                            <AccountSearchSelect
                              value={billPayableAccountId}
                              onChange={setBillPayableAccountId}
                              accountType={['liability']}
                              placeholder="Search payable account..."
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bill-narration">Narration</Label>
                          <Textarea
                            id="bill-narration"
                            placeholder="Optional notes..."
                            maxLength={500}
                            value={billNarration}
                            onChange={(e) => setBillNarration(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={createBill.isPending}>
                          {createBill.isPending ? 'Creating...' : 'Create Bill'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
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
                      <TableCell className="font-medium">{bill.vendor_name ?? '-'}</TableCell>
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
                        {(bill.status === 'approved' || bill.status === 'partially_paid') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 p-1 text-xs"
                            onClick={() => {
                              setSelectedBillId(bill.id);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <CreditCard className="mr-1 h-3 w-3" />
                            Pay
                          </Button>
                        )}
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

      {/* ------------------------------------------------------------------- */}
      {/* Record Payment Dialog                                                */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle>Record Bill Payment</DialogTitle>
              <DialogDescription>Record a payment against this vendor bill</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-amount">Amount</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                    title="Amount must be greater than zero"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-date">Payment Date</Label>
                  <Input
                    id="pay-date"
                    type="date"
                    min={dateBounds.min}
                    max={dateBounds.max}
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(clampDateString(e.target.value, dateBounds.min, dateBounds.max))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-mode">Payment Mode</Label>
                <Select
                  id="pay-mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-bank">Bank Account</Label>
                <Select
                  id="pay-bank"
                  value={paymentBankAccountId}
                  onChange={(e) => setPaymentBankAccountId(e.target.value)}
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.bank_name} - {ba.account_number}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-ref">Reference Number</Label>
                <Input
                  id="pay-ref"
                  placeholder="Cheque / UTR number"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Convert PR to Bill Dialog                                            */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <form onSubmit={handleConvertPR}>
            <DialogHeader>
              <DialogTitle>Convert PR to Bill</DialogTitle>
              <DialogDescription>Fill in bill details to convert this purchase request</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="convert-vendor">Vendor</Label>
                <div className="flex gap-2">
                  <Select
                    id="convert-vendor"
                    required
                    value={convertVendorId}
                    onChange={(e) => {
                      const newVendorId = e.target.value;
                      setConvertVendorId(newVendorId);
                      // Auto-fill the Payable Account picker with the
                      // vendor's own Sundry Creditors ledger. Operator
                      // can override by clicking into the picker.
                      // Skips legacy vendors that pre-date migration 059.
                      const vendor = vendors.find((v) => v.id === newVendorId);
                      if (vendor?.ledger_account_id) {
                        setConvertPayableAccountId(vendor.ledger_account_id);
                      }
                      // Refresh TDS suggestion — different vendor may
                      // map to a different IT-Act section (194C vs 194J
                      // vs 194I) with a different threshold/rate.
                      reSuggestTds(newVendorId, convertSubtotal);
                    }}
                    className="flex-1"
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.is_active === false}>
                        {v.name}
                        {v.is_active === false ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => openQuickVendorDialog('convert')}
                    title="Add a new vendor"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="convert-bill-number">Bill Number (optional)</Label>
                <Input
                  id="convert-bill-number"
                  placeholder="Vendor invoice number"
                  value={convertBillNumber}
                  onChange={(e) => setConvertBillNumber(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="convert-bill-date">Bill Date</Label>
                  <Input
                    id="convert-bill-date"
                    type="date"
                    min={dateBounds.min}
                    max={dateBounds.max}
                    required
                    value={convertBillDate}
                    onChange={(e) => setConvertBillDate(clampDateString(e.target.value, dateBounds.min, dateBounds.max))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="convert-due-date">Due Date</Label>
                  <Input
                    id="convert-due-date"
                    type="date"
                    min={dateBounds.min}
                    max={dateBounds.max}
                    required
                    value={convertDueDate}
                    onChange={(e) => setConvertDueDate(clampDateString(e.target.value, dateBounds.min, dateBounds.max))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="convert-subtotal">Subtotal (pre-GST)</Label>
                  <Input
                    id="convert-subtotal"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={convertSubtotal}
                    onChange={(e) => {
                      const next = e.target.value;
                      setConvertSubtotal(next);
                      // Re-evaluate TDS suggestion — crossing the
                      // threshold flips deduction on/off.
                      reSuggestTds(convertVendorId, next);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="convert-gst">GST Rate</Label>
                  <GstRateSelect
                    id="convert-gst"
                    allowNone
                    value={convertGstRate}
                    onChange={(v) => setConvertGstRate(v ?? null)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="convert-tds">TDS %</Label>
                    {tdsConfig?.enabled && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() =>
                          reSuggestTds(convertVendorId, convertSubtotal)
                        }
                        title="Reset to the suggested rate based on this vendor's TDS section + the platform/tenant config"
                      >
                        Auto-suggest
                      </button>
                    )}
                  </div>
                  <Input
                    id="convert-tds"
                    type="number"
                    min="0"
                    max="50"
                    step="0.01"
                    placeholder="0"
                    value={convertTdsRate}
                    onChange={(e) => setConvertTdsRate(e.target.value)}
                  />
                  {tdsConfig?.enabled && convertVendorId && (
                    <p className="text-[11px] text-muted-foreground">
                      {(() => {
                        const v = vendors.find((x) => x.id === convertVendorId);
                        const sec = v?.tds_section?.trim();
                        if (!sec) {
                          return `Default rate ${tdsConfig.default_rate}% over ₹${tdsConfig.default_threshold.toLocaleString()}.`;
                        }
                        const match = tdsConfig.sections.find(
                          (s) =>
                            s.code.toLowerCase() === sec.toLowerCase(),
                        );
                        if (!match) {
                          return `Section ${sec} not in config — using default ${tdsConfig.default_rate}%.`;
                        }
                        return `Section ${match.code}: ${match.rate}% over ₹${match.threshold.toLocaleString()}.`;
                      })()}
                    </p>
                  )}
                </div>
              </div>
              {/* Live computation summary so the operator sees what
                  posts to the journal before submit. */}
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(convertSubtotalNum)}</span>
                </div>
                {convertGstAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      GST ({convertGstRate ?? 0}%)
                    </span>
                    <span>{formatCurrency(convertGstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total (gross)</span>
                  <span>{formatCurrency(convertTotalNum)}</span>
                </div>
                {convertTdsAmount > 0 && (
                  <div className="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>
                      TDS withheld ({convertTdsRateNum}%)
                    </span>
                    <span>− {formatCurrency(convertTdsAmount)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                  <span>Payable to vendor</span>
                  <span>{formatCurrency(convertPayableNum)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="convert-expense-account">Expense Account</Label>
                  <AccountSearchSelect
                    value={convertExpenseAccountId}
                    onChange={setConvertExpenseAccountId}
                    accountType={['expense']}
                    placeholder="Search expense account..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Where the cost gets booked. Examples: Repairs &amp;
                    Maintenance, Housekeeping, Electricity.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="convert-payable-account">Payable Account</Label>
                  <AccountSearchSelect
                    value={convertPayableAccountId}
                    onChange={setConvertPayableAccountId}
                    accountType={['liability']}
                    placeholder="Search payable account..."
                  />
                  <p className="text-xs text-muted-foreground">
                    What we owe the vendor — typically under Sundry
                    Creditors, or the vendor&apos;s own ledger if one
                    exists.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={convertPR.isPending}>
                {convertPR.isPending ? 'Converting...' : 'Convert to Bill'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Quick "+ Add Vendor" Dialog                                          */}
      {/* Tiny inline form so the operator can add a vendor mid-flow without */}
      {/* navigating to /vendors. The created vendor's id is auto-selected   */}
      {/* in whichever parent dialog (convert / bill / pr) opened this.      */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={quickVendorDialogOpen} onOpenChange={setQuickVendorDialogOpen}>
        <DialogContent>
          <form onSubmit={handleQuickVendorSubmit}>
            <DialogHeader>
              <DialogTitle>Add Vendor</DialogTitle>
              <DialogDescription>
                Quick-create a vendor. They&apos;ll also get a Sundry
                Creditors ledger automatically. Edit further details
                anytime on the Vendors page.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="quick-vendor-name">Name</Label>
                <Input
                  id="quick-vendor-name"
                  required
                  autoFocus
                  placeholder="e.g., Acme Cleaning Services"
                  value={quickVendorName}
                  onChange={(e) => setQuickVendorName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quick-vendor-phone">Phone (optional)</Label>
                  <Input
                    id="quick-vendor-phone"
                    placeholder="+91…"
                    value={quickVendorPhone}
                    onChange={(e) => setQuickVendorPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-vendor-gstin">GSTIN (optional)</Label>
                  <Input
                    id="quick-vendor-gstin"
                    placeholder="22AAAAA0000A1Z5"
                    value={quickVendorGstin}
                    onChange={(e) => setQuickVendorGstin(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createVendorMut.isPending}>
                {createVendorMut.isPending ? 'Creating…' : 'Add Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
