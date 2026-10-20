'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, friendlyError } from '@/lib/api-error';
import { STAFF_MOVES, STAFF_STATUSES, type StaffStatusRoute } from '@/lib/staff-statuses';

type Slug = StaffStatusRoute['slug'];

const LABELS: Readonly<Record<Slug, string>> = Object.fromEntries(STAFF_STATUSES.map((status) => [status.slug, status.label])) as Record<Slug, string>;

/** The reason a move needs: on and off the blacklist (STAFF-40). */
export const needsReason = (from: Slug, to: Slug): boolean => to === 'blacklisted' || from === 'blacklisted';

export interface StaffMove {
  id: string;
  name: string;
  from: Slug;
  /** A fixed target (Reactivate, Remove from blacklist); otherwise the admin picks. */
  to?: Slug;
}

interface MoveStaffDialogProps {
  move: StaffMove | null;
  onClose: () => void;
  change: (input: { id: string; status: Slug; reason?: string }) => Promise<unknown>;
}

function moveError(error: unknown): string {
  // The admin web ships before the API: an older server has no status route.
  if (error instanceof ApiError && error.status === 404) return 'Changing the status here is not available yet.';
  return friendlyError(error);
}

/** Move to… Temp, Retired or Blacklisted (asks for a reason), Reactivate, Remove from blacklist. */
export function MoveStaffDialog({ move, onClose, change }: MoveStaffDialogProps): ReactNode {
  return (
    <Dialog open={move !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{move && <MoveForm move={move} onClose={onClose} change={change} />}</DialogContent>
    </Dialog>
  );
}

function MoveForm({ move, onClose, change }: Omit<MoveStaffDialogProps, 'move'> & { move: StaffMove }): ReactNode {
  const targets = move.to ? [move.to] : STAFF_MOVES[move.from];
  const [to, setTo] = useState<Slug>(targets[0]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    if (needsReason(move.from, to) && reason.trim().length < 3) {
      setError('Give a reason (at least 3 characters).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await change({ id: move.id, status: to, reason: reason.trim() || undefined });
      onClose();
    } catch (failure) {
      setError(moveError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{move.to ? `${LABELS[move.to]}: ${move.name}` : `Move ${move.name} to…`}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 space-y-3">
        {!move.to && (
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="New status">
            {targets.map((target) => (
              <label key={target} className="flex items-center gap-1 text-sm">
                <input type="radio" name="staff-status" checked={to === target} onChange={() => setTo(target)} />
                {LABELS[target]}
              </label>
            ))}
          </div>
        )}
        <Label htmlFor="staff-status-reason">Reason{needsReason(move.from, to) ? '' : ' (optional)'}</Label>
        <Textarea id="staff-status-reason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
