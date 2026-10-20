'use client';

import { useState } from 'react';
import { TextDecisionDialog } from '@/components/text-decision-dialog';
import { useToast } from '@/components/ui/toast';
import { useApproveViolation, useRejectViolation, type Violation } from '@/hooks/use-violation-register';
import { friendlyError } from '@/lib/api-error';

type Decision = { kind: 'approve' | 'reject'; violation: Pick<Violation, 'id' | 'violation_number'> } | null;

export { TextDecisionDialog };

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
