'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useApproveViolation, useRejectViolation, type Violation } from '@/hooks/use-violation-register';
import { friendlyError } from '@/lib/api-error';

export interface TextDecisionProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  /** Reject needs a reason; Approve's comment is optional. */
  required: boolean;
  maxLength: number;
  actionLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: (text: string) => void;
  onClose: () => void;
}

/** A confirm with one text box: Approve (optional comment) or Reject (reason required). */
export function TextDecisionDialog(props: TextDecisionProps): ReactNode {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const missing = props.required && trimmed.length === 0;
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decision-text">{props.label}</Label>
          <Textarea id="decision-text" rows={3} maxLength={props.maxLength} value={text} onChange={(event) => setText(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={props.destructive ? 'destructive' : 'default'}
            disabled={missing || props.busy}
            onClick={() => props.onConfirm(trimmed)}
          >
            {props.actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Decision = { kind: 'approve' | 'reject'; violation: Pick<Violation, 'id' | 'violation_number'> } | null;

/** Approve / Reject on the lists and the record (RULE-S4, S8): the dialogs and what opens them. */
export function useViolationDecisions() {
  const [decision, setDecision] = useState<Decision>(null);
  const approve = useApproveViolation();
  const reject = useRejectViolation();
  const { addToast } = useToast();
  const close = () => setDecision(null);
  const done = (title: string) => () => {
    addToast({ title, variant: 'success' });
    close();
  };
  const failed = (failure: unknown) => addToast({ title: 'Could not record the decision', description: friendlyError(failure), variant: 'destructive' });

  const dialogs = decision && (
    <TextDecisionDialog
      key={`${decision.kind}-${decision.violation.id}`}
      open
      title={decision.kind === 'approve' ? `Approve ${decision.violation.violation_number}` : `Reject ${decision.violation.violation_number}`}
      description={decision.kind === 'approve' ? 'Your approval moves it to the next level, or applies the stage at the last one.' : 'A rejected violation is closed; the raiser sees your reason.'}
      label={decision.kind === 'approve' ? 'Comment (optional)' : 'Reason'}
      required={decision.kind === 'reject'}
      maxLength={500}
      actionLabel={decision.kind === 'approve' ? 'Approve' : 'Reject'}
      destructive={decision.kind === 'reject'}
      busy={approve.isPending || reject.isPending}
      onClose={close}
      onConfirm={(text) =>
        decision.kind === 'approve'
          ? approve.mutate({ id: decision.violation.id, comments: text || undefined }, { onSuccess: done('Approved'), onError: failed })
          : reject.mutate({ id: decision.violation.id, reason: text }, { onSuccess: done('Rejected'), onError: failed })
      }
    />
  );

  return {
    askApprove: (violation: Pick<Violation, 'id' | 'violation_number'>) => setDecision({ kind: 'approve', violation }),
    askReject: (violation: Pick<Violation, 'id' | 'violation_number'>) => setDecision({ kind: 'reject', violation }),
    dialogs,
  };
}
