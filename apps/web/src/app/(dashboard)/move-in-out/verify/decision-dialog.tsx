'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
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
  const rejecting = decision?.kind === 'reject';
  const busy = approve.isPending || reject.isPending;

  function done(title: string): void {
    addToast({ title, variant: 'success' });
    setText('');
    onClose();
  }
  const failed = (error: unknown) => addToast({ title: 'Could not record the decision', description: friendlyError(error), variant: 'destructive' });

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
    approve.mutate({ id, comments: text.trim() || undefined }, { onSuccess: () => done('Move-in approved'), onError: failed });
  }

  return (
    <Dialog open={decision !== null} onOpenChange={(open) => !open && onClose()}>
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
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant={rejecting ? 'destructive' : 'default'} disabled={busy} onClick={submit}>
            {rejecting ? 'Reject' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
