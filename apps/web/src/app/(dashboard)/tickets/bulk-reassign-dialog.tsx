'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { HelpdeskAssignee } from '@/hooks';

interface BulkReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  /** Admins of this society: the only people a request can be assigned to. */
  assignees: readonly HelpdeskAssignee[];
  isPending: boolean;
  onSubmit: (assigneeId: string) => void;
}

export function BulkReassignDialog({
  open,
  onOpenChange,
  selectedCount,
  assignees,
  isPending,
  onSubmit,
}: BulkReassignDialogProps): ReactNode {
  const [assigneeId, setAssigneeId] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Reassign Tickets</DialogTitle>
          <DialogDescription>
            Assign {selectedCount} selected ticket(s) to an admin of this society.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="bulk-assignee">Assign To</Label>
          <Select id="bulk-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            <option value="">Select an admin...</option>
            {assignees.map((assignee) => (
              <option key={assignee.user_id} value={assignee.user_id}>
                {assignee.name ?? 'Unnamed'} ({assignee.roles.join(', ')})
              </option>
            ))}
          </Select>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={isPending || !assigneeId} onClick={() => onSubmit(assigneeId)}>
            {isPending ? 'Reassigning...' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
