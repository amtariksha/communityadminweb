'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Visitor } from '@/hooks/use-gate';
import { indiaDateTime } from '../register-kit';
import { VISITOR_STATUS_LABELS } from './visitor-rows';

function Field({ label, value }: { label: string; value: string | null | undefined }): ReactNode {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

/** View on an Incident Investigator visitor row: what the gate recorded (GATE-S4). */
export function VisitorDetailDialog({ visitor, onClose }: { visitor: Visitor | null; onClose: () => void }): ReactNode {
  return (
    <Dialog open={visitor !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {visitor && (
          <>
            <DialogHeader>
              <DialogTitle>{visitor.visitor_name}</DialogTitle>
            </DialogHeader>
            <dl className="mt-4 space-y-2">
              <Field label="Phone" value={visitor.visitor_phone} />
              <Field label="Unit" value={[visitor.block, visitor.unit_number].filter(Boolean).join('-')} />
              <Field label="Entry Reason" value={visitor.purpose} />
              <Field label="Vehicle No" value={visitor.vehicle_number} />
              <Field label="Gate" value={visitor.gate_name} />
              <Field label="Pre-approved" value={visitor.pre_approved ? 'Yes' : 'No'} />
              <Field label="Expected At" value={visitor.expected_at ? indiaDateTime(visitor.expected_at) : null} />
              <Field label="In Time" value={visitor.checked_in_at ? indiaDateTime(visitor.checked_in_at) : null} />
              <Field label="Out Time" value={visitor.checked_out_at ? indiaDateTime(visitor.checked_out_at) : null} />
              <Field label="Status" value={VISITOR_STATUS_LABELS[visitor.status] ?? visitor.status} />
              <Field label="Created By" value={visitor.created_by_name} />
              <Field label="Created At" value={indiaDateTime(visitor.created_at)} />
            </dl>
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
