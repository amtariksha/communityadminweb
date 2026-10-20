'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { incompleteChecklistMessage } from '@/components/move-checklist';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCancelMoveOut, useCompleteMoveOut, useIssueNoc, useMarkSubmitted, type MoveOut } from '@/hooks/use-move-outs';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { money, unitLabelOf } from './noc-cells';

export type NocStep = { kind: 'issue' | 'submit' | 'complete' | 'cancel'; row: MoveOut };

const TITLES: Record<NocStep['kind'], string> = {
  issue: 'Issue NOC',
  submit: 'Mark Submitted',
  complete: 'Complete Move-Out',
  cancel: 'Cancel Move-Out',
};

const EXPLAIN: Record<NocStep['kind'], string> = {
  issue: 'The no-objection certificate is issued and the resident is told.',
  submit: 'The resident has handed over (keys, documents …).',
  complete: 'The member and their family stop being current, and the lease is closed.',
  cancel: 'The move-out is closed without moving anyone out.',
};

/** Decision MOVE-D7: the community admin may issue an NOC with dues open, with a reason. */
const mayOverrideDues = (): boolean => ['community_admin', 'super_admin'].includes(currentRole() ?? '');

/** The open dues the API refused the NOC for (409 dues_outstanding), or null. */
export function duesRefusal(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'dues_outstanding') return null;
  const details = error.envelope.details as { dues?: unknown } | undefined;
  return typeof details?.dues === 'string' ? details.dues : '0.00';
}

function useStepRunner(step: NocStep | null, onClose: () => void) {
  const { addToast } = useToast();
  const issue = useIssueNoc();
  const submit = useMarkSubmitted();
  const complete = useCompleteMoveOut();
  const cancel = useCancelMoveOut();
  const [text, setText] = useState('');
  const [dues, setDues] = useState<string | null>(null);
  const [unticked, setUnticked] = useState<string | null>(null);

  useEffect(() => {
    setText('');
    setDues(null);
    setUnticked(null);
  }, [step]);

  const done = () => {
    addToast({ title: `${TITLES[step?.kind ?? 'issue']} done`, variant: 'success' });
    onClose();
  };
  const failed = (error: unknown) => {
    const open = duesRefusal(error);
    const warning = incompleteChecklistMessage(error);
    if (open) return setDues(open);
    if (warning) return setUnticked(warning);
    addToast({ title: `Could not ${TITLES[step?.kind ?? 'issue'].toLowerCase()}`, description: friendlyError(error), variant: 'destructive' });
  };
  const run = (): void => {
    if (!step) return;
    const exitId = step.row.exit_id;
    const handlers = { onSuccess: done, onError: failed };
    if (step.kind === 'issue') issue.mutate({ exitId, override_reason: dues ? text.trim() : undefined }, handlers);
    else if (step.kind === 'submit') submit.mutate({ exitId, confirm: unticked !== null }, handlers);
    else if (step.kind === 'complete') complete.mutate(exitId, handlers);
    else cancel.mutate({ exitId, reason: text.trim() || undefined }, handlers);
  };
  const busy = issue.isPending || submit.isPending || complete.isPending || cancel.isPending;
  return { text, setText, dues, unticked, run, busy };
}

/** Issue NOC (with the dues gate), Mark Submitted, Complete Move-Out and Cancel on one move-out. */
export function NocStepDialog({ step, onClose }: { step: NocStep | null; onClose: () => void }): ReactNode {
  const runner = useStepRunner(step, onClose);
  const kind = step?.kind ?? 'issue';
  const needsReason = kind === 'issue' && runner.dues !== null;
  const blocked = needsReason && (!mayOverrideDues() || runner.text.trim().length < 10);
  return (
    <Dialog open={step !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[kind]}</DialogTitle>
          <DialogDescription>{step ? `${step.row.name ?? 'Resident'} · ${unitLabelOf(step.row)}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <p>{EXPLAIN[kind]}</p>
          {needsReason && (
            <p role="alert" className="text-destructive">
              The unit has {money(runner.dues ?? '0')} outstanding.{' '}
              {mayOverrideDues() ? 'Give a reason (at least 10 characters) to issue it anyway.' : 'Only a community admin can issue it with dues open.'}
            </p>
          )}
          {runner.unticked && <p role="alert" className="text-amber-700 dark:text-amber-400">{runner.unticked}</p>}
          {(kind === 'cancel' || (needsReason && mayOverrideDues())) && (
            <div className="space-y-1">
              <Label htmlFor="noc-step-text">{kind === 'cancel' ? 'Reason (optional)' : 'Reason for issuing with dues'}</Label>
              <Textarea id="noc-step-text" rows={2} maxLength={500} value={runner.text} onChange={(e) => runner.setText(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant={kind === 'cancel' ? 'destructive' : 'default'} disabled={runner.busy || blocked} onClick={runner.run}>
            {runner.unticked ? 'Mark anyway' : needsReason ? 'Issue with dues' : TITLES[kind]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
