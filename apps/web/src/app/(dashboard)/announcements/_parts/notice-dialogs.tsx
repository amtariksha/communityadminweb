'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { todayIST } from '@/lib/date';

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
}

function Shell(props: ConfirmProps & { title: string; description: string; children?: ReactNode; action: ReactNode }): ReactNode {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        {props.children}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          {props.action}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Delete on an Active notice (ANN-S3): it moves to Retired; nothing is destroyed. */
export function RetireDialog(props: ConfirmProps & { onConfirm: (reason?: string) => void }): ReactNode {
  const [reason, setReason] = useState('');
  return (
    <Shell
      {...props}
      title="Delete Announcement"
      description="This moves the notice to Retired. Residents stop seeing it; the record is kept."
      action={
        <Button type="button" variant="destructive" disabled={props.busy} onClick={() => props.onConfirm(reason.trim() || undefined)}>
          {props.busy ? 'Retiring…' : 'Delete'}
        </Button>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="retire-reason">Reason (optional)</Label>
        <Textarea id="retire-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Shell>
  );
}

/** Delete on a draft: nobody has seen it, so it is really deleted. */
export function DeleteDraftDialog(props: ConfirmProps & { onConfirm: () => void }): ReactNode {
  return (
    <Shell
      {...props}
      title="Delete Draft"
      description="The draft has not been posted. Deleting it cannot be undone."
      action={
        <Button type="button" variant="destructive" disabled={props.busy} onClick={props.onConfirm}>
          {props.busy ? 'Deleting…' : 'Delete'}
        </Button>
      }
    />
  );
}

/** Reject on Awaiting Approval (ANN-S2): the reason goes back to the author. */
export function RejectDialog(props: ConfirmProps & { onConfirm: (reason: string) => void }): ReactNode {
  const [reason, setReason] = useState('');
  const missing = reason.trim().length === 0;
  return (
    <Shell
      {...props}
      title="Reject Announcement"
      description="The notice returns to its author as a draft with your reason."
      action={
        <Button type="button" variant="destructive" disabled={props.busy || missing} onClick={() => props.onConfirm(reason.trim())}>
          {props.busy ? 'Rejecting…' : 'Reject'}
        </Button>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="reject-reason">Reason</Label>
        <Textarea id="reject-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        {missing && <p className="text-xs text-muted-foreground">A reason is required.</p>}
      </div>
    </Shell>
  );
}

/** Edit Expiry (ANN-S3): a date from today on, or no expiry. */
export function EditExpiryDialog(props: ConfirmProps & { current: string; onConfirm: (date: string | null) => void }): ReactNode {
  const [date, setDate] = useState(props.current);
  const [none, setNone] = useState(props.current === '');
  return (
    <Shell
      {...props}
      title="Edit Expiry"
      description="The notice is listed as Active until the end of this day."
      action={
        <Button type="button" disabled={props.busy || (!none && !date)} onClick={() => props.onConfirm(none ? null : date)}>
          {props.busy ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="edit-expiry">Expiring On</Label>
        <Input id="edit-expiry" type="date" min={todayIST()} value={date} disabled={none} onChange={(e) => setDate(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={none} onChange={(e) => setNone(e.target.checked)} /> No expiry
        </label>
      </div>
    </Shell>
  );
}
