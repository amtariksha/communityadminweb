'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCancelEventTickets, type EventAttendee } from '@/hooks/use-event-tickets';
import { friendlyError } from '@/lib/api-error';

/**
 * AMEN-43 — cancelling a member's tickets: a reason (printed on the credit
 * note); the unpaid invoice is cancelled with a credit note, a paid one is
 * refunded first when Issue refund is ticked. A cash or cheque receipt on it
 * has to be reversed first (the API says so).
 */
export function CancelTicketsDialog({ eventId, attendee, onClose }: { eventId: string; attendee: EventAttendee | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const cancel = useCancelEventTickets(eventId);
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(false);

  useEffect(() => {
    setReason('');
    setRefund(false);
  }, [attendee]);

  async function confirm(): Promise<void> {
    if (!attendee) return;
    if (reason.trim().length < 3) {
      addToast({ title: 'Give a reason (at least 3 characters)', variant: 'destructive' });
      return;
    }
    try {
      await cancel.mutateAsync({ purchaseId: attendee.id, reason: reason.trim(), refund });
      addToast({ title: 'Tickets cancelled', description: 'The invoice is cancelled with a credit note.', variant: 'success' });
      onClose();
    } catch (error) {
      addToast({ title: 'Could not cancel the tickets', description: friendlyError(error), variant: 'destructive' });
    }
  }

  const paid = attendee !== null && Number(attendee.paid ?? 0) > 0;
  return (
    <Dialog open={attendee !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel tickets</DialogTitle>
          <DialogDescription>{attendee ? `${attendee.name ?? 'Member'} — ${attendee.member_tickets + attendee.guest_tickets} ticket(s)` : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-tickets-reason">Reason</Label>
          <Textarea id="cancel-tickets-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          {paid && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
              Issue refund (paid online)
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep tickets
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={cancel.isPending}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel tickets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
