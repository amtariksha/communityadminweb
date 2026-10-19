'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAssignSlot, useCreateSlot } from '@/hooks/use-parking';
import { useUnits } from '@/hooks';
import type { ParkingSlot } from '@/hooks/use-parking';
import { SLOT_TYPES, typeLabel } from './parking-ui';

interface NewSlot {
  number: string;
  type: string;
  location: string;
  evCharger: boolean;
  sticker: string;
  rfid: string;
}

const EMPTY_SLOT: NewSlot = { number: '', type: 'car', location: '', evCharger: false, sticker: '', rfid: '' };

/**
 * Add Parking Slot. No Monthly Charge: nothing bills it (PARK-05, decision
 * PARK-D4). Types Car · Bike · EV · Other (PARK-04).
 */
export function AddSlotDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactNode {
  const { addToast } = useToast();
  const createMutation = useCreateSlot();
  const [slot, setSlot] = useState<NewSlot>(EMPTY_SLOT);
  const set = (changes: Partial<NewSlot>) => setSlot((current) => ({ ...current, ...changes }));

  function handleCreate(): void {
    if (!slot.number.trim()) {
      addToast({ title: 'Slot number is required', variant: 'destructive' });
      return;
    }
    createMutation.mutate(
      {
        slot_number: slot.number.trim(),
        slot_type: slot.type,
        location: slot.location.trim() || null,
        has_ev_charger: slot.evCharger,
        sticker_number: slot.sticker.trim() || null,
        rfid_tag: slot.rfid.trim() || null,
        is_ev_enabled: slot.evCharger,
      },
      {
        onSuccess() {
          addToast({ title: 'Slot created', variant: 'success' });
          onOpenChange(false);
          setSlot(EMPTY_SLOT);
        },
        onError(error) {
          addToast({ title: 'Failed to create slot', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Parking Slot</DialogTitle>
          <DialogDescription>Create a new parking slot</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="slot-number">Slot Number</Label>
            <Input id="slot-number" value={slot.number} onChange={(e) => set({ number: e.target.value })} placeholder="e.g. A-01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slot-type">Type</Label>
            <Select id="slot-type" value={slot.type} onChange={(e) => set({ type: e.target.value })}>
              {SLOT_TYPES.map((t) => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slot-location">Location</Label>
            <Input id="slot-location" value={slot.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Basement 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="slot-sticker">Sticker # / Pass</Label>
              <Input id="slot-sticker" value={slot.sticker} onChange={(e) => set({ sticker: e.target.value })} placeholder="e.g. STK-1042" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-rfid">RFID Tag / Fastag</Label>
              <Input id="slot-rfid" value={slot.rfid} onChange={(e) => set({ rfid: e.target.value })} placeholder="e.g. RFID-88219" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ev-charger"
              type="checkbox"
              checked={slot.evCharger}
              onChange={(e) => set({ evCharger: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="ev-charger">Has EV Charger / Enabled</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
