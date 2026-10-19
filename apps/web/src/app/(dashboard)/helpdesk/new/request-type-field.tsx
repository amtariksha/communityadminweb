'use client';

import { type ReactNode } from 'react';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Label } from '@/components/ui/label';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import type { RequestType } from './request-values';
import type { useUnitChoices } from './use-unit-choices';

interface RequestTypeFieldProps {
  requestType: RequestType;
  unitId: string;
  units: ReturnType<typeof useUnitChoices>;
  unitError?: string;
  onChange: (changes: { requestType?: RequestType; unitId?: string }) => void;
}

const TYPES: ReadonlyArray<{ value: RequestType; label: string }> = [
  { value: 'personal', label: 'Personal' },
  { value: 'community', label: 'Community' },
];

/**
 * Request Type (HELP-15) and, for a Personal request, the unit it is for.
 * The desk raising it for a unit it does not live in raises it on that
 * unit's behalf; a Community request has no unit.
 */
export function RequestTypeField({ requestType, unitId, units, unitError, onChange }: RequestTypeFieldProps): ReactNode {
  return (
    <>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Request Type</legend>
        <div className="flex gap-4">
          {TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="request-type"
                value={type.value}
                checked={requestType === type.value}
                onChange={() => onChange({ requestType: type.value })}
              />
              {type.label}
            </label>
          ))}
        </div>
      </fieldset>
      {requestType === 'personal' && (
        <div className="space-y-2">
          <Label>Select Unit</Label>
          <UnitSearchSelect value={unitId} onChange={(id) => onChange({ unitId: id })} units={units.data ?? []} placeholder="Search unit" />
          {unitError && <FormFieldError message={unitError} />}
        </div>
      )}
    </>
  );
}
