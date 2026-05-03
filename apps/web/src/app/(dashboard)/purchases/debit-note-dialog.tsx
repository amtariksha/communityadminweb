'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
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
import { AccountSearchSelect } from '@/components/ui/account-search-select';
import { useVendors } from '@/hooks';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Debit Note dialog (Phase C.4)
// ---------------------------------------------------------------------------
//
// For vendor returns, post-billing discounts, refunds expected from
// vendors. Reduces what we owe the vendor (DR vendor's Sundry
// Creditors, CR Purchase Returns).
//
// Backend: POST /purchases/debit-notes (purchase.controller).
// Tally round-trip: voucher_type = "Debit Note".
// ---------------------------------------------------------------------------

interface DebitNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebitNoteDialog({
  open,
  onOpenChange,
}: DebitNoteDialogProps): ReactNode {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [returnAccountId, setReturnAccountId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');

  const vendorsQuery = useVendors({
    search: vendorSearch || undefined,
    is_active: true,
    limit: 25,
  });
  const vendors = vendorsQuery.data?.data ?? [];
  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === vendorId),
    [vendors, vendorId],
  );

  useEffect(() => {
    if (!open) return;
    setVendorSearch('');
    setVendorId('');
    setDate(new Date().toISOString().slice(0, 10));
    setAmount('');
    setReturnAccountId('');
    setReferenceNumber('');
    setNarration('');
  }, [open]);

  const submit = useMutation({
    mutationFn: async (payload: {
      vendor_id: string;
      debit_note_date: string;
      amount: number;
      return_account_id?: string;
      reference_number?: string;
      narration?: string;
    }) => {
      return api.post<{
        data: {
          journal_entry_id: string;
          voucher_number: string;
          amount: number;
          vendor_name: string;
        };
      }>('/purchases/debit-notes', payload);
    },
    onSuccess: (response) => {
      addToast({
        title: `Debit note ${response.data.voucher_number} posted`,
        description: `Reduced ${response.data.vendor_name} payable by ₹${response.data.amount.toFixed(2)}`,
        variant: 'success',
      });
      // Refresh the purchases (vendor bills) and ledger views.
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-accounts'] });
      onOpenChange(false);
    },
    onError: (err) => {
      addToast({
        title: 'Failed to post debit note',
        description: friendlyError(err),
        variant: 'destructive',
      });
    },
  });

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!vendorId) {
      addToast({ title: 'Pick a vendor', variant: 'destructive' });
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast({ title: 'Amount must be > 0', variant: 'destructive' });
      return;
    }

    submit.mutate({
      vendor_id: vendorId,
      debit_note_date: date,
      amount: amt,
      return_account_id: returnAccountId || undefined,
      reference_number: referenceNumber || undefined,
      narration: narration || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Issue debit note</DialogTitle>
            <DialogDescription>
              For vendor returns, post-billing discounts, or refund credits.
              Reduces what we owe this vendor and credits the chosen return
              ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Vendor picker — same search-as-you-type pattern as the
                custom invoice dialog. */}
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input
                placeholder="Search vendor by name…"
                value={
                  selectedVendor && !vendorSearch
                    ? selectedVendor.name
                    : vendorSearch
                }
                onChange={(e) => {
                  setVendorSearch(e.target.value);
                  setVendorId('');
                }}
              />
              {vendorSearch && !selectedVendor && vendors.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-md border bg-card">
                  {vendors.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setVendorId(v.id);
                        setVendorSearch('');
                      }}
                    >
                      <div className="font-medium">{v.name}</div>
                      {v.gstin && (
                        <div className="text-xs text-muted-foreground">
                          {v.gstin}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dn-date">Date</Label>
                <Input
                  id="dn-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dn-amount">Amount</Label>
                <Input
                  id="dn-amount"
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
              <Label>
                Return / discount-received ledger{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (defaults to first income ledger named &quot;Purchase Returns&quot;)
                </span>
              </Label>
              <AccountSearchSelect
                value={returnAccountId}
                onChange={setReturnAccountId}
                accountType={['income']}
                placeholder="Pick income ledger (e.g. Purchase Returns)…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dn-ref">Reference # (optional)</Label>
              <Input
                id="dn-ref"
                placeholder="(vendor's credit memo #, return docket #…)"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dn-narration">Reason / narration</Label>
              <Textarea
                id="dn-narration"
                rows={2}
                maxLength={1000}
                placeholder="e.g. Returned 5 cartons of stationery, faulty stock"
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
            <Button
              type="submit"
              disabled={!vendorId || submit.isPending}
            >
              {submit.isPending ? 'Posting…' : 'Post debit note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
