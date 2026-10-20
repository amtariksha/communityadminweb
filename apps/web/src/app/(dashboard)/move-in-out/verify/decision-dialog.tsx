'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { incompleteChecklistMessage } from '@/components/move-checklist';
import { useApproveRequest, useRejectRequest } from '@/hooks/use-approvals';
import type { MoveIn } from '@/hooks/use-move-ins';
import { friendlyError } from '@/lib/api-error';

export type Decision = { kind: 'approve' | 'reject'; moveIn: MoveIn };

/** Approve (optional comment) or Reject (reason required) one move-in, through POST /approvals/:id/… */
export function DecisionDialog({ decision, onClose }: { decision: Decision | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const [text, setText] = useState('');
  // MOVE-13 — the API's warning that checklist items are unticked; the
  // approver confirms to go on (decision MOVE-D6).
  const [unticked, setUnticked] = useState<string | null>(null);
  const rejecting = decision?.kind === 'reject';
  const busy = approve.isPending || reject.isPending;

  function close(): void {
    setUnticked(null);
    onClose();
  }
  function done(title: string): void {
    addToast({ title, variant: 'success' });
    setText('');
    close();
  }
  const failed = (error: unknown) => {
    const warning = incompleteChecklistMessage(error);
    if (warning) {
      setUnticked(warning);
      return;
    }
    addToast({ title: 'Could not record the decision', description: friendlyError(error), variant: 'destructive' });
  };

  function submit(): void {
    if (!decision) return;
    const id = decision.moveIn.approval_id;
    if (rejecting) {
      if (!text.trim()) {
        addToast({ title: 'Give a reason for rejecting', variant: 'destructive' });
        return;
      }
      reject.mutate({ id, reason: text.trim() }, { onSuccess: () => done('Move-in rejected'), onError: failed });
      return;
    }
    approve.mutate(
      { id, comments: text.trim() || undefined, confirm_incomplete_checklist: unticked !== null },
      { onSuccess: () => done('Move-in approved'), onError: failed },
    );
  }

  return (
    <Dialog open={decision !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{rejecting ? 'Reject move-in' : 'Approve move-in'}</DialogTitle>
          <DialogDescription>
            {decision ? `${decision.moveIn.name} · ${[decision.moveIn.block, decision.moveIn.unit_number].filter(Boolean).join('-')}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="move-in-decision">{rejecting ? 'Reason' : 'Comment (optional)'}</Label>
          <Textarea id="move-in-decision" rows={3} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} />
          {unticked && !rejecting && (
            <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
              {unticked}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" variant={rejecting ? 'destructive' : 'default'} disabled={busy} onClick={submit}>
            {rejecting ? 'Reject' : unticked ? 'Approve anyway' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
