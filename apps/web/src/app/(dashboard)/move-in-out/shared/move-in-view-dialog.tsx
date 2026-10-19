'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApprovalDetail } from '@/hooks/use-approvals';
import type { MoveIn } from '@/hooks/use-move-ins';
import { indiaDateTime } from '@/lib/india-time';
import { formatDate } from '@/lib/utils';
import { memberTypeLabel } from './move-in-cells';

function Field({ label, value }: { label: string; value: string | null | undefined }): ReactNode {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

/** View on a move-in: who, where, the lease dates and each approval step (MOVE-S6 / S7). */
export function MoveInViewDialog({ moveIn, onClose }: { moveIn: MoveIn | null; onClose: () => void }): ReactNode {
  const detail = useApprovalDetail(moveIn?.approval_id ?? '');
  return (
    <Dialog open={moveIn !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {moveIn && (
          <>
            <DialogHeader>
              <DialogTitle>{moveIn.name}</DialogTitle>
            </DialogHeader>
            <dl className="mt-4 space-y-2">
              <Field label="Phone" value={moveIn.phone} />
              <Field label="Unit" value={[moveIn.block, moveIn.unit_number].filter(Boolean).join('-')} />
              <Field label="Owner/Tenant" value={memberTypeLabel(moveIn)} />
              <Field label="Agreement" value={moveIn.lease_start_date ? `${formatDate(moveIn.lease_start_date)} – ${formatDate(moveIn.lease_end_date)}` : null} />
              <Field label="Requested" value={`${indiaDateTime(moveIn.requested_at)}${moveIn.requested_by_name ? ` by ${moveIn.requested_by_name}` : ''}`} />
            </dl>
            <h3 className="mt-4 text-sm font-semibold">Approvals</h3>
            <ol className="mt-2 space-y-1 text-sm">
              {(detail.data?.steps ?? []).map((step) => (
                <li key={step.id}>
                  Level {step.level} · {step.approver_role?.replace(/_/g, ' ') ?? 'named person'} · {step.decision}
                  {step.decided_by_name ? ` by ${step.decided_by_name}` : ''}
                </li>
              ))}
            </ol>
            <DialogFooter className="mt-4">
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
