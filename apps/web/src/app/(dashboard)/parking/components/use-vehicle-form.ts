'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import {
  useRegisterVehicle,
  useUpdateVehicle,
  type Vehicle,
  type VehicleFieldsInput,
} from '@/hooks/use-parking';
import { friendlyError } from '@/lib/api-error';

/** What the Add / Edit Vehicle form holds (PARK-S5). Dates are `YYYY-MM-DD` or ''. */
export interface VehicleDraft {
  unitId: string;
  memberId: string;
  plate: string;
  type: string;
  slotId: string;
  sticker: string;
  rfid: string;
  additional: string;
  from: string;
  to: string;
  comments: string;
  make: string;
  model: string;
  color: string;
}

export function vehicleDraftFrom(vehicle?: Vehicle | null, unitId = ''): VehicleDraft {
  return {
    unitId: vehicle?.unit_id ?? unitId,
    memberId: vehicle?.member_id ?? '',
    plate: vehicle?.registration_number ?? '',
    type: vehicle?.vehicle_type ?? 'car',
    slotId: vehicle?.parking_slot_id ?? '',
    sticker: vehicle?.sticker_number ?? '',
    rfid: vehicle?.rfid_number ?? '',
    additional: vehicle?.additional_field ?? '',
    from: vehicle?.valid_from?.slice(0, 10) ?? '',
    to: vehicle?.valid_to?.slice(0, 10) ?? '',
    comments: vehicle?.comments ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    color: vehicle?.color ?? '',
  };
}

// Column limits of `vehicles` (migrations 025, 216).
const LIMITS: ReadonlyArray<[keyof VehicleDraft, number, string]> = [
  ['plate', 20, 'Vehicle No'],
  ['sticker', 50, 'Sticker No'],
  ['rfid', 100, 'RFID No'],
  ['additional', 200, 'The additional field'],
  ['comments', 500, 'Comments'],
  ['make', 50, 'Make'],
  ['model', 50, 'Model'],
  ['color', 30, 'Colour'],
];

/** A problem with the typed fields, or null when they can be sent. */
export function vehicleDraftError(draft: VehicleDraft): string | null {
  if (!draft.unitId) return 'Choose the unit.';
  if (!draft.memberId) return 'Choose whose vehicle it is.';
  if (!draft.plate.trim()) return 'Enter the vehicle number.';
  const tooLong = LIMITS.find(([field, max]) => draft[field].trim().length > max);
  if (tooLong) return `${tooLong[2]} has at most ${tooLong[1]} characters.`;
  if (draft.from && draft.to && draft.to < draft.from) return 'To Date cannot be before From Date.';
  return null;
}

const orNull = (text: string): string | null => text.trim() || null;

/**
 * The register fields to send. The extra field goes only while Setup names
 * it, so a hidden field is never cleared by a save.
 */
export function vehicleFields(draft: VehicleDraft, withAdditional: boolean): VehicleFieldsInput {
  return {
    registration_number: draft.plate.trim(),
    vehicle_type: draft.type,
    parking_slot_id: draft.slotId || null,
    sticker_number: orNull(draft.sticker),
    rfid_number: orNull(draft.rfid),
    ...(withAdditional ? { additional_field: orNull(draft.additional) } : {}),
    valid_from: draft.from || null,
    valid_to: draft.to || null,
    comments: orNull(draft.comments),
    make: orNull(draft.make),
    model: orNull(draft.model),
    color: orNull(draft.color),
  };
}

/** State and save of the vehicle form; `vehicle` = Edit, none = Add. */
export function useVehicleForm(vehicle: Vehicle | null | undefined, options: { unitId?: string; withAdditional: boolean }) {
  const { addToast } = useToast();
  const [draft, setDraft] = useState<VehicleDraft>(() => vehicleDraftFrom(vehicle, options.unitId));
  const register = useRegisterVehicle();
  const update = useUpdateVehicle();
  const set = (changes: Partial<VehicleDraft>) => setDraft((current) => ({ ...current, ...changes }));

  async function persist(): Promise<string> {
    const fields = vehicleFields(draft, options.withAdditional);
    if (vehicle) {
      await update.mutateAsync({ id: vehicle.id, ...fields });
      return 'Vehicle updated';
    }
    const created = await register.mutateAsync({ ...fields, unit_id: draft.unitId, member_id: draft.memberId });
    return created.data?.approval_status === 'pending' ? 'Vehicle added — waiting for approval' : 'Vehicle registered';
  }

  async function save(onDone: () => void): Promise<void> {
    const problem = vehicleDraftError(draft);
    if (problem) {
      addToast({ title: problem, variant: 'destructive' });
      return;
    }
    try {
      addToast({ title: await persist(), variant: 'success' });
      onDone();
    } catch (error) {
      addToast({ title: vehicle ? 'Failed to update vehicle' : 'Failed to add vehicle', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return {
    draft,
    set,
    reset: () => setDraft(vehicleDraftFrom(null, options.unitId)),
    save,
    saving: register.isPending || update.isPending,
  };
}
