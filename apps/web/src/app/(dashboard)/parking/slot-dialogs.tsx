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
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useAssignSlot } from '@/hooks/use-parking';
import { useUnits } from '@/hooks';
import type { ParkingSlot } from '@/hooks/use-parking';

interface AssignSlotDialogProps {
  slot: ParkingSlot | null;
  onClose: () => void;
}

/** Assign a vacant slot to a unit. */
export function AssignSlotDialog({ slot, onClose }: AssignSlotDialogProps): ReactNode {
  const { addToast } = useToast();
  const assignMutation = useAssignSlot();
  const unitsQuery = useUnits();
  const units = unitsQuery.data?.data ?? [];
  const [unitId, setUnitId] = useState('');

  function handleAssign(): void {
    if (!slot || !unitId) {
      addToast({ title: 'Unit is required', variant: 'destructive' });
      return;
    }
    assignMutation.mutate(
      { id: slot.id, unit_id: unitId },
      {
        onSuccess() {
          addToast({ title: 'Slot assigned', variant: 'success' });
          setUnitId('');
          onClose();
        },
        onError(error) {
          addToast({ title: 'Failed to assign slot', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={slot !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Slot {slot?.slot_number}</DialogTitle>
          <DialogDescription>Assign this parking slot to a unit</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="assign-unit">Unit</Label>
            <Select id="assign-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Select unit...</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
              ))}
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAssign} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
