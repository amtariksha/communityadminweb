'use client';

import { useState, useMemo, useEffect, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Plus, Send, Ban, Eye, MoreHorizontal, Download, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { GstRateSelect } from '@/components/ui/gst-rate-select';
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
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { formatCurrency, formatDate, financialDateBounds, clampDateString } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { FormFieldError } from '@/components/ui/form-field-error';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  useInvoices,
  useInvoice,
  useInvoiceRules,
  useCreateInvoiceRule,
  useLedgerAccounts,
  useGenerateInvoices,
  usePostInvoices,
  useCancelInvoice,
  useDownloadInvoicePdf,
  useCalculateLPI,
  usePostLPI,
  useDefaulters,
  useUnits,
  useBulkUpdateDueDates,
} from '@/hooks';
import { useListUrlState } from '@/hooks/use-list-url-state';
import type { InvoiceStatus, Invoice } from '@communityos/shared';

const INVOICE_SORTS = [
  'invoice_date',
  'invoice_number',
  'due_date',
  'total_amount',
  'balance_due',
  'status',
] as const;

// ---------------------------------------------------------------------------
// Tab / status config
// ---------------------------------------------------------------------------

type TabFilter = 'all' | InvoiceStatus;

const tabs: Array<{ label: string; value: TabFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Paid', value: 'paid' },
];

function getStatusBadgeVariant(
  status: InvoiceStatus,
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partially_paid':
      return 'warning';
    case 'overdue':
    case 'cancelled':
      return 'destructive';
    case 'draft':
    case 'sent':
      return 'secondary';
  }
}

function getStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'partially_paid':
      return 'Partially Paid';
    case 'overdue':
      return 'Overdue';
    case 'draft':
      return 'Draft';
    case 'sent':
      return 'Sent';
    case 'cancelled':
      return 'Cancelled';
  }
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function StatCardSkeleton(): ReactNode {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  );
}

function TableRowsSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InvoicesContent(): ReactNode {
  const { addToast } = useToast();
  // Clamp all date inputs to prev-FY-start → next-month-end. Prevents
  // accidental back-dating (beyond last FY) and forward-dating.
  const dateBounds = useMemo(() => financialDateBounds(), []);

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [lpiDialogOpen, setLpiDialogOpen] = useState(false);
  const [lpiPostDate, setLpiPostDate] = useState('');
  const [defaultersDialogOpen, setDefaultersDialogOpen] = useState(false);
  const [unitFilter, setUnitFilter] = useState('');
  // QA #92 — bulk-update-due-date dialog
  const [bulkDueDialogOpen, setBulkDueDialogOpen] = useState(false);
  const [bulkDueDate, setBulkDueDate] = useState('');

  // QA #95 / #246 — dashboard Outstanding-Dues card now links here
  // with `?filter=defaulters`. Open the existing Defaulters dialog
  // automatically so the operator lands on the drilldown without an
  // extra click.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get('filter') === 'defaulters') {
      setDefaultersDialogOpen(true);
    }
  }, [searchParams]);
  // QA #46 — persist page + sort in the URL so pagination survives refresh
  // and shared links reopen the same view.
  const listState = useListUrlState({
    allowedSorts: INVOICE_SORTS,
    defaultSort: 'invoice_date',
    defaultDir: 'desc',
  });
  const page = listState.state.page;
  const setPage = listState.setPage;
  const limit = 20;

  // Form state for generate
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [billingDate, setBillingDate] = useState('');

  // Form state for create rule
  //
  // The backend supports two charge modes end-to-end:
  //   flat        — one fixed amount per unit
  //   area_based  — amount × unit.area_sqft (per-sqft pricing)
  //
  // (A third "hybrid" mode is in the Zod enum but the DB column required
  // to store the flat add-on was never added, so it's not wired. Can be
  // enabled later via migration + calculateBaseAmount update.)
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleLedgerAccountId, setRuleLedgerAccountId] = useState('');
  const [ruleChargeType, setRuleChargeType] = useState<'flat' | 'area_based'>('flat');
  const [ruleFlatAmount, setRuleFlatAmount] = useState('');
  const [ruleRatePerSqft, setRuleRatePerSqft] = useState('');
  const [ruleFrequency, setRuleFrequency] = useState('monthly');
  const [ruleGstApplicable, setRuleGstApplicable] = useState(false);
  const [ruleGstRate, setRuleGstRate] = useState('');

  const statusFilter = activeTab === 'all' ? undefined : activeTab;
  const {
    data: invoicesResponse,
    isLoading,
    isError,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useInvoices({
    status: statusFilter,
    unit_id: unitFilter || undefined,
    page,
    limit,
    sort: listState.state.sort ?? undefined,
    dir: listState.state.dir,
  });
  const { data: rules } = useInvoiceRules();
  const { data: accountsResponse } = useLedgerAccounts({ limit: 500 });
  const ledgerAccounts = accountsResponse?.data ?? [];

  const generateInvoices = useGenerateInvoices();
  const createInvoiceRule = useCreateInvoiceRule();
  const postInvoices = usePostInvoices();
  const cancelInvoice = useCancelInvoice();
  const downloadPdf = useDownloadInvoicePdf();
  const lpiQuery = useCalculateLPI();
  const postLPI = usePostLPI();
  const defaultersQuery = useDefaulters();
  const unitsQuery = useUnits({ limit: 500 });
  // QA #92 — bulk-update-due-date toolbar action
  const bulkUpdateDueDates = useBulkUpdateDueDates();
  const { data: viewInvoiceData } = useInvoice(viewInvoiceId);
  const lpiData = lpiQuery.data ?? [];
  const defaulters = defaultersQuery.data ?? [];
  const units = unitsQuery.data?.data ?? [];

  const invoices = invoicesResponse?.data ?? [];
  const totalCount = invoicesResponse?.total ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => {
      const amt = typeof inv.total_amount === 'string' ? parseFloat(inv.total_amount) : Number(inv.total_amount);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    const paidCount = invoices.filter((inv) => inv.status === 'paid').length;
    const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;
    return { total, totalCount, paidCount, overdueCount };
  }, [invoices, totalCount]);

  function toggleSelect(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll(): void {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((inv) => inv.id)));
    }
  }

  function resetRuleForm(): void {
    setRuleName('');
    setRuleLedgerAccountId('');
    setRuleChargeType('flat');
    setRuleFlatAmount('');
    setRuleRatePerSqft('');
    setRuleFrequency('monthly');
    setRuleGstApplicable(false);
    setRuleGstRate('');
  }

  function handleCreateRule(e: FormEvent): void {
    e.preventDefault();

    // Build the payload by charge_type so the backend applies the right
    // calculation at invoice-generation time:
    //   flat        → amount (backend: is_per_sqft=false)
    //   area_based  → rate_per_sqft (backend: is_per_sqft=true, amount × unit.area_sqft)
    //
    // Previously this form silently dropped charge_type, so every rule was
    // stored as flat regardless of the dropdown selection. QA-reported.
    type RulePayload = {
      name: string;
      ledger_account_id: string;
      frequency: string;
      charge_type: 'flat' | 'area_based';
      amount?: number;
      flat_amount?: number;
      rate_per_sqft?: number;
      gst_rule?: 'none' | 'full';
      gst_rate?: number;
      is_gst_applicable?: boolean;
    };

    const payload: RulePayload = {
      name: ruleName,
      ledger_account_id: ruleLedgerAccountId,
      frequency: ruleFrequency,
      charge_type: ruleChargeType,
    };

    if (ruleChargeType === 'flat') {
      const amt = Number(ruleFlatAmount) || 0;
      payload.amount = amt;
      payload.flat_amount = amt;
    } else {
      const rate = Number(ruleRatePerSqft) || 0;
      payload.amount = rate;
      payload.rate_per_sqft = rate;
    }

    if (ruleGstApplicable) {
      payload.is_gst_applicable = true;
      payload.gst_rule = 'full';
      payload.gst_rate = Number(ruleGstRate) || 0;
    }

    createInvoiceRule.mutate(payload, {
      onSuccess(response) {
        setRuleDialogOpen(false);
        resetRuleForm();
        setSelectedRuleId(response.data.id);
        addToast({ title: 'Billing rule created', variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to create billing rule',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  function handleGenerate(e: FormEvent): void {
    e.preventDefault();

    generateInvoices.mutate(
      { rule_id: selectedRuleId, invoice_date: billingDate },
      {
        onSuccess(response) {
          setGenerateDialogOpen(false);
          setSelectedRuleId('');
          setBillingDate('');
          addToast({
            title: 'Invoices generated',
            description: `${response.data.count} invoice(s) created`,
            variant: 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to generate invoices',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handlePostSelected(): void {
    const ids = Array.from(selectedIds);

    postInvoices.mutate(
      { invoice_ids: ids },
      {
        onSuccess() {
          setSelectedIds(new Set());
          addToast({
            title: `${ids.length} invoices posted`,
            variant: 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to post invoices',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  // QA #92 — bulk-update due-date for selected invoices. The
  // backend wrapper (PATCH /invoices/due-dates) already takes
  // { invoice_ids, due_date } and updates them in one shot; no
  // backend change needed here.
  function openBulkDueDialog(): void {
    setBulkDueDate('');
    setBulkDueDialogOpen(true);
  }

  function handleBulkDueDate(e: FormEvent): void {
    e.preventDefault();
    if (!bulkDueDate) {
      addToast({ title: 'Pick a new due date', variant: 'destructive' });
      return;
    }
    const ids = Array.from(selectedIds);
    bulkUpdateDueDates.mutate(
      { invoice_ids: ids, due_date: bulkDueDate },
      {
        onSuccess() {
          setBulkDueDialogOpen(false);
          setSelectedIds(new Set());
          addToast({
            title: `Due date updated on ${ids.length} invoice${ids.length === 1 ? '' : 's'}`,
            variant: 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to update due dates',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function openCancelDialog(invoiceId: string): void {
    setCancelInvoiceId(invoiceId);
    setCancelReason('');
    setCancelDialogOpen(true);
  }

  function handleCancel(e: FormEvent): void {
    e.preventDefault();
    if (!cancelReason.trim()) {
      addToast({ title: 'Cancellation reason is required', variant: 'destructive' });
      return;
    }
    cancelInvoice.mutate({ id: cancelInvoiceId, reason: cancelReason.trim() }, {
      onSuccess() {
        setCancelDialogOpen(false);
        setCancelInvoiceId('');
        setCancelReason('');
        addToast({ title: 'Invoice cancelled', variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to cancel invoice',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Invoices' }]}
        title="Invoices"
        description="Generate and manage member invoices — billing rules, bulk generation, posting to GL"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setDefaultersDialogOpen(true)}
            >
              <Ban className="mr-2 h-4 w-4" />
              Defaulters
            </Button>
            <Button
              variant="outline"
              onClick={() => setLpiDialogOpen(true)}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Calculate LPI
            </Button>
            <ExportButton
              data={invoices as unknown as Record<string, unknown>[]}
              filename={`invoices-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { key: 'invoice_number', label: 'Invoice #' },
                { key: 'unit_number', label: 'Unit' },
                { key: 'total_amount', label: 'Amount' },
                { key: 'amount_paid', label: 'Paid' },
                { key: 'balance_due', label: 'Balance' },
                { key: 'status', label: 'Status' },
                { key: 'due_date', label: 'Due Date' },
              ]}
            />
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePostSelected}
                  disabled={postInvoices.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {postInvoices.isPending
                    ? 'Posting...'
                    : `Post Selected (${selectedIds.size})`}
                </Button>
                {/* QA #92 — open the bulk-update-due-date dialog */}
                <Button
                  variant="outline"
                  onClick={openBulkDueDialog}
                  disabled={bulkUpdateDueDates.isPending}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {bulkUpdateDueDates.isPending
                    ? 'Updating…'
                    : `Update Due Date (${selectedIds.size})`}
                </Button>
              </>
            )}
            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
              <DialogTrigger>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Invoices
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleGenerate}>
                  <DialogHeader>
                    <DialogTitle>Generate Invoices</DialogTitle>
                    <DialogDescription>
                      Generate invoices for all units based on a billing rule
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="billing-rule">Billing Rule</Label>
                      <div className="flex gap-2">
                        <Select
                          id="billing-rule"
                          value={selectedRuleId}
                          onChange={(e) => setSelectedRuleId(e.target.value)}
                          required
                          className="flex-1"
                        >
                          <option value="">Select billing rule</option>
                          {rules?.map((rule) => {
                            const isPerSqft = rule.is_per_sqft || rule.charge_type === 'area_based';
                            const label = isPerSqft
                              ? `${rule.name} (${formatCurrency(rule.amount)}/sqft)`
                              : `${rule.name} (${formatCurrency(rule.amount)} flat)`;
                            return (
                              <option key={rule.id} value={rule.id}>
                                {label}
                              </option>
                            );
                          })}
                        </Select>
                        {/* QA #197 — the inline trigger only flips state.
                            The actual Create Billing Rule <Dialog> is mounted
                            at the component root (below) so it sits as a
                            sibling of Generate Invoices, not nested inside
                            its <DialogContent>. Nested Radix dialogs swallow
                            the inner trigger via the outer overlay's
                            pointer-event interception, which is why the
                            "+" button silently did nothing. */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setRuleDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-date">Billing Date</Label>
                      <Input
                        id="billing-date"
                        type="date"
                        min={dateBounds.min}
                        max={dateBounds.max}
                        value={billingDate}
                        onChange={(e) => setBillingDate(clampDateString(e.target.value, dateBounds.min, dateBounds.max))}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={generateInvoices.isPending}>
                      {generateInvoices.isPending ? 'Generating...' : 'Generate'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* QA #37 — explicit pagination/query error banner so users don't
          stare at an empty table wondering if it really has no data. */}
      {isError && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <div className="text-destructive">
            <strong>Couldn&apos;t load invoices.</strong>{' '}
            {invoicesError instanceof Error ? invoicesError.message : 'Please try again.'}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetchInvoices()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invoiced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(Number(stats.total) || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.totalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-success">{stats.paidCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{stats.overdueCount}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setActiveTab(tab.value);
                    setSelectedIds(new Set());
                    setPage(1);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={unitFilter}
                onChange={(e) => {
                  setUnitFilter(e.target.value);
                  setPage(1);
                }}
                className="w-48"
              >
                <option value="">All Units</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number}{unit.block ? ` (${unit.block})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === invoices.length && invoices.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-input"
                  />
                </TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Unit / Owner</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton />
              ) : invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(invoice.id)}
                        onChange={() => toggleSelect(invoice.id)}
                        className="rounded border-input"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{invoice.invoice_number}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {invoice.unit_number
                          ? `${invoice.unit_number}${invoice.block ? ` (Block ${invoice.block})` : ''}`
                          : invoice.unit_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {invoice.owner_name ?? '\u2014'}
                      </div>
                      {invoice.tenant_name && (
                        <div className="text-xs text-muted-foreground/70">
                          (Tenant: {invoice.tenant_name})
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(invoice.total_amount) || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(invoice.amount_paid ?? invoice.paid_amount ?? 0) > 0
                        ? formatCurrency(Number(invoice.amount_paid ?? invoice.paid_amount) || 0)
                        : <span className="text-xs text-muted-foreground">UNPAID</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(invoice.balance_due) || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(String(invoice.due_date))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setViewInvoiceId(invoice.id);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => downloadPdf.mutate(invoice.id)}
                            disabled={downloadPdf.isPending}
                          >
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>
                          {(invoice.status === 'draft' || invoice.status === 'sent') && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => openCancelDialog(invoice.id)}
                            >
                              <Ban className="mr-2 h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : null}
            </TableBody>
          </Table>

          {!isLoading && invoices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No invoices found</p>
              <p className="text-sm text-muted-foreground">
                No invoices match the current filter
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of{' '}
                {totalCount} invoices
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Invoice Dialog */}
      {/* QA #92 — Bulk update due-date dialog */}
      <Dialog open={bulkDueDialogOpen} onOpenChange={setBulkDueDialogOpen}>
        <DialogContent>
          <form onSubmit={handleBulkDueDate}>
            <DialogHeader>
              <DialogTitle>
                Update due date — {selectedIds.size} invoice
                {selectedIds.size === 1 ? '' : 's'}
              </DialogTitle>
              <DialogDescription>
                Pick the new due date. All selected invoices will be
                updated atomically. Defaulters / LPI re-evaluate
                automatically against the new date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-due-date">New due date</Label>
                <Input
                  id="bulk-due-date"
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={bulkUpdateDueDates.isPending}>
                {bulkUpdateDueDates.isPending ? 'Updating…' : 'Apply'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCancel}>
            <DialogHeader>
              <DialogTitle>Cancel Invoice</DialogTitle>
              <DialogDescription>
                Please provide a reason for cancelling this invoice
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Reason</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Reason for cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={cancelInvoice.isPending}>
                {cancelInvoice.isPending ? 'Cancelling...' : 'Cancel Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setViewInvoiceId('');
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Invoice {viewInvoiceData?.invoice_number ?? ''}
            </DialogTitle>
            <DialogDescription>
              Invoice details and line items
            </DialogDescription>
          </DialogHeader>

          {viewInvoiceData ? (
            <div className="space-y-6 py-4">
              {/* Invoice header info */}
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-mono font-medium">
                  {viewInvoiceData.invoice_number}
                </span>

                <span className="text-muted-foreground">Status</span>
                <span>
                  <Badge variant={getStatusBadgeVariant(viewInvoiceData.status)}>
                    {getStatusLabel(viewInvoiceData.status)}
                  </Badge>
                </span>

                <span className="text-muted-foreground">Unit</span>
                <span>{viewInvoiceData.unit_number ?? viewInvoiceData.unit_id}</span>

                <span className="text-muted-foreground">Invoice Date</span>
                <span>{formatDate(String(viewInvoiceData.invoice_date ?? viewInvoiceData.issue_date ?? viewInvoiceData.created_at))}</span>

                <span className="text-muted-foreground">Due Date</span>
                <span>{formatDate(String(viewInvoiceData.due_date))}</span>

                <span className="text-muted-foreground">Billing Period</span>
                <span>{viewInvoiceData.billing_period ?? '—'}</span>
              </div>

              <Separator />

              {/* Line items */}
              {viewInvoiceData.lines && viewInvoiceData.lines.length > 0 ? (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Line Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewInvoiceData.lines.map((line: { id: string; description: string; amount: number; gst_amount?: number; total?: number }, idx: number) => (
                        <TableRow key={line.id ?? idx}>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(line.amount))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(line.gst_amount ?? 0))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(line.total ?? line.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No line items</p>
              )}

              <Separator />

              {/* Totals */}
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-right font-medium">
                  {formatCurrency(Number(viewInvoiceData.subtotal ?? viewInvoiceData.total_amount))}
                </span>

                {Number(viewInvoiceData.gst_amount ?? 0) > 0 && (
                  <>
                    <span className="text-muted-foreground">GST</span>
                    <span className="text-right">
                      {formatCurrency(Number(viewInvoiceData.gst_amount))}
                    </span>
                  </>
                )}

                <span className="font-semibold">Total Amount</span>
                <span className="text-right font-bold text-lg">
                  {formatCurrency(Number(viewInvoiceData.total_amount))}
                </span>

                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-right text-green-600">
                  {Number(viewInvoiceData.amount_paid) > 0
                    ? formatCurrency(Number(viewInvoiceData.amount_paid))
                    : 'UNPAID'}
                </span>

                <span className="font-semibold">Balance Due</span>
                <span className="text-right font-bold text-destructive">
                  {Number(viewInvoiceData.balance_due) > 0
                    ? formatCurrency(Number(viewInvoiceData.balance_due))
                    : '—'}
                </span>
              </div>

              {/* Receipts that allocated against this invoice */}
              {(() => {
                const receipts = (viewInvoiceData as unknown as {
                  receipts?: Array<{
                    id: string;
                    receipt_number: string;
                    receipt_date: string;
                    amount: number;
                    mode: string;
                  }>;
                }).receipts ?? [];
                if (receipts.length === 0) return null;
                return (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Payments Received</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Receipt #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receipts.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>
                                <Link
                                  href={`/receipts?highlight=${r.id}`}
                                  className="font-mono text-primary underline-offset-2 hover:underline"
                                >
                                  {r.receipt_number}
                                </Link>
                              </TableCell>
                              <TableCell>{formatDate(r.receipt_date)}</TableCell>
                              <TableCell className="capitalize">
                                {r.mode.replace(/_/g, ' ')}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrency(Number(r.amount))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (viewInvoiceId) downloadPdf.mutate(viewInvoiceId);
              }}
              disabled={downloadPdf.isPending || !viewInvoiceId}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadPdf.isPending ? 'Generating...' : 'Download PDF'}
            </Button>
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LPI Calculation Dialog */}
      <Dialog open={lpiDialogOpen} onOpenChange={setLpiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Late Payment Interest (LPI)</DialogTitle>
            <DialogDescription>
              Review calculated interest on overdue invoices and post to GL
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {lpiQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : lpiData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead className="text-right">LPI Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lpiData.map((lpi, idx) => (
                    <TableRow key={`${lpi.invoice_id}-${idx}`}>
                      <TableCell>{lpi.unit_number}</TableCell>
                      <TableCell className="font-mono text-xs">{lpi.invoice_number}</TableCell>
                      <TableCell className="text-right">{formatCurrency(lpi.principal)}</TableCell>
                      <TableCell className="text-right">{lpi.days_overdue}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(lpi.lpi_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No overdue invoices with pending interest
              </p>
            )}

            {lpiData.length > 0 && (
              <div className="flex items-end gap-4 border-t pt-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="lpi-post-date">Post As Of Date</Label>
                  <Input
                    id="lpi-post-date"
                    type="date"
                    min={dateBounds.min}
                    max={dateBounds.max}
                    value={lpiPostDate}
                    onChange={(e) => setLpiPostDate(clampDateString(e.target.value, dateBounds.min, dateBounds.max))}
                  />
                </div>
                <Button
                  disabled={postLPI.isPending || !lpiPostDate}
                  onClick={() => {
                    postLPI.mutate(
                      { as_of_date: lpiPostDate },
                      {
                        onSuccess(response) {
                          addToast({
                            title: 'LPI Posted',
                            description: `${response.data.posted_count} entries posted, total interest: ${formatCurrency(response.data.total_interest)}`,
                            variant: 'success',
                          });
                          setLpiDialogOpen(false);
                          setLpiPostDate('');
                        },
                        onError(error) {
                          addToast({
                            title: 'Failed to post LPI',
                            description: friendlyError(error),
                            variant: 'destructive',
                          });
                        },
                      },
                    );
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {postLPI.isPending ? 'Posting...' : 'Post LPI'}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QA #197 — Create Billing Rule dialog hoisted to a sibling of
          the Generate Invoices dialog so the "+" trigger inside the
          parent's <DialogContent> can reliably flip ruleDialogOpen
          without Radix's overlay swallowing the click. handleCreateRule
          already calls setRuleDialogOpen(false) on success (line 358).*/}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateRule}>
            <DialogHeader>
              <DialogTitle>Create Billing Rule</DialogTitle>
              <DialogDescription>Add a new billing rule for invoice generation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Name</Label>
                <Input
                  id="rule-name"
                  placeholder="e.g., Maintenance Charge"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  required
                />
                <FormFieldError error={createInvoiceRule.error} field="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-ledger-account">Ledger Account</Label>
                <Select
                  id="rule-ledger-account"
                  value={ruleLedgerAccountId}
                  onChange={(e) => setRuleLedgerAccountId(e.target.value)}
                  required
                >
                  <option value="">Select account</option>
                  {ledgerAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
                <FormFieldError error={createInvoiceRule.error} field="ledger_account_id" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-charge-type" className="flex items-center gap-1">
                  Charge Type
                  <HelpTooltip text="Flat = one fixed amount per unit. Per Sq Ft = amount multiplied by unit's area_sqft at invoice generation." />
                </Label>
                <Select
                  id="rule-charge-type"
                  value={ruleChargeType}
                  onChange={(e) => setRuleChargeType(e.target.value as 'flat' | 'area_based')}
                  required
                >
                  <option value="flat">Flat Amount (one fixed fee per unit)</option>
                  <option value="area_based">Per Sq Ft (rate × unit area)</option>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ruleChargeType === 'flat'
                    ? 'Every unit billed the same amount regardless of size.'
                    : 'Invoice amount = rate × unit.area_sqft. Units without area_sqft will bill zero.'}
                </p>
              </div>
              {ruleChargeType === 'flat' ? (
                <div className="space-y-2">
                  <Label htmlFor="rule-flat-amount">Amount (₹)</Label>
                  <Input
                    id="rule-flat-amount"
                    type="number"
                    placeholder="3000"
                    min="0.01"
                    max="10000000"
                    step="0.01"
                    title="Amount must be greater than zero (max ₹1 crore)"
                    value={ruleFlatAmount}
                    onChange={(e) => setRuleFlatAmount(e.target.value)}
                    required
                  />
                  <FormFieldError error={createInvoiceRule.error} field="flat_amount" />
                  <FormFieldError error={createInvoiceRule.error} field="amount" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="rule-rate-per-sqft">Rate per Sq Ft (₹)</Label>
                  <Input
                    id="rule-rate-per-sqft"
                    type="number"
                    placeholder="2.5"
                    min="0.01"
                    step="0.01"
                    value={ruleRatePerSqft}
                    onChange={(e) => setRuleRatePerSqft(e.target.value)}
                    required
                  />
                  <FormFieldError error={createInvoiceRule.error} field="rate_per_sqft" />
                  <p className="text-xs text-muted-foreground">
                    Example: rate = ₹2.5, unit = 1,200 sqft → invoice = ₹3,000
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="rule-frequency">Frequency</Label>
                <Select
                  id="rule-frequency"
                  value={ruleFrequency}
                  onChange={(e) => setRuleFrequency(e.target.value)}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one_time">One Time</option>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="rule-gst"
                  type="checkbox"
                  checked={ruleGstApplicable}
                  onChange={(e) => setRuleGstApplicable(e.target.checked)}
                />
                <Label htmlFor="rule-gst">GST Applicable</Label>
              </div>
              {ruleGstApplicable && (
                <div className="space-y-2">
                  <Label htmlFor="rule-gst-rate">GST Rate</Label>
                  <GstRateSelect
                    id="rule-gst-rate"
                    required
                    allowNone={false}
                    value={ruleGstRate ? Number(ruleGstRate) : null}
                    onChange={(v) => setRuleGstRate(v == null ? '' : String(v))}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createInvoiceRule.isPending}>
                {createInvoiceRule.isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
