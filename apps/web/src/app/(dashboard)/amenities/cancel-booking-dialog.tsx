'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useCancelBooking } from '@/hooks';
import type { AmenityBooking, CancelBookingResult } from '@/hooks';

/**
 * AMEN-02 — an admin cancels with a reason (3–500 characters, printed on
 * the credit note). The booking's unpaid invoice is cancelled with a credit
 * note; a paid one is refunded first when "Issue refund" is ticked, and
 * otherwise stands.
 */

const MIN_REASON = 3;
const MAX_REASON = 500;

interface CancelBookingDialogProps {
  booking: AmenityBooking | null;
  onClose: () => void;
}

export function cancelOutcomeToast(result: CancelBookingResult): {
  title: string;
  description?: string;
  variant: 'success' | 'destructive';
} {
  if (result.refunded_payment_order_ids.length > 0) {
    return {
      title: 'Booking cancelled · refund issued',
      description: `Refund started for ${result.refunded_payment_order_ids.length} payment(s); the invoice is cancelled with a credit note.`,
      variant: 'success',
    };
  }
  if (result.refund_failed) {
    return {
      title: 'Booking cancelled · refund failed',
      description: 'The Razorpay refund did not complete. Retry from the Payments page.',
      variant: 'destructive',
    };
  }
  if (result.invoice_cancelled || result.refund_skipped_reason === 'not_paid') {
    return {
      title: 'Booking cancelled',
      description: 'The unpaid invoice is cancelled with a credit note.',
      variant: 'success',
    };
  }
  return { title: 'Booking cancelled', variant: 'success' };
}

export function CancelBookingDialog({ booking, onClose }: CancelBookingDialogProps): ReactNode {
  const { addToast } = useToast();
  const cancelMutation = useCancelBooking();
  const [reason, setReason] = useState('');
  const [withRefund, setWithRefund] = useState(true);

  useEffect(() => {
    setReason('');
    setWithRefund(Boolean(booking?.invoice_id));
  }, [booking]);

  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= MIN_REASON && trimmed.length <= MAX_REASON;

  function handleCancel(): void {
    if (!booking || !reasonValid) return;
    cancelMutation.mutate(
      { id: booking.id, reason: trimmed, refund: withRefund && Boolean(booking.invoice_id) },
      {
        onSuccess(response) {
          addToast(cancelOutcomeToast(response.data));
          onClose();
        },
        onError(error) {
          addToast({
            title: 'Failed to cancel booking',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Dialog open={booking !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this booking for {booking?.amenity_name}?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this booking cancelled?"
              maxLength={MAX_REASON}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Required. It is printed on the credit note that cancels the invoice.
            </p>
          </div>
          {booking?.invoice_id ? (
            <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-900/20">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={withRefund}
                onChange={(e) => setWithRefund(e.target.checked)}
              />
              <span className="space-y-1">
                <span className="block font-medium text-amber-900 dark:text-amber-100">
                  Issue refund to resident
                </span>
                <span className="block text-xs text-amber-800 dark:text-amber-200">
                  If invoice {booking.invoice_number ?? ''} was paid online, the payment is refunded via
                  Razorpay and the invoice cancelled with a credit note. Leave unticked to keep a paid
                  charge. An unpaid invoice is always cancelled.
                </span>
              </span>
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep Booking</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending || !reasonValid}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
