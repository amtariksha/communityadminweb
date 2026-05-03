'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GstRateSelect } from '@/components/ui/gst-rate-select';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { useCustomers, useCreateCustomer } from '@/hooks';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';

// ---------------------------------------------------------------------------
// Custom (non-unit) invoice dialog — Phase D.6 parity with vendor bills
// ---------------------------------------------------------------------------
//
// Multi-line invoice for non-resident parties (sponsors, external
// clubhouse renters, retainers, etc.). Each line has its own
// description, amount, and GST rate. The header carries an optional
// TDS rate (rare on customer invoices but kept for parity).
//
// Backend: POST /invoices/custom (invoice.controller). The service
// accepts either single-line (description+amount) or multi-line
// (`lines: [...]`). This dialog always sends `lines`.
// ---------------------------------------------------------------------------

interface CustomInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InvoiceLine {
  id: string;
  description: string;
  amount: string;
  gst_rate: string;
  income_account_id: string;
}

const newLine = (): InvoiceLine => ({
  id: `line-${Math.random().toString(36).slice(2, 10)}`,
  description: '',
  amount: '',
  gst_rate: '',
  income_account_id: '',
});

export function CustomInvoiceDialog({
  open,
  onOpenChange,
}: CustomInvoiceDialogProps): ReactNode {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Customer selection — search-as-you-type with inline create.
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [showInlineCustomer, setShowInlineCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Header fields.
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDays, setDueDays] = useState('15');
  const [tdsRate, setTdsRate] = useState('');
  // Default income account — used as a fallback when a line doesn't
  // pick its own. Most invoices have a single income account so the
  // operator sets it once at the header.
  const [defaultIncomeAccountId, setDefaultIncomeAccountId] = useState('');

  // Multi-line. Seeded with one empty line so the form looks usable
  // as soon as it opens.
  const [lines, setLines] = useState<InvoiceLine[]>(() => [newLine()]);

  const customersQuery = useCustomers({
    search: customerSearch || undefined,
    is_active: true,
    limit: 25,
  });
  const createCustomer = useCreateCustomer();

  const customers = customersQuery.data?.data ?? [];
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  // Reset everything every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setCustomerSearch('');
    setCustomerId('');
    setShowInlineCustomer(false);
    setNewCustomerName('');
    setNewCustomerEmail('');
    setNewCustomerPhone('');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setDueDays('15');
    setTdsRate('');
    setDefaultIncomeAccountId('');
    setLines([newLine()]);
  }, [open]);

  // Live totals — drives the totals strip + submit validation.
  const subtotal = useMemo(
    () =>
      lines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0),
    [lines],
  );
  const gstAmount = useMemo(
    () =>
      lines.reduce((acc, l) => {
        const amt = Number(l.amount) || 0;
        const rate = Number(l.gst_rate) || 0;
        return acc + (amt * rate) / 100;
      }, 0),
    [lines],
  );
  const totalAmount = subtotal + gstAmount;
  const tdsAmount = ((Number(tdsRate) || 0) * totalAmount) / 100;
  const netAmount = totalAmount - tdsAmount;

  function updateLine(idx: number, patch: Partial<InvoiceLine>): void {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );
  }
  function addLine(): void {
    setLines((prev) => [...prev, newLine()]);
  }
  function removeLine(idx: number): void {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      customer_id: string;
      lines: Array<{
        description: string;
        amount: number;
        gst_rate?: number;
        income_account_id?: string;
      }>;
      gst_amount: number;
      tds_amount?: number;
      income_account_id?: string;
      invoice_date: string;
      due_days?: number;
    }) => {
      return api.post<{ data: { id: string; invoice_number: string } }>(
        '/invoices/custom',
        payload,
      );
    },
    onSuccess: (response) => {
      addToast({
        title: `Invoice ${response.data.invoice_number} created`,
        description: 'Saved as draft. Post it from the invoices list.',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      onOpenChange(false);
    },
    onError: (err) => {
      addToast({
        title: 'Failed to create custom invoice',
        description: friendlyError(err),
        variant: 'destructive',
      });
    },
  });

  function handleInlineCreate(): void {
    if (!newCustomerName.trim()) {
      addToast({
        title: 'Customer name required',
        variant: 'destructive',
      });
      return;
    }
    createCustomer.mutate(
      {
        name: newCustomerName.trim(),
        email: newCustomerEmail || null,
        phone: newCustomerPhone || null,
      },
      {
        onSuccess(res) {
          addToast({
            title: `Customer "${res.data.name}" added`,
            variant: 'success',
          });
          setCustomerId(res.data.id);
          setCustomerSearch(res.data.name);
          setShowInlineCustomer(false);
        },
        onError(err) {
          addToast({
            title: 'Failed to add customer',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!customerId) {
      addToast({ title: 'Pick a customer', variant: 'destructive' });
      return;
    }
    // Validate every line has a description + amount > 0.
    for (const [i, l] of lines.entries()) {
      if (!l.description.trim()) {
        addToast({
          title: `Line ${i + 1}: description required`,
          variant: 'destructive',
        });
        return;
      }
      const amt = Number(l.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        addToast({
          title: `Line ${i + 1}: amount must be > 0`,
          variant: 'destructive',
        });
        return;
      }
    }

    submitMutation.mutate({
      customer_id: customerId,
      lines: lines.map((l) => ({
        description: l.description.trim(),
        amount: Number(l.amount),
        gst_rate: l.gst_rate ? Number(l.gst_rate) : undefined,
        income_account_id: l.income_account_id || undefined,
      })),
      gst_amount: Math.round(gstAmount * 100) / 100,
      tds_amount: tdsAmount > 0 ? Math.round(tdsAmount * 100) / 100 : undefined,
      income_account_id: defaultIncomeAccountId || undefined,
      invoice_date: invoiceDate,
      due_days: Number(dueDays) || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New custom invoice</DialogTitle>
            <DialogDescription>
              For non-resident parties — sponsors, external clubhouse renters,
              retainers. Posts to the customer&apos;s Sundry Debtors ledger
              with full GST + multi-line support.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Customer</Label>
                {!showInlineCustomer && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowInlineCustomer(true);
                      setNewCustomerName(customerSearch);
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    New customer
                  </Button>
                )}
              </div>

              {!showInlineCustomer ? (
                <>
                  <Input
                    placeholder="Search customer by name…"
                    value={
                      selectedCustomer && !customerSearch
                        ? selectedCustomer.name
                        : customerSearch
                    }
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerId('');
                    }}
                  />
                  {customerSearch && !selectedCustomer && customers.length > 0 && (
                    <div className="max-h-48 overflow-auto rounded-md border bg-card">
                      {customers.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerSearch('');
                          }}
                        >
                          <div className="font-medium">{c.name}</div>
                          {c.email && (
                            <div className="text-xs text-muted-foreground">
                              {c.email}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {customerSearch &&
                    !customersQuery.isLoading &&
                    customers.length === 0 && (
                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        No matches. Click &quot;New customer&quot; to create one.
                      </div>
                    )}
                </>
              ) : (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="new-cust-name" className="text-xs">
                        Name *
                      </Label>
                      <Input
                        id="new-cust-name"
                        required
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-cust-phone" className="text-xs">
                        Phone
                      </Label>
                      <Input
                        id="new-cust-phone"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="new-cust-email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="new-cust-email"
                        type="email"
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInlineCustomer(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleInlineCreate}
                      disabled={createCustomer.isPending}
                    >
                      {createCustomer.isPending
                        ? 'Creating…'
                        : 'Create + select'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Date + due days + default income account */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ci-date">Invoice date</Label>
                <Input
                  id="ci-date"
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-due">Due in (days)</Label>
                <Input
                  id="ci-due"
                  type="number"
                  min="0"
                  max="365"
                  value={dueDays}
                  onChange={(e) => setDueDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-tds">TDS rate (%)</Label>
                <Input
                  id="ci-tds"
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  placeholder="0"
                  value={tdsRate}
                  onChange={(e) => setTdsRate(e.target.value)}
                />
              </div>
            </div>

            {/* Default income account — used for any line that doesn't
                pick its own. */}
            <div className="space-y-2">
              <Label>
                Default income ledger{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (used when a line doesn&apos;t pick its own)
                </span>
              </Label>
              <AccountSearchSelect
                value={defaultIncomeAccountId}
                onChange={setDefaultIncomeAccountId}
                accountType={['income']}
                placeholder="Pick income ledger (e.g. Sponsorship)…"
              />
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={line.id}
                    className="space-y-2 rounded-md border bg-muted/20 p-3"
                  >
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <Label
                          htmlFor={`line-${idx}-desc`}
                          className="text-xs"
                        >
                          Description
                        </Label>
                        <Input
                          id={`line-${idx}-desc`}
                          placeholder="e.g. Clubhouse rental — Sat event"
                          maxLength={500}
                          value={line.description}
                          onChange={(e) =>
                            updateLine(idx, { description: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-span-3">
                        <Label
                          htmlFor={`line-${idx}-amt`}
                          className="text-xs"
                        >
                          Amount (pre-GST)
                        </Label>
                        <Input
                          id={`line-${idx}-amt`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          className="text-right tabular-nums"
                          value={line.amount}
                          onChange={(e) =>
                            updateLine(idx, { amount: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-span-3">
                        <Label
                          htmlFor={`line-${idx}-gst`}
                          className="text-xs"
                        >
                          GST rate
                        </Label>
                        <GstRateSelect
                          id={`line-${idx}-gst`}
                          allowNone
                          value={line.gst_rate ? Number(line.gst_rate) : null}
                          onChange={(v) =>
                            updateLine(idx, {
                              gst_rate: v == null ? '' : String(v),
                            })
                          }
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          disabled={lines.length <= 1}
                          onClick={() => removeLine(idx)}
                          title={
                            lines.length <= 1
                              ? 'At least one line required'
                              : 'Remove line'
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {/* Per-line income account override (collapsed
                        by default — only the operator who actually
                        wants split-income invoices opens it). */}
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">
                        Override income ledger for this line
                      </summary>
                      <div className="pt-2">
                        <AccountSearchSelect
                          value={line.income_account_id}
                          onChange={(id) =>
                            updateLine(idx, { income_account_id: id })
                          }
                          accountType={['income']}
                          placeholder="(uses default if not picked)"
                        />
                      </div>
                    </details>
                  </div>
                ))}
              </div>

              {/* Totals strip */}
              <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-sm tabular-nums">
                <span>
                  <span className="text-muted-foreground">Subtotal</span>{' '}
                  <strong>{formatCurrency(subtotal)}</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">GST</span>{' '}
                  <strong>{formatCurrency(gstAmount)}</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">Total</span>{' '}
                  <strong>{formatCurrency(totalAmount)}</strong>
                </span>
                {tdsAmount > 0 && (
                  <span>
                    <span className="text-muted-foreground">TDS</span>{' '}
                    <strong>{formatCurrency(tdsAmount)}</strong>
                  </span>
                )}
                <span>
                  <span className="text-muted-foreground">Net payable</span>{' '}
                  <strong className="text-foreground">
                    {formatCurrency(netAmount)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!customerId || submitMutation.isPending}
            >
              {submitMutation.isPending ? 'Creating…' : 'Create draft invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
