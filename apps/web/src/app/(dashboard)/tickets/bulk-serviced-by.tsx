'use client';

import { useState, type ReactNode } from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useBulkAssignServicedBy, useServicedByOptions } from '@/hooks';
import { friendlyError } from '@/lib/api-error';

interface BulkServicedByProps {
  ticketIds: readonly string[];
  onDone: () => void;
}

/**
 * Bulk "Assign Serviced By" (HELP-18): the staff member doing the job on
 * every selected request. Hidden while the API has no staff picker.
 */
export function BulkServicedBy({ ticketIds, onDone }: BulkServicedByProps): ReactNode {
  const { addToast } = useToast();
  const options = useServicedByOptions();
  const assign = useBulkAssignServicedBy();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  if (!options.isSuccess) return null;

  async function submit(): Promise<void> {
    try {
      const result = await assign.mutateAsync({ ticket_ids: [...ticketIds], serviced_by_staff_id: staffId });
      addToast({ title: `Serviced By set on ${result.data.assigned} request(s)`, variant: 'success' });
      setOpen(false);
      onDone();
    } catch (error) {
      addToast({ title: 'Could not assign Serviced By', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Wrench className="mr-1 h-4 w-4" />
        Assign Serviced By
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Serviced By</DialogTitle>
            <DialogDescription>The staff member who will do the job on {ticketIds.length} selected request(s).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-serviced-by">Serviced By</Label>
            <Select id="bulk-serviced-by" value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">Select a staff member...</option>
              {(options.data ?? []).map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                  {staff.designation ? ` (${staff.designation})` : ''}
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={assign.isPending || !staffId} onClick={() => void submit()}>
              {assign.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
