'use client';

import { type ReactNode } from 'react';
import { RequestChecklistPanel, canTickChecklists } from '@/components/move-checklist';
import { SocietyFields, initialValues } from '@/components/society-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { downloadNoc, type MoveOut } from '@/hooks/use-move-outs';
import { useExitFields } from '@/hooks/use-resident-fields';
import { friendlyError } from '@/lib/api-error';
import { indiaDate, indiaDateTime } from '@/lib/india-time';
import { money, statusLabel, unitLabelOf } from './noc-cells';

function Row({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ExitFields({ exitId }: { exitId: string }): ReactNode {
  const query = useExitFields(exitId);
  const fields = query.data?.fields ?? [];
  if (fields.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Society fields</h3>
      <SocietyFields fields={fields} values={initialValues(fields)} readOnly />
    </section>
  );
}

/** View on a move-out: its details, the move-out checklist (ticks), society fields and the NOC. */
export function NocViewDialog({ row, onClose }: { row: MoveOut | null; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const issued = row?.status === 'noc_sent' || row?.status === 'noc_submitted';
  const save = () =>
    row &&
    downloadNoc(row.exit_id, unitLabelOf(row)).catch((error) =>
      addToast({ title: 'Could not download the NOC', description: friendlyError(error), variant: 'destructive' }),
    );
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        {row && (
          <>
            <DialogHeader>
              <DialogTitle>
                {row.name ?? 'Resident'} — {unitLabelOf(row)}
              </DialogTitle>
            </DialogHeader>
            <dl className="mt-2 space-y-2">
              <Row label="Status" value={statusLabel(row)} />
              <Row label="Exit date" value={indiaDate(row.exit_date)} />
              <Row label="Dues now" value={money(row.dues)} />
              {row.dues_at_noc !== null && <Row label="Dues at NOC" value={money(row.dues_at_noc)} />}
              {row.noc_sent_at && <Row label="NOC issued" value={indiaDateTime(row.noc_sent_at)} />}
              {row.noc_submitted_at && <Row label="Handed over" value={indiaDateTime(row.noc_submitted_at)} />}
            </dl>
            <div className="mt-4 space-y-4">
              <RequestChecklistPanel kind="exit" requestId={row.exit_id} canTick={canTickChecklists()} />
              <ExitFields exitId={row.exit_id} />
            </div>
            <DialogFooter className="mt-4">
              {issued && (
                <Button type="button" variant="outline" onClick={() => void save()}>
                  Download NOC
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
