'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { FinancialYear } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { friendlyError } from '@/lib/api-error';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCloseFinancialYear, useCreateFinancialYear, useFreezeYear } from '@/hooks';
import type { CloseFinancialYearResult } from '@/hooks/use-ledger';

export const YEAR_END_TEXT =
  "Posts an entry moving this year's surplus or deficit to Retained Earnings (Current) and freezes the year. " +
  'Nothing can be posted into it unless it is unfrozen.';
export const FREEZE_ONLY_TEXT =
  'Freezing does not pass the retained-earnings entry — use Perform Year End for that.';

/** "Surplus ₹7,000 moved to Retained Earnings (Current) in entry #12." */
export function yearEndSummary(result: CloseFinancialYearResult): string {
  if (!result.closing_entry_id) return 'Nothing was left to move to Retained Earnings (Current).';
  const amount = `${result.surplus < 0 ? 'Deficit' : 'Surplus'} ${formatCurrency(Math.abs(result.surplus))}`;
  const entry = result.entry_number ? ` in entry #${result.entry_number}` : '';
  return `${amount} moved to Retained Earnings (Current)${entry}.`;
}

export function CreateFinancialYearDialog(): ReactNode {
  const { addToast } = useToast();
  const createFY = useCreateFinancialYear();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    createFY.mutate(
      { label, start_date: startDate, end_date: endDate },
      {
        onSuccess() {
          setOpen(false);
          setLabel('');
          setStartDate('');
          setEndDate('');
          addToast({ title: 'Financial year created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create financial year', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Financial Year
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Financial Year</DialogTitle>
            <DialogDescription>Define a new financial year period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fy-label">Label</Label>
              <Input id="fy-label" required placeholder="e.g., FY 2026-27" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fy-start">Start Date</Label>
                <Input id="fy-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fy-end">End Date</Label>
                <Input id="fy-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={createFY.isPending}>
              {createFY.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TargetDialogProps {
  year: FinancialYear | null;
  onClose: () => void;
}

/** QA #230: a styled confirm that shows the end date; GL-06 adds what freezing does not do. */
export function FreezeYearDialog({ year, onClose }: TargetDialogProps): ReactNode {
  const { addToast } = useToast();
  const freezeYear = useFreezeYear();

  function handleConfirm(): void {
    if (!year) return;
    freezeYear.mutate(year.id, {
      onSuccess() {
        addToast({ title: `${year.label} frozen`, variant: 'success' });
        onClose();
      },
      onError(error: Error) {
        addToast({ title: 'Failed to freeze year', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={year !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Freeze {year?.label}?</DialogTitle>
          <DialogDescription>
            Once frozen, no journal entries can be posted before{' '}
            <span className="font-medium">{year ? formatDate(year.end_date) : ''}</span>. {FREEZE_ONLY_TEXT}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={freezeYear.isPending}>Cancel</Button>
          <Button variant="destructive" disabled={freezeYear.isPending} onClick={handleConfirm}>
            {freezeYear.isPending ? 'Freezing…' : 'Freeze Year'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function YearEndDialog({ year, onClose }: TargetDialogProps): ReactNode {
  const { addToast } = useToast();
  const closeYear = useCloseFinancialYear();

  function handleConfirm(): void {
    if (!year) return;
    closeYear.mutate(
      { id: year.id, freeze: true },
      {
        onSuccess(response) {
          addToast({ title: `${year.label} closed and frozen`, description: yearEndSummary(response.data), variant: 'success' });
          onClose();
        },
        onError(error: Error) {
          addToast({ title: 'Year end failed', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={year !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Perform Year End for {year?.label}?</DialogTitle>
          <DialogDescription>{YEAR_END_TEXT}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={closeYear.isPending}>Cancel</Button>
          <Button variant="destructive" disabled={closeYear.isPending} onClick={handleConfirm}>
            {closeYear.isPending ? 'Closing…' : 'Perform Year End'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
