'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useCloseViolation, useMoveToPenalty, useViolation, type ViolationDetail } from '@/hooks/use-violation-register';
import { ApiError, friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { useViolationDecisions } from '../_parts/decision-dialogs';
import { ViolationsPage } from '../_parts/violations-page';
import { CloseDialog } from './close-dialog';
import { ViolationFacts, ViolationHistory, ViolationSteps } from './record-sections';

// Move to Penalty and Close are the community admin's (RULE-04).
const STAGE_ROLES = new Set(['super_admin', 'community_admin']);

function RecordActions({ violation }: { violation: ViolationDetail }): ReactNode {
  const decisions = useViolationDecisions();
  const move = useMoveToPenalty();
  const close = useCloseViolation();
  const { addToast } = useToast();
  const [closing, setClosing] = useState(false);
  const mayStage = STAGE_ROLES.has(currentRole() ?? '');
  const failed = (failure: unknown) => addToast({ title: 'Could not update the violation', description: friendlyError(failure), variant: 'destructive' });
  const open = violation.status === 'warning' || violation.status === 'penalty';

  return (
    <div className="flex flex-wrap gap-2">
      {violation.status === 'awaiting_approval' && violation.can_act && (
        <>
          <Button type="button" onClick={() => decisions.askApprove(violation)}>Approve</Button>
          <Button type="button" variant="destructive" onClick={() => decisions.askReject(violation)}>Reject</Button>
        </>
      )}
      {mayStage && violation.status === 'warning' && (
        <Button
          type="button"
          disabled={move.isPending}
          onClick={() => window.confirm(`Move ${violation.violation_number} to Penalty?`) && move.mutate(violation.id, { onError: failed })}
        >
          Move to Penalty
        </Button>
      )}
      {mayStage && open && (
        <Button type="button" variant="outline" onClick={() => setClosing(true)}>
          Close Violation
        </Button>
      )}
      <ShowLogsButton recordTypes={['violation']} recordId={violation.id} />
      {decisions.dialogs}
      {closing && (
        <CloseDialog
          violation={violation}
          busy={close.isPending}
          onClose={() => setClosing(false)}
          onConfirm={(outcome, note) =>
            close.mutate({ id: violation.id, outcome, note: note || undefined }, { onSuccess: () => setClosing(false), onError: failed })
          }
        />
      )}
    </div>
  );
}

/** The list a violation is on, where Close returns. */
function listOf(violation: ViolationDetail): string {
  if (violation.status === 'closed' || violation.status === 'rejected') return '/violations/closed';
  if (violation.status === 'awaiting_approval') return '/violations/open/awaiting-approval';
  return `/violations/open/${violation.status}`;
}

/** The violation record (RULE-S8): facts, approval steps, history and the actions its status allows. */
export function ViolationRecord({ id }: { id: string }): ReactNode {
  const query = useViolation(id);
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.error) {
    const missing = query.error instanceof ApiError && query.error.code === 'violation_not_found';
    const text = !missing && isNotDeployed(query.error) ? 'Rules & Violations is not available yet.' : 'Violation not found';
    return <p className="text-sm text-muted-foreground">{text}</p>;
  }
  const violation = query.data;
  if (!violation) return null;
  return (
    <ViolationsPage title={violation.violation_number}>
      <Card>
        <CardContent className="space-y-6 pt-6">
          <RecordActions violation={violation} />
          <ViolationFacts violation={violation} />
          <section className="space-y-2">
            <h3 className="text-base font-semibold">Approvals</h3>
            <ViolationSteps violation={violation} />
          </section>
          <section className="space-y-2">
            <h3 className="text-base font-semibold">History</h3>
            <ViolationHistory violation={violation} />
          </section>
          <Link href={listOf(violation)} className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
            Close
          </Link>
        </CardContent>
      </Card>
    </ViolationsPage>
  );
}
