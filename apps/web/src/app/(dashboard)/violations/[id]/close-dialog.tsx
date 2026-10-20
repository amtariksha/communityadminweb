'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CloseOutcome, Violation } from '@/hooks/use-violation-register';
import { CLOSE_CHOICES, OUTCOME_LABELS, rupees } from '../_parts/labels';

interface CloseDialogProps {
  violation: Pick<Violation, 'violation_number' | 'status' | 'balance_due'>;
  busy: boolean;
  onConfirm: (outcome: CloseOutcome, note: string) => void;
  onClose: () => void;
}

/** What a Waived or Withdrawn close of a penalty with a balance does to the books (RULE-06). */
export function creditNoteNotice(status: Violation['status'], outcome: CloseOutcome | '', balance: string | null): string | null {
  if (status !== 'penalty' || (outcome !== 'waived' && outcome !== 'withdrawn')) return null;
  if (Number(balance ?? 0) <= 0) return null;
  return `A credit note of ${rupees(balance)} is raised against the penalty invoice for its balance. The invoice is kept.`;
}

/** Close (RULE-S8): Outcome by stage — Warning: Complied · Withdrawn; Penalty: Paid · Waived · Withdrawn — and a note. */
export function CloseDialog({ violation, busy, onConfirm, onClose }: CloseDialogProps): ReactNode {
  const [outcome, setOutcome] = useState<CloseOutcome | ''>('');
  const [note, setNote] = useState('');
  const stage = violation.status === 'penalty' ? 'penalty' : 'warning';
  const notice = creditNoteNotice(violation.status, outcome, violation.balance_due);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Close {violation.violation_number}</DialogTitle>
          <DialogDescription>Choose how the violation ended.</DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Outcome</legend>
          {CLOSE_CHOICES[stage].map((choice) => (
            <label key={choice} className="mr-4 inline-flex items-center gap-2 text-sm">
              <input type="radio" name="close-outcome" checked={outcome === choice} onChange={() => setOutcome(choice)} />
              {OUTCOME_LABELS[choice]}
            </label>
          ))}
        </fieldset>
        <div className="space-y-1">
          <Label htmlFor="close-note">Note</Label>
          <Textarea id="close-note" rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        {notice && (
          <p role="note" className="rounded-md bg-muted p-2 text-sm">
            {notice}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!outcome || busy} onClick={() => outcome && onConfirm(outcome, note.trim())}>
            Close Violation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
