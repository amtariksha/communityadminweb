'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { useCustomers, useCreateCustomer } from '@/hooks';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';

// ---------------------------------------------------------------------------
// Custom (non-unit) invoice dialog
// ---------------------------------------------------------------------------
//
// Lets the operator raise an invoice against a non-resident party
// (sponsor, external clubhouse renter, retainer, etc.).
//
//   1. Pick / inline-create a customer (with a "+ New" inline form).
//   2. Pick the income ledger (defaults to "Other Income" server-side
//      when not chosen) — but the operator is encouraged to pick a
//      specific income ledger like "Sponsorship Income" for cleaner P&L.
//   3. Enter description + amount.
//   4. Submit → POST /invoices/custom → invoice lands in 'draft' and
//      shows up in the standard invoice list, where it can be posted
//      with the same bulk Post action.
//
// Backend endpoint (POST /invoices/custom) added in invoice.controller.
// ---------------------------------------------------------------------------

interface CustomInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomInvoiceDialog({
  open,
  onOpenChange,
}: CustomInvoiceDialogProps): ReactNode {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [showInlineCustomer, setShowInlineCustomer] = useState(false);

  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeAccountId, setIncomeAccountId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDays, setDueDays] = useState('15');

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

  useEffect(() => {
    if (!open) return;
    setCustomerSearch('');
    setCustomerId('');
    setShowInlineCustomer(false);
    setNewCustomerName('');
    setNewCustomerEmail('');
    setNewCustomerPhone('');
    setDescription('');
    setAmount('');
    setIncomeAccountId('');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setDueDays('15');
  }, [open]);

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      customer_id: string;
      description: string;
      amount: number;
      income_account_id?: string;
      invoice_date?: string;
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
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast({ title: 'Amount must be > 0', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      addToast({ title: 'Description required', variant: 'destructive' });
      return;
    }

    submitMutation.mutate({
      customer_id: customerId,
      description: description.trim(),
      amount: amt,
      income_account_id: incomeAccountId || undefined,
      invoice_date: invoiceDate || undefined,
      due_days: Number(dueDays) || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New custom invoice</DialogTitle>
            <DialogDescription>
              For non-resident parties — sponsors, external clubhouse renters,
              retainers. Posts to the customer&apos;s Sundry Debtors ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                  {customerSearch &&
                    !selectedCustomer &&
                    customers.length > 0 && (
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label>
                Income account{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (defaults to &quot;Other Income&quot; if not picked)
                </span>
              </Label>
              <AccountSearchSelect
                value={incomeAccountId}
                onChange={setIncomeAccountId}
                accountType={['income']}
                placeholder="Pick income ledger (e.g. Sponsorship)…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ci-desc">Description</Label>
              <Textarea
                id="ci-desc"
                required
                placeholder="e.g. Clubhouse rental — sponsor event Sat 12 Apr"
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-amount">Amount</Label>
              <Input
                id="ci-amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-right tabular-nums"
              />
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
