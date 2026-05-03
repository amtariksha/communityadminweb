'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Select } from '@/components/ui/select';
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { api } from '@/lib/api';
import { purchaseKeys } from '@/hooks/use-purchases';

// ---------------------------------------------------------------------------
// Direct-expense payment dialog
// ---------------------------------------------------------------------------
//
// For petty cash, freight, courier, one-off reimbursements that
// don't go through the vendor-bill workflow. Phase B (migration
// 070) added vendor_payments.expense_account_id + dropped the NOT
// NULL on vendor_bill_id so these flows can land in the same
// vendor_payments audit trail (with payment-mode tracking +
// reference number) instead of being recorded as raw JEs.
//
// Backend: POST /purchases/direct-expense (purchase.controller).
// ---------------------------------------------------------------------------

interface DirectExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentMode = 'cash' | 'cheque' | 'bank_transfer' | 'upi';

export function DirectExpenseDialog({
  open,
  onOpenChange,
}: DirectExpenseDialogProps): ReactNode {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [paymentDate, setPaymentDate] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    if (!open) return;
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setExpenseAccountId('');
    setBankAccountId('');
    setPaymentMode('cash');
    setReferenceNumber('');
    setNarration('');
  }, [open]);

  const submit = useMutation({
    mutationFn: async (payload: {
      payment_date: string;
      amount: number;
      expense_account_id: string;
      bank_account_id: string;
      payment_mode: PaymentMode;
      reference_number?: string;
      narration?: string;
    }) => {
      return api.post<{ data: { id: string } }>(
        '/purchases/direct-expense',
        payload,
      );
    },
    onSuccess: () => {
      addToast({
        title: 'Direct expense recorded',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      onOpenChange(false);
    },
    onError: (err) => {
      addToast({
        title: 'Failed to record direct expense',
        description: friendlyError(err),
        variant: 'destructive',
      });
    },
  });

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!expenseAccountId) {
      addToast({ title: 'Pick an expense account', variant: 'destructive' });
      return;
    }
    if (!bankAccountId) {
      addToast({
        title: 'Pick the bank/cash ledger paying this',
        variant: 'destructive',
      });
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast({ title: 'Amount must be > 0', variant: 'destructive' });
      return;
    }

    submit.mutate({
      payment_date: paymentDate,
      amount: amt,
      expense_account_id: expenseAccountId,
      bank_account_id: bankAccountId,
      payment_mode: paymentMode,
      reference_number: referenceNumber || undefined,
      narration: narration || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record direct expense</DialogTitle>
            <DialogDescription>
              For petty cash, freight, courier, one-off reimbursements that
              don&apos;t go through the vendor-bill workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="de-date">Date</Label>
                <Input
                  id="de-date"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="de-amount">Amount</Label>
                <Input
                  id="de-amount"
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

            <div className="space-y-2">
              <Label>Expense account</Label>
              <AccountSearchSelect
                value={expenseAccountId}
                onChange={setExpenseAccountId}
                accountType={['expense']}
                placeholder="Pick expense ledger (Freight, Courier…)"
              />
            </div>

            <div className="space-y-2">
              <Label>Paying from</Label>
              <AccountSearchSelect
                value={bankAccountId}
                onChange={setBankAccountId}
                accountType={['asset']}
                placeholder="Pick bank/cash ledger…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="de-mode">Payment mode</Label>
                <Select
                  id="de-mode"
                  value={paymentMode}
                  onChange={(e) =>
                    setPaymentMode(e.target.value as PaymentMode)
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="upi">UPI</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="de-ref">Reference #</Label>
                <Input
                  id="de-ref"
                  placeholder="(cheque #, UTR, txn ID…)"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="de-narration">Narration (optional)</Label>
              <Textarea
                id="de-narration"
                rows={2}
                maxLength={1000}
                placeholder="e.g. Courier — society documents to RWA office"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? 'Recording…' : 'Record expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
