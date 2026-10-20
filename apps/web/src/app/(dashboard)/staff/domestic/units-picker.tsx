'use client';

import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUnits } from '@/hooks/use-units';

export interface PickedUnit {
  id: string;
  label: string;
}

interface UnitsPickerProps {
  value: readonly PickedUnit[];
  onChange: (units: PickedUnit[]) => void;
}

const unitLabel = (unit: { block: string | null; unit_number: string }): string =>
  unit.block ? `${unit.block} - ${unit.unit_number}` : unit.unit_number;

/** Units served (STAFF-S3, Domestic): search the society's units and tick the flats the helper works in. */
export function UnitsPicker({ value, onChange }: UnitsPickerProps): ReactNode {
  const [search, setSearch] = useState('');
  const units = useUnits({ search: search.trim() || undefined, limit: 20 });
  const picked = new Set(value.map((unit) => unit.id));
  const toggle = (unit: PickedUnit) =>
    onChange(picked.has(unit.id) ? value.filter((row) => row.id !== unit.id) : [...value, unit]);

  return (
    <div className="space-y-2">
      <Label htmlFor="domestic-unit-search">Units served</Label>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Units picked">
          {value.map((unit) => (
            <li key={unit.id} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm">
              {unit.label}
              <button type="button" aria-label={`Remove ${unit.label}`} onClick={() => toggle(unit)}>
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input id="domestic-unit-search" placeholder="Search a unit, e.g. A-101" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="max-h-48 overflow-y-auto rounded border p-2" role="group" aria-label="Units">
        {units.isLoading && <p className="text-sm text-muted-foreground">Loading units…</p>}
        {units.isError && <p className="text-sm text-destructive">Could not load the units.</p>}
        {(units.data?.data ?? []).map((unit) => {
          const row = { id: unit.id, label: unitLabel(unit) };
          return (
            <label key={unit.id} className="flex items-center gap-2 py-0.5 text-sm">
              <input type="checkbox" checked={picked.has(unit.id)} onChange={() => toggle(row)} />
              {row.label}
            </label>
          );
        })}
        {units.data && units.data.data.length === 0 && <p className="text-sm text-muted-foreground">No unit matches.</p>}
      </div>
    </div>
  );
}
