'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useWaiveInterest } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { formatCurrency } from '@/lib/utils';

// Mirrors the API's @Roles on POST /invoices/:id/waive-interest. UI shaping
// only — the server enforces it.
const WAIVE_ROLES = new Set(['super_admin', 'community_admin', 'accountant']);

interface WaiveInterestButtonProps {
  invoiceId: string;
  lpiAmount: number;
}

/**
 * INC-08 — "Interest ₹x · Waive interest" on an invoice that carries late
 * payment interest. Waiving takes the unpaid interest off the balance with a
 * credit note and a journal entry; it is not undone, so it asks first.
 */
export function WaiveInterestButton({ invoiceId, lpiAmount }: WaiveInterestButtonProps): ReactNode {
  const { addToast } = useToast();
  const waiveInterest = useWaiveInterest();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setRole(currentRole());
  }, []);

  if (!(lpiAmount > 0)) return null;
  const canWaive = role !== null && WAIVE_ROLES.has(role);
  const amount = formatCurrency(lpiAmount);

  function handleWaive(): void {
    waiveInterest.mutate(invoiceId, {
      onSuccess(response) {
        setOpen(false);
        addToast({
          title: 'Interest waived',
          description: `${formatCurrency(response.data.amount_waived)} taken off; credit note ${response.data.credit_note_number}.`,
          variant: 'success',
        });
      },
      onError(error) {
        addToast({
          title: 'Could not waive the interest',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
      <span>
        Interest <span className="font-medium">{amount}</span>
      </span>
      {canWaive && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button type="button" variant="outline" size="sm">
              Waive interest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Waive interest</DialogTitle>
              <DialogDescription>
                The unpaid interest on this invoice is taken off its balance, with a credit note.
                This cannot be undone, and the days it covered are not charged again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleWaive} disabled={waiveInterest.isPending}>
                {waiveInterest.isPending ? 'Waiving...' : `Waive ${amount}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
