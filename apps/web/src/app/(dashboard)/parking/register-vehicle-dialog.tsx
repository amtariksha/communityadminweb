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
import { SLOT_PICKER_LIMIT, useRegisterVehicle, useSlots } from '@/hooks/use-parking';
import { useUnitMembers, useUnits } from '@/hooks';
import { VEHICLE_TYPES, typeLabel } from './parking-ui';

interface NewVehicle {
  registration: string;
  type: string;
  make: string;
  model: string;
  color: string;
  unitId: string;
  memberId: string;
  slotId: string;
  sticker: string;
}

const EMPTY: NewVehicle = { registration: '', type: 'car', make: '', model: '', color: '', unitId: '', memberId: '', slotId: '', sticker: '' };

const orNull = (text: string): string | null => text.trim() || null;

/** Register Vehicle. A committee member's or admin's vehicle is approved on save (PARK-03). */
export function RegisterVehicleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactNode {
  const { addToast } = useToast();
  const [vehicle, setVehicle] = useState<NewVehicle>(EMPTY);
  const set = (changes: Partial<NewVehicle>) => setVehicle((current) => ({ ...current, ...changes }));
  const units = useUnits().data?.data ?? [];
  const vacantSlots = useSlots({ status: 'vacant', limit: SLOT_PICKER_LIMIT }).data ?? [];
  const unitMembers = useUnitMembers(vehicle.unitId).data ?? [];
  const registerMutation = useRegisterVehicle();

  function handleRegister(): void {
    if (!vehicle.registration.trim() || !vehicle.memberId || !vehicle.unitId) {
      addToast({ title: 'Registration number, member, and unit are required', variant: 'destructive' });
      return;
    }
    registerMutation.mutate(
      {
        registration_number: vehicle.registration.trim(),
        vehicle_type: vehicle.type,
        make: orNull(vehicle.make),
        model: orNull(vehicle.model),
        color: orNull(vehicle.color),
        member_id: vehicle.memberId,
        unit_id: vehicle.unitId,
        parking_slot_id: vehicle.slotId || null,
        sticker_number: orNull(vehicle.sticker),
      },
      {
        onSuccess(result) {
          const pending = result.data?.approval_status === 'pending';
          addToast({ title: pending ? 'Vehicle added — waiting for approval' : 'Vehicle registered', variant: 'success' });
          onOpenChange(false);
          setVehicle(EMPTY);
        },
        onError(error) {
          addToast({ title: 'Failed to register vehicle', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  const text = (id: string, label: string, key: keyof NewVehicle, placeholder: string): ReactNode => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={vehicle[key]} onChange={(e) => set({ [key]: e.target.value })} placeholder={placeholder} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register Vehicle</DialogTitle>
          <DialogDescription>Add a new vehicle to the system</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {text('reg-number', 'Registration Number', 'registration', 'e.g. KA-01-AB-1234')}
          <div className="space-y-2">
            <Label htmlFor="vehicle-type">Type</Label>
            <Select id="vehicle-type" value={vehicle.type} onChange={(e) => set({ type: e.target.value })}>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {text('vehicle-make', 'Make', 'make', 'e.g. Maruti')}
            {text('vehicle-model', 'Model', 'model', 'e.g. Swift')}
          </div>
          {text('vehicle-color', 'Color', 'color', 'e.g. White')}
          <div className="space-y-2">
            <Label htmlFor="vehicle-unit">Unit</Label>
            <Select id="vehicle-unit" value={vehicle.unitId} onChange={(e) => set({ unitId: e.target.value, memberId: '' })}>
              <option value="">Select unit...</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle-member">Member</Label>
            <Select id="vehicle-member" value={vehicle.memberId} onChange={(e) => set({ memberId: e.target.value })} disabled={!vehicle.unitId}>
              <option value="">{vehicle.unitId ? 'Select member...' : 'Select a unit first'}</option>
              {unitMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name ?? member.member_type ?? member.id.slice(0, 8)} ({member.member_type})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle-slot">Parking Slot (optional)</Label>
            <Select id="vehicle-slot" value={vehicle.slotId} onChange={(e) => set({ slotId: e.target.value })}>
              <option value="">None</option>
              {vacantSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>{slot.slot_number} ({slot.slot_type})</option>
              ))}
            </Select>
          </div>
          {text('vehicle-sticker', 'Sticker Number (optional)', 'sticker', 'e.g. STK-001')}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleRegister} disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Registering...' : 'Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
