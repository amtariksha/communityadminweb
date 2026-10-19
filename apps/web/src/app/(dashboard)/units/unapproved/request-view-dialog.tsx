'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useApprovalDetail, useApproveRequest, useRejectRequest } from '@/hooks';
import type { ApprovalDetail, ApprovalStep } from '@/hooks/use-approvals';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

const REASON_MAX = 500;

const DECISION_LABELS: Record<string, string> = {
  pending: 'Waiting',
  approved: 'Approved',
  rejected: 'Declined',
  not_required: 'Not needed',
};

function stepWho(step: ApprovalStep): string {
  if (step.approver_type === 'user') return 'Unit owner';
  return (step.approver_role ?? 'Society').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function StepTimeline({ steps }: { steps: readonly ApprovalStep[] }): ReactNode {
  if (steps.length === 0) return <p className="text-sm text-muted-foreground">No approval steps recorded yet.</p>;
  return (
    <ol aria-label="Approval steps" className="space-y-2">
      {steps.map((step) => (
        <li key={step.id} className="rounded-md border p-2 text-sm">
          <span className="font-medium">
            Level {step.level} — {stepWho(step)}
          </span>
          {': '}
          {DECISION_LABELS[step.decision] ?? step.decision}
          {step.decided_by_name && ` by ${step.decided_by_name}`}
          {step.decided_at && ` on ${formatDate(step.decided_at)}`}
          {step.comments && <p className="text-xs italic text-muted-foreground">“{step.comments}”</p>}
        </li>
      ))}
    </ol>
  );
}

function RequestFacts({ detail }: { detail: ApprovalDetail }): ReactNode {
  const meta = detail.request.metadata as { name?: string; phone?: string };
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Request</dt>
      <dd>{detail.request.entity_summary ?? '—'}</dd>
      <dt className="text-muted-foreground">Name</dt>
      <dd>{meta.name ?? detail.request.requester_name ?? '—'}</dd>
      <dt className="text-muted-foreground">Phone/Mobile</dt>
      <dd>{meta.phone ?? detail.request.requester_phone ?? '—'}</dd>
      <dt className="text-muted-foreground">Joined On</dt>
      <dd>{formatDate(detail.request.created_at)}</dd>
    </dl>
  );
}

interface RequestViewDialogProps {
  approvalId: string;
  onClose: () => void;
}

/** View (UNIT-S1): the request, its step timeline, Approve and Decline with a reason. */
export function RequestViewDialog({ approvalId, onClose }: RequestViewDialogProps): ReactNode {
  const { addToast } = useToast();
  const detailQuery = useApprovalDetail(approvalId);
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const busy = approve.isPending || reject.isPending;

  async function decide(kind: 'approve' | 'decline'): Promise<void> {
    try {
      if (kind === 'approve') await approve.mutateAsync({ id: approvalId });
      else await reject.mutateAsync({ id: approvalId, reason: trimmed });
      addToast({ title: kind === 'approve' ? 'Request approved' : 'Request declined', variant: 'success' });
      onClose();
    } catch (error) {
      addToast({ title: kind === 'approve' ? 'Could not approve' : 'Could not decline', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <Dialog open={approvalId !== ''} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Self-signup request</DialogTitle>
          <DialogDescription>Who asked, and who has acted on it so far.</DialogDescription>
        </DialogHeader>
        {detailQuery.isLoading || !detailQuery.data ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-4">
            <RequestFacts detail={detailQuery.data} />
            <StepTimeline steps={detailQuery.data.steps} />
            <div className="space-y-1">
              <Label htmlFor="decline-reason">Decline reason</Label>
              <Textarea
                id="decline-reason"
                maxLength={REASON_MAX}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why the request is declined (the requester is told)"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="destructive" disabled={busy || trimmed.length === 0} onClick={() => void decide('decline')}>
            Decline
          </Button>
          <Button type="button" disabled={busy || !detailQuery.data} onClick={() => void decide('approve')}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
