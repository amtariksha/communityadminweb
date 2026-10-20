'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useRecurringRuns, useRetryRecurringRun, type RecurringInvoice } from '@/hooks/use-recurring-invoices';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

const RUN_LABELS = { started: 'Started', created: 'Raised', failed: 'Failed' } as const;

/** A schedule's runs, newest first, with Raise again on a failed one (finance writers). */
export function RecurringRuns({ schedule, canWrite, onClose }: { schedule: RecurringInvoice; canWrite: boolean; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const runs = useRecurringRuns(schedule.id);
  const retry = useRetryRecurringRun();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Runs</DialogTitle>
          <DialogDescription>{schedule.lines[0]?.description ?? 'Recurring invoice'} · next {formatDate(schedule.next_run_date)}</DialogDescription>
        </DialogHeader>
        {runs.data && runs.data.length === 0 && <p className="text-sm text-muted-foreground">No runs yet.</p>}
        <ul className="divide-y text-sm">
          {(runs.data ?? []).map((run) => (
            <li key={run.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                {formatDate(run.run_date)} · {RUN_LABELS[run.status]}
                {run.invoice_number ? ` · ${run.invoice_number}${run.posted ? ' (posted)' : ' (draft)'}` : ''}
                {run.error_code ? ` · ${run.error_code}` : ''}
              </span>
              {canWrite && !run.invoice_id && run.status !== 'created' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={retry.isPending}
                  onClick={() =>
                    retry.mutate(
                      { id: schedule.id, runId: run.id },
                      { onError: (error) => addToast({ title: 'Not raised', description: friendlyError(error), variant: 'destructive' }) },
                    )
                  }
                >
                  Raise again
                </Button>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
