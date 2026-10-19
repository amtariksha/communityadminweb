'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import {
  useAssignSlot,
  useCreateSlot,
  useDeallocateSlot,
  useUpdateSlot,
  useVehiclePage,
  type ParkingSlot,
  type Vehicle,
} from '@/hooks/use-parking';
import { friendlyError } from '@/lib/api-error';

/** What the Add / Edit Slot form holds (PARK-S3). */
export interface SlotDraft {
  number: string;
  type: string;
  location: string;
  evCharger: boolean;
  /** '' = vacant. */
  unitId: string;
  memberId: string;
}

export function slotDraftFrom(slot?: ParkingSlot | null): SlotDraft {
  return {
    number: slot?.slot_number ?? '',
    type: slot?.slot_type ?? 'car',
    location: slot?.location ?? '',
    evCharger: slot?.has_ev_charger ?? false,
    unitId: slot?.unit_id ?? '',
    memberId: slot?.assigned_to_member_id ?? '',
  };
}

/** A problem with the typed fields, or null when they can be sent. */
export function slotDraftError(draft: SlotDraft): string | null {
  const number = draft.number.trim();
  if (!number) return 'Slot number is required.';
  if (number.length > 20) return 'A slot number has at most 20 characters.';
  if (draft.location.trim().length > 100) return 'A location has at most 100 characters.';
  return null;
}

/** The assignment step a save needs: none, release the slot, or (re)assign it. */
export function assignmentStep(slot: ParkingSlot | null | undefined, draft: SlotDraft): 'none' | 'release' | 'assign' | 'move' {
  const unitBefore = slot?.unit_id ?? '';
  const memberBefore = slot?.assigned_to_member_id ?? '';
  if (draft.unitId === unitBefore) return draft.unitId && draft.memberId !== memberBefore ? 'assign' : 'none';
  if (!draft.unitId) return 'release';
  return unitBefore ? 'move' : 'assign';
}

/** Vehicles in use on the slot: a unit change has to unlink them (PARK-07). */
function useLinkedVehicles(slot: ParkingSlot | null | undefined): Vehicle[] {
  const unitId = slot?.unit_id ?? undefined;
  const query = useVehiclePage({ unit_id: unitId, status: 'active', limit: 100 }, { enabled: Boolean(slot && unitId) });
  return (query.data?.data ?? []).filter((vehicle) => vehicle.parking_slot_id === slot?.id);
}

/**
 * State and saving of the slot form (PARK-07, SB-07): one set of checks for
 * the standard dialog and the classic page. Assignment goes through the
 * assign / deallocate routes; moving a slot with vehicles on it asks first.
 */
export function useSlotForm(slot: ParkingSlot | null | undefined) {
  const { addToast } = useToast();
  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();
  const assignSlot = useAssignSlot();
  const deallocateSlot = useDeallocateSlot();
  const linked = useLinkedVehicles(slot);
  const [draft, setDraft] = useState<SlotDraft>(() => slotDraftFrom(slot));
  const set = (changes: Partial<SlotDraft>) => setDraft((current) => ({ ...current, ...changes }));

  function confirmUnlink(step: ReturnType<typeof assignmentStep>): boolean {
    if ((step !== 'move' && step !== 'release') || linked.length === 0) return true;
    const plates = linked.map((vehicle) => vehicle.registration_number).join(', ');
    return window.confirm(`Slot ${slot?.slot_number} has vehicles parked on it (${plates}). Unlink them from the slot and change the unit?`);
  }

  async function persist(step: ReturnType<typeof assignmentStep>): Promise<void> {
    const fields = {
      slot_number: draft.number.trim(),
      slot_type: draft.type,
      location: draft.location.trim() || null,
      has_ev_charger: draft.evCharger,
      // The EV flag the resident app reads is kept equal to the charger (PARK-S3).
      is_ev_enabled: draft.evCharger,
    };
    const saved = slot ? (await updateSlot.mutateAsync({ id: slot.id, data: fields })).data : (await createSlot.mutateAsync(fields)).data;
    // Deallocating also unlinks the slot's vehicles (the API does it).
    if (step === 'release' || step === 'move') await deallocateSlot.mutateAsync(saved.id);
    if (step === 'assign' || step === 'move') {
      await assignSlot.mutateAsync({ id: saved.id, unit_id: draft.unitId, member_id: draft.memberId || undefined });
    }
  }

  async function save(onDone: () => void): Promise<void> {
    const problem = slotDraftError(draft);
    if (problem) {
      addToast({ title: problem, variant: 'destructive' });
      return;
    }
    const step = assignmentStep(slot, draft);
    if (!confirmUnlink(step)) return;
    try {
      await persist(step);
      addToast({ title: slot ? 'Slot updated' : 'Slot created', variant: 'success' });
      onDone();
    } catch (error) {
      addToast({ title: slot ? 'Failed to update slot' : 'Failed to create slot', description: friendlyError(error), variant: 'destructive' });
    }
  }

  const saving = createSlot.isPending || updateSlot.isPending || assignSlot.isPending || deallocateSlot.isPending;
  return { draft, set, reset: () => setDraft(slotDraftFrom(null)), save, saving };
}
