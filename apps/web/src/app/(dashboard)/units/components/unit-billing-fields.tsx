import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { UnitBillingCategory } from '@/hooks/use-unit-billing-categories';

interface UnitBillingFieldsProps {
  /** The society's unit types; null when the server has none to offer yet. */
  types: readonly UnitBillingCategory[] | null;
  /** The unit's type id, or '' for none. */
  typeId: string;
  onTypeChange: (typeId: string) => void;
  /** Sq.ft 2 as typed; '' for none. */
  area2: string;
  onArea2Change: (value: string) => void;
}

/** '' clears the second area; otherwise it must be a number above zero. */
export function area2Error(value: string): string | null {
  if (value.trim() === '') return null;
  const area = Number(value);
  return Number.isFinite(area) && area > 0 ? null : 'Area 2 must be a number above 0, or left blank.';
}

/** The PATCH /units/:id fields for billing: the type only when the server offers types. */
export function billingFieldsPayload(
  types: readonly UnitBillingCategory[] | null,
  typeId: string,
  area2: string,
): { garden_area: number | null; billing_category_id?: string | null } {
  const garden_area = area2.trim() === '' ? null : Number(area2);
  return types === null ? { garden_area } : { garden_area, billing_category_id: typeId || null };
}

/**
 * The unit's type for billing and its second area (INC-15), on the Details
 * tab of the unit dialog. The type picker is left out when the server has no
 * unit types yet.
 */
export function UnitBillingFields({ types, typeId, onTypeChange, area2, onArea2Change }: UnitBillingFieldsProps): ReactNode {
  const error = area2Error(area2);
  return (
    <div className="grid grid-cols-2 gap-4">
      {types !== null && (
        <div className="space-y-2">
          <Label htmlFor="edit-unit-billing-type">Unit type (billing)</Label>
          <Select id="edit-unit-billing-type" value={typeId} onChange={(e) => onTypeChange(e.target.value)}>
            <option value="">No unit type</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="edit-unit-area2">Area 2 (sq ft)</Label>
        <Input
          id="edit-unit-area2"
          type="number"
          min={0}
          step="0.01"
          placeholder="e.g. garden or terrace"
          value={area2}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onArea2Change(e.target.value)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
