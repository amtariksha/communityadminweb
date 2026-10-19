'use client';

import { type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useUnitMembers } from '@/hooks';
import { useUnitChoices } from '@/app/(dashboard)/helpdesk/new/use-unit-choices';
import type { ParkingSlot } from '@/hooks/use-parking';
import { SLOT_TYPES, typeLabel } from '../parking-ui';
import { useSlotForm } from './use-slot-form';

export interface SlotFormProps {
  mode: FormMode;
  /** Dialog only: whether it is showing. */
  open?: boolean;
  /** The slot being edited; none = Add Slot. */
  slot?: ParkingSlot | null;
  onClose: () => void;
  onSaved: () => void;
}

type Form = ReturnType<typeof useSlotForm>;

function AssignmentFields({ form }: { form: Form }): ReactNode {
  const { draft, set } = form;
  // GET /units pages at most 100 rows; the picker reads them 100 at a time.
  const units = useUnitChoices().data ?? [];
  const members = useUnitMembers(draft.unitId).data ?? [];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="slot-unit">Assigned Unit</Label>
        <Select id="slot-unit" value={draft.unitId} onChange={(event) => set({ unitId: event.target.value, memberId: '' })}>
          <option value="">Vacant</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {[unit.block, unit.unit_number].filter(Boolean).join('-')}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="slot-member">Assigned Member</Label>
        <Select id="slot-member" value={draft.memberId} disabled={!draft.unitId} onChange={(event) => set({ memberId: event.target.value })}>
          <option value="">{draft.unitId ? 'Any member of the unit' : 'Choose a unit first'}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? member.member_type}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function SlotFields({ form }: { form: Form }): ReactNode {
  const { draft, set } = form;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="slot-number">Slot No</Label>
          <Input id="slot-number" maxLength={20} placeholder="e.g. A-01" value={draft.number} onChange={(event) => set({ number: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slot-type">Type</Label>
          <Select id="slot-type" value={draft.type} onChange={(event) => set({ type: event.target.value })}>
            {SLOT_TYPES.map((type) => (
              <option key={type} value={type}>{typeLabel(type)}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="slot-location">Location</Label>
        <Input id="slot-location" maxLength={100} placeholder="e.g. Basement 1" value={draft.location} onChange={(event) => set({ location: event.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <input id="slot-ev" type="checkbox" className="h-4 w-4 rounded border-input" checked={draft.evCharger} onChange={(event) => set({ evCharger: event.target.checked })} />
        <Label htmlFor="slot-ev">EV charger</Label>
      </div>
      <AssignmentFields form={form} />
    </>
  );
}

/**
 * Add / Edit Slot (PARK-07, screen PARK-S3, SB-07): a dialog on the
 * standard Parking page, a page under Parking Manager in classic. No
 * sticker, RFID or monthly charge on a slot (PARK-05, PARK-08).
 */
export function SlotForm({ mode, open, slot, onClose, onSaved }: SlotFormProps): ReactNode {
  const form = useSlotForm(slot);
  const editing = Boolean(slot);
  return (
    <FormFrame
      mode={mode}
      open={open}
      title={editing ? `Edit Slot ${slot?.slot_number ?? ''}`.trim() : 'Add Slot'}
      description={editing ? 'Change the slot or who it is assigned to' : 'Create a new parking slot'}
      onClose={onClose}
      onSave={() => void form.save(onSaved)}
      onSaveAndNew={mode === 'page' && !editing ? () => void form.save(form.reset) : undefined}
      saving={form.saving}
    >
      <SlotFields form={form} />
    </FormFrame>
  );
}
