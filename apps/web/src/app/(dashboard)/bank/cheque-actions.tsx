'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useBounceCheque, useCancelCheque, useClearCheque, type Cheque } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { formatCurrency } from '@/lib/utils';

export type ChequeAction = 'clear' | 'bounce' | 'cancel';

const COPY: Readonly<Record<ChequeAction, { title: string; text: string; button: string; done: string; dateLabel?: string }>> = {
  clear: { title: 'Clear cheque', text: 'Marks the cheque cleared on the date the bank paid it.', button: 'Clear', done: 'Cheque cleared', dateLabel: 'Clearing date' },
  bounce: {
    title: 'Bounce cheque',
    text: 'Marks the cheque bounced and posts the entry that undoes its payment; the original entry stays in the books.',
    button: 'Bounce',
    done: 'Cheque bounced',
    dateLabel: 'Bounce date',
  },
  cancel: {
    title: 'Cancel cheque',
    text: 'Cancels the cheque and posts the entry that undoes its payment; the original entry stays in the books.',
    button: 'Cancel cheque',
    done: 'Cheque cancelled',
  },
};

/** The action a cheque in this status may take: an issued cheque only. */
export function chequeActions(cheque: Pick<Cheque, 'status'>): ChequeAction[] {
  return cheque.status === 'issued' ? ['clear', 'bounce', 'cancel'] : [];
}

function useRunAction() {
  const clear = useClearCheque();
  const bounce = useBounceCheque();
  const cancel = useCancelCheque();
  const run = (action: ChequeAction, cheque: Cheque, date: string, options: { onSuccess: () => void; onError: (error: Error) => void }) => {
    if (action === 'clear') clear.mutate({ id: cheque.id, clearing_date: date }, options);
    else if (action === 'bounce') bounce.mutate({ id: cheque.id, bounce_date: date }, options);
    else cancel.mutate(cheque.id, options);
  };
  return { run, pending: clear.isPending || bounce.isPending || cancel.isPending };
}

interface ChequeActionDialogProps {
  target: { cheque: Cheque; action: ChequeAction } | null;
  onClose: () => void;
}

/** BANK-07: Clear (asks the clearing date), Bounce (asks the bounce date) or Cancel (confirm). */
export function ChequeActionDialog({ target, onClose }: ChequeActionDialogProps): ReactNode {
  const { addToast } = useToast();
  const { run, pending } = useRunAction();
  const [date, setDate] = useState(todayIST());
  const copy = target ? COPY[target.action] : null;

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!target || !copy) return;
    run(target.action, target.cheque, date, {
      onSuccess: () => {
        addToast({ title: `${copy.done} — #${target.cheque.cheque_number}`, variant: 'success' });
        onClose();
      },
      onError: (error) => addToast({ title: `Could not ${copy.button.toLowerCase()}`, description: friendlyError(error), variant: 'destructive' }),
    });
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{copy?.title} #{target?.cheque.cheque_number}</DialogTitle>
            <DialogDescription>
              {target ? `${target.cheque.payee}, ${formatCurrency(target.cheque.amount)}. ` : ''}
              {copy?.text}
            </DialogDescription>
          </DialogHeader>
          {copy?.dateLabel && (
            <div className="space-y-2 py-4">
              <Label htmlFor="cheque-action-date">{copy.dateLabel}</Label>
              <Input id="cheque-action-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Back</Button>
            <Button type="submit" variant={target?.action === 'clear' ? 'default' : 'destructive'} disabled={pending || (copy?.dateLabel !== undefined && !date)}>
              {pending ? 'Saving…' : copy?.button}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
