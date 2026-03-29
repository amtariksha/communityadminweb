'use client';

import { useState, useMemo, type FormEvent, type ReactNode } from 'react';
import { FileText, Plus, Send, Ban } from 'lucide-react';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useInvoices,
  useInvoiceRules,
  useCreateInvoiceRule,
  useLedgerAccounts,
  useGenerateInvoices,
  usePostInvoices,
  useCancelInvoice,
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

  const invoices = invoicesResponse?.data ?? [];
  const totalCount = invoicesResponse?.total ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
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
      { rule_id: selectedRuleId, date: billingDate },
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
        description="Manage maintenance and other invoices"
        actions={
          <>
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
                                    <Label htmlFor="rule-charge-type">Charge Type</Label>
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
                <TableHead>Unit</TableHead>
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
                    <TableCell className="font-medium">{invoice.unit_id}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.paid_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.balance_due)}
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
                      {(invoice.status === 'draft' || invoice.status === 'sent') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleCancel(invoice.id)}
                          disabled={cancelInvoice.isPending}
                          title="Cancel invoice"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
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
    </div>
  );
}
