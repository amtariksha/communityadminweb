'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCreateAmenity, useUpdateAmenity, type Amenity } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { AMENITY_TYPES, amenityTypeIcon, formatAmenityType, formatPricingType, PRICING_TYPES } from '../amenity-labels';
import { amenityFormValues, amenityPayload, type AmenityFormValues } from './amenity-form-values';

interface AmenityFormProps {
  mode: FormMode;
  /** The amenity to edit; none adds one. */
  amenity?: Amenity | null;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldsProps {
  values: AmenityFormValues;
  set: (patch: Partial<AmenityFormValues>) => void;
  page: boolean;
}

function NameTypeFields({ values, set }: FieldsProps): ReactNode {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="amenity-name">Name</Label>
        <Input id="amenity-name" value={values.name} maxLength={100} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Party Hall" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amenity-type">Type</Label>
          <Select id="amenity-type" value={values.type} onChange={(e) => set({ type: e.target.value })}>
            {AMENITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {amenityTypeIcon(t)} {formatAmenityType(t)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amenity-capacity">Capacity</Label>
          <Input id="amenity-capacity" type="number" value={values.capacity} onChange={(e) => set({ capacity: e.target.value })} placeholder="e.g. 50" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amenity-location">Location</Label>
        <Input id="amenity-location" value={values.location} maxLength={100} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Ground Floor, Block A" />
      </div>
    </>
  );
}

function ChargeFields({ values, set, page }: FieldsProps): ReactNode {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amenity-pricing">Pricing Type</Label>
          <Select id="amenity-pricing" value={values.pricingType} onChange={(e) => set({ pricingType: e.target.value })}>
            {PRICING_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatPricingType(t)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amenity-price">Price</Label>
          <Input id="amenity-price" type="number" value={values.price} onChange={(e) => set({ price: e.target.value })} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amenity-deposit">Deposit</Label>
          <Input id="amenity-deposit" type="number" value={values.deposit} onChange={(e) => set({ deposit: e.target.value })} placeholder="0" />
        </div>
      </div>
      <div className="space-y-2">
        {/* The committee's word for the same column is Notes (AMEN-S2). */}
        <Label htmlFor="amenity-rules">{page ? 'Notes' : 'Rules'}</Label>
        <Textarea id="amenity-rules" value={values.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Usage rules and guidelines..." rows={3} />
      </div>
      {page && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
          Active (an inactive amenity takes no bookings and is listed under Inactive Amenities)
        </label>
      )}
    </>
  );
}

/**
 * Add Amenity / Edit Amenity (SB-07): today's dialog in the standard
 * layout, a page in classic (`/amenities/new`, `/amenities/:id/edit`)
 * with the Active tick, which moves an amenity between the Setup lists.
 */
export function AmenityForm({ mode, amenity, open, onClose, onSaved }: AmenityFormProps): ReactNode {
  const { addToast } = useToast();
  const createMutation = useCreateAmenity();
  const updateMutation = useUpdateAmenity();
  const [values, setValues] = useState<AmenityFormValues>(() => amenityFormValues(amenity));
  const set = (patch: Partial<AmenityFormValues>) => setValues((current) => ({ ...current, ...patch }));
  const page = mode === 'page';
  const editing = Boolean(amenity);

  async function save(): Promise<void> {
    const { payload, error } = amenityPayload(values, page && editing);
    if (!payload) {
      addToast({ title: error ?? 'Check the form', variant: 'destructive' });
      return;
    }
    try {
      if (amenity) await updateMutation.mutateAsync({ id: amenity.id, ...payload });
      else await createMutation.mutateAsync(payload);
      addToast({ title: editing ? 'Amenity updated' : 'Amenity created', variant: 'success' });
      onSaved();
    } catch (failure) {
      addToast({ title: editing ? 'Failed to update amenity' : 'Failed to create amenity', description: friendlyError(failure), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title={editing ? 'Edit Amenity' : 'Add Amenity'}
      description={editing ? `Update amenity details for ${amenity?.name}` : 'Create a new community amenity'}
      onClose={onClose}
      onSave={() => void save()}
      saving={createMutation.isPending || updateMutation.isPending}
      saveLabel={editing ? (page ? 'Save Changes' : 'Update') : page ? 'Add Amenity' : 'Create'}
      dialogClassName="max-w-lg"
    >
      <NameTypeFields values={values} set={set} page={page} />
      <ChargeFields values={values} set={set} page={page} />
    </FormFrame>
  );
}
