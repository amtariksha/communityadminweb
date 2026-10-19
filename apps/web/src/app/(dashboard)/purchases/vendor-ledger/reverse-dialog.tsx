'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useReverseVendorRecord } from '@/hooks/use-vendor-ledger';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';

export interface ReverseTarget {
  /** A bill is cancelled (inverse entry dated today), not reversed. */
  kind: 'payment' | 'debit_note' | 'bill';
  id: string;
  voucher: string;
}

/**
 * Reverse a payment voucher or debit note (EXP-17): asks for a reason (3–500
 * characters) and the reversal date (today by default). The API posts the
 * linked inverse entry and gives the invoices back what they owed.
 */
export function ReverseDialog({ target, onClose }: { target: ReverseTarget | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const reverse = useReverseVendorRecord();
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(todayIST());
  const [error, setError] = useState<string | null>(null);

  function save(): void {
    if (!target) return;
    if (reason.trim().length < 3) {
      setError('Give a reason (3–500 characters)');
      return;
    }
    reverse.mutate(
      { kind: target.kind, id: target.id, reason: reason.trim(), reversal_date: date || undefined },
      {
        onSuccess() {
          addToast({ title: `${target.voucher} ${target.kind === 'bill' ? 'cancelled' : 'reversed'}`, variant: 'success' });
          setReason('');
          onClose();
        },
        onError(err) {
          setError(friendlyError(err));
        },
      },
    );
  }

  return (
    <FormFrame
      mode="dialog"
      open={target !== null}
      title={`${target?.kind === 'bill' ? 'Cancel' : 'Reverse'} ${target?.voucher ?? ''}`}
      saveLabel={target?.kind === 'bill' ? 'Cancel invoice' : 'Reverse'}
      savingLabel="Saving…"
      saving={reverse.isPending}
      onSave={save}
      onClose={onClose}
    >
      <div className="space-y-1">
        <Label htmlFor="reverse-reason">Reason *</Label>
        <Input id="reverse-reason" maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
      </div>
      {target?.kind !== 'bill' && (
        <div className="space-y-1">
          <Label htmlFor="reverse-date">Reversal date</Label>
          <Input id="reverse-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </FormFrame>
  );
}
