'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useCloneBudgets } from '@/hooks/use-budgets';
import { friendlyError } from '@/lib/api-error';

export interface CloneYears {
  from: { id: string; label: string };
  to: { id: string; label: string };
}

/** Clone Previous Year (EXP-S13): copy one year's budget into the year on screen. */
export function CloneBudgetDialog({ years, onClose }: { years: CloneYears | null; onClose: () => void }): ReactNode {
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const clone = useCloneBudgets();
  const { addToast } = useToast();

  function copy(): void {
    if (!years) return;
    clone.mutate(
      { from_financial_year_id: years.from.id, to_financial_year_id: years.to.id, only_empty: onlyEmpty },
      {
        onSuccess(result) {
          addToast({ title: `Budget copied (${result.changed} heads changed)`, variant: 'success' });
          onClose();
        },
        onError(error) {
          addToast({ title: 'Could not copy the budget', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={years !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Previous Year</DialogTitle>
          <DialogDescription>
            Copy {years?.from.label} budget into {years?.to.label}? Existing amounts will be overwritten.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} />
          Only fill empty heads
        </label>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={clone.isPending} onClick={copy}>
            {clone.isPending ? 'Copying…' : 'Copy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
