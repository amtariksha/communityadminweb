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
import { receiptKeys } from '@/hooks/use-receipts';

// ---------------------------------------------------------------------------
// Direct-income receipt dialog
// ---------------------------------------------------------------------------
//
// For cash that doesn't tie to a unit / customer invoice — bank FD
// interest, donation, scrap sale, ATM rental, etc. The operator was
// previously forced to record these as raw Journal Entries, losing
// payment-mode tracking + the receipt number / PDF. Phase B
// (migration 070) added receipts.income_account_id so this flow can
// land in the same `receipts` table as unit-receipt entries.
//
// Backend: POST /receipts/direct-income (receipt.controller).
// ---------------------------------------------------------------------------

interface DirectIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentMode = 'cash' | 'cheque' | 'bank_transfer' | 'upi';

export function DirectIncomeDialog({
  open,
  onOpenChange,
}: DirectIncomeDialogProps): ReactNode {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [receiptDate, setReceiptDate] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeAccountId, setIncomeAccountId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [bankAccountId, setBankAccountId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');

  // Reset on open so a stale value can't leak across openings.
  useEffect(() => {
    if (!open) return;
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setIncomeAccountId('');
    setPaymentMode('bank_transfer');
    setBankAccountId('');
    setReferenceNumber('');
    setNarration('');
  }, [open]);

  const submit = useMutation({
    mutationFn: async (payload: {
      receipt_date: string;
      amount: number;
      income_account_id: string;
      payment_mode: PaymentMode;
      bank_account_id?: string;
      reference_number?: string;
      narration?: string;
    }) => {
      return api.post<{ data: { id: string; receipt_number: string } }>(
        '/receipts/direct-income',
        payload,
      );
    },
    onSuccess: (response) => {
      addToast({
        title: `Receipt ${response.data.receipt_number} recorded`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      onOpenChange(false);
    },
    onError: (err) => {
      addToast({
        title: 'Failed to record direct income',
        description: friendlyError(err),
        variant: 'destructive',
      });
    },
  });

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!incomeAccountId) {
      addToast({ title: 'Pick an income account', variant: 'destructive' });
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast({ title: 'Amount must be > 0', variant: 'destructive' });
      return;
    }
    // Cash mode skips the bank-account picker — the server resolves
    // the tenant's Cash-in-Hand ledger automatically. For everything
    // else, the operator must pick the bank/cash ledger receiving the
    // funds.
    if (paymentMode !== 'cash' && !bankAccountId) {
      addToast({
        title: 'Pick the bank/cash ledger receiving the funds',
        variant: 'destructive',
      });
      return;
    }

    submit.mutate({
      receipt_date: receiptDate,
      amount: amt,
      income_account_id: incomeAccountId,
      payment_mode: paymentMode,
      bank_account_id: bankAccountId || undefined,
      reference_number: referenceNumber || undefined,
      narration: narration || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record direct income</DialogTitle>
            <DialogDescription>
              For cash that doesn&apos;t tie to a unit or customer invoice —
              FD interest, donation, scrap sale, etc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="di-date">Date</Label>
                <Input
                  id="di-date"
                  type="date"
                  required
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="di-amount">Amount</Label>
                <Input
                  id="di-amount"
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
              <Label>Income account</Label>
              <AccountSearchSelect
                value={incomeAccountId}
                onChange={setIncomeAccountId}
                accountType={['income']}
                placeholder="Pick income ledger (FD interest, donation…)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="di-mode">Payment mode</Label>
                <Select
                  id="di-mode"
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
                <Label htmlFor="di-ref">Reference #</Label>
                <Input
                  id="di-ref"
                  placeholder="(cheque #, UTR, txn ID…)"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>

            {paymentMode !== 'cash' && (
              <div className="space-y-2">
                <Label>Receiving bank / cash ledger</Label>
                <AccountSearchSelect
                  value={bankAccountId}
                  onChange={setBankAccountId}
                  accountType={['asset']}
                  placeholder="Pick bank ledger…"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="di-narration">Narration (optional)</Label>
              <Textarea
                id="di-narration"
                rows={2}
                maxLength={1000}
                placeholder="e.g. FD interest credited Q1 2026"
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
              {submit.isPending ? 'Recording…' : 'Record receipt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
