'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { useToast } from '@/components/ui/toast';
import { useAddUnitManager } from '@/hooks/use-unit-managers';
import { UNIT_PICKER_LIMIT, useUnits } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';

export const MAX_MANAGED_UNITS = 20;

interface PickedUnit {
  id: string;
  label: string;
}

/** What the form refuses before calling the API; null when it may be sent. */
export function caretakerFormError(input: { phone: string; name: string; units: readonly PickedUnit[]; validUntil: string; today: string }): string | null {
  if (!normalizePhone(input.phone).ok || !input.phone.trim()) return 'Enter an Indian mobile number.';
  if (!input.name.trim()) return 'Enter the name.';
  if (input.units.length === 0) return 'Choose at least one unit.';
  if (input.units.length > MAX_MANAGED_UNITS) return 'At most 20 units.';
  if (input.validUntil && input.validUntil <= input.today) return 'Valid until must be after today.';
  return null;
}

function indiaToday(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

/** Add New Caretaker / Unit Manager (UNIT-S10): phone, name, 1–20 units, an optional last day. */
export function AddCaretakerForm({ open, onClose }: { open: boolean; onClose: () => void }): ReactNode {
  const add = useAddUnitManager();
  const { addToast } = useToast();
  const unitList = useUnits({ limit: UNIT_PICKER_LIMIT }).data?.data ?? [];
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [units, setUnits] = useState<PickedUnit[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [error, setError] = useState<string>();

  function pick(unitId: string): void {
    const unit = unitList.find((candidate) => candidate.id === unitId);
    if (!unit || units.some((picked) => picked.id === unitId)) return;
    setUnits([...units, { id: unit.id, label: [unit.block, unit.unit_number].filter(Boolean).join('-') }]);
  }

  function save(): void {
    const problem = caretakerFormError({ phone, name, units, validUntil, today: indiaToday() });
    if (problem) {
      setError(problem);
      return;
    }
    const checked = normalizePhone(phone);
    add.mutate(
      { phone: checked.ok && checked.value ? checked.value : phone, name: name.trim(), unit_ids: units.map((unit) => unit.id), valid_until: validUntil || null },
      {
        onSuccess: () => {
          addToast({ title: 'Caretaker added', variant: 'success' });
          onClose();
        },
        onError: (failure) => addToast({ title: 'Could not add', description: friendlyError(failure), variant: 'destructive' }),
      },
    );
  }

  return (
    <FormFrame mode="dialog" open={open} title="Add New Caretaker / Unit Manager" onClose={onClose} onSave={save} saving={add.isPending}>
      <div className="space-y-1">
        <Label htmlFor="caretaker-phone">Phone</Label>
        <Input id="caretaker-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="caretaker-name">Name</Label>
        <Input id="caretaker-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Unit(s)</Label>
        <UnitSearchSelect value="" onChange={pick} units={unitList} placeholder="Search a unit to add" />
        <ul aria-label="Chosen units" className="flex flex-wrap gap-1">
          {units.map((unit) => (
            <li key={unit.id} className="flex items-center gap-1 rounded border px-2 py-0.5 text-xs">
              {unit.label}
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${unit.label}`} onClick={() => setUnits(units.filter((picked) => picked.id !== unit.id))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-1">
        <Label htmlFor="caretaker-until">Valid until (optional)</Label>
        <Input id="caretaker-until" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">
        They sign in to the resident app and act for these units only: dues, payments, visitors and helpdesk. They cannot vote, transfer
        ownership or start a move-out, and get no admin access.
      </p>
      <FormFieldError message={error} />
    </FormFrame>
  );
}
