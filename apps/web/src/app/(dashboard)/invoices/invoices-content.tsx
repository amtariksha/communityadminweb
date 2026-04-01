'use client';

import { useState, useMemo, type FormEvent, type ReactNode } from 'react';
import { FileText, Plus, Send, Ban, Eye, MoreHorizontal, Download } from 'lucide-react';
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
} from '@/hooks';
import type { InvoiceStatus, Invoice } from '@communityos/shared';

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
): 'success' | 'warning' | 'destructive' | 'secondary' | 'default' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partially_paid':
      return 'warning';
    case 'overdue':
    case 'cancelled':
      return 'destructive';
    case 'draft':
      return 'secondary';
    case 'sent':
      return 'default';
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

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Form state for generate
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [billingDate, setBillingDate] = useState('');

  // Form state for create rule
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleLedgerAccountId, setRuleLedgerAccountId] = useState('');
  const [ruleChargeType, setRuleChargeType] = useState('flat');
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleFrequency, setRuleFrequency] = useState('monthly');
  const [ruleGstApplicable, setRuleGstApplicable] = useState(false);
  const [ruleGstRate, setRuleGstRate] = useState('');

  const statusFilter = activeTab === 'all' ? undefined : activeTab;
  const { data: invoicesResponse, isLoading } = useInvoices({
    status: statusFilter,
    page,
    limit,
  });
  const { data: rules } = useInvoiceRules();
  const { data: accountsResponse } = useLedgerAccounts({ limit: 500 });
  const ledgerAccounts = accountsResponse?.data ?? [];

  const generateInvoices = useGenerateInvoices();
  const createInvoiceRule = useCreateInvoiceRule();
  const postInvoices = usePostInvoices();
  const cancelInvoice = useCancelInvoice();
  const downloadPdf = useDownloadInvoicePdf();
  const { data: viewInvoiceData } = useInvoice(viewInvoiceId);

  const invoices = invoicesResponse?.data ?? [];
  const totalCount = invoicesResponse?.total ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
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
    setRuleAmount('');
    setRuleFrequency('monthly');
    setRuleGstApplicable(false);
    setRuleGstRate('');
  }

  function handleCreateRule(e: FormEvent): void {
    e.preventDefault();

    const amount = Number(ruleAmount);
    const payload: {
      name: string;
      ledger_account_id: string;
      frequency: string;
      amount: number;
      is_gst_applicable?: boolean;
      gst_rate?: number;
    } = {
      name: ruleName,
      ledger_account_id: ruleLedgerAccountId,
      frequency: ruleFrequency,
      amount,
    };

    if (ruleGstApplicable) {
      payload.is_gst_applicable = true;
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
          description: error.message,
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
            description: response.message,
            variant: 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to generate invoices',
            description: error.message,
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
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleCancel(invoiceId: string): void {
    cancelInvoice.mutate(invoiceId, {
      onSuccess() {
        addToast({ title: 'Invoice cancelled', variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to cancel invoice',
          description: error.message,
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
                          {rules?.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.name} ({formatCurrency(rule.amount)})
                            </option>
                          ))}
                        </Select>
                        <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
                          <DialogTrigger>
                            <Button type="button" variant="outline" size="sm" className="shrink-0">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
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
                                        {account.name} ({account.code})
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="rule-charge-type" className="flex items-center gap-1">
                                      Charge Type
                                      <HelpTooltip text="Flat = fixed amount per unit. Per Sq Ft = rate multiplied by unit area in sq ft." />
                                    </Label>
                                    <Select
                                      id="rule-charge-type"
                                      value={ruleChargeType}
                                      onChange={(e) => setRuleChargeType(e.target.value)}
                                      required
                                    >
                                      <option value="flat">Flat Amount</option>
                                      <option value="area_based">Per Sq Ft</option>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="rule-amount">
                                      {ruleChargeType === 'area_based' ? 'Rate per sqft' : 'Amount'}
                                    </Label>
                                    <Input
                                      id="rule-amount"
                                      type="number"
                                      placeholder="0"
                                      min="0.01"
                                      step="0.01"
                                      title="Amount must be greater than zero"
                                      value={ruleAmount}
                                      onChange={(e) => setRuleAmount(e.target.value)}
                                      required
                                    />
                                  </div>
                                </div>
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
                                    <Label htmlFor="rule-gst-rate">GST Rate (%)</Label>
                                    <Input
                                      id="rule-gst-rate"
                                      type="number"
                                      placeholder="18"
                                      value={ruleGstRate}
                                      onChange={(e) => setRuleGstRate(e.target.value)}
                                      required
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-date">Billing Date</Label>
                      <Input
                        id="billing-date"
                        type="date"
                        value={billingDate}
                        onChange={(e) => setBillingDate(e.target.value)}
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
                <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
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
          <div className="mb-4 flex gap-1 border-b">
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
                        {(invoice as Record<string, unknown>).unit_number
                          ? `${(invoice as Record<string, unknown>).unit_number}${(invoice as Record<string, unknown>).block ? ` (Block ${(invoice as Record<string, unknown>).block})` : ''}`
                          : invoice.unit_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(invoice as Record<string, unknown>).owner_name
                          ? String((invoice as Record<string, unknown>).owner_name)
                          : '\u2014'}
                      </div>
                      {(invoice as Record<string, unknown>).tenant_name && (
                        <div className="text-xs text-muted-foreground/70">
                          (Tenant: {String((invoice as Record<string, unknown>).tenant_name)})
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
                              onClick={() => handleCancel(invoice.id)}
                              disabled={cancelInvoice.isPending}
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
                  <Badge variant={getStatusBadgeVariant(viewInvoiceData.status as TabFilter)}>
                    {getStatusLabel(viewInvoiceData.status as TabFilter)}
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
    </div>
  );
}
