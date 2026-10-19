'use client';

import { type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUnitMembers } from '@/hooks';
import { SLOT_PICKER_LIMIT, useSlots, type ParkingSlot, type Vehicle } from '@/hooks/use-parking';
import { useAdditionalFieldLabel } from '@/hooks/use-parking-settings';
import { useUnitChoices } from '@/app/(dashboard)/helpdesk/new/use-unit-choices';
import { VEHICLE_TYPES, typeLabel } from '../parking-ui';
import { useVehicleForm, type VehicleDraft } from './use-vehicle-form';

export interface VehicleFormProps {
  mode: FormMode;
  /** Dialog only: whether it is showing. */
  open?: boolean;
  /** The vehicle being edited; none = Add Vehicle. */
  vehicle?: Vehicle | null;
  /** Add only: the unit to start with (e.g. a unit's own panel). */
  unitId?: string;
  onClose: () => void;
  onSaved: () => void;
}

type Form = ReturnType<typeof useVehicleForm>;

/** The unit's own slots first, then the vacant ones (PARK-S5). */
export function slotChoices(own: readonly ParkingSlot[], vacant: readonly ParkingSlot[]): ParkingSlot[] {
  const seen = new Set(own.map((slot) => slot.id));
  return [...own, ...vacant.filter((slot) => !seen.has(slot.id))];
}

function TextField({ id, label, value, max, onChange }: { id: string; label: string; value: string; max: number; onChange: (value: string) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} maxLength={max} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

// Who owns it: an edit keeps the unit and member (PATCH /parking/vehicles/:id does not move a vehicle).
function OwnerFields({ form, editing }: { form: Form; editing: boolean }): ReactNode {
  const { draft, set } = form;
  const units = useUnitChoices().data ?? [];
  const members = useUnitMembers(draft.unitId).data ?? [];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="vehicle-unit">Block-Unit</Label>
        <Select id="vehicle-unit" value={draft.unitId} disabled={editing} onChange={(event) => set({ unitId: event.target.value, memberId: '', slotId: '' })}>
          <option value="">Select unit...</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{[unit.block, unit.unit_number].filter(Boolean).join('-')}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vehicle-member">Name</Label>
        <Select id="vehicle-member" value={draft.memberId} disabled={editing || !draft.unitId} onChange={(event) => set({ memberId: event.target.value })}>
          <option value="">{draft.unitId ? 'Select member...' : 'Choose a unit first'}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name ?? member.member_type}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function VehicleFields({ form }: { form: Form }): ReactNode {
  const { draft, set } = form;
  const own = useSlots({ unit_id: draft.unitId || undefined, limit: SLOT_PICKER_LIMIT }).data ?? [];
  const vacant = useSlots({ status: 'vacant', limit: SLOT_PICKER_LIMIT }).data ?? [];
  const slots = slotChoices(draft.unitId ? own : [], vacant);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <TextField id="vehicle-plate" label="Vehicle No" max={20} value={draft.plate} onChange={(plate) => set({ plate })} />
      <div className="space-y-2">
        <Label htmlFor="vehicle-type">Vehicle Type</Label>
        <Select id="vehicle-type" value={draft.type} onChange={(event) => set({ type: event.target.value })}>
          {VEHICLE_TYPES.map((type) => (
            <option key={type} value={type}>{typeLabel(type)}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vehicle-slot">Slot No</Label>
        <Select id="vehicle-slot" value={draft.slotId} onChange={(event) => set({ slotId: event.target.value })}>
          <option value="">None</option>
          {slots.map((slot) => (
            <option key={slot.id} value={slot.id}>{slot.slot_number} ({typeLabel(slot.slot_type)})</option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function RegisterFields({ form, additionalLabel }: { form: Form; additionalLabel: string }): ReactNode {
  const { draft, set } = form;
  const text = (key: keyof VehicleDraft) => (value: string) => set({ [key]: value } as Partial<VehicleDraft>);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField id="vehicle-sticker" label="Sticker No" max={50} value={draft.sticker} onChange={text('sticker')} />
        <TextField id="vehicle-rfid" label="RFID No" max={100} value={draft.rfid} onChange={text('rfid')} />
        {additionalLabel && <TextField id="vehicle-additional" label={additionalLabel} max={200} value={draft.additional} onChange={text('additional')} />}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vehicle-from">From Date</Label>
          <Input id="vehicle-from" type="date" value={draft.from} onChange={(event) => set({ from: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicle-to">To Date</Label>
          <Input id="vehicle-to" type="date" min={draft.from || undefined} value={draft.to} onChange={(event) => set({ to: event.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vehicle-comments">Comments</Label>
        <Textarea id="vehicle-comments" maxLength={500} rows={2} value={draft.comments} onChange={(event) => set({ comments: event.target.value })} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField id="vehicle-make" label="Make" max={50} value={draft.make} onChange={text('make')} />
        <TextField id="vehicle-model" label="Model" max={50} value={draft.model} onChange={text('model')} />
        <TextField id="vehicle-color" label="Colour" max={30} value={draft.color} onChange={text('color')} />
      </div>
    </>
  );
}

/**
 * Add / Edit Vehicle (PARK-09, screen PARK-S5, SB-07): a dialog on the
 * standard Parking page, a page under Parking Manager in classic. The extra
 * field shows only while Parking Setup names it (PARK-08).
 */
export function VehicleForm({ mode, open, vehicle, unitId, onClose, onSaved }: VehicleFormProps): ReactNode {
  const additionalLabel = useAdditionalFieldLabel();
  const form = useVehicleForm(vehicle, { unitId, withAdditional: additionalLabel !== '' });
  const editing = Boolean(vehicle);
  return (
    <FormFrame
      mode={mode}
      open={open}
      title={editing ? `Edit Vehicle ${vehicle?.registration_number ?? ''}`.trim() : 'Add Vehicle'}
      description={editing ? 'Change the vehicle, its slot or its register details' : 'An admin’s vehicle is active at once'}
      onClose={onClose}
      onSave={() => void form.save(onSaved)}
      onSaveAndNew={mode === 'page' && !editing ? () => void form.save(form.reset) : undefined}
      saving={form.saving}
      dialogClassName="max-w-2xl"
    >
      <OwnerFields form={form} editing={editing} />
      <VehicleFields form={form} />
      <RegisterFields form={form} additionalLabel={additionalLabel} />
    </FormFrame>
  );
}
